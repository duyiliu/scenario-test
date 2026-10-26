import assert from "node:assert/strict";
import test from "node:test";
import { defineScenario } from "../src/registry.js";
import { contract, CONTRACT_VERSION } from "../src/contract.js";

// Issue #26 B1：拼错的 DSL 键此前被 defineScenario 静默接受——业务断言消失、
// 重试/超时失效，接口返回 2xx 即假绿。现按 contract.scenario.keys/stepKeys
// 白名单定义期拒绝（contract v9）。
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

// Issue #26 B3：request/params 非对象此前在运行期被静默忽略（headers/body/method
// 或整个 query 丢弃），请求照发并可能 PASS。
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

// Issue #26 F3：environment.authorization 一直被 CLI/浏览器消费，契约补投射
// （contract v11 引入；v12 新增 CLI --concurrency/--vars/--timeout，v13 新增 configKeys 与 retryUntil.retryOn，版本断言随契约递增）
test("F3：契约 environmentKeys 补投射 authorization（contract v14）", () => {
    assert.equal(CONTRACT_VERSION, 14);
    assert.ok(contract.config.environmentKeys.includes("authorization"));
});
