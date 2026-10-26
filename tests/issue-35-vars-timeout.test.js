import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { buildCapabilities, CONTRACT_VERSION, contract, renderCapabilitiesText } from "../src/index.js";

// 隔离宿主 SCENARIO_* 变量，避免外部授权/全局参数/响应体开关影响子进程断言
for (const key of Object.keys(process.env)) {
    if (key.toUpperCase().startsWith("SCENARIO_")) delete process.env[key];
}

const cli = path.resolve(import.meta.dirname, "../src/cli.js");

function runCli(args) {
    return new Promise((resolve, reject) => {
        const child = spawn(process.execPath, [cli, ...args], { stdio: ["ignore", "pipe", "pipe"] });
        let stdout = "";
        let stderr = "";
        child.stdout.setEncoding("utf8");
        child.stderr.setEncoding("utf8");
        child.stdout.on("data", (chunk) => { stdout += chunk; });
        child.stderr.on("data", (chunk) => { stderr += chunk; });
        child.on("error", reject);
        child.on("close", (code) => resolve({ code, stdout, stderr }));
    });
}

async function withServer(handler, run) {
    const server = http.createServer(handler);
    await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
    try {
        return await run(server.address().port);
    } finally {
        await new Promise((resolve) => server.close(resolve));
    }
}

test("contract v14 与 --help 投射 --vars/--timeout/--cookie-jar", () => {
    assert.equal(CONTRACT_VERSION, 14);
    assert.equal(contract.cli.options.vars.kind, "value");
    assert.equal(contract.cli.options.vars.repeatable, true);
    assert.match(contract.cli.options.vars.description, /key=value/);
    assert.equal(contract.cli.options.timeout.kind, "value");
    assert.equal(contract.cli.options.timeout.parse, "number");
    assert.equal(contract.cli.options["cookie-jar"].kind, "flag");
    assert.match(contract.cli.options["cookie-jar"].description, /Cookie Jar/);

    // capabilities JSON/文本同样从 contract 投射新选项（含 repeatable 元数据）
    const capabilities = buildCapabilities(contract);
    assert.equal(capabilities.cli.options.vars.repeatable, true);
    assert.equal(capabilities.cli.options.timeout.parse, "number");
    assert.equal(capabilities.cli.options["cookie-jar"].kind, "flag");
    const capabilitiesText = renderCapabilitiesText(capabilities);
    assert.match(capabilitiesText, /--vars/);
    assert.match(capabilitiesText, /--timeout/);
    assert.match(capabilitiesText, /--cookie-jar/);

    const result = spawnSync(process.execPath, [cli, "--help"], { encoding: "utf8" });
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /--vars <value>/);
    assert.match(result.stdout, /key=value/);
    assert.match(result.stdout, /--timeout <number>/);
    assert.match(result.stdout, /--cookie-jar/);
});

test("--vars 覆盖配置 vars、多组叠加、模板值解析，并可满足 required 变量", async () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), "scenario-test-issue35-vars-"));
    try {
        await withServer((request, response) => {
            response.writeHead(200, { "Content-Type": "application/json" });
            response.end(JSON.stringify({
                token: request.headers["x-token"],
                tenant: request.headers["x-tenant"],
                multi: request.headers["x-multi"],
                multiB: request.headers["x-multi-b"],
                alias: request.headers["x-alias"],
                requiredToken: request.headers["x-required-token"]
            }));
        }, async (port) => {
            fs.mkdirSync(path.join(directory, "scenarios"));
            fs.writeFileSync(path.join(directory, "scenario.config.js"), `ScenarioTest.registerConfig(ScenarioTest.defineConfig({
                envs: [{ key: "mock", name: "Mock", baseUrl: "http://127.0.0.1:${port}" }],
                vars: { token: "config-token", tenant: "config-tenant", base: "config-base" },
                variables: [{ name: "requiredToken", required: true }],
                requestTimeoutMs: 10000,
                scenarios: [{ id: "vars", name: "Vars", url: "scenarios/vars.js" }]
            }));`, "utf8");
            fs.writeFileSync(path.join(directory, "scenarios/vars.js"), `ScenarioTest.registerScenario("vars", ScenarioTest.defineScenario({
                name: "Vars",
                steps: [{
                    name: "回显注入变量",
                    path: "echo",
                    status: 200,
                    request: { headers: {
                        "X-Token": "{{vars.token}}",
                        "X-Tenant": "{{vars.tenant}}",
                        "X-Multi": "{{vars.a}}",
                        "X-Multi-B": "{{vars.b}}",
                        "X-Alias": "{{vars.alias}}",
                        "X-Required-Token": "{{vars.requiredToken}}"
                    } },
                    assertions: [
                        { path: "token", equals: "cli-token" },
                        { path: "tenant", equals: "cli-tenant" },
                        { path: "multi", equals: "A" },
                        { path: "multiB", equals: "B" },
                        { path: "alias", equals: "config-base-cli" },
                        { path: "requiredToken", equals: "from-cli" }
                    ]
                }]
            }));`, "utf8");

            const result = await runCli([
                "run",
                "--config", path.join(directory, "scenario.config.js"),
                "--scenario", "vars",
                "--vars", "token=cli-token",
                "--vars", "tenant=cli-tenant",
                "--vars", "a=A",
                "--vars", "b=B",
                "--vars", "alias={{vars.base}}-cli",
                "--vars", "requiredToken=from-cli"
            ]);
            assert.equal(result.code, 0, result.stderr);
            assert.match(result.stdout, /\[PASS\] 回显注入变量/);
            assert.match(result.stdout, /Overall: 1\/1 passed/);

            // 保留变量复用引擎 assertNoReservedVars：命令行注入也不能覆盖 runId
            const reserved = await runCli([
                "run",
                "--config", path.join(directory, "scenario.config.js"),
                "--scenario", "vars",
                "--vars", "requiredToken=from-cli",
                "--vars", "runId=forged"
            ]);
            assert.notEqual(reserved.code, 0);
            assert.match(reserved.stderr, /保留变量/);
        });
    } finally {
        fs.rmSync(directory, { recursive: true, force: true });
    }
});

test("--vars 非法格式与 --timeout 非法值给出示例错误", async () => {
    const invalidVars = await runCli(["--vars", "missing-separator"]);
    assert.notEqual(invalidVars.code, 0);
    assert.match(invalidVars.stderr, /--vars 需要 key=value 格式/);
    assert.match(invalidVars.stderr, /示例：--vars tenant=test/);

    const invalidTimeout = await runCli(["--timeout", "0"]);
    assert.notEqual(invalidTimeout.code, 0);
    assert.match(invalidTimeout.stderr, /--timeout 必须是大于 0 的毫秒数/);
});

test("--timeout 覆盖配置 requestTimeoutMs，短超时使慢响应返回 TIMEOUT", async () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), "scenario-test-issue35-timeout-"));
    try {
        await withServer((request, response) => {
            // 慢响应：配置宽容（10s），只有 --timeout 覆盖后才会在完成前触发超时
            setTimeout(() => {
                response.writeHead(200, { "Content-Type": "application/json" });
                response.end(JSON.stringify({ ready: true }));
            }, 500);
        }, async (port) => {
            fs.mkdirSync(path.join(directory, "scenarios"));
            fs.writeFileSync(path.join(directory, "scenario.config.js"), `ScenarioTest.registerConfig(ScenarioTest.defineConfig({
                envs: [{ key: "mock", name: "Mock", baseUrl: "http://127.0.0.1:${port}" }],
                requestTimeoutMs: 10000,
                scenarios: [{ id: "slow", name: "Slow", url: "scenarios/slow.js" }]
            }));`, "utf8");
            fs.writeFileSync(path.join(directory, "scenarios/slow.js"), `ScenarioTest.registerScenario("slow", ScenarioTest.defineScenario({
                name: "Slow",
                steps: [{ name: "慢响应", path: "slow", status: 200 }]
            }));`, "utf8");

            const startedAt = Date.now();
            const result = await runCli([
                "run",
                "--config", path.join(directory, "scenario.config.js"),
                "--scenario", "slow",
                "--timeout", "60"
            ]);
            const elapsed = Date.now() - startedAt;
            assert.notEqual(result.code, 0);
            assert.match(result.stdout, /\[FAIL\] 慢响应/);
            assert.match(result.stdout, /TIMEOUT/);
            assert.ok(elapsed < 800, `短超时应快速中断，实际耗时 ${elapsed}ms`);
        });
    } finally {
        fs.rmSync(directory, { recursive: true, force: true });
    }
});
