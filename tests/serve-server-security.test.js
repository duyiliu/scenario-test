import assert from "node:assert/strict";
import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import { once } from "node:events";
import { Readable, Writable } from "node:stream";
import test from "node:test";
import {
    HOP_BY_HOP_HEADERS,
    buildProxyRequestHeaders,
    connectionNamedHeaders,
    contentType,
    createServeServer,
    isAllowedServeHost,
    proxyRequest,
    resolveRequestProxyTarget,
    resolveStartupProxyTarget,
    respondProxyError,
    rewriteProxyOriginHeaders,
    safeFile,
    serveStaticFile
} from "../src/cli/serve-server.js";

// 轻量响应桩：既能承接 fs.createReadStream().pipe()，也能观察 writeHead/destroy 调用。
// headersSent 复刻 Node ServerResponse 的“已写头”语义，用于 headersSent 回归（#32）。
class MockResponse extends Writable {
    constructor(options = {}) {
        super();
        this.statusCode = null;
        this.headers = null;
        this.headersSent = Boolean(options.headersSent);
        this.writeHeadCalls = [];
        this.destroyCalls = 0;
        this.chunks = [];
    }

    _write(chunk, _encoding, callback) {
        this.chunks.push(Buffer.from(chunk));
        callback();
    }

    writeHead(status, headers) {
        if (this.headersSent) throw new Error("ERR_HTTP_HEADERS_SENT");
        this.statusCode = status;
        this.headers = headers || {};
        this.headersSent = true;
        this.writeHeadCalls.push(status);
        return this;
    }

    end(chunk, encoding, callback) {
        if (typeof chunk === "function") return super.end(chunk);
        if (chunk !== undefined) this.write(chunk, encoding);
        return super.end(callback);
    }

    destroy(error) {
        this.destroyCalls += 1;
        return super.destroy(error);
    }

    text() {
        return Buffer.concat(this.chunks).toString("utf8");
    }
}

function fakeProxyRequest(headers = {}, options = {}) {
    const request = Readable.from([Buffer.from("")]);
    request.method = options.method || "GET";
    request.url = options.url || "/api/orders";
    request.headers = headers;
    return request;
}

function listen(server) {
    return new Promise((resolve) => server.listen(0, "127.0.0.1", () => resolve(server.address().port)));
}

async function freePort() {
    const server = http.createServer();
    const port = await listen(server);
    await new Promise((resolve) => server.close(resolve));
    return port;
}

async function startServe(options) {
    const port = await freePort();
    const server = createServeServer({ ...options, port });
    await new Promise((resolve, reject) => {
        server.once("error", reject);
        server.listen(port, "127.0.0.1", resolve);
    });
    return {
        port,
        async close() {
            server.closeAllConnections?.();
            await new Promise((resolve) => server.close(resolve));
        }
    };
}

function requestRaw(port, requestPath, headers = {}) {
    return new Promise((resolve, reject) => {
        const request = http.request({ host: "127.0.0.1", port, path: requestPath, headers }, (response) => {
            let body = "";
            response.setEncoding("utf8");
            response.on("data", (chunk) => { body += chunk; });
            response.on("end", () => resolve({ status: response.statusCode, headers: response.headers, body }));
        });
        request.on("error", reject);
        request.end();
    });
}

test("#33 Host 白名单 / hop-by-hop / Connection 点名头纯函数", () => {
    assert.equal(isAllowedServeHost("127.0.0.1:4300", 4300), true);
    assert.equal(isAllowedServeHost("LOCALHOST:4300", 4300), true);
    assert.equal(isAllowedServeHost(" [::1]:4300 ", 4300), true);
    assert.equal(isAllowedServeHost("localhost", 4300), true);
    assert.equal(isAllowedServeHost("attacker.example.com", 4300), false);
    assert.equal(isAllowedServeHost("127.0.0.1:4301", 4300), false);
    assert.equal(isAllowedServeHost(undefined, 4300), false);

    assert.deepEqual(connectionNamedHeaders(" X-One, x-two ,,"), ["x-one", "x-two"]);
    assert.deepEqual(connectionNamedHeaders(undefined), []);
    assert.equal(HOP_BY_HOP_HEADERS.has("host"), true);
    assert.equal(HOP_BY_HOP_HEADERS.has("transfer-encoding"), true);

    const headers = buildProxyRequestHeaders({
        headers: {
            host: "127.0.0.1:4300",
            connection: "X-Req-Hop",
            "x-req-hop": "1",
            "keep-alive": "timeout=5",
            "transfer-encoding": "chunked",
            "x-scenario-test-env": "b",
            "content-type": "application/json",
            origin: "http://127.0.0.1:4300",
            referer: "http://127.0.0.1:4300/index.html?x=1"
        }
    }, "https://api.example.com/base");
    assert.deepEqual(headers, {
        "content-type": "application/json",
        origin: "https://api.example.com",
        referer: "https://api.example.com/index.html?x=1"
    });

    // 外部来源原样保留；非法 URL / 非法目标不得抛错
    assert.deepEqual(
        rewriteProxyOriginHeaders({ Origin: "https://evil.example" }, "127.0.0.1:4300", "https://api.example.com"),
        { Origin: "https://evil.example" }
    );
    assert.deepEqual(
        rewriteProxyOriginHeaders({ Referer: "not a url" }, "127.0.0.1:4300", "https://api.example.com"),
        { Referer: "not a url" }
    );
    assert.deepEqual(
        rewriteProxyOriginHeaders({ Origin: "http://127.0.0.1:4300" }, "127.0.0.1:4300", "not a url"),
        { Origin: "http://127.0.0.1:4300" }
    );
    assert.deepEqual(
        rewriteProxyOriginHeaders({ Accept: "*/*" }, "127.0.0.1:4300", "https://api.example.com"),
        { Accept: "*/*" }
    );

    assert.equal(contentType("a.html"), "text/html; charset=utf-8");
    assert.equal(contentType("a.CSS"), "text/css; charset=utf-8");
    assert.equal(contentType("a.unknownext"), "application/octet-stream");
});

test("#33 启动/逐请求代理目标解析：环境覆盖、缺失 baseUrl 与未知环境", () => {
    const envs = [
        { key: "local", baseUrl: "http://127.0.0.1:8080/" },
        { key: "blank", baseUrl: "   " }
    ];
    assert.deepEqual(
        resolveStartupProxyTarget({ envs, defaultEnvKey: "local" }),
        { key: "local", envKey: "local", target: "http://127.0.0.1:8080" }
    );
    assert.deepEqual(
        resolveStartupProxyTarget({ envs, defaultEnvKey: "local" }, "blank", ""),
        { key: "blank", envKey: "blank", target: "   " }
    );
    assert.deepEqual(
        resolveStartupProxyTarget({ envs, defaultEnvKey: "local" }, undefined, "http://override:9000"),
        { key: "local（--base-url 覆盖）", envKey: "local", target: "http://override:9000" }
    );
    assert.match(
        resolveStartupProxyTarget({ envs, defaultEnvKey: "local" }, "nope").error,
        /未找到环境 nope，可用值: local, blank/
    );
    assert.deepEqual(
        resolveStartupProxyTarget({ baseUrl: "http://top:8080/" }),
        { key: "default", envKey: "default", target: "http://top:8080" }
    );

    const defaultTarget = { key: "local", envKey: "local", target: "http://127.0.0.1:8080" };
    assert.equal(
        resolveRequestProxyTarget({ config: { envs }, defaultTarget, defaultEnvKey: "local", overrideBaseUrl: "http://override" }),
        defaultTarget
    );
    assert.deepEqual(
        resolveRequestProxyTarget({ config: { envs }, defaultTarget, defaultEnvKey: "local", envKey: "blank" }),
        { key: "blank", envKey: "blank", target: "   " }
    );
    assert.throws(
        () => resolveRequestProxyTarget({ config: { envs }, defaultTarget, defaultEnvKey: "local", envKey: "nope" }),
        /未知环境 nope，可用值: local, blank/
    );
});

test("#33 resolveRequestProxyTarget：空 baseUrl 与未声明环境均拒绝", () => {
    const envs = [{ key: "empty", baseUrl: "" }];
    const defaultTarget = { key: "empty", envKey: "empty", target: "" };
    assert.throws(
        () => resolveRequestProxyTarget({ config: { envs }, defaultTarget, defaultEnvKey: "empty", envKey: "empty" }),
        /环境 empty 未配置 baseUrl/
    );
    assert.throws(
        () => resolveRequestProxyTarget({
            config: { envs: [] },
            defaultTarget,
            defaultEnvKey: "local",
            envKey: "prod"
        }),
        /配置未声明环境 prod，无法切换代理目标/
    );
    assert.equal(
        resolveRequestProxyTarget({ config: { envs: [] }, defaultTarget, defaultEnvKey: "local", envKey: "local" }),
        defaultTarget
    );
});

test("#33 safeFile：链接实路径越界返回 null，处理器回 403 且不泄漏内容", async (t) => {
    const workspace = fs.mkdtempSync(path.join(os.tmpdir(), "scenario-test-security-safe-"));
    const outside = fs.mkdtempSync(path.join(os.tmpdir(), "scenario-test-security-outside-"));
    try {
        fs.writeFileSync(path.join(workspace, "index.html"), "<html><head></head><body>ok</body></html>", "utf8");
        fs.writeFileSync(path.join(outside, "secret.txt"), "out-of-bounds", "utf8");
        assert.equal(safeFile(workspace, "index.html"), path.join(workspace, "index.html"));
        assert.equal(safeFile(workspace, "../outside.txt"), null);
        assert.equal(safeFile(workspace, ""), null);

        const link = path.join(workspace, "link");
        try {
            fs.symlinkSync(outside, link, "junction");
        } catch (error) {
            t.skip(`当前平台不支持目录链接: ${error.message}`);
            return;
        }
        assert.equal(safeFile(workspace, "link/secret.txt"), null);

        const { port, close } = await startServe({ workspace, libraryDist: workspace });
        try {
            const escaped = await requestRaw(port, "/link/secret.txt");
            assert.equal(escaped.status, 403);
            assert.doesNotMatch(escaped.body, /out-of-bounds/);
        } finally {
            await close();
        }
    } finally {
        fs.rmSync(workspace, { recursive: true, force: true });
        fs.rmSync(outside, { recursive: true, force: true });
    }
});

test("#33 serveStaticFile：HTML 注入、流式返回、缺失文件与 headersSent 降级", async () => {
    const workspace = fs.mkdtempSync(path.join(os.tmpdir(), "scenario-test-security-static-"));
    try {
        const headHtml = path.join(workspace, "head.html");
        const noHeadHtml = path.join(workspace, "nohead.html");
        const script = path.join(workspace, "app.js");
        fs.writeFileSync(headHtml, "<html><HEAD data-x=\"1\"><title>x</title></HEAD></html>", "utf8");
        fs.writeFileSync(noHeadHtml, "<!doctype html><title>x</title>", "utf8");
        fs.writeFileSync(script, "console.log('ok')", "utf8");

        const withHead = new MockResponse();
        serveStaticFile(withHead, headHtml);
        await once(withHead, "finish");
        assert.equal(withHead.statusCode, 200);
        assert.match(withHead.headers["Content-Type"], /text\/html/);
        assert.match(withHead.text(), /<HEAD data-x="1"><script>window\.__SCENARIO_TEST_SERVE_PROXY__ = true;<\/script>/);

        const withoutHead = new MockResponse();
        serveStaticFile(withoutHead, noHeadHtml);
        await once(withoutHead, "finish");
        assert.match(withoutHead.text(), /^<script>window\.__SCENARIO_TEST_SERVE_PROXY__ = true;<\/script>/);

        const streamed = new MockResponse();
        serveStaticFile(streamed, script);
        await once(streamed, "finish");
        assert.equal(streamed.statusCode, 200);
        assert.equal(streamed.headers["Content-Type"], "application/javascript; charset=utf-8");
        assert.equal(streamed.text(), "console.log('ok')");

        const missingStream = new MockResponse();
        serveStaticFile(missingStream, path.join(workspace, "missing.txt"));
        await once(missingStream, "finish");
        assert.equal(missingStream.statusCode, 500);

        const missingHtml = new MockResponse();
        serveStaticFile(missingHtml, path.join(workspace, "missing.html"));
        await once(missingHtml, "finish");
        assert.equal(missingHtml.statusCode, 500);

        // 已写响应头后读流报错：不能二次 writeHead(500)，只销毁连接（#32）
        const afterHeaders = new MockResponse({ headersSent: true });
        serveStaticFile(afterHeaders, path.join(workspace, "missing.txt"));
        await once(afterHeaders, "close");
        assert.deepEqual(afterHeaders.writeHeadCalls, []);
        assert.equal(afterHeaders.destroyCalls, 1);
    } finally {
        fs.rmSync(workspace, { recursive: true, force: true });
    }
});

test("#33 respondProxyError：headersSent 后只销毁连接，绝不二次 writeHead", async () => {
    const started = new MockResponse({ headersSent: true });
    respondProxyError(started, "Bad Gateway");
    assert.equal(started.statusCode, null);
    assert.deepEqual(started.writeHeadCalls, []);
    assert.equal(started.destroyCalls, 1);
    assert.equal(started.destroyed, true);

    const fresh = new MockResponse();
    respondProxyError(fresh, "Bad Gateway: upstream down");
    await once(fresh, "finish");
    assert.equal(fresh.statusCode, 502);
    assert.equal(fresh.headers["Content-Type"], "text/plain; charset=utf-8");
    assert.match(fresh.text(), /upstream down/);
});

test("#33 proxyRequest：无效目标 / 构造异常 / 上游连接失败 / 超时均降级 502", async () => {
    const invalid = new MockResponse();
    proxyRequest(fakeProxyRequest(), invalid, "192.168.1.5:8080");
    await once(invalid, "finish");
    assert.equal(invalid.statusCode, 502);
    assert.match(invalid.text(), /baseUrl/);

    // 非 http/https 协议同样按“目标无效”拒绝，而不是抛异常
    const unsupported = new MockResponse();
    proxyRequest(fakeProxyRequest(), unsupported, "ftp://127.0.0.1:21");
    await once(unsupported, "finish");
    assert.equal(unsupported.statusCode, 502);
    assert.match(unsupported.text(), /接口代理目标无效/);

    // 通过畸形 method 让 transport.request 同步抛错，验证构造阶段兜底 502
    const thrown = new MockResponse();
    proxyRequest(fakeProxyRequest({}, { method: "GE T" }), thrown, "http://127.0.0.1:1");
    await once(thrown, "finish");
    assert.equal(thrown.statusCode, 502);
    assert.match(thrown.text(), /请求构造失败/);

    const closedPort = await freePort();
    const failed = new MockResponse();
    proxyRequest(fakeProxyRequest(), failed, `http://127.0.0.1:${closedPort}`);
    await once(failed, "finish");
    assert.equal(failed.statusCode, 502);
    assert.match(failed.text(), /无法连接接口代理目标或代理超时/);

    const slow = http.createServer(() => {});
    const slowPort = await listen(slow);
    try {
        const timedOut = new MockResponse();
        proxyRequest(fakeProxyRequest(), timedOut, `http://127.0.0.1:${slowPort}`, { timeoutMs: 50 });
        await once(timedOut, "finish");
        assert.equal(timedOut.statusCode, 502);
        assert.match(timedOut.text(), /无法连接接口代理目标或代理超时/);
    } finally {
        slow.closeAllConnections?.();
        await new Promise((resolve) => slow.close(resolve));
    }
});

test("#33 proxyRequest：转发成功时双向剥离头，响应开始后上游断连只销毁连接", async () => {
    const received = [];
    const backend = http.createServer((request, response) => {
        received.push(request);
        response.writeHead(201, {
            "Content-Type": "text/plain",
            Connection: "X-Up-Hop",
            "X-Up-Hop": "leak",
            "Keep-Alive": "timeout=5"
        });
        response.end("upstream-body");
    });
    const backendPort = await listen(backend);
    try {
        const response = new MockResponse();
        proxyRequest(
            fakeProxyRequest({ connection: "X-Req-Hop", "x-req-hop": "1", "keep-alive": "timeout=5", "content-type": "text/plain" }),
            response,
            `http://127.0.0.1:${backendPort}`
        );
        await once(response, "finish");
        assert.equal(response.statusCode, 201);
        assert.equal(response.headers["X-Up-Hop"], undefined);
        assert.equal(response.headers["Keep-Alive"], undefined);
        assert.equal(response.text(), "upstream-body");
        assert.equal(received[0].headers["x-req-hop"], undefined);
        assert.equal(received[0].headers["keep-alive"], undefined);
        assert.equal(received[0].headers["content-type"], "text/plain");
    } finally {
        await new Promise((resolve) => backend.close(resolve));
    }

    const aborting = http.createServer((request, response) => {
        response.writeHead(200, { "Content-Type": "text/plain", "Content-Length": "1024" });
        response.write("partial-body");
        setTimeout(() => response.socket.destroy(), 30);
    });
    const abortPort = await listen(aborting);
    try {
        const response = new MockResponse();
        proxyRequest(fakeProxyRequest(), response, `http://127.0.0.1:${abortPort}`);
        await once(response, "close");
        // 已写 200 头后不得二次 writeHead(502)，只能断开下游连接（#32）
        assert.deepEqual(response.writeHeadCalls, [200]);
        assert.ok(response.destroyCalls >= 1);
        assert.doesNotMatch(response.text(), /Bad Gateway/);
    } finally {
        aborting.closeAllConnections?.();
        await new Promise((resolve) => aborting.close(resolve));
    }
});

test("#33 createServeServer：畸形 URL 400、无代理 404、库路径映射与静态命中", async () => {
    const workspace = fs.mkdtempSync(path.join(os.tmpdir(), "scenario-test-security-handler-"));
    const libraryDist = fs.mkdtempSync(path.join(os.tmpdir(), "scenario-test-security-lib-"));
    try {
        fs.writeFileSync(path.join(workspace, "index.html"), "<html><head></head><body>ok</body></html>", "utf8");
        fs.writeFileSync(path.join(workspace, "app.js"), "console.log('ok')", "utf8");
        fs.writeFileSync(path.join(libraryDist, "scenario-test.umd.js"), "umd-body", "utf8");
        const { port, close } = await startServe({
            workspace,
            libraryDist,
            config: { envs: [] },
            defaultTarget: { key: "default", envKey: "default", target: "" }
        });
        try {
            const forbidden = await requestRaw(port, "/", { Host: `attacker.example.com:${port}` });
            assert.equal(forbidden.status, 403);

            const malformed = await requestRaw(port, "/%E0%A4%A");
            assert.equal(malformed.status, 400);

            const traversal = await requestRaw(port, "/..%2foutside.txt");
            assert.equal(traversal.status, 403);

            const page = await requestRaw(port, "/", { Host: "localhost" });
            assert.equal(page.status, 200);
            assert.match(page.body, /__SCENARIO_TEST_SERVE_PROXY__/);

            const script = await requestRaw(port, "/app.js");
            assert.equal(script.status, 200);
            assert.equal(script.body, "console.log('ok')");

            assert.equal((await requestRaw(port, "/missing")).status, 404);

            for (const libraryPath of [
                "/__scenario-test__/scenario-test.umd.js",
                "/dist/scenario-test.umd.js",
                "/node_modules/@yc_yzkj/scenario-test/dist/scenario-test.umd.js"
            ]) {
                const library = await requestRaw(port, libraryPath);
                assert.equal(library.status, 200, libraryPath);
                assert.equal(library.body, "umd-body", libraryPath);
            }
        } finally {
            await close();
        }
    } finally {
        fs.rmSync(workspace, { recursive: true, force: true });
        fs.rmSync(libraryDist, { recursive: true, force: true });
    }
});
