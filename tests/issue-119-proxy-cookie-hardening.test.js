import assert from "node:assert/strict";
import fs from "node:fs";
import http from "node:http";
import https from "node:https";
import os from "node:os";
import path from "node:path";
import { Readable, Writable } from "node:stream";
import { once } from "node:events";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { createEngine } from "../src/engine.js";
import { defineScenario } from "../src/registry.js";
import {
    createServeServer,
    isProxyOriginAllowed,
    proxyRequest
} from "../src/cli/serve-server.js";

// Issue #119：serve 代理与 Cookie Jar 加固
// 1) 代理只接受本机 origin（Origin/Referer 校验）
// 2) https 上游默认校验证书，显式 insecure 才放宽
// 3) 客户端断开后销毁上游请求
// 4) Cookie Jar 拒绝跨站 Domain 与公共后缀

function listen(server) {
    return new Promise((resolve) => server.listen(0, "127.0.0.1", () => resolve(server.address().port)));
}

async function freePort() {
    const server = http.createServer();
    const port = await listen(server);
    await new Promise((resolve) => server.close(resolve));
    return port;
}

function requestRaw(port, requestPath, headers = {}) {
    return new Promise((resolve, reject) => {
        const request = http.request({ host: "127.0.0.1", port, path: requestPath, headers }, (response) => {
            let body = "";
            response.setEncoding("utf8");
            response.on("data", (chunk) => { body += chunk; });
            response.on("end", () => resolve({ status: response.statusCode, body }));
        });
        request.on("error", reject);
        request.end();
    });
}

class MockResponse extends Writable {
    constructor() {
        super();
        this.headersSent = false;
        this.statusCode = null;
        this.destroyCalls = 0;
        this.chunks = [];
    }
    _write(chunk, _encoding, callback) {
        this.chunks.push(Buffer.from(chunk));
        callback();
    }
    writeHead(status) {
        if (this.headersSent) throw new Error("ERR_HTTP_HEADERS_SENT");
        this.statusCode = status;
        this.headersSent = true;
        return this;
    }
    destroy(error) {
        this.destroyCalls += 1;
        return super.destroy(error);
    }
}

test("#119：代理 Origin/Referer 只接受本机 serve origin（缺省放行）", () => {
    const port = 4300;
    assert.equal(isProxyOriginAllowed({}, "127.0.0.1:4300", port), true, "无 Origin/Referer（curl/脚本）应放行");
    assert.equal(isProxyOriginAllowed({ origin: "http://127.0.0.1:4300" }, "127.0.0.1:4300", port), true);
    assert.equal(isProxyOriginAllowed({ referer: "http://localhost:4300/index.html?a=1" }, "127.0.0.1:4300", port), true);
    assert.equal(isProxyOriginAllowed({ origin: "https://evil.example.com" }, "127.0.0.1:4300", port), false, "跨站 Origin 应拒绝");
    assert.equal(isProxyOriginAllowed({ referer: "https://evil.example.com/page" }, "127.0.0.1:4300", port), false, "跨站 Referer 应拒绝");
    assert.equal(isProxyOriginAllowed({ origin: "null" }, "127.0.0.1:4300", port), false, "Origin: null 应拒绝");
    assert.equal(isProxyOriginAllowed({ origin: "http://127.0.0.1:9999" }, "127.0.0.1:4300", port), false, "非本端口 origin 应拒绝");
});

test("#119：createServeServer 拒绝跨站来源的代理请求，且不触达上游", async () => {
    const workspace = fs.mkdtempSync(path.join(os.tmpdir(), "scenario-test-119-ws-"));
    const libraryDist = fs.mkdtempSync(path.join(os.tmpdir(), "scenario-test-119-lib-"));
    const received = [];
    const backend = http.createServer((request, response) => {
        received.push(request.url);
        response.writeHead(200, { "Content-Type": "application/json" });
        response.end("{}");
    });
    const backendPort = await listen(backend);
    const port = await freePort();
    const server = createServeServer({
        workspace,
        libraryDist,
        port,
        config: { envs: [] },
        defaultTarget: { key: "local", envKey: "local", target: `http://127.0.0.1:${backendPort}` }
    });
    await new Promise((resolve) => server.listen(port, "127.0.0.1", resolve));
    try {
        const blocked = await requestRaw(port, "/api/orders", { origin: "https://evil.example.com" });
        assert.equal(blocked.status, 403, "跨站来源应 403");
        assert.deepEqual(received, [], "跨站请求不得触达上游");

        const allowed = await requestRaw(port, "/api/orders", { origin: `http://127.0.0.1:${port}` });
        assert.equal(allowed.status, 200);
        assert.deepEqual(received, ["/api/orders"]);
    } finally {
        server.closeAllConnections?.();
        await new Promise((resolve) => server.close(resolve));
        await new Promise((resolve) => backend.close(resolve));
        fs.rmSync(workspace, { recursive: true, force: true });
        fs.rmSync(libraryDist, { recursive: true, force: true });
    }
});

test("#119：https 上游默认校验证书，insecure 才放宽（无 openssl 时跳过）", async (t) => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "scenario-test-119-tls-"));
    try {
        const keyPath = path.join(dir, "key.pem");
        const certPath = path.join(dir, "cert.pem");
        const result = spawnSync("openssl", [
            "req", "-x509", "-newkey", "rsa:2048", "-nodes", "-days", "1",
            "-keyout", keyPath, "-out", certPath,
            "-subj", "/CN=127.0.0.1", "-addext", "subjectAltName=IP:127.0.0.1"
        ], { encoding: "utf8" });
        if (result.status !== 0 || !fs.existsSync(certPath)) {
            t.skip("缺少 openssl，跳过 https 证书校验回归");
            return;
        }
        const backend = https.createServer({ key: fs.readFileSync(keyPath), cert: fs.readFileSync(certPath) }, (_request, response) => {
            response.writeHead(200, { "Content-Type": "text/plain" });
            response.end("secure-ok");
        });
        const backendPort = await listen(backend);
        try {
            const makeRequest = () => {
                const request = Readable.from([Buffer.from("")]);
                request.method = "GET";
                request.url = "/api/secure";
                request.headers = {};
                return request;
            };
            const strict = new MockResponse();
            proxyRequest(makeRequest(), strict, `https://127.0.0.1:${backendPort}`);
            await once(strict, "finish");
            assert.equal(strict.statusCode, 502, "默认应因自签证书校验失败返回 502");

            const relaxed = new MockResponse();
            proxyRequest(makeRequest(), relaxed, `https://127.0.0.1:${backendPort}`, { insecure: true });
            await once(relaxed, "finish");
            assert.equal(relaxed.statusCode, 200, "--insecure 才放宽证书校验");
            assert.equal(Buffer.concat(relaxed.chunks).toString("utf8"), "secure-ok");
        } finally {
            backend.closeAllConnections?.();
            await new Promise((resolve) => backend.close(resolve));
        }
    } finally {
        fs.rmSync(dir, { recursive: true, force: true });
    }
});

test("#119：客户端中断后立即销毁上游请求", async () => {
    let upstreamClosed = null;
    let upstreamStarted = false;
    const backend = http.createServer((request, response) => {
        upstreamStarted = true;
        request.on("close", () => { upstreamClosed = Date.now(); });
        // 持续输出，模拟长连接/轮询；不主动结束
        response.writeHead(200, { "Content-Type": "text/plain" });
        response.write("chunk");
    });
    const backendPort = await listen(backend);
    try {
        const clientRequest = Readable.from([Buffer.from("")]);
        clientRequest.method = "GET";
        clientRequest.url = "/api/stream";
        clientRequest.headers = {};
        const response = new MockResponse();
        proxyRequest(clientRequest, response, `http://127.0.0.1:${backendPort}`, { timeoutMs: 30000 });
        // 等上游真正开始响应，再模拟浏览器关闭页面（请求 aborted + 下游 close）
        const startDeadline = Date.now() + 3000;
        while (!upstreamStarted && Date.now() < startDeadline) {
            await new Promise((resolve) => setTimeout(resolve, 10));
        }
        assert.equal(upstreamStarted, true, "上游请求应已建立");
        clientRequest.emit("aborted");
        response.destroy();
        const deadline = Date.now() + 3000;
        while (!upstreamClosed && Date.now() < deadline) {
            await new Promise((resolve) => setTimeout(resolve, 20));
        }
        assert.ok(upstreamClosed, "客户端断开后上游请求应被销毁（不能等到空闲超时）");
    } finally {
        backend.closeAllConnections?.();
        await new Promise((resolve) => backend.close(resolve));
    }
});

test("#119：Cookie Jar 拒绝跨站 Domain 与公共后缀", async () => {
    const sentCookies = [];
    let call = 0;
    const engine = createEngine({
        baseUrl: "https://api.example.com",
        cookieJar: true,
        fetch: async (url, options) => {
            call += 1;
            sentCookies.push({ url: String(url), cookie: options.headers?.Cookie || options.headers?.cookie || "" });
            if (call === 1) {
                const headers = new Headers({ "Content-Type": "application/json" });
                // 多值 Set-Cookie 必须用 Headers.append 保持独立条目（对象字面量会被合并成一行）
                headers.append("Set-Cookie", "sid=secret; Path=/");
                headers.append("Set-Cookie", "evil=1; Domain=victim.com; Path=/");
                headers.append("Set-Cookie", "suffix=1; Domain=com; Path=/");
                headers.append("Set-Cookie", "parent=1; Domain=example.com; Path=/");
                return new Response("{}", { status: 200, headers });
            }
            return new Response("{}", { status: 200, headers: { "Content-Type": "application/json" } });
        }
    });
    const scenario = defineScenario({
        name: "跨站 cookie",
        steps: [
            { name: "设置 cookie", path: "/login" },
            { name: "同站请求", path: "/same-site" },
            { name: "跨站请求", path: "https://victim.com/collect" }
        ]
    });
    const report = await engine.runScenario(scenario);
    assert.equal(report.passed, true, JSON.stringify(report.results.map((item) => item.error)));
    const sameSite = sentCookies.find((item) => item.url.includes("api.example.com/same-site"));
    assert.match(sameSite.cookie, /sid=secret/, "同站 cookie 应携带");
    assert.match(sameSite.cookie, /parent=1/, "合法父域（example.com）cookie 应携带");
    assert.doesNotMatch(sameSite.cookie, /evil=1/, "跨站 Domain 必须被丢弃");
    assert.doesNotMatch(sameSite.cookie, /suffix=1/, "公共后缀 Domain 必须被丢弃");
    const crossSite = sentCookies.find((item) => item.url.includes("victim.com"));
    assert.equal(crossSite.cookie, "", "跨站 cookie 不得发往 victim.com");
});
