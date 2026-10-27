import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import http from "node:http";
import { spawn } from "node:child_process";
import test from "node:test";

const root = path.resolve(import.meta.dirname, "..");
const cli = path.join(root, "src/cli.js");

function runCli(args, options = {}) {
    return new Promise((resolve, reject) => {
        const child = spawn(process.execPath, [cli, ...args], {
            cwd: options.cwd || root,
            stdio: ["ignore", "pipe", "pipe"],
            env: { ...process.env, ...(options.env || {}) }
        });
        let stdout = "";
        let stderr = "";
        child.stdout.on("data", (chunk) => { stdout += chunk; });
        child.stderr.on("data", (chunk) => { stderr += chunk; });
        child.on("error", reject);
        child.on("close", (code) => resolve({ code, stdout, stderr }));
    });
}

function startBackend(handler) {
    const received = [];
    const server = http.createServer((request, response) => {
        let body = "";
        request.on("data", (chunk) => { body += chunk; });
        request.on("end", () => {
            received.push({ method: request.method, url: request.url, headers: request.headers, body });
            handler(request, response, received.length);
        });
    });
    return new Promise((resolve) => {
        server.listen(0, "127.0.0.1", () => resolve({ server, received, port: server.address().port }));
    });
}

async function freePort() {
    const server = http.createServer();
    await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
    const port = server.address().port;
    await new Promise((resolve) => server.close(resolve));
    return port;
}

function makeProject(entries, options = {}) {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "scenario-test-features-"));
    const scenariosDir = path.join(dir, "scenarios");
    fs.mkdirSync(scenariosDir, { recursive: true });
    for (const entry of entries) {
        fs.writeFileSync(path.join(scenariosDir, `${entry.id}.js`), entry.source, "utf8");
    }
    fs.writeFileSync(path.join(dir, "scenario.config.js"), `ScenarioTest.registerConfig(ScenarioTest.defineConfig({
        envs: ${JSON.stringify(options.envs || [])},
        defaultEnvKey: ${JSON.stringify(options.defaultEnvKey || "")},
        vars: ${JSON.stringify(options.vars || {})},
        scenarios: ${JSON.stringify(entries.map((entry) => ({
            id: entry.id,
            name: entry.name || entry.id,
            url: `scenarios/${entry.id}.js`,
            ...(entry.tags ? { tags: entry.tags } : {}),
            ...(entry.manual ? { manual: true } : {})
        })))}
    }));`, "utf8");
    return dir;
}

function scenarioSource(id, definition) {
    return `ScenarioTest.registerScenario(${JSON.stringify(id)}, ScenarioTest.defineScenario(${JSON.stringify(definition, null, 2)}));`;
}

test("#90 敏感变量：失败 diff、摘要与 --json 均不出现原始密钥", async () => {
    const secret = "sk-live-1234567890";
    const backend = await startBackend((_request, response) => {
        response.writeHead(200, { "Content-Type": "application/json" });
        response.end(JSON.stringify({ echo: secret }));
    });
    const dir = makeProject([{
        id: "secret-case",
        source: scenarioSource("secret-case", {
            name: "密钥回显",
            steps: [{
                name: "调用",
                path: "echo",
                request: { headers: { Authorization: `Bearer {{vars.clientSecret}}` } },
                assertions: [{ name: "回显匹配", path: "echo", equals: "expected-not-secret" }]
            }]
        })
    }], {
        envs: [{ key: "local", name: "本地", baseUrl: `http://127.0.0.1:${backend.port}` }],
        defaultEnvKey: "local",
        vars: { clientSecret: secret }
    });
    try {
        const jsonRun = await runCli(["run", "--config", path.join(dir, "scenario.config.js"), "--scenario", "secret-case", "--json"]);
        assert.equal(jsonRun.code, 1);
        assert.doesNotMatch(jsonRun.stdout, new RegExp(secret), "JSON 输出不得包含原始密钥");
        const payload = JSON.parse(jsonRun.stdout);
        assert.equal(payload.vars.clientSecret, "sk-l...7890");
        assert.doesNotMatch(JSON.stringify(payload), new RegExp(secret));

        const textRun = await runCli(["run", "--config", path.join(dir, "scenario.config.js"), "--scenario", "secret-case"]);
        assert.equal(textRun.code, 1);
        assert.doesNotMatch(textRun.stdout, new RegExp(secret), "文本输出不得包含原始密钥");
        assert.match(textRun.stdout, /sk-l\.\.\.7890/);
        assert.match(textRun.stdout, /expected-not-secret/);
    } finally {
        backend.server.close();
        fs.rmSync(dir, { recursive: true, force: true });
    }
});

test("#71 --bail：首个失败场景后不再执行后续场景，JSON 标注 notRun", async () => {
    const backend = await startBackend((request, response) => {
        response.writeHead(request.url === "/a" ? 500 : 200, { "Content-Type": "application/json" });
        response.end("{}");
    });
    const dir = makeProject([
        { id: "a", source: scenarioSource("a", { name: "A", steps: [{ name: "失败", path: "a" }] }) },
        { id: "b", source: scenarioSource("b", { name: "B", steps: [{ name: "成功", path: "b" }] }) }
    ], {
        envs: [{ key: "local", name: "本地", baseUrl: `http://127.0.0.1:${backend.port}` }],
        defaultEnvKey: "local"
    });
    try {
        const result = await runCli(["run", "--config", path.join(dir, "scenario.config.js"), "--scenario", "a,b", "--bail", "--json"]);
        assert.equal(result.code, 1);
        const payload = JSON.parse(result.stdout);
        assert.equal(payload.scenarios.length, 1);
        assert.equal(payload.scenarios[0].scenarioId, "a");
        assert.equal(payload.notRun.length, 1);
        assert.equal(payload.notRun[0].id, "b");
        assert.deepEqual(backend.received.map((item) => item.url), ["/a"], "b 不应发起请求");

        backend.received.length = 0;
        const withoutBail = await runCli(["run", "--config", path.join(dir, "scenario.config.js"), "--scenario", "a,b", "--json"]);
        assert.equal(withoutBail.code, 1);
        assert.equal(JSON.parse(withoutBail.stdout).scenarios.length, 2);
        assert.deepEqual(backend.received.map((item) => item.url), ["/a", "/b"]);
    } finally {
        backend.server.close();
        fs.rmSync(dir, { recursive: true, force: true });
    }
});

test("#68 --tag：重复参数为 OR，单个参数内逗号为 AND，manual 仍需显式选择", async () => {
    const backend = await startBackend((_request, response) => {
        response.writeHead(200, { "Content-Type": "application/json" });
        response.end("{}");
    });
    const dir = makeProject([
        { id: "smoke", tags: ["smoke"], source: scenarioSource("smoke", { name: "冒烟", steps: [{ name: "s", path: "smoke" }] }) },
        { id: "pay", tags: ["smoke", "pay"], source: scenarioSource("pay", { name: "支付", steps: [{ name: "p", path: "pay" }] }) },
        { id: "regression", tags: ["regression"], source: scenarioSource("regression", { name: "回归", steps: [{ name: "r", path: "regression" }] }) },
        { id: "manual-smoke", tags: ["smoke"], manual: true, source: scenarioSource("manual-smoke", { name: "手动冒烟", steps: [{ name: "m", path: "manual" }] }) }
    ], {
        envs: [{ key: "local", name: "本地", baseUrl: `http://127.0.0.1:${backend.port}` }],
        defaultEnvKey: "local"
    });
    try {
        const idsOf = (stdout) => {
            const payload = JSON.parse(stdout);
            return (payload.scenarios || [payload]).map((item) => item.scenarioId).sort();
        };
        const one = await runCli(["run", "--config", path.join(dir, "scenario.config.js"), "--tag", "smoke", "--json"]);
        assert.equal(one.code, 0);
        assert.deepEqual(idsOf(one.stdout), ["pay", "smoke"]);
        assert.deepEqual(backend.received.map((item) => item.url).sort(), ["/pay", "/smoke"]);

        backend.received.length = 0;
        const and = await runCli(["run", "--config", path.join(dir, "scenario.config.js"), "--tag", "smoke,pay", "--json"]);
        assert.equal(and.code, 0);
        assert.deepEqual(idsOf(and.stdout), ["pay"]);

        backend.received.length = 0;
        const or = await runCli(["run", "--config", path.join(dir, "scenario.config.js"), "--tag", "smoke", "--tag", "regression", "--json"]);
        assert.equal(or.code, 0);
        assert.deepEqual(idsOf(or.stdout), ["pay", "regression", "smoke"]);
    } finally {
        backend.server.close();
        fs.rmSync(dir, { recursive: true, force: true });
    }
});

test("#70 --data：CSV/JSONL 逐行注入变量并聚合结果", async () => {
    const backend = await startBackend((_request, response) => {
        response.writeHead(200, { "Content-Type": "application/json" });
        response.end("{}");
    });
    const dir = makeProject([{
        id: "row",
        source: scenarioSource("row", { name: "按行执行", steps: [{ name: "请求", path: "api/{{vars.id}}" }] })
    }], {
        envs: [{ key: "local", name: "本地", baseUrl: `http://127.0.0.1:${backend.port}` }],
        defaultEnvKey: "local"
    });
    fs.writeFileSync(path.join(dir, "rows.csv"), "id,note\n1,first\n2,second\n", "utf8");
    fs.writeFileSync(path.join(dir, "rows.jsonl"), '{"id":3}\n{"id":4}\n', "utf8");
    try {
        const csv = await runCli(["run", "--config", path.join(dir, "scenario.config.js"), "--scenario", "row", "--data", path.join(dir, "rows.csv"), "--json"]);
        assert.equal(csv.code, 0);
        const csvPayload = JSON.parse(csv.stdout);
        assert.equal(csvPayload.data.rows, 2);
        assert.equal(csvPayload.results.length, 2);
        assert.equal(csvPayload.results[0].vars.note, "first");
        assert.deepEqual(backend.received.map((item) => item.url), ["/api/1", "/api/2"]);

        backend.received.length = 0;
        const jsonl = await runCli(["run", "--config", path.join(dir, "scenario.config.js"), "--scenario", "row", "--data", path.join(dir, "rows.jsonl"), "--json"]);
        assert.equal(jsonl.code, 0);
        assert.equal(JSON.parse(jsonl.stdout).results.length, 2);
        assert.deepEqual(backend.received.map((item) => item.url), ["/api/3", "/api/4"]);
    } finally {
        backend.server.close();
        fs.rmSync(dir, { recursive: true, force: true });
    }
});

test("#69 extract scope:suite：CLI 多场景共享登录 token", async () => {
    const backend = await startBackend((request, response) => {
        response.writeHead(200, { "Content-Type": "application/json" });
        response.end(JSON.stringify({ token: "cli-token-123456" }));
    });
    const dir = makeProject([
        {
            id: "login",
            source: scenarioSource("login", {
                name: "登录",
                steps: [{ name: "登录", path: "login", extract: [{ name: "accessToken", path: "token", scope: "suite" }] }]
            })
        },
        {
            id: "query",
            source: scenarioSource("query", {
                name: "查询",
                steps: [{ name: "查询", path: "query", request: { headers: { Authorization: "Bearer {{vars.accessToken}}" } } }]
            })
        }
    ], {
        envs: [{ key: "local", name: "本地", baseUrl: `http://127.0.0.1:${backend.port}` }],
        defaultEnvKey: "local"
    });
    try {
        const result = await runCli(["run", "--config", path.join(dir, "scenario.config.js"), "--scenario", "login,query", "--json"]);
        assert.equal(result.code, 0);
        const payload = JSON.parse(result.stdout);
        assert.equal(payload.scenarios.length, 2);
        assert.equal(backend.received[1].url, "/query");
        assert.equal(backend.received[1].headers.authorization, "Bearer cli-token-123456");
    } finally {
        backend.server.close();
        fs.rmSync(dir, { recursive: true, force: true });
    }
});

test("#58 envs[].vars：配置 vars < 环境 vars < --vars", async () => {
    const backend = await startBackend((_request, response) => {
        response.writeHead(200, { "Content-Type": "application/json" });
        response.end("{}");
    });
    const dir = makeProject([{
        id: "env-vars",
        source: scenarioSource("env-vars", { name: "环境变量", steps: [{ name: "请求", path: "api/{{vars.tenant}}" }] })
    }], {
        envs: [{ key: "local", name: "本地", baseUrl: `http://127.0.0.1:${backend.port}`, vars: { tenant: "env" } }],
        defaultEnvKey: "local",
        vars: { tenant: "config" }
    });
    try {
        const envRun = await runCli(["run", "--config", path.join(dir, "scenario.config.js"), "--scenario", "env-vars", "--json"]);
        assert.equal(envRun.code, 0);
        assert.deepEqual(backend.received.map((item) => item.url), ["/api/env"]);

        backend.received.length = 0;
        const cliRun = await runCli(["run", "--config", path.join(dir, "scenario.config.js"), "--scenario", "env-vars", "--vars", "tenant=cli", "--json"]);
        assert.equal(cliRun.code, 0);
        assert.deepEqual(backend.received.map((item) => item.url), ["/api/cli"]);
    } finally {
        backend.server.close();
        fs.rmSync(dir, { recursive: true, force: true });
    }
});

test("#57 --junit：失败/跳过映射为 failure/skipped，XML 完整转义", async () => {
    const backend = await startBackend((request, response) => {
        response.writeHead(request.url === "/bad" ? 500 : 200, { "Content-Type": "application/json" });
        response.end(JSON.stringify({ message: "<boom> & \"quoted\"" }));
    });
    const dir = makeProject([{
        id: "junit-case",
        source: scenarioSource("junit-case", {
            name: "JUnit <场景> & 特殊字符",
            steps: [
                { name: "失败 <步骤>", path: "bad" },
                { name: "跳过", path: "skip", when: "{{vars.missing}}", status: 200 }
            ]
        })
    }], {
        envs: [{ key: "local", name: "本地", baseUrl: `http://127.0.0.1:${backend.port}` }],
        defaultEnvKey: "local"
    });
    const junitPath = path.join(dir, "reports", "junit.xml");
    try {
        const result = await runCli(["run", "--config", path.join(dir, "scenario.config.js"), "--scenario", "junit-case", "--junit", junitPath, "--json"]);
        assert.equal(result.code, 1);
        const xml = fs.readFileSync(junitPath, "utf8");
        assert.match(xml, /^<\?xml version="1\.0" encoding="UTF-8"\?>/);
        assert.match(xml, /<testsuites name="scenario-test" tests="2" failures="1" skipped="1"/);
        assert.match(xml, /<failure message="/);
        assert.match(xml, /<skipped message="/);
        assert.match(xml, /失败 &lt;步骤&gt;/);
        assert.doesNotMatch(xml, /<boom>/);
    } finally {
        backend.server.close();
        fs.rmSync(dir, { recursive: true, force: true });
    }
});

test("#72 --proxy-timeout：非法值报错，合法值透传；超时语义保持 502", async () => {
    const backend = await startBackend((_request, response) => {
        setTimeout(() => {
            response.writeHead(200, { "Content-Type": "application/json" });
            response.end("{}");
        }, 400);
    });
    const dir = makeProject([], {
        envs: [{ key: "slow", name: "慢", baseUrl: `http://127.0.0.1:${backend.port}` }],
        defaultEnvKey: "slow"
    });
    fs.writeFileSync(path.join(dir, "index.html"), "<!doctype html><title>x</title>", "utf8");
    const invalid = await runCli(["serve", "--config", path.join(dir, "scenario.config.js"), "--proxy-timeout", "0"]);
    assert.equal(invalid.code, 1);
    assert.match(invalid.stderr, /--proxy-timeout/);
    assert.match(invalid.stderr, /毫秒/);

    const startServe = async (timeout) => {
        const port = await freePort();
        const child = spawn(process.execPath, [cli, "serve", "--config", path.join(dir, "scenario.config.js"), "--port", String(port), "--proxy-timeout", String(timeout)], { cwd: root, stdio: ["ignore", "pipe", "pipe"] });
        await new Promise((resolve, reject) => {
            const timer = setTimeout(() => reject(new Error("serve 启动超时")), 10000);
            child.stdout.on("data", (chunk) => {
                if (String(chunk).includes("场景测试工作台")) { clearTimeout(timer); resolve(); }
            });
            child.on("exit", (code) => reject(new Error(`serve 提前退出: ${code}`)));
        });
        return { child, port };
    };
    try {
        const fast = await startServe(150);
        const timedOut = await fetch(`http://127.0.0.1:${fast.port}/api/slow`);
        assert.equal(timedOut.status, 502);
        fast.child.kill();

        const slow = await startServe(1200);
        const ok = await fetch(`http://127.0.0.1:${slow.port}/api/slow`);
        assert.equal(ok.status, 200);
        slow.child.kill();
    } finally {
        backend.server.close();
        fs.rmSync(dir, { recursive: true, force: true });
    }
});
