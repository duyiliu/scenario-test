import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import http from "node:http";
import test from "node:test";
import {
    buildProxyRequestHeaders,
    connectionNamedHeaders,
    createServeServer,
    isAllowedServeHost,
    rewriteProxyOriginHeaders,
    safeFile
} from "../src/cli/serve-server.js";

function startBackend(name) {
    const received = [];
    const server = http.createServer((request, response) => {
        received.push({ name, url: request.url, headers: request.headers });
        response.writeHead(200, { "Content-Type": "application/json" });
        response.end(JSON.stringify({ name, url: request.url }));
    });
    return new Promise((resolve) => {
        server.listen(0, "127.0.0.1", () => resolve({ server, received, port: server.address().port }));
    });
}

function listen(server) {
    return new Promise((resolve) => {
        server.listen(0, "127.0.0.1", () => resolve(server.address().port));
    });
}

async function freePort() {
    const server = http.createServer();
    const port = await listen(server);
    await new Promise((resolve) => server.close(resolve));
    return port;
}

function rawRequest(port, requestPath, headers = {}) {
    return new Promise((resolve, reject) => {
        const request = http.request({ host: "127.0.0.1", port, path: requestPath, headers }, (response) => {
            let body = "";
            response.on("data", (chunk) => { body += chunk; });
            response.on("end", () => resolve({ status: response.statusCode, body, headers: response.headers }));
        });
        request.on("error", reject);
        request.end();
    });
}

test("#33 serve 纯函数：Host 白名单、Connection 点名头、来源头重写、路径越界", () => {
    assert.equal(isAllowedServeHost("127.0.0.1:4300", 4300), true);
    assert.equal(isAllowedServeHost("localhost:4300", 4300), true);
    assert.equal(isAllowedServeHost("attacker.example.com", 4300), false);
    assert.deepEqual(connectionNamedHeaders("X-A, X-B,,"), ["x-a", "x-b"]);

    const local = "127.0.0.1:4300";
    const rewritten = rewriteProxyOriginHeaders(
        { Origin: "http://127.0.0.1:4300", Referer: "http://127.0.0.1:4300/page?x=1" },
        local,
        "https://api.example.com/base"
    );
    assert.equal(rewritten.Origin, "https://api.example.com");
    assert.equal(rewritten.Referer, "https://api.example.com/page?x=1");
    const external = rewriteProxyOriginHeaders({ Origin: "https://evil.example" }, local, "https://api.example.com");
    assert.equal(external.Origin, "https://evil.example");
    const none = rewriteProxyOriginHeaders({ Accept: "*/*" }, local, "https://api.example.com");
    assert.deepEqual(none, { Accept: "*/*" });

    const workspace = fs.mkdtempSync(path.join(os.tmpdir(), "scenario-test-safe-"));
    try {
        assert.equal(safeFile(workspace, "index.html"), path.join(workspace, "index.html"));
        assert.equal(safeFile(workspace, "../outside.txt"), null);
        assert.equal(safeFile(workspace, "a/../../outside.txt"), null);
        assert.equal(safeFile(workspace, ""), null);
    } finally {
        fs.rmSync(workspace, { recursive: true, force: true });
    }

    const headers = buildProxyRequestHeaders({
        headers: {
            host: "127.0.0.1:4300",
            connection: "X-Hop",
            "x-hop": "1",
            "x-scenario-test-env": "b",
            origin: "http://127.0.0.1:4300"
        }
    }, "http://backend.local");
    assert.equal(headers["x-hop"], undefined);
    assert.equal(headers["x-scenario-test-env"], undefined);
    assert.equal(headers.origin, "http://backend.local");
});

test("#60/#67 serve 按请求环境路由并重写 Origin/Referer，未知环境 502", async () => {
    const a = await startBackend("a");
    const b = await startBackend("b");
    const workspace = fs.mkdtempSync(path.join(os.tmpdir(), "scenario-test-serve-"));
    fs.writeFileSync(path.join(workspace, "index.html"), "<!doctype html><html><head><title>x</title></head><body>ok</body></html>", "utf8");
    fs.writeFileSync(path.join(workspace, "data.json"), "{\"ok\":true}", "utf8");
    const config = {
        envs: [
            { key: "a", name: "A", baseUrl: `http://127.0.0.1:${a.port}` },
            { key: "b", name: "B", baseUrl: `http://127.0.0.1:${b.port}` }
        ],
        defaultEnvKey: "a"
    };
    const defaultTarget = { key: "a", envKey: "a", target: `http://127.0.0.1:${a.port}` };
    const port = await freePort();
    const server = createServeServer({
        workspace,
        libraryDist: path.join(path.resolve(path.dirname(fileURLToPath(import.meta.url)), ".."), "dist"),
        port,
        config,
        defaultTarget
    });
    await new Promise((resolve) => server.listen(port, "127.0.0.1", resolve));
    try {
        const first = await fetch(`http://127.0.0.1:${port}/api/probe`);
        assert.equal(first.status, 200);
        assert.equal((await first.json()).name, "a");

        const switched = await rawRequest(port, "/api/probe", {
            "X-Scenario-Test-Env": "b",
            Origin: `http://127.0.0.1:${port}`,
            Referer: `http://127.0.0.1:${port}/index.html?x=1`
        });
        assert.equal(switched.status, 200);
        assert.equal(JSON.parse(switched.body).name, "b");
        const bRequest = b.received.at(-1);
        assert.equal(bRequest.headers["x-scenario-test-env"], undefined, "内部环境头不得转发到上游");
        assert.equal(bRequest.headers.origin, `http://127.0.0.1:${b.port}`);
        assert.equal(bRequest.headers.referer, `http://127.0.0.1:${b.port}/index.html?x=1`);

        // #119：跨站来源的代理请求一律 403，且不触达上游（写请求同样被拦）
        const receivedBeforeExternal = a.received.length;
        const external = await rawRequest(port, "/api/probe", { Origin: "https://evil.example" });
        assert.equal(external.status, 403);
        assert.equal(a.received.length, receivedBeforeExternal, "跨站请求不应触达上游");

        const unknown = await fetch(`http://127.0.0.1:${port}/api/probe`, { headers: { "X-Scenario-Test-Env": "nope" } });
        assert.equal(unknown.status, 502);
        assert.match(await unknown.text(), /可用值: a, b/);

        const page = await fetch(`http://127.0.0.1:${port}/`);
        assert.equal(page.status, 200);
        assert.match(await page.text(), /__SCENARIO_TEST_SERVE_PROXY__/);

        const staticJson = await fetch(`http://127.0.0.1:${port}/data.json`);
        assert.equal(staticJson.status, 200);
        assert.match(staticJson.headers.get("content-type"), /application\/json/);
        assert.equal(staticJson.headers.get("cache-control"), "no-store");

        const forbiddenHost = await rawRequest(port, "/", { Host: "attacker.example.com" });
        assert.equal(forbiddenHost.status, 403);

        const traversal = await rawRequest(port, "/..%2F..%2Fsecret.txt");
        assert.equal(traversal.status, 403);
    } finally {
        await new Promise((resolve) => server.close(resolve));
        a.server.close();
        b.server.close();
        fs.rmSync(workspace, { recursive: true, force: true });
    }
});

test("#33 serve 代理：无效目标与非静态请求回退转发", async () => {
    const workspace = fs.mkdtempSync(path.join(os.tmpdir(), "scenario-test-serve2-"));
    try {
        const config = { envs: [], baseUrl: "" };
        const port = await freePort();
        const server = createServeServer({
            workspace,
            libraryDist: path.join(path.resolve(path.dirname(fileURLToPath(import.meta.url)), ".."), "dist"),
            port,
            config,
            defaultTarget: { key: "default", envKey: "default", target: "192.168.1.5:8080" }
        });
        await new Promise((resolve) => server.listen(port, "127.0.0.1", resolve));
        try {
            const response = await fetch(`http://127.0.0.1:${port}/api/x`);
            assert.equal(response.status, 502);
            assert.match(await response.text(), /baseUrl/);
        } finally {
            await new Promise((resolve) => server.close(resolve));
        }
    } finally {
        fs.rmSync(workspace, { recursive: true, force: true });
    }
});
