import assert from "node:assert/strict";
import test from "node:test";
import {
    createEngine,
    defineScenario,
    getAdapter,
    listAdapters,
    registerAdapter,
    clearAdapters,
    clearScenarios,
    getScenario,
    registerScenario,
    unregisterAdapter,
    validateAdapter,
    validateAdapterResponse
} from "../src/index.js";

// ==================== adapter-types：协议校验 ====================

test("validateAdapter：非对象 / 缺 execute / 可选钩子非函数均报错", () => {
    assert.throws(() => validateAdapter(null), /适配器必须是对象/);
    assert.throws(() => validateAdapter("nope"), /适配器必须是对象/);
    assert.throws(() => validateAdapter({}), /缺少必需的 execute 方法/);
    assert.throws(
        () => validateAdapter({ execute() {}, matches: "yes" }),
        /matches 必须是函数/
    );
    assert.throws(
        () => validateAdapter({ execute() {}, initialize: 1, onError: {} }, "bad"),
        /适配器 bad 验证失败:\n\s+- initialize 必须是函数\n\s+- onError 必须是函数/
    );
});

test("validateAdapter：含全部合法钩子的适配器通过", () => {
    const adapter = {
        execute() {},
        initialize() {},
        matches() {},
        beforeExecute() {},
        afterExecute() {},
        onError() {},
        dispose() {}
    };
    assert.doesNotThrow(() => validateAdapter(adapter));
});

test("validateAdapterResponse：非对象 / 缺 status / headers 非对象报错，合法结构通过", () => {
    assert.throws(() => validateAdapterResponse(null, "a"), /适配器 a 返回值必须是对象/);
    assert.throws(() => validateAdapterResponse({}, "a"), /响应缺少 status 字段/);
    assert.throws(() => validateAdapterResponse({ status: 200, headers: "x" }, "a"), /headers 必须是对象/);
    // 裸响应与 { response } 包装两种形态都合法
    assert.equal(validateAdapterResponse({ status: 200 }), true);
    assert.equal(validateAdapterResponse({ response: { status: 200, headers: {} } }), true);
});

// ==================== registry：全局适配器注册 API ====================

test("registerAdapter：初始化钩子执行后可 getAdapter/listAdapters，listAdapters 返回副本", () => {
    const initialized = [];
    const adapter = {
        initialize() { initialized.push("init"); },
        execute() { return { response: { status: 200, headers: {}, body: null, bodyText: null } }; }
    };
    registerAdapter("registry-test", adapter);
    try {
        assert.deepEqual(initialized, ["init"]);
        assert.equal(getAdapter("registry-test"), adapter);
        const listed = listAdapters();
        assert.equal(listed.get("registry-test"), adapter);
        // 副本语义：引擎 isolateAdapters 依赖它，改副本不能污染全局注册表
        listed.set("registry-test", {});
        assert.equal(getAdapter("registry-test"), adapter);
    } finally {
        unregisterAdapter("registry-test");
    }
    assert.equal(getAdapter("registry-test"), undefined);
});

test("registerAdapter：initialize 抛错时不注册并包装为 TypeError", () => {
    assert.throws(
        () => registerAdapter("registry-bad-init", { initialize() { throw new Error("boom"); }, execute() {} }),
        /适配器 registry-bad-init 初始化失败: boom/
    );
    assert.equal(getAdapter("registry-bad-init"), undefined);
});

test("registerAdapter：空名称直接拒绝", () => {
    assert.throws(() => registerAdapter("  ", { execute() {} }), /适配器名称不能为空/);
});

test("unregisterAdapter：触发 dispose；dispose 抛错不影响注销", () => {
    const disposed = [];
    registerAdapter("registry-dispose", {
        dispose() { disposed.push("ok"); },
        execute() {}
    });
    unregisterAdapter("registry-dispose");
    assert.deepEqual(disposed, ["ok"]);
    assert.equal(getAdapter("registry-dispose"), undefined);

    registerAdapter("registry-dispose-throw", {
        dispose() { throw new Error("cleanup boom"); },
        execute() {}
    });
    assert.doesNotThrow(() => unregisterAdapter("registry-dispose-throw"));
    assert.equal(getAdapter("registry-dispose-throw"), undefined);
});

// ==================== engine：适配器执行钩子协议 ====================

test("执行钩子：beforeExecute 收原始定义，execute 收 resolve 副本，afterExecute 可覆盖输出", async () => {
    const seen = { before: null, execute: null, after: null };
    const adapter = {
        async beforeExecute({ step }) {
            seen.before = step;
            // 修改原始定义会随深拷贝进入 execute（引擎契约）
            step.name = "改写后的步骤";
        },
        async execute({ step }) {
            seen.execute = step;
            // execute 收到的是独立副本：修改不泄漏回原始 step
            step.name = "execute 内改写";
            return {
                method: "ADAPTER",
                path: step.path,
                response: { status: 200, headers: {}, body: { marker: "{{vars.token}}" }, bodyText: null }
            };
        },
        async afterExecute({ step, output }) {
            seen.after = { stepName: step.name, output };
            // 覆盖输出：把 body 换成加工后的标记
            return { ...output, response: { ...output.response, body: { marker: "after-processed" } } };
        }
    };
    const scenario = defineScenario({
        name: "钩子协议",
        vars: { token: "T-1" },
        steps: [{ name: "原始步骤", adapter: "hooked", path: "do/{{vars.token}}", assertions: [{ path: "marker", equals: "after-processed" }] }]
    });
    const report = await createEngine({ fetch: async () => { throw new Error("不应发起 HTTP"); }, adapters: { hooked: adapter } })
        .runScenario(scenario);

    assert.equal(report.passed, true);
    // beforeExecute / afterExecute 看到的是未做 {{vars.*}} 替换的原始定义
    assert.equal(seen.before.path, "do/{{vars.token}}");
    assert.equal(seen.after.stepName, "改写后的步骤");
    // execute 收到 resolve 后的副本，且其内部修改不回写原始步骤
    assert.equal(seen.execute.path, "do/T-1");
    assert.equal(scenario.steps[0].name, "改写后的步骤");
    assert.notEqual(scenario.steps[0].name, "execute 内改写");
});

test("执行失败：onError 收到原始异常，错误包装为 AdapterExecutionError 且步骤判 ERROR", async () => {
    const seen = [];
    const adapter = {
        async execute() { throw new Error("适配器内部故障"); },
        async onError({ error }) { seen.push(error.message); }
    };
    const scenario = defineScenario({
        name: "失败钩子",
        steps: [{ name: "会失败", adapter: "faulty" }]
    });
    const report = await createEngine({ fetch: async () => new Response("ok"), adapters: { faulty: adapter } })
        .runScenario(scenario);

    assert.deepEqual(seen, ["适配器内部故障"]);
    assert.equal(report.results[0].status, "ERROR");
    assert.match(report.results[0].error, /适配器 faulty 执行失败: 适配器内部故障/);
    assert.equal(report.passed, false);
});

test("执行失败：适配器超时的结构化标记与请求现场透传，步骤判 TIMEOUT", async () => {
    const timeoutError = new Error("请求超时（50ms）");
    timeoutError.scenarioTimedOut = true;
    timeoutError.scenarioContext = {
        method: "POST",
        path: "slow/endpoint",
        request: { headers: { "X-Test": "1" }, body: null },
        timedOut: true,
        timeoutMs: 50
    };
    const adapter = { async execute() { throw timeoutError; } };
    const scenario = defineScenario({
        name: "适配器超时",
        steps: [{ name: "慢步骤", adapter: "slow" }]
    });
    const report = await createEngine({ fetch: async () => new Response("ok"), adapters: { slow: adapter } })
        .runScenario(scenario);
    const result = report.results[0];
    assert.equal(result.status, "TIMEOUT");
    assert.equal(result.timedOut, true);
    // scenarioContext 透传：method/path/request 现场保留在结果里
    assert.equal(result.method, "POST");
    assert.equal(result.path, "slow/endpoint");
    assert.deepEqual(result.request, { headers: { "X-Test": "1" }, body: null });
    // 包装消息已含原始错误，cause 不重复拼接成 "（…（…））"
    assert.match(result.error, /适配器 slow 执行失败: 请求超时（50ms）/);
    assert.doesNotMatch(result.error, /（请求超时（50ms））/);
});

test("执行失败：适配器底层错误的 code 经 cause 透出到错误消息", async () => {
    const adapter = {
        async execute() { throw Object.assign(new Error("连接失败"), { code: "ECONNREFUSED" }); }
    };
    const scenario = defineScenario({ name: "cause 透出", steps: [{ name: "步骤", adapter: "netty" }] });
    const report = await createEngine({ fetch: async () => new Response("ok"), adapters: { netty: adapter } })
        .runScenario(scenario);
    const result = report.results[0];
    assert.equal(result.status, "ERROR");
    // 包装 message 只含原始 message；cause 里的 code 未出现在 message 中 → 追加透出
    assert.match(result.error, /适配器 netty 执行失败: 连接失败（ECONNREFUSED）/);
});

test("执行失败：onError 自身抛错被吞，不掩盖原始错误", async () => {
    const adapter = {
        async execute() { throw new Error("原始故障"); },
        async onError() { throw new Error("钩子自身的错误"); }
    };
    const scenario = defineScenario({ name: "onError 抛错", steps: [{ name: "会失败", adapter: "noisy" }] });
    const report = await createEngine({ fetch: async () => new Response("ok"), adapters: { noisy: adapter } })
        .runScenario(scenario);
    assert.match(report.results[0].error, /原始故障/);
    assert.doesNotMatch(report.results[0].error, /钩子自身/);
});

test("执行失败：onError 钩子抛出的错误不改变步骤的失败语义", async () => {
    const calls = { onError: 0 };
    const adapter = {
        async execute() { throw new Error("execute 故障"); },
        async onError() { calls.onError += 1; throw new Error("onError 故障"); }
    };
    const scenario = defineScenario({
        name: "onError 抛错不影响失败判定",
        steps: [{ name: "步骤", adapter: "hook-throw" }]
    });
    const report = await createEngine({ fetch: async () => new Response("ok"), adapters: { "hook-throw": adapter } })
        .runScenario(scenario);
    assert.equal(calls.onError, 1);
    assert.equal(report.results[0].passed, false);
    assert.equal(report.failed, 1);
});

test("未注册的适配器名称报错且给出名称提示", async () => {
    const scenario = defineScenario({ name: "未知适配器", steps: [{ name: "幽灵步骤", adapter: "ghost" }] });
    const report = await createEngine({ fetch: async () => new Response("ok") }).runScenario(scenario);
    assert.equal(report.results[0].status, "ERROR");
    assert.match(report.results[0].error, /未注册步骤适配器: ghost/);
});

test("matches 自动分发：按步骤特征选择适配器而无需显式 adapter 字段", async () => {
    const dispatched = [];
    const scenario = defineScenario({
        name: "自动分发",
        steps: [
            { name: "本地步骤", prepareLocal: true },
            { name: "远程步骤", path: "remote", status: 200 }
        ]
    });
    const fetchImpl = async () => new Response(JSON.stringify({ ok: true }), { headers: { "Content-Type": "application/json" } });
    const report = await createEngine({
        baseUrl: "https://mock.local",
        fetch: fetchImpl,
        adapters: {
            local: {
                matches: (step) => Boolean(step.prepareLocal),
                async execute({ step }) {
                    dispatched.push(step.name);
                    return { response: { status: "LOCAL", headers: {}, body: { ok: true }, bodyText: null } };
                }
            }
        }
    }).runScenario(scenario);

    assert.deepEqual(dispatched, ["本地步骤"]);
    assert.equal(report.failed, 0);
    // 远程步骤仍走 HTTP fetch
    assert.equal(report.results[1].status, 200);
});

test("clearAdapters：逐个触发 dispose 并清空注册表", () => {
    const disposed = [];
    registerAdapter("clear-a", { dispose() { disposed.push("a"); }, execute() {} });
    registerAdapter("clear-b", { dispose() { disposed.push("b"); }, execute() {} });
    registerAdapter("clear-c", { dispose() { throw new Error("dispose boom"); }, execute() {} });
    assert.doesNotThrow(() => clearAdapters());
    assert.deepEqual(disposed.sort(), ["a", "b"]);
    assert.equal(listAdapters().size, 0);
});

test("clearScenarios：清空场景注册表", () => {
    registerScenario("clearable", defineScenario({ name: "待清理", steps: [{ name: "s", path: "x" }] }));
    assert.ok(getScenario("clearable"));
    clearScenarios();
    assert.equal(getScenario("clearable"), undefined);
});
