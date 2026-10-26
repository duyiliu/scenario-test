import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import http from "node:http";
import https from "node:https";
import { spawn, spawnSync } from "node:child_process";
import test from "node:test";
import { createEngine, defineScenario } from "../src/index.js";

const root = path.resolve(import.meta.dirname, "..");
const cli = path.join(root, "src/cli.js");

// openssl 能力探测：仅用于可选的 https 端到端转发用例
function hasOpenSsl() {
    try {
        const probe = spawnSync("openssl", ["version"], { stdio: "ignore", timeout: 5000 });
        return probe.status === 0;
    } catch {
        return false;
    }
}

function startMockBackend() {
    const received = [];
    const server = http.createServer((request, response) => {
        received.push({ method: request.method, url: request.url, headers: request.headers });
        let body = "";
        request.on("data", (chunk) => { body += chunk; });
        request.on("end", () => {
            response.writeHead(200, { "Content-Type": "application/json" });
            response.end(JSON.stringify({ method: request.method, url: request.url, body }));
        });
    });
    return new Promise((resolve) => {
        server.listen(0, "127.0.0.1", () => resolve({ server, received, port: server.address().port }));
    });
}

// 每个 serve 子进程维护一份累积输出缓冲：多行日志可能同 chunk 到达，
// 逐次独立监听会错过已被上一个 waitForOutput 消费掉的 chunk
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
        const timer = setTimeout(() => finish(reject, new Error("serve 启动超时")), 10000);
        const onData = () => {
            if (bufferOf().includes(pattern)) finish(resolve);
        };
        const onExit = (code) => finish(reject, new Error(`serve 提前退出: ${code}`));
        child.stdout.on("data", onData);
        child.on("exit", onExit);
    });
}

async function freePort() {
    const server = http.createServer();
    await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
    const port = server.address().port;
    await new Promise((resolve) => server.close(resolve));
    return port;
}

test("serve 同源代理：非静态请求转发到环境 baseUrl，静态文件优先", async () => {
    const { server: mock, received, port: mockPort } = await startMockBackend();
    const project = fs.mkdtempSync(path.join(os.tmpdir(), "scenario-test-serve-"));
    const dir = path.join(project, "scenario-test");
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, "scenario.config.js"), `ScenarioTest.registerConfig(ScenarioTest.defineConfig({
        envs: [{ key: "local", name: "本地", baseUrl: "http://127.0.0.1:${mockPort}" }],
        defaultEnvKey: "local",
        scenarios: []
    }));`, "utf8");
    fs.writeFileSync(path.join(dir, "index.html"), "<!doctype html><title>scenario</title>", "utf8");

    const servePort = await freePort();
    const child = spawn(process.execPath, [cli, "serve", "--config", path.join(dir, "scenario.config.js"), "--port", String(servePort)], { cwd: root, stdio: ["ignore", "pipe", "pipe"] });
    try {
        await waitForOutput(child, "场景测试工作台");
        // 日志必须打印实际生效的环境 key（而非用户输入），避免误导代理目标
        await waitForOutput(child, "接口代理: local -> ");

        const proxyResponse = await fetch(`http://127.0.0.1:${servePort}/api/health`, {
            method: "POST",
            headers: { "Content-Type": "text/plain" },
            body: "ping"
        });
        assert.equal(proxyResponse.status, 200);
        const payload = await proxyResponse.json();
        assert.equal(payload.method, "POST");
        assert.equal(payload.url, "/api/health");
        assert.equal(payload.body, "ping");
        assert.equal(received.length, 1, "mock 后端应收到代理请求");
        assert.equal(received[0].method, "POST");

        // 静态文件优先：根路径返回 index.html 而非代理
        const pageResponse = await fetch(`http://127.0.0.1:${servePort}/`);
        assert.equal(pageResponse.status, 200);
        const page = await pageResponse.text();
        assert.match(page, /<title>scenario<\/title>/);
        assert.match(page, /window\.__SCENARIO_TEST_SERVE_PROXY__ = true/, "serve 页面应注入同源代理模式标记");
        assert.equal(received.length, 1, "静态请求不应转发到 mock 后端");

        // 静态文件未命中时按同源请求代理转发（路径原样传给后端）
        const proxied = await fetch(`http://127.0.0.1:${servePort}/api/orders/42`);
        assert.equal(proxied.status, 200);
        const proxiedPayload = await proxied.json();
        assert.equal(proxiedPayload.url, "/api/orders/42");
        assert.equal(received.length, 2, "未命中静态文件时应代理转发");
    } finally {
        child.kill();
        mock.close();
        fs.rmSync(project, { recursive: true, force: true });
    }
});

test("serve：环境 baseUrl 为纯空白时回退顶层 baseUrl，doctor 同口径 PASS", async () => {
    const { server: mock, received, port: mockPort } = await startMockBackend();
    const project = fs.mkdtempSync(path.join(os.tmpdir(), "scenario-test-serve-top-fallback-"));
    const dir = path.join(project, "scenario-test");
    fs.mkdirSync(dir, { recursive: true });
    const configPath = path.join(dir, "scenario.config.js");
    fs.writeFileSync(configPath, `ScenarioTest.registerConfig(ScenarioTest.defineConfig({
        baseUrl: "http://127.0.0.1:${mockPort}",
        envs: [
            { key: "local", name: "本地", baseUrl: "   " },
            { key: "switched", name: "切换环境", baseUrl: "   " }
        ],
        defaultEnvKey: "local",
        scenarios: []
    }));`, "utf8");
    fs.writeFileSync(path.join(dir, "index.html"), "<!doctype html><title>scenario</title>", "utf8");

    // doctor 与 serve 必须使用同一条回退规则：环境缺省 baseUrl 时回退顶层 baseUrl
    const doctorResult = spawnSync(process.execPath, [cli, "doctor", "--config", configPath, "--json"], { encoding: "utf8" });
    const doctorReport = JSON.parse(doctorResult.stdout);
    const baseUrlCheck = doctorReport.checks.find((check) => check.name === "base-url");
    assert.ok(baseUrlCheck, "doctor 应输出 base-url 检查项");
    assert.equal(baseUrlCheck.status, "PASS");
    assert.match(baseUrlCheck.message, /回退顶层 baseUrl/);

    const servePort = await freePort();
    const child = spawn(process.execPath, [cli, "serve", "--config", configPath, "--port", String(servePort)], { cwd: root, stdio: ["ignore", "pipe", "pipe"] });
    try {
        await waitForOutput(child, "场景测试工作台");
        await waitForOutput(child, `接口代理: local -> http://127.0.0.1:${mockPort}`);
        const response = await fetch(`http://127.0.0.1:${servePort}/api/top-level-fallback`);
        assert.equal(response.status, 200);
        assert.equal(received.length, 1, "代理请求应到达顶层 baseUrl 指定的上游");
        assert.equal(received[0].url, "/api/top-level-fallback");

        // 切换到另一个同样未声明 baseUrl 的环境：仍按请求头实时回退顶层 baseUrl
        const switched = await fetch(`http://127.0.0.1:${servePort}/api/switched-fallback`, {
            headers: { "X-Scenario-Test-Env": "switched" }
        });
        assert.equal(switched.status, 200);
        assert.equal(received.length, 2, "切换环境后仍应回退顶层 baseUrl");
        assert.equal(received[1].url, "/api/switched-fallback");
    } finally {
        child.kill();
        mock.close();
        fs.rmSync(project, { recursive: true, force: true });
    }
});

test("serve：端口占用时友好退出，不输出未处理异常", async () => {
    const project = fs.mkdtempSync(path.join(os.tmpdir(), "scenario-test-serve-port-"));
    const configPath = path.join(project, "scenario.config.js");
    fs.writeFileSync(configPath, `ScenarioTest.registerConfig(ScenarioTest.defineConfig({baseUrl:"http://127.0.0.1:1",scenarios:[]}));`, "utf8");
    const occupied = http.createServer();
    await new Promise((resolve) => occupied.listen(0, "127.0.0.1", resolve));
    const port = occupied.address().port;
    try {
        const result = await new Promise((resolve, reject) => {
            const child = spawn(process.execPath, [cli, "serve", "--config", configPath, "--port", String(port)], { cwd: root, stdio: ["ignore", "pipe", "pipe"] });
            let stderr = "";
            child.stderr.on("data", (chunk) => { stderr += chunk; });
            child.on("error", reject);
            child.on("close", (code) => resolve({ code, stderr }));
        });
        assert.equal(result.code, 1);
        assert.match(result.stderr, new RegExp(`错误：端口 ${port} 已被占用`));
        assert.match(result.stderr, /提示：请使用 --port <其他空闲端口> 指定端口后重试；或双击 start-scenario-test\.cmd 重新申请空闲端口。/);
        assert.doesNotMatch(result.stderr, /请重新启动以获取新的随机端口/);
        assert.doesNotMatch(result.stderr, /Unhandled/);
    } finally {
        await new Promise((resolve) => occupied.close(resolve));
        fs.rmSync(project, { recursive: true, force: true });
    }
});

test("serve：代理目标不可达时返回 502", async () => {
    const project = fs.mkdtempSync(path.join(os.tmpdir(), "scenario-test-serve-down-"));
    const dir = path.join(project, "scenario-test");
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, "scenario.config.js"), `ScenarioTest.registerConfig(ScenarioTest.defineConfig({
        envs: [{ key: "local", name: "本地", baseUrl: "http://127.0.0.1:1" }],
        defaultEnvKey: "local",
        scenarios: []
    }));`, "utf8");

    const servePort = await freePort();
    const child = spawn(process.execPath, [cli, "serve", "--config", path.join(dir, "scenario.config.js"), "--port", String(servePort)], { cwd: root, stdio: ["ignore", "pipe", "pipe"] });
    try {
        await waitForOutput(child, "场景测试工作台");
        const response = await fetch(`http://127.0.0.1:${servePort}/api/anything`);
        assert.equal(response.status, 502);
    } finally {
        child.kill();
        fs.rmSync(project, { recursive: true, force: true });
    }
});

test("serve 代理响应方向剔除 hop-by-hop 头", async () => {
    const mock = http.createServer((request, response) => {
        response.writeHead(200, {
            "Content-Type": "application/json",
            "Keep-Alive": "timeout=99",
            "Proxy-Authenticate": 'Basic realm="scenario"',
            "Upgrade": "websocket"
        });
        response.end(JSON.stringify({ ok: true }));
    });
    await new Promise((resolve) => mock.listen(0, "127.0.0.1", resolve));
    const mockPort = mock.address().port;

    const project = fs.mkdtempSync(path.join(os.tmpdir(), "scenario-test-serve-hop-"));
    const dir = path.join(project, "scenario-test");
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, "scenario.config.js"), `ScenarioTest.registerConfig(ScenarioTest.defineConfig({
        envs: [{ key: "local", name: "本地", baseUrl: "http://127.0.0.1:${mockPort}" }],
        defaultEnvKey: "local",
        scenarios: []
    }));`, "utf8");

    const servePort = await freePort();
    const child = spawn(process.execPath, [cli, "serve", "--config", path.join(dir, "scenario.config.js"), "--port", String(servePort)], { cwd: root, stdio: ["ignore", "pipe", "pipe"] });
    try {
        await waitForOutput(child, "场景测试工作台");
        const response = await fetch(`http://127.0.0.1:${servePort}/api/hop`);
        assert.equal(response.status, 200);
        // 上游返回的 hop-by-hop 头不得透传给浏览器（Keep-Alive 除外：
        // 它是 Node 服务器对 keep-alive 连接自行追加的连接管理头，非上游透传，值恒为 timeout=5）
        assert.equal(response.headers.get("proxy-authenticate"), null, "Proxy-Authenticate 是 hop-by-hop 头，不应透传");
        assert.equal(response.headers.get("upgrade"), null, "Upgrade 是 hop-by-hop 头，不应透传");
        // 普通实体头正常透传
        assert.match(response.headers.get("content-type"), /application\/json/);
        const payload = await response.json();
        assert.equal(payload.ok, true);
    } finally {
        child.kill();
        mock.close();
        fs.rmSync(project, { recursive: true, force: true });
    }
});

// 崩溃回归：历史上 proxyRequest 用 http.request 转发 https 目标会在 fs.stat 回调里
// 同步抛 ERR_INVALID_PROTOCOL（uncaughtException），serve 进程整体退出、浏览器侧 ECONNRESET。
// 现在必须：识别 https 协议、失败降级 502、进程保持存活。
test("serve：https 上游不再崩溃，连接失败返回 502 且进程存活", async () => {
    const project = fs.mkdtempSync(path.join(os.tmpdir(), "scenario-test-serve-https-"));
    const dir = path.join(project, "scenario-test");
    fs.mkdirSync(dir, { recursive: true });
    // https 指向无监听端口：协议可识别但连接被拒，应走 upstream error 分支返回 502
    fs.writeFileSync(path.join(dir, "scenario.config.js"), `ScenarioTest.registerConfig(ScenarioTest.defineConfig({
        envs: [{ key: "cloud", name: "云端", baseUrl: "https://127.0.0.1:1" }],
        defaultEnvKey: "cloud",
        scenarios: []
    }));`, "utf8");
    fs.writeFileSync(path.join(dir, "index.html"), "<!doctype html><title>scenario</title>", "utf8");

    const servePort = await freePort();
    const child = spawn(process.execPath, [cli, "serve", "--config", path.join(dir, "scenario.config.js"), "--port", String(servePort)], { cwd: root, stdio: ["ignore", "pipe", "pipe"] });
    let exited = null;
    child.on("exit", (code) => { exited = code; });
    try {
        await waitForOutput(child, "场景测试工作台");
        const response = await fetch(`http://127.0.0.1:${servePort}/api/health`);
        assert.equal(response.status, 502, "https 上游连接失败应返回 502 而非连接重置");
        await new Promise((resolve) => setTimeout(resolve, 200));
        assert.equal(exited, null, `serve 进程不应退出（实际退出码 ${exited}）`);
        // 进程存活验证：静态页面仍可访问
        const stillAlive = await fetch(`http://127.0.0.1:${servePort}/index.html`);
        assert.equal(stillAlive.status, 200, "代理失败后 serve 应继续提供静态页面");
    } finally {
        child.kill();
        fs.rmSync(project, { recursive: true, force: true });
    }
});

// 崩溃回归：无协议代理目标（如内网手滑写 "192.168.1.5:8080"）历史上同步抛
// ERR_INVALID_URL 导致 serve 进程退出。配置文件里的非法 baseUrl 现已由 defineConfig
// 定义期拒绝，因此这里用 --base-url 覆盖进入同一代理路径，仍须降级 502 并保持存活。
test("serve：无协议 --base-url 不再崩溃，返回 502 且进程存活", async () => {
    const project = fs.mkdtempSync(path.join(os.tmpdir(), "scenario-test-serve-noproto-"));
    const dir = path.join(project, "scenario-test");
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, "scenario.config.js"), `ScenarioTest.registerConfig(ScenarioTest.defineConfig({
        envs: [{ key: "lan", name: "内网", baseUrl: "http://127.0.0.1:1" }],
        defaultEnvKey: "lan",
        scenarios: []
    }));`, "utf8");
    fs.writeFileSync(path.join(dir, "index.html"), "<!doctype html><title>scenario</title>", "utf8");

    const servePort = await freePort();
    const child = spawn(process.execPath, [cli, "serve", "--config", path.join(dir, "scenario.config.js"), "--base-url", "192.168.1.5:8080", "--port", String(servePort)], { cwd: root, stdio: ["ignore", "pipe", "pipe"] });
    let exited = null;
    child.on("exit", (code) => { exited = code; });
    try {
        await waitForOutput(child, "场景测试工作台");
        const response = await fetch(`http://127.0.0.1:${servePort}/api/health`);
        assert.equal(response.status, 502, "无协议 baseUrl 应返回 502 而非连接重置");
        const body = await response.text();
        assert.match(body, /baseUrl/, "502 提示应指向 baseUrl 配置问题");
        await new Promise((resolve) => setTimeout(resolve, 200));
        assert.equal(exited, null, `serve 进程不应退出（实际退出码 ${exited}）`);
    } finally {
        child.kill();
        fs.rmSync(project, { recursive: true, force: true });
    }
});

// 端到端 https 转发：依赖本机 openssl 生成自签证书，无 openssl 时跳过（不崩溃回归已由上一条覆盖）
test("serve：https 上游端到端转发（需 openssl，自签证书容忍）", { skip: !hasOpenSsl() }, async () => {
    const project = fs.mkdtempSync(path.join(os.tmpdir(), "scenario-test-serve-tls-"));
    try {
        const keyFile = path.join(project, "key.pem");
        const certFile = path.join(project, "cert.pem");
        // Windows 发行版 openssl 常缺失默认 openssl.cnf；空配置可绕过（自签参数全在命令行）
        const emptyConf = path.join(project, "openssl-empty.cnf");
        fs.writeFileSync(emptyConf, "", "utf8");
        const openssl = spawnSync("openssl", ["req", "-x509", "-newkey", "rsa:2048", "-nodes",
            "-keyout", keyFile, "-out", certFile, "-days", "1", "-subj", "/CN=127.0.0.1"], {
            stdio: "ignore",
            env: { ...process.env, OPENSSL_CONF: emptyConf }
        });
        if (openssl.status !== 0) {
            // MSYS openssl 1.1 对 OPENSSL_CONF 指向空文件仍可能报错
            console.error(`openssl 自签失败(status=${openssl.status})，跳过 https 端到端用例`);
            return; // skip 而非 fail：环境缺 openssl.cnf 支持不属产品缺陷
        }

        const received = [];
        const mock = https.createServer({ key: fs.readFileSync(keyFile), cert: fs.readFileSync(certFile) }, (request, response) => {
            received.push(request.url);
            response.writeHead(200, { "Content-Type": "application/json" });
            response.end(JSON.stringify({ url: request.url, tls: true }));
        });
        await new Promise((resolve) => mock.listen(0, "127.0.0.1", resolve));
        const mockPort = mock.address().port;

        const dir = path.join(project, "scenario-test");
        fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(path.join(dir, "scenario.config.js"), `ScenarioTest.registerConfig(ScenarioTest.defineConfig({
            envs: [{ key: "cloud", name: "云端", baseUrl: "https://127.0.0.1:${mockPort}" }],
            defaultEnvKey: "cloud",
            scenarios: []
        }));`, "utf8");

        const servePort = await freePort();
        const child = spawn(process.execPath, [cli, "serve", "--config", path.join(dir, "scenario.config.js"), "--port", String(servePort)], { cwd: root, stdio: ["ignore", "pipe", "pipe"] });
        try {
            await waitForOutput(child, "场景测试工作台");
            const response = await fetch(`http://127.0.0.1:${servePort}/api/tls-check`);
            const responseText = await response.text();
            assert.equal(response.status, 200, `https 端到端转发应成功: ${responseText}`);
            const payload = JSON.parse(responseText);
            assert.equal(payload.url, "/api/tls-check");
            assert.equal(payload.tls, true);
            assert.equal(received.length, 1, "https mock 后端应收到代理请求");
        } finally {
            child.kill();
            await new Promise((resolve) => mock.close(resolve));
        }
    } finally {
        fs.rmSync(project, { recursive: true, force: true });
    }
});
test("serve：--env 指定未知环境时报错退出，不静默回退 envs[0]", async () => {
    const { server: mock, port: mockPort } = await startMockBackend();
    const project = fs.mkdtempSync(path.join(os.tmpdir(), "scenario-test-serve-env-"));
    const dir = path.join(project, "scenario-test");
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, "scenario.config.js"), `ScenarioTest.registerConfig(ScenarioTest.defineConfig({
        envs: [
            { key: "local", name: "本地", baseUrl: "http://127.0.0.1:${mockPort}" },
            { key: "prod", name: "生产", baseUrl: "http://127.0.0.1:1" }
        ],
        defaultEnvKey: "local",
        scenarios: []
    }));`, "utf8");

    try {
        const servePort = await freePort();
        const result = await new Promise((resolve, reject) => {
            const child = spawn(process.execPath, [cli, "serve", "--config", path.join(dir, "scenario.config.js"), "--env", "prod-typo", "--port", String(servePort)], { cwd: root, stdio: ["ignore", "pipe", "pipe"] });
            let stderr = "";
            // 看门狗：若修复被回退（未知环境静默回退 envs[0]），serve 会一直存活而 close 永不触发，
            // 没有超时保护时表现为整个测试文件挂死而非快速失败
            const timer = setTimeout(() => {
                child.kill();
                reject(new Error("未知环境用例超时：serve 未按预期退出（可能静默回退了 envs[0]）"));
            }, 10000);
            child.stderr.on("data", (chunk) => { stderr += chunk; });
            child.on("error", reject);
            child.on("close", (code) => {
                clearTimeout(timer);
                resolve({ code, stderr });
            });
        });
        assert.equal(result.code, 1, "未知环境应导致非零退出码");
        assert.match(result.stderr, /未找到环境 prod-typo/);
        assert.match(result.stderr, /可用值: local, prod/);
    } finally {
        mock.close();
        fs.rmSync(project, { recursive: true, force: true });
    }
});

test("serve：Host 头非本机回环时返回 403，阻断 DNS rebinding 读取面", async () => {
    const project = fs.mkdtempSync(path.join(os.tmpdir(), "scenario-test-serve-host-"));
    const dir = path.join(project, "scenario-test");
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, "scenario.config.js"), `ScenarioTest.registerConfig(ScenarioTest.defineConfig({
        envs: [{ key: "local", name: "本地", baseUrl: "http://127.0.0.1:1" }],
        defaultEnvKey: "local",
        scenarios: []
    }));`, "utf8");
    fs.writeFileSync(path.join(dir, "scenario.config.js.bak"), "TOKEN=secret", "utf8");

    const servePort = await freePort();
    const child = spawn(process.execPath, [cli, "serve", "--config", path.join(dir, "scenario.config.js"), "--port", String(servePort)], { cwd: root, stdio: ["ignore", "pipe", "pipe"] });
    try {
        await waitForOutput(child, "场景测试工作台");

        const requestWithHost = (hostHeader) => new Promise((resolve, reject) => {
            const request = http.request(
                { host: "127.0.0.1", port: servePort, path: "/scenario.config.js.bak", headers: { Host: hostHeader } },
                (response) => {
                    response.resume();
                    response.on("end", () => resolve(response.statusCode));
                }
            );
            request.on("error", reject);
            request.end();
        });

        assert.equal(await requestWithHost("attacker.example.com"), 403, "伪造 Host（DNS rebinding）应被拒绝");
        assert.equal(await requestWithHost("attacker.example.com:443"), 403);
        // 正常回环 Host（浏览器同源访问形态）不受影响
        assert.equal(await requestWithHost(`127.0.0.1:${servePort}`), 200);
        assert.equal(await requestWithHost(`localhost:${servePort}`), 200);
    } finally {
        child.kill();
        fs.rmSync(project, { recursive: true, force: true });
    }
});

test("serve 代理双向剔除 Connection 头点名的自定义字段（RFC 7230 §6.1）", async () => {
    let sawRequestHopHeader = "unset";
    const mock = http.createServer((request, response) => {
        sawRequestHopHeader = request.headers["x-req-hop"] === undefined ? null : request.headers["x-req-hop"];
        response.writeHead(200, { "Content-Type": "application/json", "Connection": "X-Custom-Hop", "X-Custom-Hop": "leak" });
        response.end("{}");
    });
    await new Promise((resolve) => mock.listen(0, "127.0.0.1", resolve));
    const mockPort = mock.address().port;

    const project = fs.mkdtempSync(path.join(os.tmpdir(), "scenario-test-serve-conn-"));
    const dir = path.join(project, "scenario-test");
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, "scenario.config.js"), `ScenarioTest.registerConfig(ScenarioTest.defineConfig({
        envs: [{ key: "local", name: "本地", baseUrl: "http://127.0.0.1:${mockPort}" }],
        defaultEnvKey: "local",
        scenarios: []
    }));`, "utf8");

    const servePort = await freePort();
    const child = spawn(process.execPath, [cli, "serve", "--config", path.join(dir, "scenario.config.js"), "--port", String(servePort)], { cwd: root, stdio: ["ignore", "pipe", "pipe"] });
    try {
        await waitForOutput(child, "场景测试工作台");
        const result = await new Promise((resolve, reject) => {
            const request = http.request(
                { host: "127.0.0.1", port: servePort, path: "/api/hop", headers: { "Connection": "X-Req-Hop", "X-Req-Hop": "1" } },
                (response) => {
                    response.resume();
                    response.on("end", () => resolve({ status: response.statusCode, hop: response.headers["x-custom-hop"] ?? null }));
                }
            );
            request.on("error", reject);
            request.end();
        });
        assert.equal(result.status, 200);
        assert.equal(result.hop, null, "响应方向：Connection 点名的字段不应透传给浏览器");
        assert.equal(sawRequestHopHeader, null, "请求方向：Connection 点名的字段不应转发给上游");
    } finally {
        child.kill();
        await new Promise((resolve) => mock.close(resolve));
        fs.rmSync(project, { recursive: true, force: true });
    }
});

test("serve：--base-url 临时覆盖代理目标并在日志中标注", async () => {
    const { server: mock, received, port: mockPort } = await startMockBackend();
    const project = fs.mkdtempSync(path.join(os.tmpdir(), "scenario-test-serve-override-"));
    const dir = path.join(project, "scenario-test");
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, "scenario.config.js"), `ScenarioTest.registerConfig(ScenarioTest.defineConfig({
        envs: [{ key: "local", name: "本地", baseUrl: "http://127.0.0.1:1" }],
        defaultEnvKey: "local",
        scenarios: []
    }));`, "utf8");

    const servePort = await freePort();
    const child = spawn(process.execPath, [cli, "serve", "--config", path.join(dir, "scenario.config.js"), "--base-url", `http://127.0.0.1:${mockPort}`, "--port", String(servePort)], { cwd: root, stdio: ["ignore", "pipe", "pipe"] });
    try {
        await waitForOutput(child, "--base-url 覆盖");
        // 配置内 baseUrl 指向不可达端口，请求能通说明覆盖生效
        const response = await fetch(`http://127.0.0.1:${servePort}/api/override`);
        assert.equal(response.status, 200);
        assert.equal(received.length, 1, "请求应转发到 --base-url 指定的 mock");
    } finally {
        child.kill();
        mock.close();
        fs.rmSync(project, { recursive: true, force: true });
    }
});

// 崩溃回归：上游在响应已 writeHead 且 pipe 进行中时断开（传输中途重置/超时销毁）。
// 历史上该分支会无条件 respondProxyError → 二次 writeHead(502)，抛 ERR_HTTP_HEADERS_SENT
// 并作为 uncaughtException 杀死 serve 进程；现在必须销毁下游连接、进程保持存活，
// 浏览器侧收到连接中断而不是挂起或收到半截 200 + 502 响应体。
test("serve：响应已开始后上游中途断连，销毁连接而非二次写头", async () => {
    const mock = http.createServer((request, response) => {
        // 声明 1024 字节但只发一部分，随后像上游重置连接一样直接销毁 socket
        response.writeHead(200, { "Content-Type": "text/plain", "Content-Length": "1024" });
        response.write("partial-body");
        setTimeout(() => { response.socket.destroy(); }, 30);
    });
    await new Promise((resolve) => mock.listen(0, "127.0.0.1", resolve));
    const mockPort = mock.address().port;

    const project = fs.mkdtempSync(path.join(os.tmpdir(), "scenario-test-serve-midstream-"));
    const dir = path.join(project, "scenario-test");
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, "scenario.config.js"), `ScenarioTest.registerConfig(ScenarioTest.defineConfig({
        envs: [{ key: "local", name: "本地", baseUrl: "http://127.0.0.1:${mockPort}" }],
        defaultEnvKey: "local",
        scenarios: []
    }));`, "utf8");

    const servePort = await freePort();
    const child = spawn(process.execPath, [cli, "serve", "--config", path.join(dir, "scenario.config.js"), "--port", String(servePort)], { cwd: root, stdio: ["ignore", "pipe", "pipe"] });
    let exited = null;
    let stderr = "";
    child.on("exit", (code) => { exited = code; });
    child.stderr.on("data", (chunk) => { stderr += chunk; });
    try {
        await waitForOutput(child, "场景测试工作台");
        const outcome = await new Promise((resolve, reject) => {
            // 看门狗：若连接既不结束也不断开（pipe 源错误被吞），用例必须快速失败而非挂死
            const timer = setTimeout(() => {
                request.destroy();
                reject(new Error("上游中途断连后代理连接未关闭（可能二次写头或挂起）"));
            }, 8000);
            const settle = (value) => { clearTimeout(timer); resolve(value); };
            const request = http.request({ host: "127.0.0.1", port: servePort, path: "/api/midstream" }, (response) => {
                let body = "";
                response.on("data", (chunk) => { body += chunk; });
                response.on("end", () => settle({ kind: "end", status: response.statusCode, body }));
                response.on("aborted", () => settle({ kind: "aborted", status: response.statusCode, body }));
                response.on("error", (error) => settle({ kind: "error", status: response.statusCode, body, code: error.code }));
            });
            request.on("error", (error) => settle({ kind: "request-error", code: error.code }));
            request.end();
        });

        assert.notEqual(outcome.kind, "end", "上游中途断连不应伪装成完整响应");
        assert.doesNotMatch(outcome.body || "", /Bad Gateway/, "已发送响应头后不得再写 502 响应体");
        await new Promise((resolve) => setTimeout(resolve, 200));
        assert.equal(exited, null, `serve 进程不应退出（实际退出码 ${exited}）`);
        assert.doesNotMatch(stderr, /ERR_HTTP_HEADERS_SENT|Uncaught|uncaughtException/, `serve 不应抛出未捕获异常: ${stderr}`);
        // 进程存活验证：关闭 mock 后同一 serve 仍能继续处理代理请求并降级 502
        await new Promise((resolve) => mock.close(resolve));
        const stillAlive = await fetch(`http://127.0.0.1:${servePort}/api/anything`);
        assert.equal(stillAlive.status, 502, "连接断开后 serve 应继续可用（mock 已关闭，返回 502）");
    } finally {
        child.kill();
        mock.close();
        fs.rmSync(project, { recursive: true, force: true });
    }
});

test("serve 代理按请求环境 key 实时切换目标，--env 仅作默认，未知 key 返回 502", async () => {
    const local = await startMockBackend();
    const prod = await startMockBackend();
    const project = fs.mkdtempSync(path.join(os.tmpdir(), "scenario-test-serve-route-"));
    const dir = path.join(project, "scenario-test");
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, "scenario.config.js"), `ScenarioTest.registerConfig(ScenarioTest.defineConfig({
        envs: [
            { key: "local", name: "本地", baseUrl: "http://127.0.0.1:${local.port}" },
            { key: "prod", name: "生产", baseUrl: "http://127.0.0.1:${prod.port}" }
        ],
        defaultEnvKey: "local",
        scenarios: []
    }));`, "utf8");

    const servePort = await freePort();
    // --env prod 只改变默认环境：未携带环境头的请求走 prod，携带时按请求头切换
    const child = spawn(process.execPath, [cli, "serve", "--config", path.join(dir, "scenario.config.js"), "--env", "prod", "--port", String(servePort)], { cwd: root, stdio: ["ignore", "pipe", "pipe"] });
    try {
        await waitForOutput(child, "接口代理: prod -> ");
        await waitForOutput(child, "可用环境: local -> ");

        const call = (pathname, envKey) => {
            const headers = envKey ? { "X-Scenario-Test-Env": envKey } : {};
            return fetch(`http://127.0.0.1:${servePort}${pathname}`, { headers });
        };

        const defaultRoute = await call("/api/default");
        assert.equal(defaultRoute.status, 200);
        assert.equal((await defaultRoute.json()).url, "/api/default");
        assert.equal(prod.received.length, 1, "未带环境头时应走 --env 指定的默认环境");
        assert.equal(local.received.length, 0);

        assert.equal((await call("/api/switched", "local")).status, 200);
        assert.equal(local.received.length, 1, "切换环境后请求应转发到该环境的 baseUrl");
        assert.equal(prod.received.length, 1);
        assert.equal(local.received[0].url, "/api/switched");
        // 内部路由头不能泄漏给业务后端
        assert.equal(local.received[0].headers["x-scenario-test-env"], undefined);

        assert.equal((await call("/api/back", "prod")).status, 200);
        assert.equal(prod.received.length, 2, "切回原环境后请求应再次转发到该环境");
        assert.equal(prod.received[1].headers["x-scenario-test-env"], undefined);

        const unknown = await call("/api/unknown", "missing");
        assert.equal(unknown.status, 502, "未知环境 key 必须拒绝");
        const message = await unknown.text();
        assert.match(message, /未找到环境 missing/);
        assert.match(message, /可用环境: local, prod/);
        assert.equal(local.received.length, 1, "未知环境不应转发到任何后端");
        assert.equal(prod.received.length, 2, "未知环境不应转发到任何后端");

        // 环境 key 精确匹配：显式携带带前后空格的值不得被 trim 成 prod
        const padded = await call("/api/padded", encodeURIComponent(" prod "));
        assert.equal(padded.status, 502, "带空格的环境 key 应按未知环境拒绝，不能 trim 后转发");
        assert.equal(local.received.length, 1);
        assert.equal(prod.received.length, 2, "trim 后的已配置 key 不得被接受");
    } finally {
        child.kill();
        local.server.close();
        prod.server.close();
        fs.rmSync(project, { recursive: true, force: true });
    }
});

test("serve --base-url 覆盖所有环境目标，但仍拒绝未知环境 key", async () => {
    const mock = await startMockBackend();
    const project = fs.mkdtempSync(path.join(os.tmpdir(), "scenario-test-serve-route-override-"));
    const dir = path.join(project, "scenario-test");
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, "scenario.config.js"), `ScenarioTest.registerConfig(ScenarioTest.defineConfig({
        envs: [
            { key: "local", name: "本地", baseUrl: "http://127.0.0.1:1" },
            { key: "prod", name: "生产", baseUrl: "http://127.0.0.1:2" }
        ],
        defaultEnvKey: "local",
        scenarios: []
    }));`, "utf8");

    const servePort = await freePort();
    const child = spawn(process.execPath, [cli, "serve", "--config", path.join(dir, "scenario.config.js"), "--base-url", `http://127.0.0.1:${mock.port}`, "--port", String(servePort)], { cwd: root, stdio: ["ignore", "pipe", "pipe"] });
    try {
        await waitForOutput(child, "--base-url 覆盖");
        for (const envKey of ["local", "prod"]) {
            const response = await fetch(`http://127.0.0.1:${servePort}/api/${envKey}`, { headers: { "X-Scenario-Test-Env": envKey } });
            assert.equal(response.status, 200, `--base-url 应覆盖 ${envKey} 的目标`);
        }
        assert.equal(mock.received.length, 2, "所有已声明环境的请求都应转发到 --base-url 指定目标");

        const unknown = await fetch(`http://127.0.0.1:${servePort}/api/unknown`, { headers: { "X-Scenario-Test-Env": "missing" } });
        assert.equal(unknown.status, 502, "覆盖目标不应绕过环境 key 校验");
        assert.match(await unknown.text(), /可用环境: local, prod/);
        assert.equal(mock.received.length, 2, "未知环境不应转发到覆盖目标");
    } finally {
        child.kill();
        mock.server.close();
        fs.rmSync(project, { recursive: true, force: true });
    }
});

test("serve 端到端：运行时路由头大小写不同也覆盖步骤同名头，上游收到正确环境", async () => {
    const { server: mock, received, port: mockPort } = await startMockBackend();
    const project = fs.mkdtempSync(path.join(os.tmpdir(), "scenario-test-serve-mixed-case-"));
    const dir = path.join(project, "scenario-test");
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, "scenario.config.js"), `ScenarioTest.registerConfig(ScenarioTest.defineConfig({
        envs: [
            { key: "local", name: "本地", baseUrl: "http://127.0.0.1:1" },
            { key: "prod", name: "生产", baseUrl: "http://127.0.0.1:${mockPort}" }
        ],
        defaultEnvKey: "prod",
        scenarios: []
    }));`, "utf8");

    const servePort = await freePort();
    const child = spawn(process.execPath, [cli, "serve", "--config", path.join(dir, "scenario.config.js"), "--port", String(servePort)], { cwd: root, stdio: ["ignore", "pipe", "pipe"] });
    try {
        await waitForOutput(child, "场景测试工作台");
        // 走真实 Fetch -> serve 路径：引擎注入小写路由头，步骤声明大小写不同的同名头。
        // 若两个键同时保留，Fetch 会合并成非法环境值并得到 502。
        const engine = createEngine({ baseUrl: `http://127.0.0.1:${servePort}` });
        const report = await engine.runScenario(defineScenario({
            name: "混合大小写路由头",
            steps: [{
                name: "请求 prod",
                path: "api/mixed-case",
                request: { headers: { "X-Scenario-Test-Env": "local" } }
            }]
        }), { requestHeaders: { "x-scenario-test-env": "prod" } });
        assert.equal(report.passed, true, report.results[0].error);
        assert.equal(received.length, 1, "请求应成功转发到 prod 环境");
        assert.equal(received[0].url, "/api/mixed-case");
        assert.equal(received[0].headers["x-scenario-test-env"], undefined, "内部路由头不得转发给上游");
    } finally {
        child.kill();
        mock.close();
        fs.rmSync(project, { recursive: true, force: true });
    }
});

test("serve 无 envs 时默认 baseUrl 保留，但携带任意环境 key 返回 502 且不转发", async () => {
    const { server: mock, received, port: mockPort } = await startMockBackend();
    const project = fs.mkdtempSync(path.join(os.tmpdir(), "scenario-test-serve-no-envs-"));
    const dir = path.join(project, "scenario-test");
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, "scenario.config.js"), `ScenarioTest.registerConfig(ScenarioTest.defineConfig({
        baseUrl: "http://127.0.0.1:${mockPort}",
        scenarios: []
    }));`, "utf8");

    const servePort = await freePort();
    const child = spawn(process.execPath, [cli, "serve", "--config", path.join(dir, "scenario.config.js"), "--port", String(servePort)], { cwd: root, stdio: ["ignore", "pipe", "pipe"] });
    try {
        await waitForOutput(child, "接口代理: default -> ");
        const legacy = await fetch(`http://127.0.0.1:${servePort}/api/default`);
        assert.equal(legacy.status, 200, "不带环境头的旧默认请求仍应代理到 config.baseUrl");
        assert.equal(received.length, 1);

        const unknown = await fetch(`http://127.0.0.1:${servePort}/api/unknown`, {
            headers: { "X-Scenario-Test-Env": "prod" }
        });
        assert.equal(unknown.status, 502, "未配置 envs 时任意环境 key 都应拒绝");
        const message = await unknown.text();
        assert.match(message, /未找到环境 prod/);
        assert.match(message, /未声明任何环境/);
        assert.equal(received.length, 1, "非法环境 key 不应转发到默认 baseUrl");
    } finally {
        child.kill();
        mock.close();
        fs.rmSync(project, { recursive: true, force: true });
    }
});

test("serve 接受 URL 编码后的非 ASCII 环境 key 并转发到对应 baseUrl", async () => {
    const { server: mock, received, port: mockPort } = await startMockBackend();
    const project = fs.mkdtempSync(path.join(os.tmpdir(), "scenario-test-serve-unicode-env-"));
    const dir = path.join(project, "scenario-test");
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, "scenario.config.js"), `ScenarioTest.registerConfig(ScenarioTest.defineConfig({
        envs: [
            { key: "生产", name: "生产", baseUrl: "http://127.0.0.1:${mockPort}" },
            { key: "本地", name: "本地", baseUrl: "http://127.0.0.1:1" }
        ],
        defaultEnvKey: "生产",
        scenarios: []
    }));`, "utf8");

    const servePort = await freePort();
    const child = spawn(process.execPath, [cli, "serve", "--config", path.join(dir, "scenario.config.js"), "--port", String(servePort)], { cwd: root, stdio: ["ignore", "pipe", "pipe"] });
    try {
        await waitForOutput(child, "接口代理: 生产 -> ");
        const response = await fetch(`http://127.0.0.1:${servePort}/api/unicode`, {
            headers: { "X-Scenario-Test-Env": encodeURIComponent("生产") }
        });
        assert.equal(response.status, 200, "URL 编码后的非 ASCII 环境 key 应能路由到配置环境");
        assert.equal((await response.json()).url, "/api/unicode");
        assert.equal(received.length, 1);
        assert.equal(received[0].headers["x-scenario-test-env"], undefined, "内部路由头不得转发给上游");
    } finally {
        child.kill();
        mock.close();
        fs.rmSync(project, { recursive: true, force: true });
    }
});

test("serve 无 envs 且无任何代理目标时，携带环境 key 仍返回可读 502 而非 404", async () => {
    const project = fs.mkdtempSync(path.join(os.tmpdir(), "scenario-test-serve-no-target-"));
    const dir = path.join(project, "scenario-test");
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, "scenario.config.js"), `ScenarioTest.registerConfig(ScenarioTest.defineConfig({
        scenarios: []
    }));`, "utf8");

    const servePort = await freePort();
    const child = spawn(process.execPath, [cli, "serve", "--config", path.join(dir, "scenario.config.js"), "--port", String(servePort)], { cwd: root, stdio: ["ignore", "pipe", "pipe"] });
    try {
        await waitForOutput(child, "场景测试工作台");
        const unknown = await fetch(`http://127.0.0.1:${servePort}/api/unknown`, {
            headers: { "X-Scenario-Test-Env": "prod" }
        });
        assert.equal(unknown.status, 502, "无任何代理目标时非法环境 key 仍应返回 502");
        const message = await unknown.text();
        assert.match(message, /未找到环境 prod/);
        assert.match(message, /未声明任何环境/);

        // 不带环境头的普通未命中请求保持既有 404，不凭空产生代理
        const plain = await fetch(`http://127.0.0.1:${servePort}/api/plain`);
        assert.equal(plain.status, 404);
    } finally {
        child.kill();
        fs.rmSync(project, { recursive: true, force: true });
    }
});

test("serve 环境 key 按解码后的原值精确匹配，支持配置中带前后空格的合法 key", async () => {
    const plain = await startMockBackend();
    const spaced = await startMockBackend();
    const project = fs.mkdtempSync(path.join(os.tmpdir(), "scenario-test-serve-env-whitespace-"));
    const dir = path.join(project, "scenario-test");
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, "scenario.config.js"), `ScenarioTest.registerConfig(ScenarioTest.defineConfig({
        envs: [
            { key: "prod", name: "无空格", baseUrl: "http://127.0.0.1:${plain.port}" },
            { key: " prod ", name: "带空格", baseUrl: "http://127.0.0.1:${spaced.port}" }
        ],
        defaultEnvKey: " prod ",
        scenarios: []
    }));`, "utf8");

    const servePort = await freePort();
    const child = spawn(process.execPath, [cli, "serve", "--config", path.join(dir, "scenario.config.js"), "--port", String(servePort)], { cwd: root, stdio: ["ignore", "pipe", "pipe"] });
    try {
        await waitForOutput(child, "场景测试工作台");
        const padded = await fetch(`http://127.0.0.1:${servePort}/api/spaced`, {
            headers: { "X-Scenario-Test-Env": encodeURIComponent(" prod ") }
        });
        assert.equal(padded.status, 200, "带前后空格的合法环境 key 应精确匹配");
        assert.equal(spaced.received.length, 1);
        assert.equal(plain.received.length, 0, "不得 trim 后落到无空格环境");

        const direct = await fetch(`http://127.0.0.1:${servePort}/api/plain`, {
            headers: { "X-Scenario-Test-Env": "prod" }
        });
        assert.equal(direct.status, 200);
        assert.equal(plain.received.length, 1);
        assert.equal(spaced.received.length, 1);
    } finally {
        child.kill();
        plain.server.close();
        spaced.server.close();
        fs.rmSync(project, { recursive: true, force: true });
    }
});
