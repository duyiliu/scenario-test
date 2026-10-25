import assert from "node:assert/strict";
import test from "node:test";
import vm from "node:vm";
import { createEngine } from "../src/index.js";
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

// request.timeoutMs 与 step.timeoutMs 共用运行期超时链（step 优先），但 request 对象会整体
// resolve，因此整串 {{ }} 模板是合法写法；非数字/0/负数/非模板字符串仍会被静默钳制为 30000ms。
test("#45 request.timeoutMs：非数字/0/负数/非模板字符串定义期拒绝", () => {
    for (const timeoutMs of [0, -1, -0.5, NaN, Infinity, -Infinity, "5000", "0", "abc", "{{vars.t}}000", null, true, [], {}]) {
        assertStepError({ path: "/x", request: { timeoutMs } }, /request\.timeoutMs 必须是正数或整串 \{\{ \}\} 模板/);
    }
});

test("#45 request.timeoutMs：正数与整串 {{ }} 模板放行，模板在运行期解析后生效", async () => {
    assert.doesNotThrow(() => defineStep({ path: "/x", request: { timeoutMs: 5000 } }));
    assert.doesNotThrow(() => defineStep({ path: "/x", request: { timeoutMs: 0.5, method: "POST" } }));
    assert.doesNotThrow(() => defineStep({ path: "/x", request: { timeoutMs: "{{vars.timeout}}" } }));
    // step.timeoutMs 与 request.timeoutMs 各自独立校验：step 优先不代表非法 request 值可静默
    assert.doesNotThrow(() => defineStep({ path: "/x", timeoutMs: 1000, request: { timeoutMs: "{{vars.timeout}}" } }));
    assertStepError({ path: "/x", timeoutMs: 1000, request: { timeoutMs: "0" } }, /request\.timeoutMs 必须是正数或整串/);

    // 模板解析后确实参与超时链路：挂起的 fetch 在 vars.timeout 毫秒后被中止并归类 TIMEOUT
    const scenario = defineScenario({
        name: "request.timeoutMs 模板",
        vars: { timeout: 30 },
        steps: [{ name: "挂起", path: "/x", request: { timeoutMs: "{{vars.timeout}}" }, assertions: [{ path: "code", equals: 200 }] }]
    });
    const report = await createEngine({
        baseUrl: "https://mock.local",
        fetch: async (_url, options) => new Promise((_resolve, reject) => {
            options.signal.addEventListener("abort", () => reject(options.signal.reason || new Error("aborted")));
        })
    }).runScenario(scenario);
    assert.equal(report.results[0].status, "TIMEOUT");
    assert.equal(report.results[0].timedOut, true);
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
    class CustomHeaders {
        constructor() {
            this["X-Test"] = "1";
        }
    }
    // 特制原型绕过：proto 自身无原型、constructor 伪装成 Object，且 X-Test 为继承的可枚举
    // 属性——运行期 clone 只保留自有属性，X-Test 会静默丢失，必须定义期拒绝
    const forgedPrototype = Object.create(null);
    forgedPrototype.constructor = Object;
    forgedPrototype["X-Test"] = "1";
    for (const headers of [
        "X-A: 1", 123, true, null, [], new Map([["X-A", "1"]]), new CustomHeaders(),
        Object.create(forgedPrototype)
    ]) {
        assertStepError({ path: "/x", request: { headers } }, /request\.headers 必须是普通对象/);
    }
    // request 本身的继承可枚举字段同样会被 clone(JSON) 丢弃：headers 看似合法、运行时静默丢头
    assertStepError(
        { path: "/x", request: Object.create({ headers: { "X-Test": "1" } }) },
        /request 包含继承的可枚举字段 "headers"/
    );
});

test("#45 request.headers：普通对象（含模板值）放行", () => {
    assert.doesNotThrow(() => defineStep({ path: "/x", request: { headers: {} } }));
    assert.doesNotThrow(() => defineStep({ path: "/x", request: { headers: Object.create(null) } }));
    assert.doesNotThrow(() => defineStep({
        path: "/x",
        request: { headers: { "X-Token": "{{vars.token}}", "Content-Type": "application/json" } }
    }));
    // node:vm 沙箱场景文件里的普通对象来自另一 realm，不能被原型严格判定误伤
    const crossRealmHeaders = vm.runInNewContext('({ "X-Token": "{{vars.token}}" })');
    assert.doesNotThrow(() => defineStep({ path: "/x", request: { headers: crossRealmHeaders } }));
    // request 对象本身也常来自 vm 沙箱：自有 headers 必须继续放行
    const crossRealmRequest = vm.runInNewContext('({ headers: { "X-Token": "{{vars.token}}" }, path: "/api" })');
    assert.doesNotThrow(() => defineStep({ request: crossRealmRequest }));
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

test("#45 适配器的 request.timeoutMs 模板在运行期解析后生效", async () => {
    const scenario = defineScenario({
        name: "适配器模板超时",
        vars: { timeout: 30 },
        steps: [{ name: "挂起", adapter: "hung", request: { timeoutMs: "{{vars.timeout}}" } }]
    });
    const startedAt = Date.now();
    const report = await createEngine({
        adapters: {
            hung: {
                async execute() {
                    await new Promise(() => {});
                }
            }
        }
    }).runScenario(scenario);
    const result = report.results[0];
    assert.equal(result.status, "TIMEOUT");
    assert.equal(result.timedOut, true);
    assert.match(result.error, /请求超时（30ms）/);
    assert.ok(Date.now() - startedAt < 1000, "适配器应按解析后的模板值超时，而不是退回 30000ms");
});

test("#45 request.timeoutMs 模板解析为非法值时发请求前明确报错", async () => {
    for (const timeout of [-1, 0, "abc", true, [5000], null]) {
        let fetchCalled = false;
        const scenario = defineScenario({
            name: "非法模板超时",
            vars: { timeout },
            steps: [{ name: "步骤", path: "/x", request: { timeoutMs: "{{vars.timeout}}" } }]
        });
        const report = await createEngine({
            baseUrl: "https://mock.local",
            fetch: async () => {
                fetchCalled = true;
                return new Response("{}", { status: 200, headers: { "Content-Type": "application/json" } });
            }
        }).runScenario(scenario);
        const result = report.results[0];
        assert.equal(fetchCalled, false, `timeout=${JSON.stringify(timeout)} 不应发起请求`);
        assert.equal(result.status, "ERROR");
        assert.match(result.error, /request\.timeoutMs 解析后不是有效的正数毫秒/);
    }
});

test("#45 超过 setTimeout 上限的正数 timeoutMs 不会立即超时", async () => {
    const scenario = defineScenario({
        name: "大超时",
        steps: [{
            name: "慢响应",
            path: "/x",
            timeoutMs: 2147483648,
            assertions: [{ path: "ok", equals: true }]
        }]
    });
    const report = await createEngine({
        baseUrl: "https://mock.local",
        fetch: async () => new Promise((resolve) => setTimeout(() => resolve(new Response(
            JSON.stringify({ ok: true }),
            { status: 200, headers: { "Content-Type": "application/json" } }
        )), 20))
    }).runScenario(scenario);
    const result = report.results[0];
    assert.equal(result.status, 200);
    assert.equal(result.timedOut, undefined);
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
