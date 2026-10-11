import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { pathToFileURL } from "node:url";
import test from "node:test";
import { createEngine, defineScenario } from "../src/index.js";

function jsonResponse(body, status = 200) {
    return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

test("默认失败停止并保留提取变量", async () => {
    let calls = 0;
    const engine = createEngine({
        baseUrl: "https://mock.local",
        fetch: async () => {
            calls += 1;
            return jsonResponse(calls === 1 ? { code: 200, data: { id: "42" } } : { code: 500 });
        }
    });
    const scenario = defineScenario({
        name: "停止策略",
        steps: [
            { name: "提取", path: "one", extract: [{ name: "id", path: "data.id" }], assertions: [{ path: "code", equals: 200 }] },
            { name: "失败", path: "two", assertions: [{ path: "code", equals: 200 }] },
            { name: "不应执行", path: "three", assertions: [{ path: "code", equals: 200 }] }
        ]
    });
    const report = await engine.runScenario(scenario);
    assert.equal(report.executed, 2);
    assert.equal(report.vars.id, "42");
    assert.equal(calls, 2);
});

test("target: duration 断言单次请求耗时，response.durationMs 随结果透出", async () => {
    const engine = createEngine({
        baseUrl: "https://mock.local",
        fetch: async () => {
            // 真实耗时：确保 durationMs 为正数且可被断言
            await new Promise((resolve) => setTimeout(resolve, 15));
            return jsonResponse({ ok: 1 });
        }
    });
    const scenario = defineScenario({
        name: "耗时断言",
        steps: [
            { name: "耗时上限", path: "slow", status: 200, assertions: [{ name: "响应在 2 秒内", target: "duration", lte: 2000 }] },
            { name: "耗时下限失败", path: "slow", status: 200, assertions: [{ name: "响应超过 1 小时（应失败）", target: "duration", gt: 3600000 }] }
        ]
    });
    const report = await engine.runScenario(scenario);
    const [within, beyond] = report.results;
    assert.equal(within.passed, true);
    assert.equal(typeof within.response.durationMs, "number");
    assert.ok(within.response.durationMs >= 10, "durationMs 应包含真实请求耗时");
    // gt 1 小时必然失败，且断言结果保留实际耗时毫秒数（assertions[0] 是隐式插入的 HTTP 200 断言）
    assert.equal(beyond.passed, false);
    const durationAssertion = beyond.assertions.find((item) => item.name === "响应超过 1 小时（应失败）");
    assert.equal(durationAssertion.passed, false);
    assert.equal(durationAssertion.actual, beyond.response.durationMs);
});

test("length 断言数组条数端到端（含 retryUntil 终态）", async () => {
    let calls = 0;
    const engine = createEngine({
        baseUrl: "https://mock.local",
        fetch: async () => {
            calls += 1;
            return jsonResponse({ data: { list: ["a"], total: 1 }, ready: calls >= 2 });
        }
    });
    const scenario = defineScenario({
        name: "条数断言",
        steps: [
            {
                name: "轮询至列表满 2 条",
                path: "poll",
                status: 200,
                retryUntil: { maxAttempts: 2, intervalMs: 100 },
                assertions: [{ name: "列表恰好 2 条", path: "data.list", length: 2 }]
            }
        ]
    });
    const report = await engine.runScenario(scenario);
    // 首次 list 长度 1 → 失败重试；第二次响应仍只有 1 条 → 尝试耗尽断言失败，actual 为可读长度
    assert.equal(report.passed, false);
    assert.equal(calls, 2);
    const assertion = report.results[0].assertions.find((item) => item.name === "列表恰好 2 条");
    assert.equal(assertion.passed, false);
    assert.equal(assertion.actual, 1);
    assert.equal(assertion.expected, 2);
});

test("continue 策略收集全部失败", async () => {
    const scenario = defineScenario({
        name: "继续策略",
        failurePolicy: "continue",
        steps: [
            { name: "失败一", path: "one", assertions: [{ path: "code", equals: 200 }] },
            { name: "失败二", path: "two", assertions: [{ path: "code", equals: 200 }] }
        ]
    });
    const report = await createEngine({ baseUrl: "https://mock.local", fetch: async () => jsonResponse({ code: 500 }) }).runScenario(scenario);
    assert.equal(report.executed, 2);
    assert.equal(report.failed, 2);
});

test("无显式断言的 HTTP 500 不得通过", async () => {
    const scenario = defineScenario({
        name: "默认状态校验",
        steps: [{ name: "服务异常", path: "failure" }]
    });
    const report = await createEngine({
        baseUrl: "https://mock.local",
        fetch: async () => jsonResponse({ message: "failed" }, 500)
    }).runScenario(scenario);
    assert.equal(report.passed, false);
    assert.equal(report.failed, 1);
    assert.equal(report.results[0].assertions[0].name, "返回 HTTP 2xx");
});

test("本地适配器返回 status=LOCAL 时默认 2xx 断言不误判失败", async () => {
    const localAdapter = {
        matches: (step) => Boolean(step.prepareLocal),
        async execute() {
            return {
                method: "LOCAL",
                path: "local-step",
                response: { status: "LOCAL", headers: {}, body: { ok: true }, bodyText: null }
            };
        }
    };
    const scenario = defineScenario({
        name: "本地适配器步骤",
        steps: [{ name: "本地准备", prepareLocal: { marker: true } }]
    });
    const report = await createEngine({
        baseUrl: "https://mock.local",
        fetch: async () => { throw new Error("不应发起 HTTP 请求"); },
        adapters: { local: localAdapter }
    }).runScenario(scenario);
    assert.equal(report.executed, 1);
    assert.equal(report.failed, 0);
    assert.equal(report.passed, true);
    assert.equal(report.results[0].assertions[0].name, "返回 HTTP 2xx");
    assert.equal(report.results[0].assertions[0].passed, true);
    assert.equal(report.results[0].assertions[0].actual, "LOCAL");
});

test("配置变量覆盖场景变量且每次执行生成唯一标识", async () => {
    const seen = [];
    const engine = createEngine({
        baseUrl: "https://mock.local",
        vars: { token: "config-token" },
        fetch: async (_url, options) => {
            seen.push(options.headers["X-Token"]);
            return jsonResponse({ ok: true });
        }
    });
    const scenario = defineScenario({
        name: "变量优先级",
        vars: { token: "scenario-token" },
        steps: [{ name: "读取变量", path: "vars", request: { headers: { "X-Token": "{{vars.token}}" } } }]
    });
    const first = await engine.runScenario(scenario);
    const second = await engine.runScenario(scenario);
    assert.deepEqual(seen, ["config-token", "config-token"]);
    assert.notEqual(first.vars.runId, second.vars.runId);
    assert.match(first.vars.runNo, /^\d{6}-[a-f0-9]{4}$/);
});

test("请求透传浏览器凭据和重定向策略", async () => {
    let captured;
    const scenario = defineScenario({
        name: "Cookie 会话",
        steps: [{
            name: "携带浏览器会话",
            path: "session",
            request: { credentials: "include", redirect: "manual" }
        }]
    });
    await createEngine({
        baseUrl: "https://mock.local",
        fetch: async (_url, options) => {
            captured = options;
            return jsonResponse({ ok: true });
        }
    }).runScenario(scenario);
    assert.equal(captured.credentials, "include");
    assert.equal(captured.redirect, "manual");
});

test("retryUntil 成功、耗尽和取消", async () => {
    let calls = 0;
    const engine = createEngine({ baseUrl: "https://mock.local", fetch: async () => jsonResponse({ ready: ++calls >= 3 }) });
    const retryScenario = defineScenario({
        name: "重试",
        steps: [{ name: "等待", path: "job", retryUntil: { maxAttempts: 3, intervalMs: 1 }, assertions: [{ path: "ready", equals: true }] }]
    });
    const success = await engine.runScenario(retryScenario);
    assert.equal(success.failed, 0);
    assert.equal(calls, 3);

    const controller = new AbortController();
    controller.abort(new Error("cancel test"));
    const cancelled = await engine.runScenario(retryScenario, { signal: controller.signal });
    assert.equal(cancelled.results[0].status, "CANCELLED");
});

test("retryUntil maxAttempts 语义 = 最大尝试总次数（含首次），不再 +1", async () => {
    // 历史实现 maxAttempts:2 实际请求 3 次（重试次数语义），与字段名矛盾；
    // 修正后总尝试次数与 maxAttempts 严格相等
    let calls = 0;
    const engine = createEngine({ baseUrl: "https://mock.local", fetch: async () => { calls += 1; return jsonResponse({ ready: false }); } });
    const report = await engine.runScenario(defineScenario({
        name: "精确计数",
        steps: [{ name: "s", path: "x", retryUntil: { maxAttempts: 2, intervalMs: 1 }, assertions: [{ path: "ready", equals: true }] }]
    }));
    assert.equal(calls, 2, "maxAttempts=2 应恰好请求 2 次");
    assert.equal(report.failed, 1);
    assert.equal(report.results[0].passed, false);
});

test("retryUntil 每次失败重试前发出 onAttempt（序号/总数/间隔/状态/首个失败断言）", async () => {
    let calls = 0;
    const engine = createEngine({
        baseUrl: "https://mock.local",
        fetch: async () => jsonResponse({ ready: ++calls >= 3 }, calls < 3 ? 202 : 200)
    });
    const attempts = [];
    const step = { name: "等待", path: "job", retryUntil: { maxAttempts: 4, intervalMs: 120 }, assertions: [{ name: "就绪", path: "ready", equals: true }] };
    const report = await engine.runScenario(defineScenario({ name: "重试进度", steps: [step] }), {
        onAttempt: async (info) => { attempts.push(info); }
    });
    assert.equal(report.failed, 0);
    assert.equal(calls, 3);
    // 前两次未通过各触发一次（第 3 次通过、第 4 次不存在均不触发）
    assert.equal(attempts.length, 2);
    assert.deepEqual(attempts.map((info) => info.attempt), [1, 2]);
    assert.deepEqual(attempts.map((info) => info.status), [202, 202]);
    for (const info of attempts) {
        assert.equal(info.totalAttempts, 4);
        assert.equal(info.intervalMs, 120);
        assert.equal(info.step, step);
        assert.equal(info.failedAssertion, "就绪");
    }
    // 无 retryUntil 的步骤不发出 onAttempt
    const plain = [];
    await engine.runScenario(defineScenario({ name: "无重试", steps: [{ name: "s", path: "x" }] }), {
        onAttempt: (info) => { plain.push(info); }
    });
    assert.equal(plain.length, 0);
});

test("createEngine 引擎级 onAttempt/onStep 默认回调生效，RunOptions 传入优先", async () => {
    let calls = 0;
    const engineAttempts = [];
    const engineSteps = [];
    const engine = createEngine({
        baseUrl: "https://mock.local",
        fetch: async () => jsonResponse({ ready: ++calls >= 3 }, calls < 3 ? 202 : 200),
        onAttempt: (info) => { engineAttempts.push(info); },
        onStep: (result) => { engineSteps.push(result); }
    });
    const step = { name: "等待", path: "job", retryUntil: { maxAttempts: 4, intervalMs: 10 }, assertions: [{ name: "就绪", path: "ready", equals: true }] };
    // 不传 runOptions 回调：引擎级默认生效
    const report = await engine.runScenario(defineScenario({ name: "引擎级", steps: [step] }));
    assert.equal(report.failed, 0);
    assert.equal(engineAttempts.length, 2);
    assert.equal(engineSteps.length, 1);
    // runOptions 传入优先于引擎级
    calls = 0;
    const runAttempts = [];
    const runSteps = [];
    await engine.runScenario(defineScenario({ name: "覆盖", steps: [step] }), {
        onAttempt: (info) => { runAttempts.push(info); },
        onStep: (result) => { runSteps.push(result); }
    });
    assert.equal(runAttempts.length, 2);
    assert.equal(runSteps.length, 1);
    assert.equal(engineAttempts.length, 2, "runOptions 提供后引擎级 onAttempt 不再触发");
    assert.equal(engineSteps.length, 1, "runOptions 提供后引擎级 onStep 不再触发");
});

test("取消落在两步之间：报告状态 CANCELLED，不再出现 status=PASSED 且 passed=false 的矛盾", async () => {
    const controller = new AbortController();
    const engine = createEngine({ baseUrl: "https://mock.local", fetch: async () => jsonResponse({ ok: 1 }) });
    const report = await engine.runScenario(
        { name: "两步取消", steps: [{ name: "a", path: "x" }, { name: "b", path: "y" }] },
        { signal: controller.signal, onStep: () => controller.abort() }
    );
    assert.equal(report.status, "CANCELLED");
    assert.equal(report.passed, false);
    assert.equal(report.executed, 1);
    assert.equal(report.planned, 2);
    // 未中途取消的完整执行仍是 PASSED（防止 CANCELLED 误判扩散）
    const full = await createEngine({ baseUrl: "https://mock.local", fetch: async () => jsonResponse({ ok: 1 }) })
        .runScenario({ name: "完整", steps: [{ name: "a", path: "x" }] });
    assert.equal(full.status, "PASSED");
});

test("when 条件不满足时安全跳过步骤", async () => {
    let calls = 0;
    const scenario = defineScenario({
        name: "条件步骤",
        vars: { cleanupId: "" },
        steps: [{
            name: "仅有目标时删除",
            method: "DELETE",
            path: "items/{{vars.cleanupId}}",
            when: { from: "vars", path: "cleanupId", exists: true }
        }]
    });
    const report = await createEngine({ baseUrl: "https://mock.local", fetch: async () => { calls += 1; return jsonResponse({}); } }).runScenario(scenario);
    assert.equal(calls, 0);
    assert.equal(report.results[0].status, "SKIPPED");
    assert.equal(report.results[0].passed, true);
});

test("全局参数注入 header/query/cookie", async () => {
    let captured;
    const engine = createEngine({
        baseUrl: "https://mock.local",
        globals: [
            { type: "header", name: "X-Trace", value: "trace-1" },
            { type: "query", name: "source", value: "scenario-test" },
            { type: "cookie", name: "sid", value: "abc-123" }
        ],
        fetch: async (url, options) => {
            captured = { url, headers: options.headers };
            return jsonResponse({ ok: true });
        }
    });
    await engine.runScenario(defineScenario({ name: "全局参数", steps: [{ name: "g", path: "api/list" }] }));
    assert.equal(captured.headers["X-Trace"], "trace-1");
    assert.equal(captured.headers.Cookie, "sid=abc-123");
    assert.match(captured.url, /[?&]source=scenario-test$/);
});

test("全局参数值支持 vars 模板且同名参数步骤优先", async () => {
    let captured;
    const engine = createEngine({
        baseUrl: "https://mock.local",
        vars: { traceId: "vars-trace" },
        globals: [
            { type: "header", name: "X-Trace", value: "{{vars.traceId}}" },
            { type: "header", name: "X-Override", value: "global" },
            { type: "query", name: "page", value: "global-page" }
        ],
        fetch: async (url, options) => {
            captured = { url, headers: options.headers };
            return jsonResponse({ ok: true });
        }
    });
    await engine.runScenario(defineScenario({
        name: "模板与覆盖",
        steps: [{
            name: "g",
            path: "api/list",
            params: { page: 2 },
            request: { headers: { "X-Override": "step" } }
        }]
    }));
    assert.equal(captured.headers["X-Trace"], "vars-trace");
    assert.equal(captured.headers["X-Override"], "step");
    assert.match(captured.url, /[?&]page=2$/);
    assert.doesNotMatch(captured.url, /global-page/);
});

test("cookie 全局参数追加到已有 Cookie 头", async () => {
    let captured;
    const engine = createEngine({
        baseUrl: "https://mock.local",
        globals: [{ type: "cookie", name: "sid", value: "abc" }],
        fetch: async (url, options) => {
            captured = options.headers;
            return jsonResponse({ ok: true });
        }
    });
    await engine.runScenario(defineScenario({
        name: "Cookie 合并",
        steps: [{ name: "g", path: "api", request: { headers: { Cookie: "a=1" } } }]
    }));
    assert.equal(captured.Cookie, "a=1; sid=abc");
});

test("绝对 URL 不注入全局参数与 authorization", async () => {
    let captured;
    const engine = createEngine({
        baseUrl: "https://mock.local",
        authorization: "Bearer env-token",
        globals: [{ type: "header", name: "X-Trace", value: "t" }],
        fetch: async (url, options) => {
            captured = { url, headers: options.headers };
            return jsonResponse({ ok: true });
        }
    });
    await engine.runScenario(defineScenario({
        name: "外部地址",
        steps: [{ name: "g", path: "https://external.example.com/api" }]
    }));
    assert.equal(captured.headers["X-Trace"], undefined);
    assert.equal(captured.headers.Authorization, undefined);
});

test("旧 authorization 配置兜底注入且全局 header 优先", async () => {
    let captured;
    const engine = createEngine({
        baseUrl: "https://mock.local",
        authorization: "Bearer legacy-token",
        fetch: async (url, options) => {
            captured = options.headers;
            return jsonResponse({ ok: true });
        }
    });
    await engine.runScenario(defineScenario({ name: "兼容", steps: [{ name: "g", path: "api" }] }));
    assert.equal(captured.Authorization, "Bearer legacy-token");

    const engine2 = createEngine({
        baseUrl: "https://mock.local",
        authorization: "Bearer legacy-token",
        globals: [{ type: "header", name: "Authorization", value: "Bearer global-token" }],
        fetch: async (url, options) => {
            captured = options.headers;
            return jsonResponse({ ok: true });
        }
    });
    await engine2.runScenario(defineScenario({ name: "兼容2", steps: [{ name: "g", path: "api" }] }));
    assert.equal(captured.Authorization, "Bearer global-token");
});

test("defineConfig 同样拒绝模板运算符（globals/vars 值内）", async () => {
    const { defineConfig } = await import("../src/index.js");
    assert.throws(() => defineConfig({ vars: { t: "{{vars.a ? 1 : 0}}" } }), /配置.*不允许使用运算符/);
    assert.throws(() => defineConfig({ globals: [{ type: "header", name: "X", value: "{{vars.a && vars.b}}" }] }), /配置.*不允许使用运算符/);
    // 合法路径与引号键放行
    defineConfig({ vars: { t: "{{vars.user.name}}", u: "{{vars[\"a:b\"]}}" }, globals: [{ type: "header", name: "X", value: "{{vars.token}}" }] });
});

test("defineConfig 拒绝非法全局参数", async () => {
    const { defineConfig } = await import("../src/index.js");
    assert.throws(() => defineConfig({ envs: [{ key: "a", name: "A" }], globals: [{ type: "body", name: "x", value: "1" }] }), /type 必须是 header\/cookie\/query/);
    assert.throws(() => defineConfig({ globals: [{ type: "header", name: "" }] }), /缺少 name/);
    assert.throws(() => defineConfig({ globals: [{ type: "header", name: "X", value: "1" }, { type: "header", name: "X", value: "2" }] }), /全局参数重复/);
    const config = defineConfig({
        globals: [{ type: "header", name: "X-G", value: "g" }],
        envs: [{ key: "a", name: "A", globals: [{ type: "query", name: "q", value: 1 }] }]
    });
    assert.deepEqual(config.globals, [{ type: "header", name: "X-G", value: "g" }]);
    assert.deepEqual(config.envs[0].globals, [{ type: "query", name: "q", value: "1" }]);
});

test("when 对象形式定义期校验：只允许 from vars，禁止 target/header 与未知断言键", () => {
    const base = { name: "W", steps: [{ name: "s", path: "x" }] };
    assert.throws(() => defineScenario({ ...base, steps: [{ name: "s", path: "x", when: { path: "code", equals: 200 } }] }), /when 对象形式只允许 from: "vars"/);
    assert.throws(() => defineScenario({ ...base, steps: [{ name: "s", path: "x", when: { from: "body", path: "code", equals: 200 } }] }), /只允许 from: "vars"/);
    assert.throws(() => defineScenario({ ...base, steps: [{ name: "s", path: "x", when: { from: "vars", target: "status", equals: 200 } }] }), /不允许使用 target\/header/);
    assert.throws(() => defineScenario({ ...base, steps: [{ name: "s", path: "x", when: { from: "vars", path: "code", bogus: 1 } }] }), /未知键 "bogus"/);
    assert.throws(() => defineScenario({ ...base, steps: [{ name: "s", path: "x", when: { from: "vars", path: "code" } }] }), /必须至少包含一个操作符/);
    // 合法 when 与模板真值形式不抛
    defineScenario({ ...base, steps: [{ name: "s", path: "x", when: { from: "vars", path: "cleanupId", exists: true } }] });
    defineScenario({ ...base, steps: [{ name: "s", path: "x", when: "{{vars.flag}}" }] });
    defineScenario({ ...base, steps: [{ name: "s", path: "x", when: false }] });
});

test("定义期拒绝非法断言（含 retryUntil 内误放 assertions）", () => {
    const base = { name: "A", steps: [{ name: "s", path: "x", assertions: [{ path: "code", equals: 200 }] }] };
    assert.throws(() => defineScenario({ name: "A", steps: [{ name: "s", path: "x", assertions: [{ path: "code" }] }] }), /必须至少包含一个操作符/);
    assert.throws(() => defineScenario({ name: "A", steps: [{ name: "s", path: "x", assertions: [{ path: "code", equals: 200, foo: 1 }] }] }), /未知键 "foo"/);
    // retryUntil.assertions 不是协议字段：重试判定只用步骤顶层 assertions，
    // 放在 retryUntil 内的断言从不执行——无论内容是否合法都拒绝并指引迁移
    assert.throws(() => defineScenario({
        name: "A",
        steps: [{ name: "s", path: "x", retryUntil: { maxAttempts: 3, assertions: [{ path: "code" }] } }]
    }), /retryUntil 不支持 assertions/);
    assert.throws(() => defineScenario({
        name: "A",
        steps: [{ name: "s", path: "x", retryUntil: { assertions: [{ path: "code", equals: 200 }] }, assertions: [{ path: "code", equals: 200 }] }]
    }), /retryUntil 不支持 assertions/);
    // 真实协议：retryUntil 本身不含断言，带合法 maxAttempts/intervalMs 不抛
    defineScenario({ name: "A", steps: [{ name: "s", path: "x", retryUntil: { maxAttempts: 3, intervalMs: 100 }, assertions: [{ path: "code", equals: 200 }] }] });
});

test("定义期拒绝非法 retryUntil 数值（maxAttempts/intervalMs/maxElapsedMs）", () => {
    const withRetry = (retryUntil) => defineScenario({ name: "A", steps: [{ name: "s", path: "x", retryUntil, assertions: [{ path: "code", equals: 200 }] }] });
    assert.throws(() => withRetry({ maxAttempts: "abc" }), /maxAttempts 必须是正整数/);
    assert.throws(() => withRetry({ maxAttempts: -1 }), /maxAttempts 必须是正整数/);
    assert.throws(() => withRetry({ maxAttempts: 0 }), /maxAttempts 必须是正整数/);
    assert.throws(() => withRetry({ intervalMs: -1 }), /intervalMs 不能为负数/);
    assert.throws(() => withRetry({ intervalMs: "abc" }), /intervalMs 不能为负数/);
    assert.throws(() => withRetry({ maxElapsedMs: "abc" }), /maxElapsedMs 必须是正数/);
    assert.throws(() => withRetry({ maxElapsedMs: 0 }), /maxElapsedMs 必须是正数/);
    assert.throws(() => withRetry({ maxElapsedMs: -1 }), /maxElapsedMs 必须是正数/);
    // 合法值不抛
    withRetry({ maxAttempts: 3, intervalMs: 100, maxElapsedMs: 5000 });
});

test("定义期拒绝 GET/HEAD 携带请求体（body/fileUpload）；step.method 模板拒绝，request.method 模板放行", () => {
    // GET + request.body：执行期 body 被静默丢弃，定义期即拒
    assert.throws(() => defineScenario({
        name: "A",
        steps: [{ name: "s", path: "x", method: "GET", request: { body: { a: 1 } } }]
    }), /GET 请求不能携带请求体/);
    // 小写方法名归一化后同样拒绝
    assert.throws(() => defineScenario({
        name: "A",
        steps: [{ name: "s", path: "x", method: "head", request: { body: "x" } }]
    }), /HEAD 请求不能携带请求体/);
    // request.method 与缺省方法（默认 GET）同口径
    assert.throws(() => defineScenario({
        name: "A",
        steps: [{ name: "s", path: "x", request: { method: "HEAD", fileUpload: "f.png" } }]
    }), /HEAD 请求不能携带请求体/);
    assert.throws(() => defineScenario({
        name: "A",
        steps: [{ name: "s", path: "x", request: { body: { a: 1 } } }]
    }), /GET 请求不能携带请求体/);
    // step.method 模板是死写法（不做 {{ }} 解析会按字面发送）——直接拒绝
    assert.throws(() => defineScenario({
        name: "A",
        steps: [{ name: "s", path: "x", method: "{{vars.m}}", request: { body: { a: 1 } } }]
    }), /method 不支持模板写法/);
    // 放行：带体方法、空 body/fileUpload、request.method 模板（运行期解析）、adapter 步骤
    defineScenario({ name: "A", steps: [{ name: "s", path: "x", method: "POST", request: { body: { a: 1 } } }] });
    defineScenario({ name: "A", steps: [{ name: "s", path: "x", method: "GET", request: { body: null, fileUpload: null } }] });
    defineScenario({ name: "A", steps: [{ name: "s", path: "x", request: { method: "{{vars.m}}", body: { a: 1 } } }] });
    defineScenario({ name: "A", steps: [{ name: "s", path: "x", adapter: "custom", method: "GET", request: { body: { a: 1 } } }] });
});

test("定义期拒绝模板内运算符（{{vars.a > 0}} 会静默解析为空，引号键与普通字符串放行）", () => {
    // when / headers / params / extract default 任一位置的表达式都拒绝
    assert.throws(() => defineScenario({
        name: "A",
        steps: [{ name: "s", path: "x", when: "{{vars.count > 0}}" }]
    }), /不允许使用运算符/);
    assert.throws(() => defineScenario({
        name: "A",
        steps: [{ name: "s", path: "x", request: { headers: { "X-F": "{{vars.a == vars.b}}" } } }]
    }), /不允许使用运算符/);
    assert.throws(() => defineScenario({
        name: "A",
        steps: [{ name: "s", path: "x", when: "{{vars.done ? vars.a : vars.b}}" }]
    }), /不允许使用运算符/);
    assert.throws(() => defineScenario({
        name: "A",
        steps: [{ name: "s", path: "x", when: "{{!vars.ready}}" }]
    }), /不允许使用运算符/);
    assert.throws(() => defineScenario({
        name: "A",
        steps: [{ name: "s", path: "x", when: "{{vars.fn()}}" }]
    }), /不允许使用运算符/);
    assert.throws(() => defineScenario({
        name: "A",
        vars: { x: "{{vars.y > 1}}" },
        steps: [{ name: "s", path: "x" }]
    }), /不允许使用运算符/);
    // 循环引用输入不递归爆栈（执行期 clone 会另行报错）
    const circular = { name: "A", vars: {}, steps: [{ name: "s", path: "x" }] };
    circular.vars.self = circular;
    defineScenario(circular);
    // 放行：负索引/数字下标、引号键内的运算符字符、连字符键、模板默认值、无 {{}} 的普通文本
    defineScenario({
        name: "A",
        vars: { x: "{{vars.y}}-suffix" },
        steps: [{
            name: "s",
            path: "items/{{vars.list[-1].id}}",
            params: { q: "score > 5" },
            request: { headers: { "X-F": "{{vars[\"a>b\"]}}" } },
            extract: [{ name: "n", path: "n", default: "{{vars.fallback}}" }],
            assertions: [{ path: "name-with-dash", equals: "{{vars.expected-value}}" }]
        }]
    });
});

test("保留变量 runId/runNo 禁止在 config vars、generatedVars、envVars 中声明", async () => {
    const ok = async (vars) => {
        const report = await createEngine({ baseUrl: "https://mock.local", fetch: async () => jsonResponse({}) }).runScenario(
            defineScenario({ name: "R", steps: [{ name: "s", path: "x" }] }),
            { vars }
        );
        return report;
    };
    await ok({ token: "t" });
    const engineFor = (opts = {}) => createEngine({ baseUrl: "https://mock.local", fetch: async () => jsonResponse({}), ...opts });
    await assert.rejects(engineFor({ vars: { runId: "x" } }).runScenario(defineScenario({ name: "R", steps: [{ name: "s", path: "x" }] })), /保留变量/);
    // scenario.vars 定义期拒绝
    assert.throws(() => defineScenario({ name: "R", vars: { runNo: "x" }, steps: [{ name: "s", path: "x" }] }), /保留变量/);
    // envVars / generatedVars 运行期拒绝
    await assert.rejects(engineFor().runScenario(defineScenario({ name: "R", envVars: { runId: "ENV_X" }, steps: [{ name: "s", path: "x" }] })), /保留变量/);
    await assert.rejects(engineFor().runScenario(defineScenario({ name: "R", generatedVars: [{ name: "runNo", type: "timestamp" }], steps: [{ name: "s", path: "x" }] })), /保留变量/);
});

test("extract required:true 路径不存在时步骤失败；默认路径缺失产生 warning 并保持兼容", async () => {
    const engine = createEngine({ baseUrl: "https://mock.local", fetch: async () => jsonResponse({ code: 200 }) });
    const requiredScenario = defineScenario({
        name: "强制提取",
        steps: [{ name: "提取缺失字段", path: "x", extract: [{ name: "missing", path: "data.id", required: true }], assertions: [{ path: "code", equals: 200 }] }]
    });
    const requiredReport = await engine.runScenario(requiredScenario);
    assert.equal(requiredReport.failed, 1);
    assert.equal(requiredReport.results[0].passed, false);
    assert.match(requiredReport.results[0].error, /提取 missing/);

    const relaxedScenario = defineScenario({
        name: "宽松提取",
        steps: [{ name: "提取缺失字段", path: "x", extract: [{ name: "missing", path: "data.id" }], assertions: [{ path: "code", equals: 200 }] }]
    });
    const relaxedReport = await engine.runScenario(relaxedScenario);
    assert.equal(relaxedReport.failed, 0);
    assert.equal(relaxedReport.results[0].warnings.length, 1);
    assert.match(relaxedReport.results[0].warnings[0], /missing/);
    assert.equal(relaxedReport.results[0].passed, true);
});

test("SKIP 统计：全跳过为 SKIPPED，部分跳过保持 PASSED，SKIP 不计 executed/passedSteps", async () => {
    const engine = createEngine({
        baseUrl: "https://mock.local",
        fetch: async () => jsonResponse({ ok: true })
    });
    const allSkipped = await engine.runScenario(defineScenario({
        name: "全跳过",
        steps: [
            { name: "a", path: "a", when: { from: "vars", path: "missing", exists: true } },
            { name: "b", path: "b", when: { from: "vars", path: "missing", exists: true } }
        ]
    }));
    assert.equal(allSkipped.status, "SKIPPED");
    assert.equal(allSkipped.skipped, 2);
    assert.equal(allSkipped.executed, 0);
    assert.equal(allSkipped.passedSteps, 0);
    assert.equal(allSkipped.failed, 0);
    assert.equal(allSkipped.passed, true);
    assert.ok(allSkipped.results.every((item) => item.skipped && item.passed === true));

    const partial = await engine.runScenario(defineScenario({
        name: "部分跳过",
        steps: [
            { name: "执行", path: "a" },
            { name: "跳过", path: "b", when: { from: "vars", path: "missing", exists: true } }
        ]
    }));
    assert.equal(partial.status, "PASSED");
    assert.equal(partial.skipped, 1);
    assert.equal(partial.executed, 1);
    assert.equal(partial.passedSteps, 1);
    assert.equal(partial.failed, 0);
    assert.equal(partial.passed, true);
    assert.equal(partial.results.filter((item) => item.skipped).length, 1);
});

test("失败步骤保留解析后的 method 与注入后的请求头/查询参数（诊断对称）", async () => {
    let captured;
    const scenario = defineScenario({
        name: "失败诊断",
        steps: [{ name: "失败", path: "api/list", request: { headers: { "X-Step": "yes" } }, assertions: [{ path: "code", equals: 200 }] }]
    });
    const report = await createEngine({
        baseUrl: "https://mock.local",
        authorization: "Bearer env-token",
        globals: [
            { type: "header", name: "X-Global", value: "g" },
            { type: "query", name: "source", value: "scenario-test" }
        ],
        fetch: async (url, options) => {
            captured = { url, headers: options.headers };
            throw new Error("network down");
        }
    }).runScenario(scenario);

    const result = report.results[0];
    assert.equal(result.passed, false);
    assert.equal(result.status, "ERROR");
    // method 徽章：未显式声明 step.method 时兜底为 GET（而非 ERROR）
    assert.equal(result.method, "GET");
    // 失败请求详情保留注入后的最终头与查询参数
    assert.equal(result.request.headers["X-Step"], "yes");
    assert.equal(result.request.headers["X-Global"], "g");
    assert.equal(result.request.headers.Authorization, "Bearer env-token");
    assert.match(result.path, /[?&]source=scenario-test$/);
    assert.match(result.error, /network down/);
    assert.equal(captured.headers.Authorization, "Bearer env-token", "实际发出的请求应含注入头");
});

test("取消返回 CANCELLED 与中文文案；超时返回 TIMEOUT 与结构化标记", async () => {
    const scenario = defineScenario({
        name: "取消与超时",
        steps: [{ name: "s", path: "api", assertions: [{ path: "code", equals: 200 }] }]
    });

    // 取消：父信号已中止 → CANCELLED + 中文文案 + cancelled 字段
    const controller = new AbortController();
    controller.abort();
    const cancelled = await createEngine({ baseUrl: "https://mock.local", fetch: async () => jsonResponse({}) })
        .runScenario(scenario, { signal: controller.signal });
    const cancelledResult = cancelled.results[0];
    assert.equal(cancelledResult.status, "CANCELLED");
    assert.equal(cancelledResult.cancelled, true);
    assert.equal(cancelledResult.error, "用户已取消执行");
    assert.equal(cancelledResult.assertions[0].name, "执行未取消");

    // 超时：fetch 尊重 signal 但超时后拒绝 → TIMEOUT + timedOut 字段 + 结构化标记（不依赖错误文案）
    const timeoutScenario = defineScenario({
        name: "超时",
        steps: [{ name: "s", path: "api", timeoutMs: 50, assertions: [{ path: "code", equals: 200 }] }]
    });
    const timedOut = await createEngine({
        baseUrl: "https://mock.local",
        fetch: async (_url, options) => new Promise((_resolve, reject) => {
            options.signal.addEventListener("abort", () => reject(new Error("The operation was aborted")));
        })
    }).runScenario(timeoutScenario);
    const timedOutResult = timedOut.results[0];
    assert.equal(timedOutResult.status, "TIMEOUT");
    assert.equal(timedOutResult.timedOut, true);
    assert.match(timedOutResult.error, /请求超时/);
    assert.equal(timedOutResult.assertions[0].name, "请求未超时");
});

test("读体阶段受超时控制：响应头到达后 body 挂起也会 TIMEOUT", { timeout: 5000 }, async () => {
    // mock fetch 立即返回响应头，但 body 流永远不结束（controller 不 close）。
    // 读体必须受 signal 超时控制，否则该测试会永久挂起。
    const scenario = defineScenario({
        name: "读体超时",
        steps: [{ name: "s", path: "api", timeoutMs: 50, assertions: [{ path: "code", equals: 200 }] }]
    });
    const report = await createEngine({
        baseUrl: "https://mock.local",
        fetch: async () => new Response(new ReadableStream({
            start(controller) { controller.enqueue(new TextEncoder().encode("partial")); }
        }), { status: 200, headers: { "Content-Type": "text/plain" } })
    }).runScenario(scenario);
    const result = report.results[0];
    assert.equal(result.status, "TIMEOUT");
    assert.equal(result.timedOut, true);
    assert.match(result.error, /请求超时/);
});

test("负 / 字符串 \"0\" / Infinity 超时值不触发即时超时且不崩溃（钳制为默认值）", async () => {
    // 这些非法值都经 || 链或 Number.isFinite 钳制为默认 30000；此处仅验证
    // 不会误判为"立即超时"或抛异常，正常响应仍通过（钳制逻辑见 executeHttp）
    for (const timeoutMs of [-5, "0", Infinity]) {
        const scenario = defineScenario({
            name: "钳制",
            steps: [{ name: "s", path: "api", timeoutMs, assertions: [{ path: "code", equals: 200 }] }]
        });
        const report = await createEngine({
            baseUrl: "https://mock.local",
            fetch: async () => new Promise((resolve) => setTimeout(() => resolve(jsonResponse({ code: 200 })), 20))
        }).runScenario(scenario);
        assert.equal(report.failed, 0, `timeoutMs=${JSON.stringify(timeoutMs)} 不应触发即时超时`);
        assert.equal(report.results[0].status, 200);
    }
});

test("浏览器环境（无 process 全局）下 runScenario/createRuntime 不崩溃", async () => {
    // UMD/ESM 浏览器产物没有 process 全局；buildGeneratedVars 曾直接读 process.env，
    // 导致浏览器里调用 runScenario 必抛 ReferenceError。子进程删除 process 后跑源码复现该环境。
    const script = `
        globalThis.process = undefined;
        globalThis.window = globalThis;
        const engineModule = await import(${JSON.stringify(pathToFileURL(path.join(path.dirname(process.argv[1]), "..", "src", "engine.js")).href)});
        const report = await engineModule.runScenario(
            { name: "浏览器回归", steps: [{ name: "s", path: "api", assertions: [{ path: "code", equals: 200 }] }] },
            { baseUrl: "https://mock.local", fetch: async () => new Response(JSON.stringify({ code: 200 }), { status: 200, headers: { "Content-Type": "application/json" } }) }
        );
        console.log("RESULT:" + report.status + ":" + report.failed);
    `;
    const result = await new Promise((resolve, reject) => {
        const child = spawn(process.execPath, ["--input-type=module", "-e", script], {
            cwd: path.resolve(import.meta.dirname, ".."),
            stdio: ["ignore", "pipe", "pipe"]
        });
        let stdout = "";
        let stderr = "";
        child.stdout.on("data", (chunk) => { stdout += chunk; });
        child.stderr.on("data", (chunk) => { stderr += chunk; });
        child.on("close", (code) => resolve({ code, stdout, stderr }));
        child.on("error", reject);
    });
    assert.equal(result.code, 0, `子进程异常退出:\n${result.stderr}`);
    assert.match(result.stdout, /RESULT:PASSED:0/, `浏览器模拟环境执行应成功，stdout: ${result.stdout}\nstderr: ${result.stderr}`);
});

test("浏览器环境（无 process 全局）下缺少 envVars 的错误消息不泄漏环境变量名", async () => {
    // verboseErrors 分支同样位于 buildGeneratedVars：无 process 时读取 SCENARIO_VERBOSE_ERRORS
    // 不得抛错，且默认（非 verbose）错误消息不含环境变量映射名
    const script = `
        globalThis.process = undefined;
        globalThis.window = globalThis;
        const engineModule = await import(${JSON.stringify(pathToFileURL(path.join(path.dirname(process.argv[1]), "..", "src", "engine.js")).href)});
        try {
            await engineModule.runScenario(
                { name: "缺变量", envVars: { password: "MY_SECRET_ENV" }, steps: [{ name: "s", path: "api" }] },
                { baseUrl: "https://mock.local", fetch: async () => new Response("{}", { status: 200 }) }
            );
            console.log("RESULT:NO_THROW");
        } catch (error) {
            console.log("RESULT:" + error.message);
        }
    `;
    const result = await new Promise((resolve, reject) => {
        const child = spawn(process.execPath, ["--input-type=module", "-e", script], {
            cwd: path.resolve(import.meta.dirname, ".."),
            stdio: ["ignore", "pipe", "pipe"]
        });
        let stdout = "";
        let stderr = "";
        child.stdout.on("data", (chunk) => { stdout += chunk; });
        child.stderr.on("data", (chunk) => { stderr += chunk; });
        child.on("close", (code) => resolve({ code, stdout, stderr }));
        child.on("error", reject);
    });
    assert.equal(result.code, 0, `子进程异常退出:\n${result.stderr}`);
    assert.match(result.stdout, /RESULT:缺少必需的场景变量/);
    assert.doesNotMatch(result.stdout, /MY_SECRET_ENV/, "非 verbose 模式不应泄漏环境变量映射名");
});


test("重试等待前已取消：立即以 CANCELLED 返回，不等待 intervalMs", async () => {
    const controller = new AbortController();
    // 适配器在返回失败响应前取消执行：断言失败进入重试时 signal 已中止，
    // delay 应立即拒绝而非等待完整 intervalMs（默认实现会白等后由下一轮循环顶部发现取消）
    const engine = createEngine({
        fetch: () => { throw new Error("适配器步骤不应发起 HTTP 请求"); },
        adapters: {
            cancelThenFail: {
                execute: async () => {
                    controller.abort();
                    return { response: { status: 500, headers: {}, body: { ok: false } } };
                }
            }
        }
    });
    const runtime = { vars: {}, lastResponse: null, lastResponseBody: null };
    const startedAt = Date.now();
    const result = await engine.runStep({
        name: "重试前取消",
        adapter: "cancelThenFail",
        retryUntil: { maxAttempts: 5, intervalMs: 5000, maxElapsedMs: 60000 }
    }, runtime, { signal: controller.signal });
    const duration = Date.now() - startedAt;
    assert.equal(result.status, "CANCELLED");
    assert.equal(result.cancelled, true);
    assert.ok(duration < 2000, `取消应立即生效，实际耗时 ${duration}ms`);
});

test("响应体按 content-type charset 解码（GBK）", async () => {
    // {"name":"中文"} 的 GBK 字节（中=D6D0、文=CEC4），硬编码避免依赖 Node Buffer 的 gbk 编码能力
    const gbkBytes = new Uint8Array([0x7B, 0x22, 0x6E, 0x61, 0x6D, 0x65, 0x22, 0x3A, 0x22, 0xD6, 0xD0, 0xCE, 0xC4, 0x22, 0x7D]);
    const engine = createEngine({
        baseUrl: "https://mock.local",
        fetch: async () => new Response(gbkBytes, { status: 200, headers: { "Content-Type": "application/json;charset=GBK" } })
    });
    const scenario = defineScenario({
        name: "GBK 解码",
        steps: [{
            name: "中文字段",
            path: "gbk",
            extract: [{ name: "city", path: "name" }],
            assertions: [{ path: "name", equals: "中文" }]
        }]
    });
    const report = await engine.runScenario(scenario);
    assert.equal(report.passed, true, JSON.stringify(report.results[0].assertions));
    assert.equal(report.vars.city, "中文");
});

test("重试总时长超限：报告状态为 TIMEOUT 并保留重试超时消息", async () => {
    let calls = 0;
    const engine = createEngine({
        baseUrl: "https://mock.local",
        fetch: async () => {
            calls += 1;
            return jsonResponse({ code: 500 }, 500);
        }
    });
    const scenario = defineScenario({
        name: "重试超时",
        steps: [{
            name: "一直失败",
            path: "flaky",
            retryUntil: { maxAttempts: 50, intervalMs: 100, maxElapsedMs: 150 }
        }]
    });
    const report = await engine.runScenario(scenario);
    assert.equal(report.results[0].status, "TIMEOUT");
    assert.equal(report.results[0].timedOut, true);
    assert.match(report.results[0].error, /重试超时/);
    assert.ok(calls < 50, `应在总时长超限后停止重试（实际请求 ${calls} 次）`);
});

test("最后一步执行中被取消：整体状态 CANCELLED 而非 FAILED", async () => {
    const controller = new AbortController();
    const engine = createEngine({
        baseUrl: "https://mock.local",
        // fetch 响应 signal 取消（真实取消路径：HTTP 步骤因 abort 拒绝，runStep 的 catch 才带 cancelled 标记）
        fetch: (url, options) => new Promise((resolve, reject) => {
            if (options.signal.aborted) { reject(options.signal.reason); return; }
            options.signal.addEventListener("abort", () => reject(options.signal.reason));
        })
    });
    controller.abort();
    const report = await engine.runScenario(
        defineScenario({ name: "单步取消", steps: [{ name: "唯一步骤", path: "only" }] }),
        { signal: controller.signal }
    );
    assert.equal(report.results[0].cancelled, true);
    assert.equal(report.results.length, report.planned, "步骤已全部产生结果（最后一步取消的边界）");
    assert.equal(report.status, "CANCELLED", "任一步骤被取消即 CANCELLED，步数已满不应误判 FAILED");
    assert.equal(report.passed, false);
});

// ==================== generatedVars idcard（GB 11643 身份证造数） ====================

function gb11643CheckOf(idNo) {
    const weights = [7, 9, 10, 5, 8, 4, 2, 1, 6, 3, 7, 9, 10, 5, 8, 4, 2];
    const codes = "10X98765432";
    let sum = 0;
    for (let i = 0; i < 17; i += 1) sum += Number(idNo[i]) * weights[i];
    return codes[sum % 11];
}

function idcardEngine(seen) {
    return createEngine({
        baseUrl: "https://mock.local",
        fetch: async () => {
            const body = {};
            seen.push(body);
            return jsonResponse(body);
        }
    });
}

test("generatedVars idcard：18 位、出生段正确、GB 11643 校验位合法、性别奇偶正确", async () => {
    const seen = [];
    const engine = idcardEngine(seen);
    const scenario = defineScenario({
        name: "idcard 合法性",
        generatedVars: [
            { name: "maleIdNo", type: "idcard", birthDate: "2026-08-15", gender: "MALE", regionCode: "110101" },
            { name: "femaleIdNo", type: "idcard", birthDate: "1996-03-12", gender: "FEMALE", regionCode: "370102" }
        ],
        steps: [
            { name: "引用男号", method: "POST", path: "one", request: { body: { idNo: "{{vars.maleIdNo}}" } } },
            { name: "引用女号", method: "POST", path: "two", request: { body: { idNo: "{{vars.femaleIdNo}}" } } }
        ]
    });
    const report = await engine.runScenario(scenario);
    assert.equal(report.status, "PASSED");
    const male = report.vars.maleIdNo;
    const female = report.vars.femaleIdNo;
    assert.match(male, /^11010120260815\d{3}[\dX]$/);
    assert.match(female, /^37010219960312\d{3}[\dX]$/);
    assert.equal(gb11643CheckOf(male), male[17]);
    assert.equal(gb11643CheckOf(female), female[17]);
    assert.equal(Number(male[16]) % 2, 1, "MALE 顺序码第 17 位为奇数");
    assert.equal(Number(female[16]) % 2, 0, "FEMALE 顺序码第 17 位为偶数");
    assert.notEqual(male, female, "轮内不同名变量互异");
});

test("generatedVars idcard：跨轮唯一（runId 派生）", async () => {
    const scenario = defineScenario({
        name: "idcard 跨轮",
        generatedVars: [{ name: "idNo", type: "idcard", birthDate: "2026-08-15" }],
        steps: [{ name: "引用", path: "one" }]
    });
    const first = await idcardEngine([]).runScenario(scenario);
    const second = await idcardEngine([]).runScenario(scenario);
    assert.equal(first.status, "PASSED");
    assert.equal(second.status, "PASSED");
    assert.notEqual(first.vars.idNo, second.vars.idNo, "两轮 runId 不同则号码不同");
    assert.equal(gb11643CheckOf(second.vars.idNo), second.vars.idNo[17]);
});

test("generatedVars idcard：非法参数拒绝", async () => {
    const run = (generatedVars) => idcardEngine([]).runScenario(
        defineScenario({ name: "idcard 非法参数", generatedVars, steps: [{ name: "s", path: "x" }] }));
    await assert.rejects(run([{ name: "a", type: "idcard", birthDate: "2026-02-30" }]), /合法日历日期|YYYY-MM-DD/);
    await assert.rejects(run([{ name: "a", type: "idcard", birthDate: "20260815" }]), /YYYY-MM-DD/);
    await assert.rejects(run([{ name: "a", type: "idcard", gender: "X" }]), /MALE\/FEMALE/);
    await assert.rejects(run([{ name: "a", type: "idcard", birthDate: "2026-08-15", regionCode: "1101" }]), /6 位数字/);
});

// ==================== generatedVars timestamp 增强（offset/unit/format）与 uuid ====================

function generatedVarEngine() {
    return createEngine({ baseUrl: "https://mock.local", fetch: async () => jsonResponse({}) });
}

test("generatedVars timestamp：offset 六种单位与正负号相对当前时间偏移", async () => {
    const before = Date.now();
    const report = await generatedVarEngine().runScenario(defineScenario({
        name: "timestamp 偏移",
        generatedVars: [
            { name: "halfSecAgo", type: "timestamp", offset: "-500ms" },
            { name: "halfMinAgo", type: "timestamp", offset: "-30s" },
            { name: "fiveMinLater", type: "timestamp", offset: "+5m" },
            { name: "twoHoursAgo", type: "timestamp", offset: "-2h" },
            { name: "weekLater", type: "timestamp", offset: "+8d" },
            { name: "plainWeek", type: "timestamp", offset: "1w" }
        ],
        steps: [{ name: "s", path: "x" }]
    }));
    assert.equal(report.status, "PASSED");
    // 容差 2s 覆盖测试执行耗时；极性判别：忽略/误解析 offset 的实现偏差为偏移量本身
    // （500ms ~ 7 天），远超容差，必然失败
    const near = (value, delta) => typeof value === "number" && Math.abs(value - (before + delta)) < 2000;
    assert.ok(near(report.vars.halfSecAgo, -500), "-500ms");
    assert.ok(near(report.vars.halfMinAgo, -30000), "-30s");
    assert.ok(near(report.vars.fiveMinLater, 300000), "+5m");
    assert.ok(near(report.vars.twoHoursAgo, -7200000), "-2h");
    assert.ok(near(report.vars.weekLater, 691200000), "+8d");
    assert.ok(near(report.vars.plainWeek, 604800000), "1w 缺省正号");
});

test("generatedVars timestamp：unit s 输出秒级数值，缺省毫秒保持向后兼容", async () => {
    const before = Date.now();
    const report = await generatedVarEngine().runScenario(defineScenario({
        name: "timestamp 粒度",
        generatedVars: [
            { name: "msVar", type: "timestamp" },
            { name: "sVar", type: "timestamp", unit: "s" }
        ],
        steps: [{ name: "s", path: "x" }]
    }));
    assert.ok(Math.abs(report.vars.msVar - before) < 2000, "缺省输出毫秒（旧行为不变）");
    assert.ok(Math.abs(report.vars.sVar * 1000 - before) < 2000, "秒级数值（极性：误按毫秒输出则乘 1000 后偏差 1000 倍）");
    assert.ok(Math.abs(report.vars.sVar - report.vars.msVar) > 1000, "秒值与毫秒值不同数量级");
});

test("generatedVars timestamp：format 输出本地时间字符串，可与 offset 组合", async () => {
    const before = Date.now();
    const report = await generatedVarEngine().runScenario(defineScenario({
        name: "timestamp 格式化",
        generatedVars: [
            { name: "weekAgoText", type: "timestamp", offset: "-7d", format: "YYYY-MM-DD HH:mm:ss" },
            { name: "dayPath", type: "timestamp", format: "YYYY/MM/DD" }
        ],
        steps: [{ name: "s", path: "x" }]
    }));
    assert.equal(typeof report.vars.weekAgoText, "string", "极性：误输出数值必失败");
    const parts = /^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2}):(\d{2})$/.exec(report.vars.weekAgoText);
    assert.ok(parts, `完整时间格式: ${report.vars.weekAgoText}`);
    const parsed = new Date(
        Number(parts[1]), Number(parts[2]) - 1, Number(parts[3]),
        Number(parts[4]), Number(parts[5]), Number(parts[6])
    ).getTime();
    assert.ok(Math.abs(parsed - (before - 604800000)) < 5000, "解析回本地时间 ≈ now-7d（极性：误用 UTC token 偏差整时区）");
    assert.match(report.vars.dayPath, /^\d{4}\/\d{2}\/\d{2}$/, "日期片段格式");
});

test("generatedVars timestamp：非法 offset/unit/format 与 format+unit 互斥拒绝", async () => {
    const run = (generatedVars) => generatedVarEngine().runScenario(
        defineScenario({ name: "timestamp 非法参数", generatedVars, steps: [{ name: "s", path: "x" }] }));
    await assert.rejects(run([{ name: "a", type: "timestamp", offset: "7x" }]), /offset/);
    await assert.rejects(run([{ name: "a", type: "timestamp", offset: "-d" }]), /offset/);
    await assert.rejects(run([{ name: "a", type: "timestamp", offset: "-7D" }]), /offset/);
    await assert.rejects(run([{ name: "a", type: "timestamp", unit: "us" }]), /unit/);
    await assert.rejects(run([{ name: "a", type: "timestamp", format: "YYYY-MM-DD", unit: "s" }]), /互斥/);
    await assert.rejects(run([{ name: "a", type: "timestamp", format: "abc" }]), /format/);
    await assert.rejects(run([{ name: "a", type: "timestamp", format: "Y-M-D" }]), /format/);
    // 判别（R6 审查阻塞）：合法 token 混残缺小写 token（"yyyy"/"dd"）必须整体拒绝，
    // 修复前这些字母溜过校验被原样留在输出里（静默字面量）
    await assert.rejects(run([{ name: "a", type: "timestamp", format: "yyyy-MM-dd HH:mm:ss" }]), /format/);
    await assert.rejects(run([{ name: "a", type: "timestamp", format: "YYYY-MM-DD HH:mm:ss [Y}" }]), /format/);
});

test("generatedVars uuid：带连字符 UUID v4；uuidHex 保持 32 位无连字符（极性锁定）", async () => {
    const report = await generatedVarEngine().runScenario(defineScenario({
        name: "uuid 形态",
        generatedVars: [
            { name: "dashed", type: "uuid" },
            { name: "hex", type: "uuidHex" }
        ],
        steps: [{ name: "s", path: "x" }]
    }));
    assert.equal(report.status, "PASSED");
    assert.match(report.vars.dashed, /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/, "标准带连字符形态");
    assert.match(report.vars.hex, /^[0-9a-f]{32}$/, "uuidHex 仍为 32 位十六进制");
    assert.ok(!report.vars.hex.includes("-"), "uuidHex 不带连字符（两个类型不可互相误实现）");
});

test("请求体：对象 JSON 序列化并补默认 Content-Type，字符串直传，GET 请求无 body", async () => {
    const seen = [];
    const engine = createEngine({
        baseUrl: "https://mock.local",
        fetch: async (_url, options) => {
            seen.push({ body: options.body, contentType: options.headers["Content-Type"] });
            return jsonResponse({ ok: true });
        }
    });
    const scenario = defineScenario({
        name: "请求体分支",
        steps: [
            { name: "json", method: "POST", request: { body: { a: 1 } } },
            { name: "text", method: "POST", request: { body: "plain-text", headers: { "Content-Type": "text/plain" } } },
            { name: "get-no-body", method: "GET" }
        ]
    });
    const report = await engine.runScenario(scenario);
    assert.equal(report.failed, 0);
    assert.equal(seen[0].body, '{"a":1}');
    assert.equal(seen[0].contentType, "application/json");
    assert.equal(seen[1].body, "plain-text");
    assert.equal(seen[1].contentType, "text/plain");
    // GET 请求不发送 body（GET 声明 body 已在定义期被拒，见「GET/HEAD 携带请求体」用例）
    assert.equal(seen[2].body, undefined);
});

test("fileUpload：io 构造上传体，omitContentType 时删除步骤 Content-Type，无 io 报环境不支持", async () => {
    const seen = [];
    const io = {
        async createUploadBody(definition) {
            seen.push(definition);
            // 模拟真实 io 语义：multipart 边界由运行时生成，步骤可显式关闭省略行为
            return { body: "RAW-BODY", headers: { "X-Upload": definition.fieldName }, omitContentType: definition.omit !== false };
        }
    };
    const engine = createEngine({
        baseUrl: "https://mock.local",
        io,
        fetch: async (_url, options) => {
            seen.push({ body: options.body, uploadHeader: options.headers["X-Upload"], contentType: options.headers["Content-Type"] });
            return jsonResponse({ ok: true });
        }
    });
    const scenario = defineScenario({
        name: "上传",
        steps: [
            {
                name: "默认省略 Content-Type",
                method: "POST",
                request: { fileUpload: { filePath: "a.txt", fieldName: "f1" }, headers: { "Content-Type": "text/plain" } }
            },
            {
                name: "保留 Content-Type",
                method: "POST",
                request: { fileUpload: { filePath: "a.txt", fieldName: "f2", omit: false }, headers: { "Content-Type": "text/plain" } }
            }
        ]
    });
    const report = await engine.runScenario(scenario);
    assert.equal(report.failed, 0, JSON.stringify(report.results));
    // io 收到 resolve 后的上传定义
    assert.deepEqual(seen[0], { filePath: "a.txt", fieldName: "f1" });
    assert.equal(seen[1].body, "RAW-BODY");
    assert.equal(seen[1].uploadHeader, "f1");
    // omitContentType 默认 true：multipart 边界由运行时生成，步骤声明的 Content-Type 被删除
    assert.equal(seen[1].contentType, undefined);
    // seen 序列：[def1, fetch1, def2, fetch2]
    assert.deepEqual(seen[2], { filePath: "a.txt", fieldName: "f2", omit: false });
    assert.equal(seen[3].uploadHeader, "f2");
    assert.equal(seen[3].body, "RAW-BODY");
    // 步骤要求保留（omit:false → omitContentType:false）时 Content-Type 原样发送
    assert.equal(seen[3].contentType, "text/plain");

    // 未提供 io（如纯浏览器无实现）时给出明确环境错误
    const noIo = createEngine({
        baseUrl: "https://mock.local",
        fetch: async () => jsonResponse({ ok: true })
    });
    const failing = defineScenario({
        name: "无 io 上传",
        steps: [{ name: "上传", method: "POST", request: { fileUpload: { filePath: "a.txt" } } }]
    });
    const noIoReport = await noIo.runScenario(failing);
    assert.equal(noIoReport.results[0].status, "ERROR");
    assert.match(noIoReport.results[0].error, /当前运行环境不支持 fileUpload/);
});

test("saveResponseAs：模板路径解析后调用 io.saveResponse，body 替换为保存信息", async () => {
    const saved = [];
    const engine = createEngine({
        baseUrl: "https://mock.local",
        io: {
            async saveResponse(relativePath, data, metadata) {
                saved.push({ relativePath, data, metadata });
                return { savedTo: `/workspace/${relativePath}`, size: data.byteLength, contentType: metadata.contentType };
            }
        },
        fetch: async () => new Response("binary-ish", { headers: { "Content-Type": "application/octet-stream" } })
    });
    const scenario = defineScenario({
        name: "保存响应",
        steps: [{ name: "下载", path: "files/report", saveResponseAs: "out/{{vars.runNo}}.bin" }]
    });
    const report = await engine.runScenario(scenario);
    assert.equal(report.failed, 0);
    assert.equal(saved.length, 1);
    assert.equal(saved[0].relativePath, `out/${report.vars.runNo}.bin`);
    assert.equal(saved[0].metadata.contentType, "application/octet-stream");
    assert.deepEqual(Buffer.from(saved[0].data).toString(), "binary-ish");
    const response = report.results[0].response;
    assert.equal(response.body.savedTo, `out/${report.vars.runNo}.bin`.replace("out/", "/workspace/out/"));
    assert.equal(response.body.size, "binary-ish".length);
    assert.equal(response.bodyText, null);
});

// ==================== generatedVars luhn / phone / uscc（测试造数） ====================

// 独立 Luhn 整体校验（与 core 实现互为镜像，防止实现自洽性错误）
function luhnValid(numberText) {
    let sum = 0;
    let alt = false;
    for (let i = numberText.length - 1; i >= 0; i -= 1) {
        let digit = Number(numberText[i]);
        if (alt) { digit *= 2; if (digit > 9) digit -= 9; }
        sum += digit;
        alt = !alt;
    }
    return sum % 10 === 0;
}

// 独立 USCC 校验位验证（GB 32100-2015）
function usccValid(code) {
    if (!/^[0-9A-HJ-NP-RTUWXY]{18}$/.test(code)) return false;
    const alphabet = "0123456789ABCDEFGHJKLMNPQRTUWXY";
    const weights = [1, 3, 9, 27, 19, 26, 16, 17, 20, 29, 25, 13, 8, 24, 10, 30, 28];
    let sum = 0;
    for (let i = 0; i < 17; i += 1) sum += alphabet.indexOf(code[i]) * weights[i];
    return alphabet[(31 - (sum % 31)) % 31] === code[17];
}

function mockEngine() {
    return createEngine({ baseUrl: "https://mock.local", fetch: async () => jsonResponse({ code: 200 }) });
}

test("generatedVars luhn：默认 16 位 62 开头且整体 Luhn 合法；length/prefix 可定制", async () => {
    const scenario = defineScenario({
        name: "luhn 造数",
        generatedVars: [
            { name: "card", type: "luhn" },
            { name: "longCard", type: "luhn", length: 19 },
            { name: "binCard", type: "luhn", length: 16, prefix: "621700" },
            { name: "peerCard", type: "luhn" }
        ],
        steps: [{ name: "s", path: "x", status: 200 }]
    });
    const report = await mockEngine().runScenario(scenario);
    assert.equal(report.failed, 0);
    const { card, longCard, binCard, peerCard } = report.vars;
    assert.match(card, /^62\d{14}$/);
    assert.ok(luhnValid(card), `${card} 应通过 Luhn 校验`);
    assert.match(longCard, /^62\d{17}$/);
    assert.ok(luhnValid(longCard));
    assert.match(binCard, /^621700\d{10}$/);
    assert.ok(luhnValid(binCard));
    // 轮内不同名变量互异
    assert.notEqual(card, peerCard);
});

test("generatedVars luhn：非法 length / prefix 拒绝", async () => {
    const run = (extra) => mockEngine().runScenario(defineScenario({
        name: "luhn 非法参数", generatedVars: [{ name: "a", type: "luhn", ...extra }], steps: [{ name: "s", path: "x" }]
    }));
    await assert.rejects(run({ length: 11 }), /12-19/);
    await assert.rejects(run({ length: "16x" }), /12-19/);
    // prefix 不短于卡号长度时拒绝（17 位卡头配默认 16 位卡号）
    await assert.rejects(run({ prefix: "12345678901234567" }), /数字卡头/);
    await assert.rejects(run({ prefix: "abc" }), /数字卡头/);
});

test("generatedVars phone：11 位 1[3-9] 开头且号段合法；prefix 可定制；跨轮唯一", async () => {
    const scenario = defineScenario({
        name: "phone 造数",
        generatedVars: [
            { name: "mobile", type: "phone" },
            { name: "ctCard", type: "phone", prefix: "166" },
            { name: "peerMobile", type: "phone" }
        ],
        steps: [{ name: "s", path: "x", status: 200 }]
    });
    const first = await mockEngine().runScenario(scenario);
    assert.equal(first.failed, 0);
    assert.match(first.vars.mobile, /^1[3-9]\d{9}$/);
    assert.match(first.vars.ctCard, /^166\d{8}$/);
    assert.notEqual(first.vars.mobile, first.vars.peerMobile);
    // 跨轮唯一：runId 变化使号码变化
    const second = await mockEngine().runScenario(scenario);
    assert.notEqual(first.vars.mobile, second.vars.mobile);

    await assert.rejects(
        mockEngine().runScenario(defineScenario({
            name: "phone 非法参数", generatedVars: [{ name: "p", type: "phone", prefix: "128" }], steps: [{ name: "s", path: "x" }]
        })),
        /1\[3-9\] 开头的 3 位号段/
    );
});

test("generatedVars uscc：18 位 91 开头且 GB 32100 校验合法；regionCode 可定制", async () => {
    const scenario = defineScenario({
        name: "uscc 造数",
        generatedVars: [
            { name: "corp", type: "uscc" },
            { name: "shCorp", type: "uscc", regionCode: "310100" }
        ],
        steps: [{ name: "s", path: "x", status: 200 }]
    });
    const report = await mockEngine().runScenario(scenario);
    assert.equal(report.failed, 0);
    // 91 + 110100（默认区划）+ 9 位主体标识码 + 1 位校验位
    assert.match(report.vars.corp, /^91110100[0-9A-HJ-NP-RTUWXY]{10}$/);
    assert.ok(usccValid(report.vars.corp), `${report.vars.corp} 应通过 GB 32100 校验`);
    assert.match(report.vars.shCorp, /^91310100/);
    assert.ok(usccValid(report.vars.shCorp));

    await assert.rejects(
        mockEngine().runScenario(defineScenario({
            name: "uscc 非法参数", generatedVars: [{ name: "u", type: "uscc", regionCode: "11010" }], steps: [{ name: "s", path: "x" }]
        })),
        /6 位数字/
    );
});

// ==================== generatedVars enum（可带权重枚举造数） ====================

test("generatedVars enum：值取自候选集、权重 0 的候选永不被选中、非字符串候选保留原类型", async () => {
    const report = await generatedVarEngine().runScenario(defineScenario({
        name: "enum 基本语义",
        generatedVars: [
            { name: "channel", type: "enum", values: ["wechat", "alipay", "unionpay"], weights: [1, 1, 0] },
            { name: "level", type: "enum", values: [1, 2, 3] }
        ],
        steps: [{ name: "s", path: "x" }]
    }));
    assert.equal(report.status, "PASSED");
    assert.ok(["wechat", "alipay"].includes(report.vars.channel), `权重 0 候选不得命中: ${report.vars.channel}`);
    assert.ok([1, 2, 3].includes(report.vars.level), "数字候选应原类型返回（极性：误字符串化必失败）");
    assert.equal(typeof report.vars.level, "number");
});

test("generatedVars enum：取值在候选集内、跨轮变化（runId 派生）", async () => {
    const scenario = defineScenario({
        name: "enum 确定性",
        generatedVars: [
            { name: "a", type: "enum", values: ["x", "y", "z"] },
            { name: "b", type: "enum", values: ["x", "y", "z"] }
        ],
        steps: [{ name: "s", path: "x" }]
    });
    const first = await generatedVarEngine().runScenario(scenario);
    assert.equal(first.status, "PASSED");
    // 不同名变量种子不同但可落到同一候选——只断言取值合法，不断言互异
    assert.ok(["x", "y", "z"].includes(first.vars.a));
    assert.ok(["x", "y", "z"].includes(first.vars.b));
    // 跨轮变化：单次对比两轮全同概率 (1/3)²≈11%（曾概率性失败），
    // 改为多轮重试——10 轮全同概率 ~3e-10，事实确定
    let differ = false;
    for (let round = 0; round < 10 && !differ; round += 1) {
        const next = await generatedVarEngine().runScenario(scenario);
        assert.equal(next.status, "PASSED");
        differ = next.vars.a !== first.vars.a || next.vars.b !== first.vars.b;
    }
    assert.ok(differ, `多轮 runId 派生应产生取值变化（首轮 ${first.vars.a}/${first.vars.b}）`);
});

test("generatedVars enum：权重分布与权重之比一致（大样本判别）", async () => {
    // 直接验证底层派生：同一种子集合下 1:3 权重的命中比例应接近 1:3
    const { pickWeightedIndex } = await import("../src/core.js");
    let hits = [0, 0];
    for (let i = 0; i < 2000; i += 1) {
        hits[pickWeightedIndex(`sample-${i}`, [1, 3])] += 1;
    }
    const ratio = hits[1] / hits[0];
    assert.ok(ratio > 2.2 && ratio < 4.1, `1:3 权重比例应接近 3（实际 ${ratio.toFixed(2)}，hits=${hits.join("/")}）`);
});

test("generatedVars enum：非法参数拒绝（values 空/weights 形状/全零权重）", async () => {
    const run = (generatedVars) => generatedVarEngine().runScenario(
        defineScenario({ name: "enum 非法参数", generatedVars, steps: [{ name: "s", path: "x" }] }));
    await assert.rejects(run([{ name: "a", type: "enum" }]), /values/);
    await assert.rejects(run([{ name: "a", type: "enum", values: [] }]), /values/);
    await assert.rejects(run([{ name: "a", type: "enum", values: ["x", "y"], weights: "1" }]), /weights/);
    await assert.rejects(run([{ name: "a", type: "enum", values: ["x", "y"], weights: [1] }]), /长度/);
    await assert.rejects(run([{ name: "a", type: "enum", values: ["x", "y"], weights: [1, -1] }]), /非负/);
    await assert.rejects(run([{ name: "a", type: "enum", values: ["x", "y"], weights: [0, 0] }]), /大于 0/);
});

test("响应体读取流异常时报 ERROR 而非挂起", async () => {    const failingBody = new ReadableStream({
        start(controller) { controller.error(new Error("流中途断开")); }
    });
    const engine = createEngine({
        baseUrl: "https://mock.local",
        fetch: async () => new Response(failingBody, { status: 200, headers: { "Content-Type": "application/json" } })
    });
    const scenario = defineScenario({ name: "读流异常", steps: [{ name: "s", path: "x", status: 200 }] });
    const report = await engine.runScenario(scenario);
    assert.equal(report.results[0].status, "ERROR");
    assert.match(report.results[0].error, /流中途断开/);
});

test("retryUntil 等待间隔内取消立即生效，不等完整 interval", async () => {
    const controller = new AbortController();
    let attempts = 0;
    const engine = createEngine({
        baseUrl: "https://mock.local",
        fetch: async () => {
            attempts += 1;
            return jsonResponse({ state: "PENDING" });
        }
    });
    const scenario = defineScenario({
        name: "等待期取消",
        steps: [{
            name: "轮询",
            path: "poll",
            retryUntil: { maxAttempts: 5, intervalMs: 10000 },
            assertions: [{ path: "state", equals: "DONE" }]
        }]
    });
    const started = Date.now();
    const pending = engine.runScenario(scenario, { signal: controller.signal });
    // 等首次请求完成、进入重试等待后取消
    await new Promise((resolve) => setTimeout(resolve, 100));
    controller.abort();
    const report = await pending;
    const elapsed = Date.now() - started;
    assert.equal(report.status, "CANCELLED");
    assert.equal(report.results[0].status, "CANCELLED");
    assert.equal(attempts, 1);
    // 立即从 delay 中醒来，而不是等满 10s 间隔
    assert.ok(elapsed < 5000, `取消应立即生效，实际耗时 ${elapsed}ms`);
});

test("运行环境无 fetch 实现时 createEngine 快速失败", () => {
    const originalFetch = globalThis.fetch;
    delete globalThis.fetch;
    try {
        assert.throws(() => createEngine(), /缺少 fetch 实现/);
    } finally {
        globalThis.fetch = originalFetch;
    }
});
