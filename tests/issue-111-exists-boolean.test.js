import assert from "node:assert/strict";
import test from "node:test";
import { defineScenario } from "../src/registry.js";
import { evaluateAssertion } from "../src/core.js";

// Issue #111：exists 未校验类型/模板。运行期是 Boolean(definition.exists) 直判，
// exists: "false"、exists: 0 都会被当成 true；模板不解析也恒判真——典型假绿入口。
test("#111：非 boolean 的 exists（含字符串与模板）在定义期即拒绝", () => {
    const withExists = (value) => () => defineScenario({
        name: "场景",
        steps: [{ name: "步骤", path: "/x", assertions: [{ path: "data.id", exists: value }] }]
    });
    for (const value of ["false", "{{vars.flag}}", 0, 1, null, {}]) {
        assert.throws(withExists(value), /exists 只接受 boolean/, `exists: ${JSON.stringify(value)} 应定义期报错`);
    }
    // 布尔字面量保持合法
    assert.doesNotThrow(withExists(true));
    assert.doesNotThrow(withExists(false));
});

test("#111：when 对象里的 exists 与断言同一口径（非 boolean 定义期拒绝）", () => {
    assert.throws(
        () => defineScenario({
            name: "场景",
            steps: [
                { name: "步骤1", path: "/x" },
                { name: "步骤2", path: "/y", when: { from: "vars", path: "id", exists: "false" } }
            ]
        }),
        /exists 只接受 boolean/
    );
    // each 子断言递归同一校验
    assert.throws(
        () => defineScenario({
            name: "场景",
            steps: [{ name: "步骤", path: "/x", assertions: [{ path: "items", each: { path: "id", exists: "true" } }] }]
        }),
        /exists 只接受 boolean/
    );
});

test("#111：exists 语义保持 boolean 直判（缺失=false 通过、存在=true 通过）", () => {
    const runtime = { vars: {} };
    const response = { status: 200, body: { data: {} }, headers: {} };
    assert.equal(evaluateAssertion({ path: "data.id", exists: false }, response, runtime).passed, true);
    assert.equal(evaluateAssertion({ path: "data", exists: true }, response, runtime).passed, true);
    assert.equal(evaluateAssertion({ path: "data.id", exists: true }, response, runtime).passed, false);
    // 空串按缺失处理
    assert.equal(evaluateAssertion({ path: "data.s", exists: false }, { ...response, body: { data: { s: "" } } }, runtime).passed, true);
});
