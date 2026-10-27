import assert from "node:assert/strict";
import { getEventListeners } from "node:events";
import { Readable } from "node:stream";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { pathToFileURL } from "node:url";
import test from "node:test";
import { createEngine, defineScenario, pickWeightedIndex, registerAdapter, unregisterAdapter } from "../src/index.js";

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

test("retryUntil 轮询不在父 signal 上累积 abort 监听（delay 正常到期即摘除）", async () => {
    // 12 次尝试 × intervalMs 下限 100ms：delay 此前在父 signal 上挂 { once:true } 监听
    // 只在 abort 时摘除——正常到期的监听随尝试次数累积，11 个即触发 Node
    // MaxListenersExceededWarning 污染 stderr（工作台整场执行复用单个 abortController）
    const controller = new AbortController();
    const engine = createEngine({ baseUrl: "https://mock.local", fetch: async () => jsonResponse({ ready: false }) });
    const report = await engine.runScenario(defineScenario({
        name: "轮询",
        steps: [{ name: "等就绪", path: "status", assertions: [{ path: "ready", equals: true }], retryUntil: { maxAttempts: 12, intervalMs: 100 } }]
    }), { signal: controller.signal });
    assert.equal(report.status, "FAILED");
    assert.equal(getEventListeners(controller.signal, "abort").length, 0);
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

test("when 支持 lastResponse/status/target:status 读取上一步响应", async () => {
    let calls = 0;
    const statuses = [201, 202, 203, 200];
    const engine = createEngine({
        baseUrl: "https://mock.local",
        fetch: async () => {
            const status = statuses[calls];
            calls += 1;
            return jsonResponse({ data: { ok: true } }, status);
        }
    });
    const scenario = defineScenario({
        name: "上一步响应条件",
        steps: [
            { name: "第一步", path: "one", status: 201 },
            { name: "按上一步 body", path: "two", status: 202, when: { from: "lastResponse", path: "data.ok", equals: true } },
            { name: "按上一步状态码（from）", path: "three", status: 203, when: { from: "status", equals: 202 } },
            { name: "按上一步状态码（target）", path: "four", status: 200, when: { target: "status", equals: 203 } },
            { name: "上一步 body 路径缺失则不执行", path: "five", status: 200, when: { from: "lastResponse", path: "data.missing", exists: true } }
        ]
    });
    const report = await engine.runScenario(scenario);
    assert.deepEqual(report.results.map((item) => (item.skipped ? "SKIPPED" : item.status)), [201, 202, 203, 200, "SKIPPED"]);
    assert.equal(report.skipped, 1);
    assert.equal(calls, 4);
});

test("第一步引用 lastResponse/status 按来源缺失处理：条件不成立且不抛错", async () => {
    let calls = 0;
    const engine = createEngine({
        baseUrl: "https://mock.local",
        fetch: async () => { calls += 1; return jsonResponse({ data: { id: "7" } }); }
    });
    const scenario = defineScenario({
        name: "无上一步响应",
        steps: [
            { name: "lastResponse exists", path: "one", when: { from: "lastResponse", path: "data.id", exists: true } },
            { name: "status equals", path: "two", when: { from: "status", equals: 200 } },
            { name: "status notEquals", path: "three", when: { from: "status", notEquals: 200 } },
            { name: "target exists false", path: "four", when: { target: "status", exists: false } }
        ]
    });
    const report = await engine.runScenario(scenario);
    assert.equal(calls, 0);
    assert.deepEqual(report.results.map((item) => item.status), ["SKIPPED", "SKIPPED", "SKIPPED", "SKIPPED"]);
    assert.equal(report.passed, true);
    assert.equal(report.status, "SKIPPED");
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

test("when 对象形式定义期校验：来源 vars/lastResponse/status、target 仅 status，禁止 header 与未知断言键", () => {
    const base = { name: "W", steps: [{ name: "s", path: "x" }] };
    assert.throws(() => defineScenario({ ...base, steps: [{ name: "s", path: "x", when: { path: "code", equals: 200 } }] }), /必须声明来源 from/);
    assert.throws(() => defineScenario({ ...base, steps: [{ name: "s", path: "x", when: { from: "body", path: "code", equals: 200 } }] }), /来源只支持 vars\/lastResponse\/status/);
    assert.throws(() => defineScenario({ ...base, steps: [{ name: "s", path: "x", when: { from: "headers", path: "code", equals: 200 } }] }), /来源只支持 vars\/lastResponse\/status/);
    assert.throws(() => defineScenario({ ...base, steps: [{ name: "s", path: "x", when: { from: "vars", target: "status", equals: 200 } }] }), /不允许使用 target\/header/);
    assert.throws(() => defineScenario({ ...base, steps: [{ name: "s", path: "x", when: { target: "duration", equals: 200 } }] }), /target 只支持 status/);
    assert.throws(() => defineScenario({ ...base, steps: [{ name: "s", path: "x", when: { from: "vars", header: "x-trace", exists: true } }] }), /不允许使用 header/);
    assert.throws(() => defineScenario({ ...base, steps: [{ name: "s", path: "x", when: { from: "vars", path: "code", bogus: 1 } }] }), /未知键 "bogus"/);
    assert.throws(() => defineScenario({ ...base, steps: [{ name: "s", path: "x", when: { from: "vars", path: "code" } }] }), /必须至少包含一个操作符/);
    // 合法 when 与模板真值形式不抛
    defineScenario({ ...base, steps: [{ name: "s", path: "x", when: { from: "vars", path: "cleanupId", exists: true } }] });
    defineScenario({ ...base, steps: [{ name: "s", path: "x", when: { from: "lastResponse", path: "data.id", exists: true } }] });
    defineScenario({ ...base, steps: [{ name: "s", path: "x", when: { from: "status", equals: 200 } }] });
    defineScenario({ ...base, steps: [{ name: "s", path: "x", when: { target: "status", equals: 200 } }] });
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

test("适配器步骤跳过 HTTP 相容校验：仅显式 adapter 声明（matches 自动认领不豁免）", async () => {
    // 显式 adapter：step.method 模板（execute 收 resolve 后副本，会真实解析）与 GET+body 均不约束
    defineScenario({ name: "A", steps: [{ name: "s", path: "x", adapter: "custom", method: "{{vars.m}}", request: { body: { a: 1 } } }] });
    // matches 自动认领不豁免校验：定义期可见全局注册表，运行期是引擎快照 + 实例适配器，
    // 两个集合可能不同——自动放行会产生「以为适配器处理、实际发 HTTP 静默丢 body」的假通过；
    // 报错指引显式声明 adapter 字段
    registerAdapter("__claimtest__", {
        matches: () => true,
        execute: async () => ({ status: 200, headers: {}, body: null, bodyText: "" })
    });
    try {
        assert.throws(() => defineScenario({
            name: "A",
            steps: [{ name: "s", path: "x", kind: "custom", request: { body: { a: 1 } } }]
        }), /不能携带请求体.*adapter/);
        assert.throws(() => defineScenario({
            name: "A",
            steps: [{ name: "s", path: "x", kind: "custom", method: "{{vars.m}}" }]
        }), /method 不支持模板写法.*adapter/);
        // 显式 adapter + 实例级适配器：定义期放行，运行期由 createEngine({adapters}) 执行，
        // method 模板经 resolve 解析后交给适配器
        let seenMethod = "";
        const engine = createEngine({
            baseUrl: "https://mock.local",
            fetch: async () => { throw new Error("适配器步骤不应发 HTTP 请求"); },
            adapters: {
                inst: { execute: async ({ step }) => { seenMethod = step.method; return { status: 200, headers: {}, body: null, bodyText: "" }; } }
            }
        });
        const report = await engine.runScenario(defineScenario({
            name: "A",
            vars: { m: "PATCH" },
            steps: [{ name: "s", path: "x", adapter: "inst", method: "{{vars.m}}", request: { body: { a: 1 } } }]
        }));
        assert.equal(report.status, "PASSED");
        assert.equal(seenMethod, "PATCH", "适配器收到的应是模板解析后的 method");
        // adapter 假值（""/null/false）：运行期按无适配器处理会走 HTTP 静默丢 body，
        // 定义期要求非空字符串；绕过定义直接 runStep 也应明确失败而非假通过
        for (const bad of ["", null, false]) {
            assert.throws(() => defineScenario({
                name: "A",
                steps: [{ name: "s", path: "x", adapter: bad, request: { body: { a: 1 } } }]
            }), /adapter 必须是非空字符串/, `adapter=${JSON.stringify(bad)} 应被拒绝`);
        }
        const direct = await createEngine({
            baseUrl: "https://mock.local",
            fetch: async () => { throw new Error("假值 adapter 不应发 HTTP 请求"); }
        }).runStep(
            { name: "s", path: "x", adapter: "", request: { body: { a: 1 } } },
            { vars: {}, lastResponse: null, lastResponseBody: null }
        );
        assert.equal(direct.passed, false);
        assert.match(direct.error || "", /适配器/);
    } finally {
        unregisterAdapter("__claimtest__");
    }
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
    // 下标段边界：只剥语法合法的下标（整数/引号键）——[0 > 1]/[fn()] 内的运算符剥不掉必拒
    assert.throws(() => defineScenario({
        name: "A",
        steps: [{ name: "s", path: "x", when: "{{vars.list[0 > 1]}}" }]
    }), /不允许使用运算符/);
    assert.throws(() => defineScenario({
        name: "A",
        steps: [{ name: "s", path: "x", when: "{{vars.list[fn()]}}" }]
    }), /不允许使用运算符/);
    // 引号键内夹带运算符表达式：["a" > "b"] 不是合法下标，按运算符误写拒绝
    assert.throws(() => defineScenario({
        name: "A",
        steps: [{ name: "s", path: "x", when: "{{vars[\"a\" > \"b\"]}}" }]
    }), /不允许使用运算符/);
    // 路径畸形（空下标/未闭合括号）：运行期会取到根对象或静默 undefined，定义期拒绝
    assert.throws(() => defineScenario({
        name: "A",
        steps: [{ name: "s", path: "x", when: "{{vars[]}}" }]
    }), /不是合法路径写法/);
    assert.throws(() => defineScenario({
        name: "A",
        steps: [{ name: "s", path: "x", when: "{{vars[}}" }]
    }), /不是合法路径写法/);
    assert.throws(() => defineScenario({
        name: "A",
        steps: [{ name: "s", path: "x", when: "{{vars.}}" }]
    }), /不是合法路径写法/);
    // 放行：负索引/数字下标、引号键内的运算符字符（含 ]）、连字符键、模板默认值、无 {{}} 的普通文本
    defineScenario({
        name: "A",
        vars: { x: "{{vars.y}}-suffix" },
        steps: [{
            name: "s",
            path: "items/{{vars.list[-1].id}}",
            params: { q: "score > 5" },
            request: { headers: { "X-F": "{{vars[\"a>b\"]}}", "X-G": "{{vars.obj[\"a]>b\"]}}" } },
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
    // envVars / generatedVars 定义期拒绝；绕过定义期直接 runScenario 仍由运行期兜底
    assert.throws(() => defineScenario({ name: "R", envVars: { runId: "ENV_X" }, steps: [{ name: "s", path: "x" }] }), /保留变量/);
    assert.throws(() => defineScenario({ name: "R", generatedVars: [{ name: "runNo", type: "timestamp" }], steps: [{ name: "s", path: "x" }] }), /保留变量/);
    const raw = (extra) => ({ name: "R", steps: [{ name: "s", path: "x" }], ...extra });
    await assert.rejects(engineFor().runScenario(raw({ envVars: { runId: "ENV_X" } })), /保留变量/);
    await assert.rejects(engineFor().runScenario(raw({ generatedVars: [{ name: "runNo", type: "timestamp" }] })), /保留变量/);
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

test("extract path [*] 通配提取数组列：空数组产 []、非数组按缺失触发 required/default", async () => {
    const engine = createEngine({
        baseUrl: "https://mock.local",
        fetch: async (url) => {
            if (String(url).endsWith("/empty")) return jsonResponse({ items: [] });
            if (String(url).endsWith("/nonarray")) return jsonResponse({ items: { id: 1 } });
            return jsonResponse({ items: [{ id: 1 }, { id: 2 }, { name: "缺少 id" }] });
        }
    });
    const passing = await engine.runScenario(defineScenario({
        name: "通配提取",
        steps: [
            {
                name: "列表",
                path: "list",
                status: 200,
                extract: [{ name: "ids", path: "items[*].id" }],
                assertions: [{ path: "items[*].id", equals: [1, 2] }]
            },
            {
                name: "空数组",
                path: "empty",
                status: 200,
                extract: [{ name: "emptyIds", path: "items[*].id", required: true }],
                assertions: [{ path: "items[*].id", length: 0 }]
            }
        ]
    }));
    assert.equal(passing.passed, true, JSON.stringify(passing.results.map((result) => result.assertions)));
    assert.deepEqual(passing.vars.ids, [1, 2]);
    assert.deepEqual(passing.vars.emptyIds, []);

    const required = await engine.runScenario(defineScenario({
        name: "通配非数组 required",
        steps: [{
            name: "非数组",
            path: "nonarray",
            status: 200,
            extract: [{ name: "missing", path: "items[*].id", required: true }]
        }]
    }));
    assert.equal(required.failed, 1);
    assert.match(required.results[0].error, /提取 missing/);

    const defaulted = await engine.runScenario(defineScenario({
        name: "通配非数组 default",
        steps: [{
            name: "非数组",
            path: "nonarray",
            status: 200,
            extract: [{ name: "fallback", path: "items[*].id", default: [] }]
        }]
    }));
    assert.equal(defaulted.passed, true);
    assert.deepEqual(defaulted.vars.fallback, []);
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

test("非法 timeoutMs 定义期拒绝；绕过定义期直接 runStep 仍钳制为默认值", async () => {
    // Issue #45：负 / 字符串 "0" / Infinity 此前被 executeHttp 的 || 链或 Number.isFinite
    // 静默钳制为默认 30000ms，超时配置实际失效——现在定义期即拒
    for (const timeoutMs of [-5, "0", Infinity, 0, NaN, "5000"]) {
        assert.throws(
            () => defineScenario({
                name: "钳制",
                steps: [{ name: "s", path: "api", timeoutMs, assertions: [{ path: "code", equals: 200 }] }]
            }),
            /timeoutMs 必须是正数/,
            `timeoutMs=${JSON.stringify(timeoutMs)} 应在定义期被拒绝`
        );
    }
    // 运行期兜底不变：直接 runStep（未经 defineScenario）的非法值仍钳制为默认 30000，
    // 不会「立即超时」或抛异常，正常响应仍通过
    for (const timeoutMs of [-5, "0", Infinity]) {
        const engine = createEngine({
            baseUrl: "https://mock.local",
            fetch: async () => new Promise((resolve) => setTimeout(() => resolve(jsonResponse({ code: 200 })), 20))
        });
        const result = await engine.runStep(
            { name: "s", path: "api", timeoutMs, assertions: [{ path: "code", equals: 200 }] },
            { vars: {}, lastResponse: null, lastResponseBody: null }
        );
        assert.equal(result.passed, true, `timeoutMs=${JSON.stringify(timeoutMs)} 不应触发即时超时`);
        assert.equal(result.status, 200);
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

// 固定本地时钟：时间造数断言不再依赖执行耗时/CI 负载；格式化期望按本地时间字段推导，
// 因此不受运行机器时区影响（误用 UTC token 仍会与本地字段产生整时区偏差而失败）。
const FIXED_NOW = new Date(2026, 4, 17, 13, 45, 30, 678).getTime();
const pad2 = (value) => String(value).padStart(2, "0");
const localDateText = (ms, separator) => {
    const date = new Date(ms);
    return `${date.getFullYear()}${separator}${pad2(date.getMonth() + 1)}${separator}${pad2(date.getDate())}`;
};
const localDateTimeText = (ms) => {
    const date = new Date(ms);
    return `${localDateText(ms, "-")} ${pad2(date.getHours())}:${pad2(date.getMinutes())}:${pad2(date.getSeconds())}`;
};

function generatedVarEngine(options = {}) {
    return createEngine({ baseUrl: "https://mock.local", fetch: async () => jsonResponse({}), ...options });
}

test("generatedVars timestamp：offset 六种单位与正负号相对固定时钟偏移", async () => {
    const report = await generatedVarEngine({ now: () => FIXED_NOW }).runScenario(defineScenario({
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
    // 固定时钟下逐项精确断言；极性判别：忽略/误解析 offset 的实现偏差为偏移量本身
    assert.equal(report.vars.halfSecAgo, FIXED_NOW - 500, "-500ms");
    assert.equal(report.vars.halfMinAgo, FIXED_NOW - 30000, "-30s");
    assert.equal(report.vars.fiveMinLater, FIXED_NOW + 300000, "+5m");
    assert.equal(report.vars.twoHoursAgo, FIXED_NOW - 7200000, "-2h");
    assert.equal(report.vars.weekLater, FIXED_NOW + 691200000, "+8d");
    assert.equal(report.vars.plainWeek, FIXED_NOW + 604800000, "1w 缺省正号");
});

test("generatedVars timestamp：unit s 输出秒级数值，缺省毫秒保持向后兼容", async () => {
    const report = await generatedVarEngine({ now: () => FIXED_NOW }).runScenario(defineScenario({
        name: "timestamp 粒度",
        generatedVars: [
            { name: "msVar", type: "timestamp" },
            { name: "sVar", type: "timestamp", unit: "s" }
        ],
        steps: [{ name: "s", path: "x" }]
    }));
    assert.equal(report.vars.msVar, FIXED_NOW, "缺省输出毫秒（旧行为不变）");
    assert.equal(report.vars.sVar, Math.floor(FIXED_NOW / 1000), "秒级数值（极性：误按毫秒输出会相差 1000 倍）");
});

test("generatedVars timestamp：format 输出本地时间字符串，可与 offset 组合", async () => {
    const report = await generatedVarEngine({ now: () => FIXED_NOW }).runScenario(defineScenario({
        name: "timestamp 格式化",
        generatedVars: [
            { name: "weekAgoText", type: "timestamp", offset: "-7d", format: "YYYY-MM-DD HH:mm:ss" },
            { name: "dayPath", type: "timestamp", format: "YYYY/MM/DD" }
        ],
        steps: [{ name: "s", path: "x" }]
    }));
    assert.equal(typeof report.vars.weekAgoText, "string", "极性：误输出数值必失败");
    assert.equal(report.vars.weekAgoText, localDateTimeText(FIXED_NOW - 604800000), "固定时钟 -7d 的本地时间文本，误用 UTC token 偏差整时区");
    assert.equal(report.vars.dayPath, localDateText(FIXED_NOW, "/"), "日期片段格式");
});

test("generatedVars timestamp：now/clock 可按单次运行覆盖且支持 clock 对象/固定值", async () => {
    const scenario = defineScenario({
        name: "timestamp 时钟注入",
        generatedVars: [{ name: "t", type: "timestamp" }],
        steps: [{ name: "s", path: "x" }]
    });
    const engine = generatedVarEngine({ now: () => FIXED_NOW });
    const engineLevel = await engine.runScenario(scenario);
    const runLevel = await engine.runScenario(scenario, { now: () => FIXED_NOW + 1000 });
    const clockObject = await generatedVarEngine({ clock: { now: () => FIXED_NOW + 2000 } }).runScenario(scenario);
    const fixedNumber = await generatedVarEngine({ now: FIXED_NOW + 3000 }).runScenario(scenario);
    assert.equal(engineLevel.vars.t, FIXED_NOW);
    assert.equal(runLevel.vars.t, FIXED_NOW + 1000, "runScenario 显式 now 覆盖引擎级");
    assert.equal(clockObject.vars.t, FIXED_NOW + 2000, "clock 对象形态");
    assert.equal(fixedNumber.vars.t, FIXED_NOW + 3000, "固定毫秒值形态");
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

test("fileUpload：Node Readable/异步可迭代上传体补 duplex: half", async () => {
    const seen = [];
    let call = 0;
    const engine = createEngine({
        baseUrl: "https://mock.local",
        io: {
            async createUploadBody() {
                call += 1;
                return {
                    body: call === 1
                        ? Readable.from([Buffer.from("streamed")])
                        : (async function* chunks() { yield "async-iterable"; })(),
                    omitContentType: true
                };
            }
        },
        fetch: async (_url, options) => {
            seen.push(options.duplex);
            return jsonResponse({ ok: true });
        }
    });
    const report = await engine.runScenario(defineScenario({
        name: "流式上传",
        steps: [
            { name: "Node Readable", method: "POST", request: { fileUpload: { filePath: "a.txt" } } },
            { name: "异步可迭代", method: "POST", request: { fileUpload: { filePath: "b.txt" } } }
        ]
    }));
    assert.equal(report.failed, 0, JSON.stringify(report.results));
    assert.deepEqual(seen, ["half", "half"]);
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

test("saveResponseAs：io 提供 saveResponseStream 时直接流式保存，不做全量缓冲", async () => {
    const calls = [];
    const saved = [];
    const engine = createEngine({
        baseUrl: "https://mock.local",
        maxResponseBytes: 1024,
        io: {
            async saveResponse() {
                calls.push("fallback");
                throw new Error("存在 saveResponseStream 时不应走缓冲回退");
            },
            async saveResponseStream(relativePath, stream, metadata) {
                calls.push("stream");
                const reader = stream.getReader();
                const chunks = [];
                let size = 0;
                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;
                    chunks.push(value);
                    size += value.byteLength;
                }
                const data = new Uint8Array(size);
                let offset = 0;
                for (const chunk of chunks) { data.set(chunk, offset); offset += chunk.byteLength; }
                saved.push({ relativePath, data, metadata });
                return { savedTo: `/workspace/${relativePath}`, size, contentType: metadata.contentType };
            }
        },
        fetch: async () => new Response("stream-payload", { headers: { "Content-Type": "application/octet-stream" } })
    });
    const scenario = defineScenario({
        name: "流式保存",
        steps: [{ name: "下载", path: "files/report", saveResponseAs: "out/{{vars.runNo}}.bin" }]
    });
    const report = await engine.runScenario(scenario);
    assert.equal(report.failed, 0, JSON.stringify(report.results));
    assert.deepEqual(calls, ["stream"]);
    assert.equal(saved.length, 1);
    assert.equal(saved[0].relativePath, `out/${report.vars.runNo}.bin`);
    assert.equal(saved[0].metadata.contentType, "application/octet-stream");
    assert.equal(saved[0].metadata.maxResponseBytes, 1024);
    assert.equal(Buffer.from(saved[0].data).toString(), "stream-payload");
    assert.equal(report.results[0].response.bodyText, null);
});

test("saveResponseAs：仅实现 saveResponseStream 的 IO 在无响应体时仍保存零字节文件", async () => {
    const saved = [];
    const engine = createEngine({
        baseUrl: "https://mock.local",
        io: {
            async saveResponseStream(relativePath, stream, metadata) {
                const reader = stream.getReader();
                let size = 0;
                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;
                    size += value.byteLength;
                }
                saved.push({ relativePath, size, metadata });
                return { savedTo: `/workspace/${relativePath}`, size, contentType: metadata.contentType };
            }
        },
        fetch: async () => new Response(null, { status: 204 })
    });
    const report = await engine.runScenario(defineScenario({
        name: "无响应体保存",
        steps: [{ name: "下载", path: "empty", saveResponseAs: "out/empty.bin" }]
    }));
    assert.equal(report.results[0].passed, true, JSON.stringify(report.results));
    assert.equal(saved.length, 1);
    assert.equal(saved[0].relativePath, "out/empty.bin");
    assert.equal(saved[0].size, 0);
    assert.equal(report.results[0].response.body.savedTo, "/workspace/out/empty.bin");
    assert.equal(report.results[0].response.bodyText, null);
});

test("maxResponseBytes：超限返回结构化 responseTooLarge，边界值通过，未设置保持不限", async () => {
    const scenario = defineScenario({
        name: "响应上限",
        steps: [{ name: "下载", path: "files/report" }]
    });
    const withBody = (body, options = {}) => createEngine({
        baseUrl: "https://mock.local",
        ...options,
        fetch: async () => new Response(body)
    });

    const over = await withBody("123456", { maxResponseBytes: 5 }).runScenario(scenario);
    assert.equal(over.status, "FAILED");
    const overResult = over.results[0];
    assert.equal(overResult.status, "ERROR");
    assert.equal(overResult.errorCode, "responseTooLarge");
    assert.deepEqual(overResult.responseTooLarge, { bytesRead: 6, limitBytes: 5 });
    assert.match(overResult.error, /响应体超过大小上限: 已读取 6 字节，限制 5 字节/);

    // 边界值：恰好等于上限必须通过
    const boundary = await withBody("12345", { maxResponseBytes: 5 }).runScenario(scenario);
    assert.equal(boundary.results[0].passed, true);

    // config 中的上限同样生效；run options 优先于引擎级配置
    const fromConfig = await withBody("123456", { config: { maxResponseBytes: 5 } }).runScenario(scenario);
    assert.equal(fromConfig.results[0].errorCode, "responseTooLarge");
    const overridden = await withBody("123456", { maxResponseBytes: 100 }).runScenario(scenario, { maxResponseBytes: 5 });
    assert.equal(overridden.results[0].errorCode, "responseTooLarge");

    // 未设置上限时维持既有行为（大响应照常通过）
    const unlimited = await withBody("1234567890").runScenario(scenario);
    assert.equal(unlimited.results[0].passed, true);
});

test("maxResponseBytes：超限结构字段只报告已读取字节数，不谎报完整响应体大小", async () => {
    const engine = createEngine({
        baseUrl: "https://mock.local",
        maxResponseBytes: 5,
        fetch: async () => new Response(new ReadableStream({
            start(controller) {
                // 三个 4 字节分块：第二个分块后累计 8 字节越限并取消，第三块不应被读取
                controller.enqueue(new Uint8Array(4));
                controller.enqueue(new Uint8Array(4));
                controller.enqueue(new Uint8Array(4));
                controller.close();
            }
        }))
    });
    const report = await engine.runScenario(defineScenario({
        name: "分块超限",
        steps: [{ name: "下载", path: "chunked" }]
    }));
    const result = report.results[0];
    assert.equal(result.errorCode, "responseTooLarge");
    assert.deepEqual(result.responseTooLarge, { bytesRead: 8, limitBytes: 5 });
    assert.ok(result.responseTooLarge.bytesRead < 12, "bytesRead 是提前中止时已读取量，不是完整响应体 12 字节");
    assert.match(result.error, /已读取 8 字节，限制 5 字节/);
});

test("normalizeByteLimit：响应限制对 0/负数/NaN/Infinity/null 均视为不限，正数向下取整", async () => {
    const scenario = defineScenario({
        name: "上限归一化",
        steps: [{ name: "下载", path: "files/report" }]
    });
    const withBody = (body, options = {}) => createEngine({
        baseUrl: "https://mock.local",
        ...options,
        fetch: async () => new Response(body)
    });
    for (const limit of [0, -1, Number.NaN, Infinity, null]) {
        const report = await withBody("123456", { maxResponseBytes: limit }).runScenario(scenario);
        assert.equal(report.results[0].passed, true, `maxResponseBytes=${String(limit)} 应视为不限制`);
    }
    // 正数小数按字节向下取整：5.9 → 5
    const floorPass = await withBody("12345", { maxResponseBytes: 5.9 }).runScenario(scenario);
    assert.equal(floorPass.results[0].passed, true);
    const floorFail = await withBody("123456", { maxResponseBytes: 5.9 }).runScenario(scenario);
    assert.deepEqual(floorFail.results[0].responseTooLarge, { bytesRead: 6, limitBytes: 5 });

    // run options 显式 null 按归一化规则视为不限，必须覆盖引擎/配置的正数上限
    const engineLimited = await withBody("123456", { maxResponseBytes: 5 })
        .runScenario(scenario, { maxResponseBytes: null });
    assert.equal(engineLimited.results[0].passed, true);
    const configLimited = await withBody("123456", { config: { maxResponseBytes: 5 } })
        .runScenario(scenario, { maxResponseBytes: null });
    assert.equal(configLimited.results[0].passed, true);
});

test("maxUploadBytes：config/run options 透传给 io.createUploadBody", async () => {
    const seen = [];
    const engine = createEngine({
        baseUrl: "https://mock.local",
        maxUploadBytes: 9,
        io: {
            async createUploadBody(definition, runtime, options) {
                seen.push({ definition, options });
                return { body: "RAW-BODY", omitContentType: true };
            }
        },
        fetch: async () => jsonResponse({ ok: true })
    });
    const scenario = defineScenario({
        name: "上传上限透传",
        steps: [{ name: "上传", method: "POST", request: { fileUpload: { filePath: "a.txt" } } }]
    });
    await engine.runScenario(scenario);
    assert.deepEqual(seen[0].options, { maxUploadBytes: 9 });
    await engine.runScenario(scenario, { maxUploadBytes: 3 });
    assert.deepEqual(seen[1].options, { maxUploadBytes: 3 });
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
    // 跨轮变化的确定性验证：enum 经 pickWeightedIndex(`${runId}|${name}`) 派生——
    // 固定种子扫描取到多个下标 + 同种子结果稳定，即锁定「跨轮可变、轮内确定」的派生语义；
    // 替代原多轮重试（两轮全同 ~11% 概率性失败，重试只是降概率不除根）
    const weights = [1, 1, 1];
    const seen = new Set();
    for (let round = 0; round < 20; round += 1) seen.add(pickWeightedIndex(`run-${round}|a`, weights));
    assert.ok(seen.size > 1, "固定种子扫描应取到多个候选下标（跨轮可变的派生依据）");
    assert.equal(pickWeightedIndex("fixed|a", weights), pickWeightedIndex("fixed|a", weights), "同种子派生结果必须稳定");
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

test("断言/extract 的 from、target、裸 path 定义期白名单与分词校验（拼错不再静默落 body 假绿）", () => {
    const define = (assertions, extra = {}) => defineScenario({
        name: "A",
        steps: [{ name: "s", path: "x", assertions, ...extra }]
    });
    // target 拼错（如 statu）原静默落到 body 分支假绿，现在定义期即拒
    assert.throws(() => define([{ target: "statu", equals: 200 }]), /target 只支持 status[/]duration/);
    assert.throws(() => define([{ target: "headers", path: "x", exists: true }]), /target 只支持 status[/]duration/);
    // from 拼错/未知源同样拒绝
    assert.throws(() => define([{ from: "bodyy", path: "code", equals: 200 }]), /from 只支持 body[/]vars[/]headers[/]bodyText/);
    assert.throws(() => define([{ from: "response", path: "status", equals: 200 }]), /from 只支持 body[/]vars[/]headers[/]bodyText/);
    // 裸 path 必须过 tokenizePath：a..b / a[] 原静默判缺，exists:false 假绿
    assert.throws(() => define([{ path: "a..b", exists: false }]), /path 不是合法路径写法/);
    assert.throws(() => define([{ path: "a[]", exists: true }]), /path 不是合法路径写法/);
    assert.throws(() => define([{ path: '["a"]b', exists: true }]), /path 不是合法路径写法/);
    // 合法形态不抛（headers 首段保留宽松特性；空串=整个来源；each 子断言 path 支持模板）
    define([{ target: "status", equals: 200 }, { target: "duration", lt: 5000 }]);
    define([{ from: "headers", path: "x-total", exists: true }]);
    define([{ from: "headers", path: ".X-TOTAL.length", equals: 2 }]);
    define([{ path: "list[-1]", equals: 1 }, { path: 'm["a>b"]', exists: true }]);
    define([{ path: "items[*].id", length: 3 }]);
    define([{ path: "", exists: true }]);
    // 顶层 path 的 {{ }} 是死写法（path 按字面取键不解析）——定义期即拒，否则 exists:false 恒真假绿
    assert.throws(() => define([{ path: "{{vars.p}}", exists: true }]), /path 不支持 \{\{ \}\} 模板/);
    assert.throws(() => define([{ path: "a.{{vars.k}}", exists: false }]), /path 不支持 \{\{ \}\} 模板/);
    // header 简写同口径：头名按字面匹配不解析，{{vars.h}} 字面头不存在 → exists:false 假绿
    assert.throws(() => define([{ header: "{{vars.h}}", exists: false }]), /header 不支持 \{\{ \}\} 模板/);
    assert.throws(() => define([{ header: "", exists: true }]), /header 必须是非空字符串/);
    assert.throws(() => define([{ header: " ", exists: false }]), /header 必须是非空字符串/);
    assert.throws(() => define([{ header: 123, exists: true }]), /header 必须是非空字符串/);
    // each 子断言的 path 随期望值整体 resolve——{{ }} 合法
    define([{ path: "list", each: { path: "{{vars.k}}", exists: true } }]);
    // each 子断言的响应级通道恒取死值（elementResponse 仅 body/vars 有实值）——整体拒绝
    assert.throws(() => define([{ path: "list", each: { header: "{{vars.h}}", exists: false } }]), /each 子断言.*响应级通道/);
    assert.throws(() => define([{ path: "list", each: { header: "X-T", exists: true } }]), /each 子断言.*响应级通道/);
    assert.throws(() => define([{ path: "list", each: { target: "status", exists: false } }]), /each 子断言.*响应级通道/);
    assert.throws(() => define([{ path: "list", each: { from: "headers", path: "x", exists: true } }]), /each 子断言.*响应级通道/);
    assert.throws(() => define([{ path: "list", each: { from: "bodyText", exists: true } }]), /each 子断言.*响应级通道/);
    // each 内 from:"vars"（读运行变量）与默认 body（元素自身）合法
    define([{ path: "list", each: [{ path: "id", exists: true }, { from: "vars", path: "flag", equals: true }] }]);
});

test("extract 定义期校验：形状/name/保留名/required+default 互斥/from、target、path", () => {
    const define = (extract) => defineScenario({ name: "A", steps: [{ name: "s", path: "x", extract }] });
    assert.throws(() => define("x"), /extract 必须是数组/);
    assert.throws(() => define(["x"]), /extract 第 1 项 必须是对象/);
    assert.throws(() => define([{ path: "a" }]), /extract 第 1 项 缺少 name/);
    assert.throws(() => define([{ name: "runId", path: "a" }]), /保留变量/);
    assert.throws(() => define([{ name: "__proto__", path: "a" }]), /保留变量/);
    assert.throws(() => define([{ name: "x", required: true, default: 1 }]), /required: true 与 default 互斥/);
    assert.throws(() => define([{ name: "x", target: "duration" }]), /target 只支持 status/);
    assert.throws(() => define([{ name: "x", from: "statu" }]), /from 只支持 body[/]headers[/]bodyText[/]response/);
    assert.throws(() => define([{ name: "x", path: "a..b" }]), /path 不是合法路径写法/);
    // 未知键即拒：heder/fromm 拼错此前静默落到 body 来源（与断言 metaKeys 同口径）
    assert.throws(() => define([{ name: "x", heder: "X-Token" }]), /未知键 "heder"/);
    assert.throws(() => define([{ name: "x", fromm: "body" }]), /未知键 "fromm"/);
    assert.throws(() => define([{ name: "x", path: "a", equals: 1 }]), /未知键 "equals"/);
    // extract 的 path 不支持 {{ }} 模板（按字面取键不解析）
    assert.throws(() => define([{ name: "x", path: "a.{{vars.k}}" }]), /不支持 \{\{ \}\} 模板/);
    // name/header 的 {{ }} 同为死写法；required 非布尔静默降级为「非必需」
    assert.throws(() => define([{ name: "{{vars.n}}", path: "a" }]), /name 不支持 \{\{ \}\} 模板/);
    assert.throws(() => define([{ name: "x", header: "{{vars.h}}" }]), /header 必须是非空字符串且不支持/);
    assert.throws(() => define([{ name: "x", header: "" }]), /header 必须是非空字符串/);
    assert.throws(() => define([{ name: "x", header: " " }]), /header 必须是非空字符串/);
    assert.throws(() => define([{ name: "x", path: "a", required: "yes" }]), /required 必须是布尔值/);
    // 合法形态不抛
    define([{ name: "x", path: "a.b" }, { name: "y", header: "Content-Type", path: "length" }]);
    define([{ name: "ids", path: "items[*].id" }]);
    define([{ name: "x", from: "response", path: "body.code" }]);
    define([{ name: "x", target: "status" }]);
    define([{ name: "x", path: "a", default: "{{vars.y}}" }]);
    define([{ name: "x", path: "" }]); // 空串 = 取整个响应体（下游在用语义，运行期 falsy 判整个 source）
    define([]);
});

test("when 非对象形式定义期收紧：裸字符串/数字/数组拒绝，模板与布尔放行", () => {
    const base = { name: "W", steps: [{ name: "s", path: "x" }] };
    // "false"/"0" 裸字符串按真值判定恒真——典型误用，定义期引导到对象断言或模板
    assert.throws(() => defineScenario({ ...base, steps: [{ name: "s", path: "x", when: "false" }] }), /when 只支持对象断言/);
    assert.throws(() => defineScenario({ ...base, steps: [{ name: "s", path: "x", when: "vars.flag" }] }), /when 只支持/);
    assert.throws(() => defineScenario({ ...base, steps: [{ name: "s", path: "x", when: 1 }] }), /when 只支持/);
    assert.throws(() => defineScenario({ ...base, steps: [{ name: "s", path: "x", when: [] }] }), /when 只支持/);
    // 部分模板 "pre {{vars.x}}" 解析成非空串恒真——when 字符串必须是整串 {{ }} 模板
    assert.throws(() => defineScenario({ ...base, steps: [{ name: "s", path: "x", when: "pre {{vars.x}}" }] }), /when 只支持/);
    assert.throws(() => defineScenario({ ...base, steps: [{ name: "s", path: "x", when: "{{a}}{{b}}" }] }), /when 只支持/);
    assert.throws(() => defineScenario({ ...base, steps: [{ name: "s", path: "x", when: "{{ }}" }] }), /合法路径写法|when 只支持/);
    defineScenario({ ...base, steps: [{ name: "s", path: "x", when: "{{vars.flag}}" }] });
    // 外层空白整串模板与运行期 resolveString 同口径放行（保真值，非拼接恒真）
    defineScenario({ ...base, steps: [{ name: "s", path: "x", when: " {{vars.flag}} " }] });
    defineScenario({ ...base, steps: [{ name: "s", path: "x", when: true }] });
    defineScenario({ ...base, steps: [{ name: "s", path: "x", when: false }] });
});

test("__proto__/constructor/prototype 保留键：读侧不可见、写侧双端拦截", async () => {
    const { getByPath, applyExtract } = await import("../src/core.js");
    // 读侧：继承成员不参与路径导航（exists:true 不得对 __proto__ 恒真）
    assert.equal(getByPath({ a: 1 }, "__proto__"), undefined);
    assert.equal(getByPath({ a: 1 }, "constructor"), undefined);
    assert.equal(getByPath({ a: { b: 2 } }, "a.b"), 2);
    assert.equal(getByPath({ list: [1, 2] }, "list.length"), 2);
    assert.equal(getByPath({ list: [1, 2] }, "list.map"), undefined);
    assert.equal(getByPath("abc", "length"), 3);
    // 写侧：vars.__proto__ 走 setter 会改原型——保留名拦截覆盖此面，运行期亦兜底
    const targetRuntime = { vars: {}, lastResponse: null, lastResponseBody: null };
    assert.throws(
        () => applyExtract({ extract: [{ name: "__proto__", path: "x" }] }, { status: 200, headers: {}, body: { x: 1 } }, targetRuntime),
        /保留变量/
    );
    assert.equal(targetRuntime.vars.polluted, undefined, "vars 原型链不得被 extract 污染");
    // 断言 evaluateAssertion 同口径：from:vars 读 __proto__ 判缺
    const verdict = (await import("../src/core.js")).evaluateAssertion(
        { from: "vars", path: "__proto__", exists: true },
        { status: 200, headers: {}, body: {}, bodyText: "" },
        { vars: { a: 1 }, lastResponse: null, lastResponseBody: null }
    );
    assert.equal(verdict.passed, false);
});

test("onStep 回调抛错降级为步骤 ERROR，不吞掉整轮报告", async () => {
    const engine = createEngine({ fetch: async () => jsonResponse({ code: 0 }) });
    const report = await engine.runScenario(
        { name: "A", steps: [{ name: "s1", path: "x" }] },
        { onStep: () => { throw new Error("reporter boom"); } }
    );
    assert.equal(report.status, "FAILED");
    assert.equal(report.results[0].status, "ERROR");
    assert.match(report.results[0].error, /onStep 回调抛错/);
    // continue 策略下回调异常不阻断后续步骤执行
    const report2 = await engine.runScenario(
        { name: "A", failurePolicy: "continue", steps: [{ name: "s1", path: "x" }, { name: "s2", path: "x" }] },
        { onStep: () => { throw new Error("boom"); } }
    );
    assert.equal(report2.results.length, 2, "每步均应产生结果行（onStep 异常按步降级）");
    assert.equal(report2.results[1].status, "ERROR");
    // SKIPPED 步骤被回调打成 ERROR 时必须清 skipped 标记——
    // 否则该步既不计 failed 也不计 passedSteps，场景报 SKIPPED/PASSED 是残留假绿
    const report3 = await engine.runScenario(
        { name: "A", steps: [{ name: "s1", path: "x", when: false }] },
        { onStep: (r) => { if (r.skipped) throw new Error("probe"); } }
    );
    assert.equal(report3.status, "FAILED", "SKIPPED 步骤的 onStep 异常不得让场景报 SKIPPED/PASSED");
    assert.equal(report3.results[0].status, "ERROR");
    assert.equal(report3.results[0].skipped, false);
});

test("fetch 拒绝时透出 error.cause（ENOTFOUND/ECONNREFUSED 等真实原因进 CI 日志）", async () => {
    const engine = createEngine({
        fetch: async () => {
            const error = new TypeError("fetch failed");
            error.cause = Object.assign(new Error("getaddrinfo ENOTFOUND api.example"), { code: "ENOTFOUND" });
            throw error;
        }
    });
    const report = await engine.runScenario({ name: "A", steps: [{ name: "s", path: "x" }] });
    assert.equal(report.results[0].status, "ERROR");
    assert.match(report.results[0].error, /fetch failed（ENOTFOUND）/);
    // cause 无 code 时回落 message
    const engine2 = createEngine({
        fetch: async () => {
            const error = new TypeError("fetch failed");
            error.cause = new Error("socket hang up");
            throw error;
        }
    });
    const report2 = await engine2.runScenario({ name: "A", steps: [{ name: "s", path: "x" }] });
    assert.match(report2.results[0].error, /socket hang up/);
});
