import assert from "node:assert/strict";
import test from "node:test";
import { appendGlobalQuery, buildUrl } from "../src/core.js";
import { createEngine } from "../src/engine.js";
import { buildStepCurl } from "../src/browser/ui/curl.js";

// Issue #42：query 参数此前直接拼在 URL 末尾，会落到 fragment 之后；浏览器 fetch
// 不发送 fragment 之后的内容，参数静默丢失。参数必须拼在 # 之前，原 fragment 保留。
test("#42 buildUrl：无 query 时参数拼在 fragment 之前", () => {
    assert.equal(buildUrl("/api/x#section", { a: 1 }, { vars: {} }), "/api/x?a=1#section");
});

test("#42 buildUrl：已有 query 时用 & 续接且保留 fragment", () => {
    assert.equal(
        buildUrl("/api/x?page=1#section", { a: 1 }, { vars: {} }),
        "/api/x?page=1&a=1#section"
    );
});

test("#42 buildUrl：fragment 内含 ?/& 时仍只按第一个 # 拆分", () => {
    assert.equal(
        buildUrl("/api/x#/route?tab=a&b=c", { a: 1 }, { vars: {} }),
        "/api/x?a=1#/route?tab=a&b=c"
    );
    assert.equal(
        buildUrl("/api/x?page=1#/route?tab=a&b=c", { a: 1 }, { vars: {} }),
        "/api/x?page=1&a=1#/route?tab=a&b=c"
    );
});

test("#42 buildUrl：无参数时 fragment 原样保留", () => {
    assert.equal(buildUrl("/api/x#section", undefined, { vars: {} }), "/api/x#section");
    assert.equal(buildUrl("/api/x#section", {}, { vars: {} }), "/api/x#section");
});

test("#42 appendGlobalQuery：globals 与步骤参数并存且跳过已存在的 key", () => {
    const url = appendGlobalQuery(
        buildUrl("/api/x?page=1#section", { a: 1 }, { vars: {} }),
        [
            { type: "query", name: "g", value: "{{vars.g}}" },
            { type: "query", name: "a", value: "should-skip" },
            { type: "query", name: "page", value: "should-skip" }
        ],
        { vars: { g: "v" } }
    );
    // 步骤参数 a 先写入；globals 的 a/page 因 URL 已有同名 key 被跳过；fragment 保持在末尾
    assert.equal(url, "/api/x?page=1&a=1&g=v#section");
});

test("#42 引擎：globals query 注入到 fragment 之前", async () => {
    const seen = [];
    const engine = createEngine({
        fetch: async (url) => {
            seen.push(String(url));
            return new Response("{}", { status: 200, headers: { "content-type": "application/json" } });
        },
        baseUrl: "http://api.example.com",
        vars: { g: "v" },
        globals: [
            { type: "query", name: "g", value: "{{vars.g}}" },
            { type: "query", name: "a", value: "should-skip" }
        ]
    });
    await engine.runScenario({
        name: "fragment 全局参数",
        steps: [{ name: "带锚点", path: "/api/x#section", params: { a: 1 } }]
    });
    assert.equal(seen[0], "http://api.example.com/api/x?a=1&g=v#section");
});

test("#42 cURL 预览：globals query 注入到 fragment 之前", () => {
    const curl = buildStepCurl(
        { method: "GET", path: "/api/x#section", params: { a: 1 } },
        {
            baseUrl: "http://api.example.com",
            vars: { g: "v" },
            globals: [{ type: "query", name: "g", value: "{{vars.g}}" }]
        }
    );
    assert.equal(curl, "curl -X GET 'http://api.example.com/api/x?a=1&g=v#section'");
});

test("#42 绝对/协议相对 URL：引擎与 cURL 默认都不注入环境 globals", async () => {
    const globals = [
        { type: "query", name: "g", value: "{{vars.g}}" },
        { type: "header", name: "X-Global", value: "{{vars.g}}" },
        { type: "cookie", name: "session", value: "{{vars.g}}" }
    ];
    for (const path of [
        "https://other.example.com/api/x#section",
        "//other.example.com/api/x#section"
    ]) {
        const seen = [];
        const engine = createEngine({
            fetch: async (url) => {
                seen.push(String(url));
                return new Response("{}", { status: 200, headers: { "content-type": "application/json" } });
            },
            baseUrl: "http://api.example.com",
            vars: { g: "v" },
            globals
        });
        await engine.runScenario({
            name: "外链不注入环境参数",
            steps: [{ name: "外链", path, params: { a: 1 } }]
        });
        const curl = buildStepCurl(
            { method: "GET", path, params: { a: 1 } },
            { baseUrl: "http://api.example.com", vars: { g: "v" }, globals }
        );
        const expected = `${path.slice(0, path.indexOf("#"))}?a=1${path.slice(path.indexOf("#"))}`;
        assert.equal(seen[0], expected);
        assert.equal(curl, `curl -X GET '${seen[0]}'`);
        assert.ok(!curl.includes("X-Global"), "绝对 URL 不应注入全局 header");
        assert.ok(!curl.includes("session="), "绝对 URL 不应注入全局 cookie");
    }
});

test("#42 绝对 URL 显式 useEnvironmentAuthorization：引擎与 cURL 都注入 globals query", async () => {
    const globals = [{ type: "query", name: "g", value: "{{vars.g}}" }];
    const step = {
        name: "外链显式启用",
        method: "GET",
        path: "https://other.example.com/api/x#section",
        request: { useEnvironmentAuthorization: true }
    };
    const seen = [];
    const engine = createEngine({
        fetch: async (url) => {
            seen.push(String(url));
            return new Response("{}", { status: 200, headers: { "content-type": "application/json" } });
        },
        baseUrl: "http://api.example.com",
        vars: { g: "v" },
        globals
    });
    await engine.runScenario({ name: "外链显式启用", steps: [step] });
    const curl = buildStepCurl(step, { baseUrl: "http://api.example.com", vars: { g: "v" }, globals });
    assert.equal(seen[0], "https://other.example.com/api/x?g=v#section");
    assert.equal(curl, `curl -X GET '${seen[0]}'`);
});

test("#42 引擎与 cURL 预览对同一输入生成相同 URL", async () => {
    const globals = [
        { type: "query", name: "g", value: "{{vars.g}}" },
        { type: "query", name: "a", value: "should-skip" }
    ];
    const step = { name: "带锚点", method: "GET", path: "/api/x?page=1#section", params: { a: 1 } };
    const seen = [];
    const engine = createEngine({
        fetch: async (url) => {
            seen.push(String(url));
            return new Response("{}", { status: 200, headers: { "content-type": "application/json" } });
        },
        baseUrl: "http://api.example.com",
        vars: { g: "v" },
        globals
    });
    await engine.runScenario({ name: "引擎与 cURL 一致", steps: [step] });
    const curl = buildStepCurl(step, { baseUrl: "http://api.example.com", vars: { g: "v" }, globals });
    assert.equal(curl, `curl -X GET '${seen[0]}'`);
    assert.equal(seen[0], "http://api.example.com/api/x?page=1&a=1&g=v#section");
});
