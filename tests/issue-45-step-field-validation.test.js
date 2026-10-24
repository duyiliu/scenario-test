import assert from "node:assert/strict";
import test from "node:test";
import { defineScenario } from "../src/registry.js";

// Issue #45：step 的 timeoutMs / saveResponseAs / path / request.path / request.headers
// 此前没有定义期校验——非法值被运行期静默钳制、隐式 String() 或拖到响应体读完后才抛错。
// 这里逐字段覆盖「非法值定义期拒绝」「合法模板放行」「既有报错优先级不回归」。
function defineStep(step, scenarioName = "字段校验") {
    return defineScenario({ name: scenarioName, steps: [{ name: "步骤", ...step }] });
}

function assertStepError(step, pattern, { scenarioName = "字段校验", checkLocation = true } = {}) {
    assert.throws(
        () => defineStep(step, scenarioName),
        (error) => {
            assert.ok(error instanceof TypeError, `应抛 TypeError，实际 ${error?.name}`);
            assert.match(error.message, pattern);
            if (checkLocation) {
                // 新增校验的定位信息：场景名 + 步骤序号 + 步骤名
                assert.match(error.message, new RegExp(`场景 ${scenarioName} 第 1 步（步骤 步骤）`));
            }
            return true;
        }
    );
}

test("#45 timeoutMs：非数字/0/负数/字符串/模板定义期拒绝", () => {
    for (const timeoutMs of [0, -1, -0.5, NaN, Infinity, -Infinity, "5000", "0", "{{vars.timeout}}", null, true, [], {}]) {
        assertStepError({ path: "/x", timeoutMs }, /timeoutMs 必须是正数/);
    }
});

test("#45 timeoutMs：合法正数放行（含小数）", () => {
    assert.doesNotThrow(() => defineStep({ path: "/x", timeoutMs: 1 }));
    assert.doesNotThrow(() => defineStep({ path: "/x", timeoutMs: 0.5, method: "POST" }));
    assert.doesNotThrow(() => defineStep({ path: "/x", timeoutMs: 30000 }));
});

test("#45 saveResponseAs：空串/空白/非字符串定义期拒绝", () => {
    for (const saveResponseAs of ["", "   ", 123, null, undefined, {}, []]) {
        if (saveResponseAs === undefined) {
            // undefined 等同未声明，应放行
            assert.doesNotThrow(() => defineStep({ path: "/x", saveResponseAs }));
            continue;
        }
        assertStepError({ path: "/x", saveResponseAs }, /saveResponseAs 必须是非空字符串/);
    }
});

test("#45 saveResponseAs：普通路径与 {{ }} 模板放行", () => {
    assert.doesNotThrow(() => defineStep({ path: "/x", saveResponseAs: "output/report.pdf" }));
    assert.doesNotThrow(() => defineStep({ path: "/x", saveResponseAs: "output/report-{{vars.id}}.pdf" }));
    assert.doesNotThrow(() => defineStep({ path: "/x", saveResponseAs: "{{vars.fileName}}" }));
});

test("#45 path / request.path：非字符串定义期拒绝（带不带 params 同一口径）", () => {
    for (const path of [123, null, true, [], {}, () => {}]) {
        assertStepError({ path }, /的 path 必须是字符串/);
        assertStepError({ request: { path } }, /的 request\.path 必须是字符串/);
        // 带 params 时旧实现会抛 rawPath.includes TypeError，现在统一在定义期报错
        assertStepError({ path, params: { page: 1 } }, /的 path 必须是字符串/);
    }
});

test("#45 path / request.path：普通路径、空串（根路径）与 {{ }} 模板放行", () => {
    assert.doesNotThrow(() => defineStep({ path: "/api/users" }));
    assert.doesNotThrow(() => defineStep({ path: "" }));
    assert.doesNotThrow(() => defineStep({ path: "{{vars.basePath}}/users" }));
    assert.doesNotThrow(() => defineStep({ request: { path: "/api/users" } }));
    assert.doesNotThrow(() => defineStep({ request: { path: "{{vars.path}}" } }));
});

test("#45 request.headers：非普通对象定义期拒绝", () => {
    for (const headers of ["X-A: 1", 123, true, null, [], new Map([["X-A", "1"]])]) {
        assertStepError({ path: "/x", request: { headers } }, /request\.headers 必须是普通对象/);
    }
});

test("#45 request.headers：普通对象（含模板值）放行", () => {
    assert.doesNotThrow(() => defineStep({ path: "/x", request: { headers: {} } }));
    assert.doesNotThrow(() => defineStep({
        path: "/x",
        request: { headers: { "X-Token": "{{vars.token}}", "Content-Type": "application/json" } }
    }));
});

test("#45 适配器步骤：私有配置键仍放行，DSL 字段校验与 HTTP 步骤一致", () => {
    // matches 自动分发 / 显式 adapter 的私有配置键不属于 DSL，不被误伤
    assert.doesNotThrow(() => defineScenario({
        name: "适配器私有配置",
        steps: [{ name: "本地", prepareLocal: true }]
    }));
    assert.doesNotThrow(() => defineScenario({
        name: "适配器私有配置",
        steps: [{ name: "本地", adapter: "local", prepareLocal: { nested: true } }]
    }));
    // timeoutMs 被引擎用于适配器超时控制，非法值同样定义期拒绝
    assertStepError({ adapter: "local", timeoutMs: 0 }, /timeoutMs 必须是正数/);
    // 适配器步骤的 DSL 字段也按同一契约校验
    assertStepError({ adapter: "local", saveResponseAs: "" }, /saveResponseAs 必须是非空字符串/);
    assertStepError({ adapter: "local", path: 123 }, /的 path 必须是字符串/);
});

test("#45 既有报错优先级不回归：GET 带体 / 断言未知键仍先于新增校验报错", () => {
    // GET 带体是既有校验，放在 timeoutMs 之前
    assertStepError(
        { path: "/x", timeoutMs: 0, request: { body: { a: 1 } } },
        /GET 请求不能携带请求体/,
        { checkLocation: false }
    );
    // 断言定义期校验（含未知键）同样先于新增字段校验
    assertStepError(
        { path: "/x", timeoutMs: 0, assertions: [{ path: "a", bogus: 1 }] },
        /未知键 "bogus"/,
        { checkLocation: false }
    );
});
