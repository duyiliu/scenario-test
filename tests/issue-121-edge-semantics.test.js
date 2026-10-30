import assert from "node:assert/strict";
import test from "node:test";
import { createEngine } from "../src/engine.js";
import { defineScenario } from "../src/registry.js";

// Issue #121：重试/提取/URL 边缘语义
// 2) required:true 在空响应体上写入 null 并通过
// 3) 协议相对 URL 在 Node fetch 下失败
// 4) {{suite.x}} 误报 vars.suite 未定义（随 #112 一并修复，见 issue-112 用例）

function engineWith(handler, options = {}) {
    return createEngine({ baseUrl: "https://mock.local", fetch: handler, ...options });
}

test("#121：空响应体（204）按缺失处理，required: true 提取失败", async () => {
    const report = await engineWith(async () => new Response(null, { status: 204 })).runScenario(defineScenario({
        name: "空响应提取",
        steps: [{
            name: "删除后提取",
            path: "/orders/1",
            method: "DELETE",
            status: 204,
            extract: [{ name: "id", required: true }]
        }]
    }));
    const result = report.results[0];
    assert.equal(result.passed, false, "空响应体上 required 提取不应通过");
    assert.match(result.assertions.map((item) => item.name).join("\n"), /提取 id（路径不存在）/);
});

test("#121：空响应体上声明 default 时取兜底值，不写 null", async () => {
    const report = await engineWith(async () => new Response(null, { status: 204 })).runScenario(defineScenario({
        name: "空响应兜底",
        steps: [{
            name: "删除后提取",
            path: "/orders/1",
            method: "DELETE",
            status: 204,
            extract: [{ name: "next", default: "none" }]
        }]
    }));
    assert.equal(report.results[0].passed, true);
    assert.equal(report.vars.next, "none");
});

test("#121：body 字面量 null 仍是真实响应值（required 通过）", async () => {
    const report = await engineWith(async () => new Response("null", {
        status: 200,
        headers: { "Content-Type": "application/json" }
    })).runScenario(defineScenario({
        name: "JSON null",
        steps: [{ name: "取值", path: "/x", extract: [{ name: "value", required: true }] }]
    }));
    assert.equal(report.results[0].passed, true, "JSON null 有 bodyText，应按真实值处理");
    assert.equal(report.vars.value, null);
});

test("#121：协议相对 URL 按 baseUrl 协议补全，Node fetch 可解析", async () => {
    for (const [baseUrl, expected] of [
        ["https://api.example.com", "https://cdn.example.com/asset/1"],
        ["http://api.example.com", "http://cdn.example.com/asset/1"]
    ]) {
        const seen = [];
        const report = await createEngine({
            baseUrl,
            fetch: async (url) => {
                seen.push(String(url));
                return new Response(`{"url":"${String(url)}"}`, { headers: { "Content-Type": "application/json" } });
            }
        }).runScenario(defineScenario({
            name: "协议相对 URL",
            steps: [{ name: "取 CDN 资源", path: "//cdn.example.com/asset/1" }]
        }));
        assert.equal(report.results[0].passed, true);
        assert.deepEqual(seen, [expected]);
        // 真实 fetch 的入口校验：补全后的 URL 必须能被 URL 解析
        assert.doesNotThrow(() => new URL(seen[0]));
    }
});

test("#121：{{suite.x}} 不再产生 vars.suite 缺失告警", async () => {
    const report = await engineWith(async () => new Response("{}", {
        headers: { "Content-Type": "application/json" }
    })).runScenario(defineScenario({
        name: "suite 模板",
        steps: [{ name: "调用", path: "/orders/{{suite.token}}" }]
    }));
    const warnings = report.results[0].warnings.join("\n");
    assert.doesNotMatch(warnings, /vars\.suite/, `不应误报 suite 命名空间: ${warnings}`);
});
