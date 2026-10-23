import assert from "node:assert/strict";
import test from "node:test";
import { buildUrl, joinUrl, queryPairs } from "../src/core.js";
import { createEngine } from "../src/engine.js";
import { defineScenario } from "../src/registry.js";

// Issue #26 回归：B1 步骤/场景未知键、B2 适配器超时、B3 request/params 类型、
// B4 协议相对 URL、B5 数组参数序列化。

test("B1：HTTP 步骤拼错的 DSL 键定义期拒绝，适配器私有配置键仍放行", () => {
    const base = (step) => ({ name: "场景", steps: [{ name: "步骤", path: "/x", ...step }] });
    assert.throws(() => defineScenario(base({ assertion: [{ exists: true }] })), /未知键 "assertion"/);
    assert.throws(() => defineScenario(base({ extracts: [{ name: "a" }] })), /未知键 "extracts"/);
    assert.throws(() => defineScenario(base({ retryuntill: {} })), /未知键 "retryuntill"/);
    assert.throws(() => defineScenario(base({ timeoutMS: 5000 })), /未知键 "timeoutMS"/);
    assert.throws(() => defineScenario({ name: "场景", steps: [], extra: 1 }), /未知键 "extra"/);
    // matches 自动分发的适配器步骤可携带私有配置（非 DSL 字段）
    assert.doesNotThrow(() => defineScenario({ name: "场景", steps: [{ name: "本地", prepareLocal: true }] }));
    // 疑似拼写错误即使出现在适配器步骤也拒绝
    assert.throws(
        () => defineScenario({ name: "场景", steps: [{ name: "本地", adapter: "local", assertion: [] }] }),
        /未知键 "assertion"/
    );
});

test("B3：request/params 非对象与双写冲突定义期拒绝", () => {
    assert.throws(
        () => defineScenario({ name: "场景", steps: [{ name: "步骤", path: "/x", request: "not-an-object" }] }),
        /request 必须是对象/
    );
    assert.throws(
        () => defineScenario({ name: "场景", steps: [{ name: "步骤", path: "/x", params: "page=1" }] }),
        /params 必须是对象/
    );
    assert.throws(
        () => defineScenario({ name: "场景", steps: [{ name: "步骤", path: "/x", request: { params: null } }] }),
        /request\.params 必须是对象/
    );
    assert.throws(
        () => defineScenario({
            name: "场景",
            steps: [{ name: "步骤", path: "/x", params: { a: 1 }, request: { params: { b: 2 } } }]
        }),
        /同时声明了 params 与 request\.params/
    );
});

test("B4：joinUrl 不破坏协议相对 URL", () => {
    assert.equal(joinUrl("http://api.example.com", "//cdn.example.com/x"), "//cdn.example.com/x");
    assert.equal(joinUrl("http://api.example.com", "/health"), "http://api.example.com/health");
    assert.equal(joinUrl("http://api.example.com", "https://cdn.example.com/x"), "https://cdn.example.com/x");
});

test("B5：数组 params 展开为重复 key，空数组/空值不产生参数", () => {
    assert.equal(buildUrl("/list", { tags: [1, 2] }, { vars: {} }), "/list?tags=1&tags=2");
    assert.equal(buildUrl("/list?page=1", { tags: ["a b", "c"], empty: [], none: null }, { vars: {} }), "/list?page=1&tags=a%20b&tags=c");
    assert.deepEqual(queryPairs("tags", [1, null, 2]), ["tags=1", "tags=2"]);
    assert.deepEqual(queryPairs("tags", undefined), []);
});

test("B2：适配器步骤 timeoutMs 生效并归类为结构化 TIMEOUT", async () => {
    const engine = createEngine({
        adapters: {
            slow: {
                async execute() {
                    await new Promise((resolve) => setTimeout(resolve, 500));
                    return { status: 200, headers: {}, body: { ok: true }, bodyText: null };
                }
            }
        }
    });
    const startedAt = Date.now();
    const report = await engine.runScenario({
        name: "适配器超时",
        steps: [{ name: "慢步骤", adapter: "slow", timeoutMs: 50, assertions: [{ exists: true, path: "ok" }] }]
    });
    const result = report.results[0];
    assert.equal(result.status, "TIMEOUT");
    assert.equal(result.timedOut, true);
    assert.match(result.error, /请求超时（50ms）/);
    assert.ok(Date.now() - startedAt < 450, "超时应及时中断，而不是等适配器执行完");
});
