import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import http from "node:http";
import { createServeServer } from "../src/cli/serve-server.js";

async function fixture(t, extensions = [], libraryRelative = "") {
    const workspace = fs.mkdtempSync(path.join(os.tmpdir(), "serve-identity-"));
    fs.writeFileSync(path.join(workspace, "index.html"), "<html><head></head><body>原工作台</body></html>");
    const server = createServeServer({ workspace, libraryDist: path.join(workspace, libraryRelative), port: 0, extensions });
    await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
    const port = server.address().port;
    t.after(async () => {
        await server.disposeExtensions().catch(() => {});
        await new Promise((resolve) => server.close(resolve));
        fs.rmSync(workspace, { recursive: true, force: true });
    });
    async function request(url, method = "GET") {
        return new Promise((resolve, reject) => {
            const req = http.request({ host: "127.0.0.1", port, path: url, method, headers: { Host: "localhost" } }, (res) => {
                let body = "";
                res.on("data", (data) => body += data);
                res.on("end", () => resolve({ status: res.statusCode, body }));
            });
            req.on("error", reject); req.end();
        });
    }
    return { workspace, server, request };
}

test("服务身份固定于启动，保留项目主页并注入 E2E 导航", async (t) => {
    const { workspace, request } = await fixture(t, [{ name: "e2e", handle: () => false }]);
    const identity = JSON.parse((await request("/__scenario-test__/status")).body);
    assert.equal(identity.workspace, workspace);
    assert.equal(identity.pid, process.pid);
    assert.ok(identity.version && identity.buildId && identity.contractVersion);
    assert.deepEqual(identity.extensions, ["e2e"]);
    fs.writeFileSync(path.join(workspace, "package.json"), '{"version":"99.0.0"}');
    assert.deepEqual(JSON.parse((await request("/__scenario-test__/status")).body), identity);
    assert.equal((await request("/__scenario-test__/status", "POST")).status, 405);
    const html = (await request("/")).body;
    assert.match(html, /原工作台/);
    assert.match(html, /data-scenario-test-e2e/);
    assert.doesNotMatch(fs.readFileSync(path.join(workspace, "index.html"), "utf8"), /data-scenario-test-e2e/);
});

test("私有文件拒绝在扩展/静态/代理之前，junction 别名也不能泄漏", async (t) => {
    let hits = 0;
    const { workspace, request } = await fixture(t, [{ name: "any", handle: () => { hits++; return false; } }]);
    fs.mkdirSync(path.join(workspace, ".auth"));
    fs.writeFileSync(path.join(workspace, ".auth", "state.json"), "secret");
    fs.symlinkSync(path.join(workspace, ".auth"), path.join(workspace, "public-alias"), "junction");
    for (const url of ["/.env", "/.env.local", "/.auth/state.json", "/node_modules/pkg/a.js", "/test-results/x", "/e2e-evidence/x"]) {
        assert.equal((await request(url)).status, 403, url);
    }
    assert.equal(hits, 0);
    assert.equal((await request("/public-alias/state.json")).status, 403);
});

test("扩展清理只执行一次，个别失败不阻断其他清理", async (t) => {
    const calls = [];
    const { server } = await fixture(t, [
        { name: "a", handle: () => false, dispose: async () => { calls.push("a"); throw Error("fail"); } },
        { name: "b", handle: () => false, dispose: async () => { calls.push("b"); } }
    ]);
    await assert.rejects(server.disposeExtensions(), /清理失败/);
    await assert.rejects(server.disposeExtensions(), /清理失败/);
    assert.deepEqual(calls, ["a", "b"]);
});

test("npm 安装目录的公开 UMD 别名可用，其他依赖保持私有", async (t) => {
    const { workspace, request } = await fixture(t, [], "node_modules/@yc_yzkj/scenario-test/dist");
    const nested = path.join(workspace, "node_modules", "@yc_yzkj", "scenario-test", "dist");
    fs.mkdirSync(nested, { recursive: true });
    fs.writeFileSync(path.join(nested, "scenario-test.umd.js"), "public-runtime");
    for (const url of ["/__scenario-test__/scenario-test.umd.js", "/dist/scenario-test.umd.js", "/node_modules/@yc_yzkj/scenario-test/dist/scenario-test.umd.js"]) {
        const result = await request(url);
        assert.equal(result.status, 200, url);
        assert.equal(result.body, "public-runtime");
    }
    assert.equal((await request("/.env::$DATA")).status, 403);
    assert.equal((await request("/node_modules/@yc_yzkj/scenario-test/dist/private.js")).status, 403);
});
