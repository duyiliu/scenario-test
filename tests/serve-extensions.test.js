import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import http from "node:http";
import test from "node:test";
import { createServeServer } from "../src/cli/serve-server.js";
import { loadServeExtensions, SERVE_EXTENSIONS_DIR } from "../src/cli/serve-extensions.js";

const distDir = path.join(path.resolve(path.dirname(fileURLToPath(import.meta.url)), ".."), "dist");

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

function rawRequest(port, requestPath, { method = "GET", headers = {}, body } = {}) {
    return new Promise((resolve, reject) => {
        const request = http.request({ host: "127.0.0.1", port, path: requestPath, method, headers }, (response) => {
            let text = "";
            response.on("data", (chunk) => { text += chunk; });
            response.on("end", () => resolve({ status: response.statusCode, body: text }));
        });
        request.on("error", reject);
        request.end(body);
    });
}

function makeWorkspace() {
    const workspace = fs.mkdtempSync(path.join(os.tmpdir(), "scenario-test-ext-"));
    fs.writeFileSync(path.join(workspace, "index.html"), "<!doctype html><html><head><title>x</title></head><body>ok</body></html>", "utf8");
    return workspace;
}

test("serve-extensions 加载器：合法扩展载入、坏导出跳过、加载失败告警", async () => {
    const workspace = makeWorkspace();
    const extDir = path.join(workspace, SERVE_EXTENSIONS_DIR);
    fs.mkdirSync(extDir);
    fs.writeFileSync(path.join(extDir, "a-good.mjs"), `export default { name: "good", handle: () => false };\n`, "utf8");
    fs.writeFileSync(path.join(extDir, "b-bad.mjs"), `export default { name: 1 };\n`, "utf8");
    fs.writeFileSync(path.join(extDir, "c-crash.mjs"), `throw new Error("boom");\n`, "utf8");
    fs.writeFileSync(path.join(extDir, "d-note.txt"), "not a module", "utf8");
    const warnings = [];
    try {
        const extensions = await loadServeExtensions(workspace, { warn: (line) => warnings.push(line) });
        assert.equal(extensions.length, 1);
        assert.equal(extensions[0].name, "good");
        assert.equal(extensions[0].file, "a-good.mjs");
        assert.equal(warnings.length, 2);
        assert.match(warnings[0], /b-bad\.mjs.*不符合约定/);
        assert.match(warnings[1], /c-crash\.mjs.*加载失败/);
    } finally {
        fs.rmSync(workspace, { recursive: true, force: true });
    }
});

test("serve-extensions 加载器：目录不存在返回空", async () => {
    const workspace = makeWorkspace();
    try {
        assert.deepEqual(await loadServeExtensions(workspace), []);
    } finally {
        fs.rmSync(workspace, { recursive: true, force: true });
    }
});

test("serve 扩展分发：接管命中路由、未命中回落静态、写方法校验来源、异常隔离", async () => {
    const workspace = makeWorkspace();
    const hits = [];
    const extensions = [
        {
            name: "e2e",
            async handle(request, response, pathname) {
                if (!pathname.startsWith("/e2e")) return false;
                hits.push(`${request.method} ${pathname}`);
                if (pathname === "/e2e/boom") throw new Error("inside extension");
                response.writeHead(200, { "Content-Type": "application/json" });
                response.end(JSON.stringify({ pathname }));
                return true;
            }
        }
    ];
    const port = await freePort();
    const server = createServeServer({
        workspace,
        libraryDist: distDir,
        port,
        config: { envs: [], baseUrl: "" },
        defaultTarget: { key: "default", envKey: "default", target: "" },
        extensions
    });
    await new Promise((resolve) => server.listen(port, "127.0.0.1", resolve));
    try {
        // 命中扩展路由
        const state = await fetch(`http://127.0.0.1:${port}/e2e/api/state`);
        assert.equal(state.status, 200);
        assert.equal((await state.json()).pathname, "/e2e/api/state");

        // 未命中 → 回落静态文件
        const page = await fetch(`http://127.0.0.1:${port}/`);
        assert.equal(page.status, 200);
        assert.match(await page.text(), /__SCENARIO_TEST_SERVE_PROXY__/);

        // 本机来源的 POST 正常进入扩展
        const localPost = await rawRequest(port, "/e2e/api/run", {
            method: "POST",
            headers: { Origin: `http://127.0.0.1:${port}`, "Content-Type": "application/json" },
            body: "{}"
        });
        assert.equal(localPost.status, 200);

        // 跨站来源的 POST 一律 403，且不触达扩展
        const hitsBefore = hits.length;
        const externalPost = await rawRequest(port, "/e2e/api/run", {
            method: "POST",
            headers: { Origin: "https://evil.example", "Content-Type": "application/json" },
            body: "{}"
        });
        assert.equal(externalPost.status, 403);
        assert.equal(hits.length, hitsBefore, "跨站写请求不应触达扩展");

        // 跨站 GET 导航仍放行（页面/资源允许外部链接跳入）
        const externalGet = await rawRequest(port, "/e2e/", { headers: { Referer: "https://wiki.example/page" } });
        assert.equal(externalGet.status, 200);

        // 扩展抛错 → 500 而不是杀死进程
        const boom = await fetch(`http://127.0.0.1:${port}/e2e/boom`);
        assert.equal(boom.status, 500);
        assert.match(await boom.text(), /扩展 e2e 处理失败/);

        // 异常后服务仍可用
        const after = await fetch(`http://127.0.0.1:${port}/e2e/api/state`);
        assert.equal(after.status, 200);
    } finally {
        await new Promise((resolve) => server.close(resolve));
        fs.rmSync(workspace, { recursive: true, force: true });
    }
});
