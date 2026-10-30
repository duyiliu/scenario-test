import assert from "node:assert/strict";
import test from "node:test";
import { createRuntime } from "../src/engine.js";
import { defineScenario } from "../src/registry.js";

// Issue #113：suite 提取值覆盖场景 vars，实际优先级与注释/README 相反。
// 现按声明实现：suite（最低）< 场景 vars < 配置 vars < 选项 vars。
test("#113：suite 不再覆盖场景 vars", () => {
    const scenario = defineScenario({
        name: "场景",
        vars: { token: "scenario-default" },
        steps: [{ name: "步骤", path: "/x" }]
    });
    const runtime = createRuntime(scenario, { suite: { token: "suite-value" } });
    assert.equal(runtime.vars.token, "scenario-default");
    // suite 命名空间仍可独立读取提取值
    assert.equal(runtime.suite.token, "suite-value");
});

test("#113：配置 vars 与选项 vars 覆盖场景 vars，选项最高", () => {
    const scenario = defineScenario({
        name: "场景",
        vars: { token: "scenario-default", only: "scenario" },
        steps: [{ name: "步骤", path: "/x" }]
    });
    const runtime = createRuntime(scenario, {
        config: { vars: { token: "config-value" } },
        vars: { token: "options-value" },
        suite: { token: "suite-value", extra: "suite-extra" }
    });
    assert.equal(runtime.vars.token, "options-value");
    // 场景独有变量保留，suite 独有变量作为最低层仍可读
    assert.equal(runtime.vars.only, "scenario");
    assert.equal(runtime.vars.extra, "suite-extra");
});

test("#113：suiteVars 兼容别名行为一致", () => {
    const scenario = defineScenario({ name: "场景", vars: { token: "scenario-default" }, steps: [{ name: "步骤", path: "/x" }] });
    const runtime = createRuntime(scenario, { suiteVars: { token: "suite-value" } });
    assert.equal(runtime.vars.token, "scenario-default");
    assert.equal(runtime.suiteVars, runtime.suite);
});
