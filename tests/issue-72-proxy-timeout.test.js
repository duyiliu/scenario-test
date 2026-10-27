import assert from "node:assert/strict";
import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import { spawn, spawnSync } from "node:child_process";
import test from "node:test";
import { buildCapabilities, CONTRACT_VERSION, contract, renderCapabilitiesText } from "../src/index.js";

// Issue #72：serve 的代理空闲超时从硬编码 30 秒外提为 --proxy-timeout <ms>。
// 缺省仍为 30000；非法值（非正整数、超上限）参数解析期拒绝且报错带参数名。

// 隔离宿主 SCENARIO_* 变量，避免外部授权/全局参数影响子进程断言
for (const key of Object.keys(process.env)) {
    if (key.toUpperCase().startsWith("SCENARIO_")) delete process.env[key];
}

const root = path.resolve(import.meta.dirname, "..");
const cli = path.join(root, "src/cli.js");

const serveOutputBuffers = new WeakMap();

function waitForOutput(child, pattern) {
    if (!serveOutputBuffers.has(child)) {
        let buffer = "";
        serveOutputBuffers.set(child, () => buffer);
        child.stdout.on("data", (chunk) => { buffer += String(chunk); });
    }
    const bufferOf = serveOutputBuffers.get(child);
    return new Promise((resolve, reject) => {
        if (bufferOf().includes(pattern)) { resolve(); return; }
        let settled = false;
        const finish = (settle, value) => {
            if (settled) return;
            settled = true;
            clearTimeout(timer);
            child.stdout.off("data", onData);
            child.off("exit", onExit);
            settle(value);
        };
        const timer = setTimeout(() => finish(reject, new Error(`等待 serve 输出超时: ${pattern}`)), 15000);
        const onData = () => {
            if (bufferOf().includes(pattern)) finish(resolve);
        };
        const onExit = (code) => finish(reject, new Error(`serve 提前退出: ${code}`));
        child.stdout.on("data", onData);
        child.on("exit", onExit);
    });
}

function serveOutput(child) {
    const bufferOf = serveOutputBuffers.get(child);
    return bufferOf ? bufferOf() : "";
}

async function freePort() {
    const server = http.createServer();
    await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
    const port = server.address().port;
    await new Promise((resolve) => server.close(resolve));
    return port;
}

// 慢后端：收到请求后延迟 delayMs 才写响应头，用于触发代理空闲超时
async function startSlowBackend(delayMs) {
    const server = http.createServer((request, response) => {
        setTimeout(() => {
            if (response.destroyed || response.writableEnded) return;
            response.writeHead(200, { "Content-Type": "application/json" });
            response.end(JSON.stringify({ slow: true, url: request.url }));
        }, delayMs);
    });
    await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
    return { server, port: server.address().port };
}

function makeProject(backendPort) {
    const project = fs.mkdtempSync(path.join(os.tmpdir(), "scenario-test-issue72-"));
    const dir = path.join(project, "scenario-test");
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, "scenario.config.js"), `ScenarioTest.registerConfig(ScenarioTest.defineConfig({
        envs: [{ key: "local", name: "本地", baseUrl: "http://127.0.0.1:${backendPort}" }],
        defaultEnvKey: "local",
        scenarios: []
    }));`, "utf8");
    return { project, configPath: path.join(dir, "scenario.config.js") };
}

test("contract v16 投射 --proxy-timeout 到 capabilities 与 --help", () => {
    assert.equal(CONTRACT_VERSION, 16);
    const option = contract.cli.options["proxy-timeout"];
    assert.equal(option.kind, "value");
    assert.equal(option.prop, "proxyTimeout");
    assert.equal(option.parse, "number");
    assert.match(option.description, /30000/);

    const capabilities = buildCapabilities(contract);
    assert.equal(capabilities.cli.options["proxy-timeout"].kind, "value");
    assert.equal(capabilities.cli.options["proxy-timeout"].parse, "number");
    assert.match(renderCapabilitiesText(capabilities), /--proxy-timeout/);

    const help = spawnSync(process.execPath, [cli, "--help"], { encoding: "utf8" });
    assert.equal(help.status, 0, help.stderr);
    assert.match(help.stdout, /--proxy-timeout <number>/);
    assert.match(help.stdout, /默认 30000/);
});

test("--proxy-timeout 非法值在参数解析期拒绝，报错带参数名", () => {
    for (const raw of ["abc", "0", "-1", "1.5", "600001"]) {
        const result = spawnSync(process.execPath, [cli, "serve", "--proxy-timeout", raw], { encoding: "utf8" });
        assert.notEqual(result.status, 0, `--proxy-timeout ${raw} 应被拒绝`);
        assert.match(result.stderr, /--proxy-timeout/, `报错信息应带参数名（输入 ${raw}）`);
        assert.match(result.stderr, /1-600000/);
    }
});

test("serve：缺省空闲超时为 30 秒，--proxy-timeout 可收紧/放宽（慢于收紧值返回 502，放宽后完成）", async () => {
    const delayMs = 1200;
    const { server: backend, port: backendPort } = await startSlowBackend(delayMs);
    const { project, configPath } = makeProject(backendPort);
    const children = [];
    try {
        // 1) 缺省：启动日志打印实际生效值 30000ms（默认），避免为验证默认值真等 30 秒
        const defaultPort = await freePort();
        const defaultChild = spawn(process.execPath, [cli, "serve", "--config", configPath, "--port", String(defaultPort)], { cwd: root, stdio: ["ignore", "pipe", "pipe"] });
        children.push(defaultChild);
        await waitForOutput(defaultChild, "场景测试工作台");
        await waitForOutput(defaultChild, "接口代理空闲超时: 30000ms（默认）");
        // 慢后端（1.2s）在默认 30s 超时下应正常返回
        const defaultResponse = await fetch(`http://127.0.0.1:${defaultPort}/api/slow`);
        assert.equal(defaultResponse.status, 200, "默认 30s 超时不应截断 1.2s 的慢响应");
        assert.equal((await defaultResponse.json()).slow, true);

        // 2) 收紧到 200ms：同一慢后端被空闲超时截断，响应头未发出 → 502
        const tightPort = await freePort();
        const tightChild = spawn(process.execPath, [cli, "serve", "--config", configPath, "--port", String(tightPort), "--proxy-timeout", "200"], { cwd: root, stdio: ["ignore", "pipe", "pipe"] });
        children.push(tightChild);
        await waitForOutput(tightChild, "接口代理空闲超时: 200ms（--proxy-timeout）");
        const tightResponse = await fetch(`http://127.0.0.1:${tightPort}/api/slow`);
        assert.equal(tightResponse.status, 502, "超过 --proxy-timeout 的上游应返回 502");
        assert.match(await tightResponse.text(), /Bad Gateway/);

        // 3) 放宽到 120000ms（验收值）：同一慢后端可完成；与 5000ms 共用同一 timeout 透传路径
        const loosePort = await freePort();
        const looseChild = spawn(process.execPath, [cli, "serve", "--config", configPath, "--port", String(loosePort), "--proxy-timeout", "120000"], { cwd: root, stdio: ["ignore", "pipe", "pipe"] });
        children.push(looseChild);
        await waitForOutput(looseChild, "接口代理空闲超时: 120000ms（--proxy-timeout）");
        const looseResponse = await fetch(`http://127.0.0.1:${loosePort}/api/slow`);
        assert.equal(looseResponse.status, 200, "放宽后的空闲超时应允许慢响应完成");
        assert.equal((await looseResponse.json()).slow, true);

        // 收紧用例的 serve 进程不应因超时分支而退出
        assert.equal(tightChild.exitCode, null, "代理超时后 serve 进程应保持存活");
        assert.doesNotMatch(serveOutput(tightChild), /Uncaught|uncaughtException/);
    } finally {
        for (const child of children) child.kill();
        await new Promise((resolve) => backend.close(resolve));
        fs.rmSync(project, { recursive: true, force: true });
    }
});
