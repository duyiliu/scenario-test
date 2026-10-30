import assert from "node:assert/strict";
import test from "node:test";
import { buildUrl, joinUrl, queryPairs } from "../src/core.js";
import { createEngine } from "../src/engine.js";

// Issue #26 B4：joinUrl 此前只识别 ^https?://，协议相对 URL（//cdn.example.com/x）
// 的前导 // 被 strip 后拼进 baseUrl，产出形式有效但发往错误主机的请求。
test("B4：joinUrl 不破坏协议相对 URL", () => {
    assert.equal(joinUrl("http://api.example.com", "//cdn.example.com/x"), "//cdn.example.com/x");
    assert.equal(joinUrl("http://api.example.com", "/health"), "http://api.example.com/health");
    assert.equal(joinUrl("http://api.example.com", "https://cdn.example.com/x"), "https://cdn.example.com/x");
});

// Issue #26 B5：数组参数此前 String([1, 2]) 拼成 tags=1%2C2，把 "1,2" 当单值
// 传给后端；现展开为重复 key（tags=1&tags=2），与 Spring 等主流服务端数组语义一致。
test("B5：数组 params 展开为重复 key，空数组/空值不产生参数", () => {
    assert.equal(buildUrl("/list", { tags: [1, 2] }, { vars: {} }), "/list?tags=1&tags=2");
    assert.equal(
        buildUrl("/list?page=1", { tags: ["a b", "c"], empty: [], none: null }, { vars: {} }),
        "/list?page=1&tags=a%20b&tags=c"
    );
    assert.deepEqual(queryPairs("tags", [1, null, 2]), ["tags=1", "tags=2"]);
    assert.deepEqual(queryPairs("tags", undefined), []);
});

// 协议相对 URL 的步骤不注入环境凭据（与绝对 URL 同口径）
test("B4：协议相对 URL 同样不注入环境 Authorization/全局 query", async () => {
    const seen = [];
    const engine = createEngine({
        fetch: async (url, opts) => {
            seen.push({ url: String(url), headers: opts.headers });
            return new Response("{}", { status: 200, headers: { "content-type": "application/json" } });
        },
        baseUrl: "http://api.example.com",
        authorization: "Bearer secret",
        globals: [{ type: "query", name: "token", value: "t1" }]
    });
    await engine.runScenario({ name: "协议相对", steps: [{ name: "外链", path: "//cdn.example.com/x" }] });
    assert.equal(seen.length, 1);
    // #121：Node 路径按 baseUrl 协议补全（此前 fetch 会报 Failed to parse URL）
    assert.equal(seen[0].url, "http://cdn.example.com/x");
    assert.equal(seen[0].headers.Authorization, undefined, "协议相对 URL 不应注入环境授权");
    assert.ok(!seen[0].url.includes("token="), "协议相对 URL 不应注入全局 query");
});

// 全局 query 参数为数组值（模板整体解析出数组）时按重复 key 展开
test("B5：全局 query 数组值按重复 key 注入", async () => {
    const seen = [];
    const engine = createEngine({
        fetch: async (url) => {
            seen.push(String(url));
            return new Response("{}", { status: 200, headers: { "content-type": "application/json" } });
        },
        baseUrl: "http://api.example.com",
        vars: { tags: [1, 2] },
        globals: [{ type: "query", name: "tags", value: "{{vars.tags}}" }]
    });
    await engine.runScenario({ name: "全局数组", steps: [{ name: "列表", path: "/list" }] });
    assert.equal(seen[0], "http://api.example.com/list?tags=1&tags=2");
});
