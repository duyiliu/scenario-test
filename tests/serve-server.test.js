import assert from "node:assert/strict";
import fs from "node:fs";
import http from "node:http";
import https from "node:https";
import os from "node:os";
import path from "node:path";
import { once } from "node:events";
import { PassThrough, Readable, Writable } from "node:stream";
import test from "node:test";
import {
    HOP_BY_HOP_HEADERS,
    PROXY_TIMEOUT_MS,
    abortProxyResponse,
    connectionNamedHeaders,
    contentType,
    createServeRequestHandler,
    createServeServer,
    filterProxyHeaders,
    isAllowedServeHost,
    proxyRequest,
    proxyTransport,
    respondProxyError,
    safeFile,
    serveStaticFile
} from "../src/cli/serve-server.js";

// 轻量响应桩：既能被 fs.createReadStream().pipe() 写入，也能观察 writeHead/destroy 调用。
// headersSent 同时模拟 Node ServerResponse 的“已写头”语义，用于 headsSent 回归。
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

function createFakeUpstream() {
    const upstream = new Writable({
        write(chunk, _encoding, callback) {
            upstream.body.push(Buffer.from(chunk));
            callback();
        }
    });
    upstream.body = [];
    upstream.timeoutMs = null;
    upstream.timeoutCallback = null;
    upstream.destroyError = null;
    upstream.setTimeout = function setTimeout(ms, callback) {
        this.timeoutMs = ms;
        this.timeoutCallback = callback;
    };
    const nativeDestroy = upstream.destroy.bind(upstream);
    upstream.destroy = (error) => {
        upstream.destroyError = error;
        return nativeDestroy(error);
    };
    return upstream;
}

function createFakeTransport(onRequest = () => {}) {
    return {
        request(url, options, callback) {
            const upstream = createFakeUpstream();
            onRequest({ url, options, callback, upstream });
            return upstream;
        }
    };
}

function fakeUpstreamResponse({ statusCode = 200, headers = {}, body = ["upstream"] } = {}) {
    const response = Readable.from(body.map((item) => Buffer.from(item)));
    response.statusCode = statusCode;
    response.headers = headers;
    return response;
}

function fakeProxyRequest(headers = {}) {
    const request = Readable.from([Buffer.from("")]);
    request.method = "GET";
    request.url = "/api/orders";
    request.headers = headers;
    return request;
}

async function freePort() {
    const server = http.createServer();
    await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
    const port = server.address().port;
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

test("filterProxyHeaders：双向剔除 hop-by-hop 与 Connection 点名头（大小写不敏感）", () => {
    assert.deepEqual(connectionNamedHeaders(" X-One, x-two ,,"), ["x-one", "x-two"]);
    assert.deepEqual(connectionNamedHeaders(undefined), []);
    const filtered = filterProxyHeaders({
        Host: "example.test",
        Connection: "X-Req-Hop",
        "X-Req-Hop": "1",
        "Keep-Alive": "timeout=5",
        "Transfer-Encoding": "chunked",
        Upgrade: "websocket",
        "Content-Type": "application/json"
    });
    assert.deepEqual(filtered, { "Content-Type": "application/json" });
    assert.equal(HOP_BY_HOP_HEADERS.has("host"), true);
});

test("isAllowedServeHost：仅放行本机回环 Host，阻断 DNS rebinding", () => {
    assert.equal(isAllowedServeHost("127.0.0.1:4300", 4300), true);
    assert.equal(isAllowedServeHost("LOCALHOST:4300", 4300), true);
    assert.equal(isAllowedServeHost("[::1]:4300", 4300), true);
    assert.equal(isAllowedServeHost("localhost", 4300), true);
    assert.equal(isAllowedServeHost("attacker.example.com", 4300), false);
    assert.equal(isAllowedServeHost("127.0.0.1:4301", 4300), false);
    assert.equal(isAllowedServeHost(undefined, 4300), false);
});

test("safeFile：拒绝路径穿越并返回工作区内真实文件", () => {
    const workspace = fs.mkdtempSync(path.join(os.tmpdir(), "scenario-test-safe-file-"));
    try {
        fs.writeFileSync(path.join(workspace, "index.html"), "ok", "utf8");
        assert.equal(safeFile(workspace, "index.html"), path.join(workspace, "index.html"));
        assert.equal(safeFile(workspace, "../outside.html"), null);
        assert.equal(safeFile(workspace, "nested/../../outside.html"), null);
        assert.equal(safeFile(workspace, ""), null);
    } finally {
        fs.rmSync(workspace, { recursive: true, force: true });
    }
});

test("proxyTransport：按协议选择 http/https，未知协议返回 null", () => {
    assert.equal(proxyTransport("http://127.0.0.1:8080"), http);
    assert.equal(proxyTransport("https://127.0.0.1:8443"), https);
    assert.equal(proxyTransport("ftp://127.0.0.1"), null);
    assert.equal(proxyTransport("127.0.0.1:8080"), null);
});

test("proxyRequest：请求/响应双向剥离并转发 body，http 目标不携带 TLS 放宽项", async () => {
    let captured;
    const transport = createFakeTransport(({ url, options, callback, upstream }) => {
        captured = { url, options, upstream };
        const upstreamResponse = fakeUpstreamResponse({
            statusCode: 201,
            headers: {
                "Content-Type": "text/plain",
                Connection: "X-Upstream-Hop",
                "X-Upstream-Hop": "leak",
                "Keep-Alive": "timeout=5",
                "Transfer-Encoding": "chunked"
            },
            body: ["upstream-body"]
        });
        process.nextTick(() => callback(upstreamResponse));
    });
    const request = Readable.from([Buffer.from("request-body")]);
    request.method = "POST";
    request.url = "/api/orders";
    request.headers = {
        Host: "127.0.0.1:4300",
        Connection: "X-Req-Hop",
        "X-Req-Hop": "1",
        "Keep-Alive": "timeout=5",
        "Content-Type": "text/plain",
        "Content-Length": "12"
    };
    const response = new MockResponse();
    proxyRequest(request, response, "http://backend:8080", { transport, timeoutMs: 1234 });

    await Promise.all([once(response, "finish"), once(captured.upstream, "finish")]);
    assert.equal(captured.url, "http://backend:8080/api/orders");
    assert.deepEqual(captured.options.headers, { "Content-Type": "text/plain", "Content-Length": "12" });
    assert.equal(captured.options.rejectUnauthorized, undefined);
    assert.equal(captured.upstream.timeoutMs, 1234);
    assert.equal(captured.upstream.body.toString(), "request-body");
    assert.equal(response.statusCode, 201);
    assert.equal(response.headers["Content-Type"], "text/plain");
    assert.equal(response.headers["X-Upstream-Hop"], undefined);
    assert.equal(response.headers["Keep-Alive"], undefined);
    assert.equal(response.headers["Transfer-Encoding"], undefined);
    assert.equal(response.text(), "upstream-body");
});

test("proxyRequest：https 目标放宽上游自签证书校验（rejectUnauthorized: false）", async () => {
    let captured;
    const transport = createFakeTransport(({ options, callback, upstream }) => {
        captured = { options, upstream };
        process.nextTick(() => callback(fakeUpstreamResponse({ body: ["secure"] })));
    });
    const response = new MockResponse();
    proxyRequest(fakeProxyRequest(), response, "https://backend:8443", { transport, secure: true });
    await once(response, "finish");
    assert.equal(captured.options.rejectUnauthorized, false);
    assert.equal(response.text(), "secure");
});

test("proxyRequest：无效目标/构造异常/上游错误均降级 502", async () => {
    const invalid = new MockResponse();
    proxyRequest(fakeProxyRequest(), invalid, "192.168.1.5:8080");
    await once(invalid, "finish");
    assert.equal(invalid.statusCode, 502);
    assert.match(invalid.text(), /baseUrl/);

    const throwingTransport = { request() { throw new Error("bad url"); } };
    const thrown = new MockResponse();
    proxyRequest(fakeProxyRequest(), thrown, "http://backend", { transport: throwingTransport });
    await once(thrown, "finish");
    assert.equal(thrown.statusCode, 502);
    assert.match(thrown.text(), /请求构造失败/);

    let upstream;
    const transport = createFakeTransport((context) => { upstream = context.upstream; });
    const failed = new MockResponse();
    proxyRequest(fakeProxyRequest(), failed, "http://backend", { transport });
    upstream.destroy(new Error("ECONNREFUSED"));
    await once(failed, "finish");
    assert.equal(failed.statusCode, 502);
    assert.match(failed.text(), /无法连接接口代理目标或代理超时/);
});

test("proxyRequest：上游超时销毁后按 502 降级，默认超时常量生效", async () => {
    let upstream;
    const transport = createFakeTransport((context) => { upstream = context.upstream; });
    const response = new MockResponse();
    proxyRequest(fakeProxyRequest(), response, "http://backend", { transport });
    assert.equal(upstream.timeoutMs, PROXY_TIMEOUT_MS);
    upstream.timeoutCallback();
    await once(response, "finish");
    assert.equal(upstream.destroyError.message, "接口代理超时");
    assert.equal(response.statusCode, 502);
});

test("respondProxyError：headersSent 后只销毁连接，绝不二次 writeHead", () => {
    const response = new MockResponse({ headersSent: true });
    respondProxyError(response, "Bad Gateway");
    assert.equal(response.statusCode, null);
    assert.deepEqual(response.writeHeadCalls, []);
    assert.equal(response.destroyCalls, 1);
    assert.equal(response.destroyed, true);
});

test("abortProxyResponse：已结束响应不重复销毁", async () => {
    const response = new MockResponse();
    response.end();
    await once(response, "finish");
    const destroyCallsBefore = response.destroyCalls;
    abortProxyResponse(response);
    assert.equal(response.destroyCalls, destroyCallsBefore);
});

test("proxyRequest：响应开始后上游 error 只销毁连接，不写 502 响应头", async () => {
    const upstreamResponse = new PassThrough();
    upstreamResponse.statusCode = 200;
    upstreamResponse.headers = { "Content-Type": "text/plain" };
    const transport = createFakeTransport(({ callback }) => {
        process.nextTick(() => callback(upstreamResponse));
    });
    const response = new MockResponse();
    proxyRequest(fakeProxyRequest(), response, "http://backend", { transport });
    // 等待回调写入 200 响应头并开始 pipe
    await new Promise((resolve) => setImmediate(resolve));
    assert.equal(response.headersSent, true);
    assert.equal(response.statusCode, 200);
    upstreamResponse.write("partial");
    upstreamResponse.emit("error", new Error("upstream reset"));
    await once(response, "close");
    assert.equal(response.destroyCalls, 1);
    assert.deepEqual(response.writeHeadCalls, [200]);
    assert.equal(response.statusCode, 200);
    assert.doesNotMatch(response.text(), /Bad Gateway/);
});

test("serveStaticFile：HTML 注入代理标记、非 HTML 流式返回、缺失文件 500", async () => {
    const workspace = fs.mkdtempSync(path.join(os.tmpdir(), "scenario-test-static-"));
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
    } finally {
        fs.rmSync(workspace, { recursive: true, force: true });
    }
});

test("contentType：已知扩展名映射且未知回落 octet-stream", () => {
    assert.equal(contentType("a.html"), "text/html; charset=utf-8");
    assert.equal(contentType("a.CSS"), "text/css; charset=utf-8");
    assert.equal(contentType("a.unknownext"), "application/octet-stream");
});

test("createServeRequestHandler：Host 校验、路径穿越、静态命中与库路径映射", async () => {
    const workspace = fs.mkdtempSync(path.join(os.tmpdir(), "scenario-test-handler-"));
    const libraryDist = fs.mkdtempSync(path.join(os.tmpdir(), "scenario-test-lib-"));
    try {
        fs.writeFileSync(path.join(workspace, "index.html"), "<html><head></head><body>ok</body></html>", "utf8");
        fs.writeFileSync(path.join(workspace, "app.js"), "console.log('ok')", "utf8");
        fs.writeFileSync(path.join(path.dirname(workspace), "outside.txt"), "outside", "utf8");
        fs.writeFileSync(path.join(libraryDist, "scenario-test.umd.js"), "umd-body", "utf8");
        const { port, close } = await startServe({ workspace, libraryDist });
        try {
            const forbidden = await requestRaw(port, "/", { Host: `attacker.example.com:${port}` });
            assert.equal(forbidden.status, 403);
            assert.equal(forbidden.body, "Forbidden");

            const traversal = await requestRaw(port, "/..%2foutside.txt");
            assert.equal(traversal.status, 403, "编码后的 ../ 穿越应在 safeFile 处被拒绝");

            const malformed = await requestRaw(port, "/%E0%A4%A");
            assert.equal(malformed.status, 400);

            const page = await requestRaw(port, "/", { Host: "localhost" });
            assert.equal(page.status, 200);
            assert.match(page.body, /__SCENARIO_TEST_SERVE_PROXY__/);
            assert.match(page.headers["content-type"], /text\/html/);

            const script = await requestRaw(port, "/app.js");
            assert.equal(script.status, 200);
            assert.match(script.headers["content-type"], /application\/javascript/);
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

test("createServeServer：静态未命中回退代理，transport 与超时均可注入", async () => {
    const workspace = fs.mkdtempSync(path.join(os.tmpdir(), "scenario-test-handler-proxy-"));
    try {
        let captured;
        const transport = createFakeTransport((context) => {
            captured = context;
            process.nextTick(() => context.callback(fakeUpstreamResponse({
                statusCode: 202,
                headers: {
                    "Content-Type": "text/plain",
                    Connection: "X-Hop",
                    "X-Hop": "leak",
                    "X-Keep": "ok"
                },
                body: ["proxied"]
            })));
        });
        const { port, close } = await startServe({
            workspace,
            libraryDist: workspace,
            proxyTarget: "http://backend:9999",
            transport,
            timeoutMs: 4321
        });
        try {
            const response = await requestRaw(port, "/api/orders");
            assert.equal(response.status, 202);
            assert.equal(response.body, "proxied");
            assert.equal(response.headers["x-hop"], undefined);
            assert.equal(response.headers["x-keep"], "ok");
            assert.equal(captured.url, "http://backend:9999/api/orders");
            assert.equal(captured.upstream.timeoutMs, 4321);
        } finally {
            await close();
        }
    } finally {
        fs.rmSync(workspace, { recursive: true, force: true });
    }
});
