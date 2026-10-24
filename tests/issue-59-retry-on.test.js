import assert from "node:assert/strict";
import test from "node:test";
import { contract, createEngine, defineScenario } from "../src/index.js";

function jsonResponse(body, status = 200) {
    return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

// 模拟 Node fetch 的网络错误形态：TypeError("fetch failed") + cause.code
function networkError(code) {
    const error = new TypeError("fetch failed");
    error.cause = Object.assign(new Error(code), { code });
    return error;
}

function retryStep(retryUntil, extra = {}) {
    return {
        name: "等待服务就绪",
        path: "health",
        retryUntil,
        assertions: [{ name: "就绪", path: "ready", equals: true }],
        ...extra
    };
}

test("contract 声明 retryOn 取值与默认值", () => {
    assert.deepEqual(contract.retryUntil.retryOn, ["assertion", "error", "timeout"]);
    assert.deepEqual(contract.retryUntil.defaultRetryOn, ["assertion"]);
    assert.deepEqual(contract.retryUntil.keys, ["maxAttempts", "intervalMs", "maxElapsedMs", "retryOn"]);
});

test("retryOn: ['error'] 首次 ECONNREFUSED、第二次成功 -> 步骤通过且 onAttempt 透出错误信息", async () => {
    let calls = 0;
    const attempts = [];
    const engine = createEngine({
        baseUrl: "https://mock.local",
        fetch: async () => {
            calls += 1;
            if (calls === 1) throw networkError("ECONNREFUSED");
            return jsonResponse({ ready: true });
        }
    });
    const report = await engine.runScenario(defineScenario({
        name: "网络错误重试",
        steps: [retryStep({ maxAttempts: 3, intervalMs: 100, retryOn: ["error"] })]
    }), {
        onAttempt: (info) => { attempts.push(info); }
    });

    assert.equal(report.status, "PASSED");
    assert.equal(report.failed, 0);
    assert.equal(calls, 2, "首次连接失败后应继续第二次尝试");
    assert.equal(attempts.length, 1);
    assert.equal(attempts[0].attempt, 1);
    assert.equal(attempts[0].totalAttempts, 3);
    assert.equal(attempts[0].status, null);
    assert.equal(attempts[0].failedAssertion, "");
    assert.equal(attempts[0].errorType, "error");
    assert.match(attempts[0].errorMessage, /fetch failed（ECONNREFUSED）/);
});

test("retryOn: ['timeout'] 单次请求超时后继续尝试并成功", async () => {
    let calls = 0;
    const attempts = [];
    const engine = createEngine({
        baseUrl: "https://mock.local",
        fetch: async (_url, options) => {
            calls += 1;
            if (calls === 1) {
                return await new Promise((_resolve, reject) => {
                    const onAbort = () => reject(options.signal.reason);
                    if (options.signal.aborted) onAbort();
                    else options.signal.addEventListener("abort", onAbort, { once: true });
                });
            }
            return jsonResponse({ ready: true });
        }
    });
    const report = await engine.runScenario(defineScenario({
        name: "单次超时重试",
        steps: [retryStep({ maxAttempts: 2, intervalMs: 100, retryOn: ["timeout"] }, { timeoutMs: 30 })]
    }), {
        onAttempt: (info) => { attempts.push(info); }
    });

    assert.equal(report.status, "PASSED");
    assert.equal(calls, 2);
    assert.equal(attempts.length, 1);
    assert.equal(attempts[0].errorType, "timeout");
    assert.match(attempts[0].errorMessage, /请求超时/);
});

test("retryOn: ['timeout'] 不重试普通网络错误", async () => {
    let calls = 0;
    const engine = createEngine({
        baseUrl: "https://mock.local",
        fetch: async () => {
            calls += 1;
            throw networkError("ECONNREFUSED");
        }
    });
    const report = await engine.runScenario(defineScenario({
        name: "只重试超时",
        steps: [retryStep({ maxAttempts: 3, intervalMs: 100, retryOn: ["timeout"] })]
    }));

    assert.equal(calls, 1);
    assert.equal(report.results[0].status, "ERROR");
    assert.match(report.results[0].error, /ECONNREFUSED/);
});

test("maxElapsedMs 用尽仍失败 -> TIMEOUT，错误包含尝试次数与最后错误", async () => {
    let calls = 0;
    const engine = createEngine({
        baseUrl: "https://mock.local",
        fetch: async () => {
            calls += 1;
            throw networkError("ENOTFOUND");
        }
    });
    const report = await engine.runScenario(defineScenario({
        name: "重试总时长",
        steps: [retryStep({ maxAttempts: 50, intervalMs: 100, maxElapsedMs: 50, retryOn: ["error"] })]
    }));

    assert.ok(calls >= 1);
    assert.ok(calls < 50, `应在总时长超限后停止重试（实际请求 ${calls} 次）`);
    assert.equal(report.results[0].status, "TIMEOUT");
    assert.equal(report.results[0].timedOut, true);
    assert.match(report.results[0].error, /重试超时/);
    assert.match(report.results[0].error, /已尝试 \d+ 次/);
    assert.match(report.results[0].error, /最后错误: .*fetch failed（ENOTFOUND）/);
});

test("maxElapsedMs 截断重试等待：interval 远大于总时限时按总时限返回 TIMEOUT", async () => {
    let calls = 0;
    const attempts = [];
    const engine = createEngine({
        baseUrl: "https://mock.local",
        fetch: async () => {
            calls += 1;
            throw networkError("ECONNREFUSED");
        }
    });
    const started = Date.now();
    const report = await engine.runScenario(defineScenario({
        name: "总时限截断间隔",
        steps: [retryStep({ maxAttempts: 10, intervalMs: 10000, maxElapsedMs: 50, retryOn: ["error"] })]
    }), {
        onAttempt: (info) => { attempts.push(info); }
    });
    const elapsed = Date.now() - started;

    assert.equal(report.results[0].status, "TIMEOUT");
    assert.equal(report.results[0].timedOut, true);
    assert.match(report.results[0].error, /重试超时/);
    assert.match(report.results[0].error, /已尝试 \d+ 次/);
    assert.match(report.results[0].error, /最后错误: .*ECONNREFUSED/);
    // 不能等完整 intervalMs(10s)，实际应在总时限附近结束
    assert.ok(elapsed < 1000, `maxElapsedMs 应约束等待时长，实际耗时 ${elapsed}ms`);
    assert.ok(calls < 5, `应在总时限到达后停止重试（实际请求 ${calls} 次）`);
    assert.equal(attempts.length, 1);
    assert.ok(attempts[0].intervalMs <= 100, `onAttempt 应报告截断后的等待时长，实际 ${attempts[0].intervalMs}ms`);
});

test("retryOn: ['error'] 适配器异常重试成功，onAttempt 与结果一致", async () => {
    let calls = 0;
    const attempts = [];
    const engine = createEngine({
        baseUrl: "https://mock.local",
        fetch: async () => { throw new Error("适配器步骤不应发起 HTTP 请求"); },
        adapters: {
            flaky: {
                async execute() {
                    calls += 1;
                    if (calls === 1) throw Object.assign(new Error("连接失败"), { code: "ECONNREFUSED" });
                    return { status: 200, headers: {}, body: { ready: true }, bodyText: null };
                }
            }
        }
    });
    const report = await engine.runScenario(defineScenario({
        name: "适配器错误重试",
        steps: [{
            name: "适配器轮询",
            adapter: "flaky",
            retryUntil: { maxAttempts: 2, intervalMs: 100, retryOn: ["error"] },
            assertions: [{ name: "就绪", path: "ready", equals: true }]
        }]
    }), {
        onAttempt: (info) => { attempts.push(info); }
    });

    assert.equal(report.status, "PASSED");
    assert.equal(report.results[0].status, 200);
    assert.equal(calls, 2);
    assert.equal(attempts.length, 1);
    assert.equal(attempts[0].errorType, "error");
    assert.match(attempts[0].errorMessage, /适配器 flaky 执行失败: 连接失败（ECONNREFUSED）/);
});

test("retryOn: ['error'] 适配器 reject 非 Error 值也能重试并保留可读错误", async () => {
    let calls = 0;
    const attempts = [];
    const engine = createEngine({
        baseUrl: "https://mock.local",
        fetch: async () => { throw new Error("适配器步骤不应发起 HTTP 请求"); },
        adapters: {
            flakyString: {
                async execute() {
                    calls += 1;
                    if (calls === 1) throw "socket 拒绝";
                    return { status: 200, headers: {}, body: { ready: true }, bodyText: null };
                }
            }
        }
    });
    const report = await engine.runScenario(defineScenario({
        name: "适配器非 Error 拒绝",
        steps: [{
            name: "适配器轮询",
            adapter: "flakyString",
            retryUntil: { maxAttempts: 2, intervalMs: 100, retryOn: ["error"] },
            assertions: [{ name: "就绪", path: "ready", equals: true }]
        }]
    }), {
        onAttempt: (info) => { attempts.push(info); }
    });

    assert.equal(report.status, "PASSED");
    assert.equal(calls, 2);
    assert.equal(attempts.length, 1);
    assert.equal(attempts[0].errorType, "error");
    assert.match(attempts[0].errorMessage, /适配器 flakyString 执行失败: socket 拒绝/);
});

test("retryOn: ['timeout'] 适配器超时后底层 Promise 延迟拒绝不产生未处理拒绝或额外回调", async () => {
    let calls = 0;
    const attempts = [];
    const steps = [];
    const unhandled = [];
    const onUnhandled = (reason) => { unhandled.push(reason); };
    process.on("unhandledRejection", onUnhandled);
    const engine = createEngine({
        baseUrl: "https://mock.local",
        fetch: async () => { throw new Error("适配器步骤不应发起 HTTP 请求"); },
        adapters: {
            slow: {
                async execute() {
                    calls += 1;
                    if (calls === 1) {
                        // 忽略 signal 的挂起适配器：超时由 raceWithSignal 先返回，底层 Promise 稍后拒绝
                        return await new Promise((_resolve, reject) => {
                            setTimeout(() => reject(new Error("延迟失败")), 180);
                        });
                    }
                    return { status: 200, headers: {}, body: { ready: true }, bodyText: null };
                }
            }
        }
    });

    try {
        const report = await engine.runScenario(defineScenario({
            name: "适配器超时重试",
            steps: [{
                name: "适配器轮询",
                adapter: "slow",
                timeoutMs: 30,
                retryUntil: { maxAttempts: 2, intervalMs: 100, retryOn: ["timeout"] },
                assertions: [{ name: "就绪", path: "ready", equals: true }]
            }]
        }), {
            onAttempt: (info) => { attempts.push(info); },
            onStep: (result) => { steps.push(result); }
        });

        assert.equal(report.status, "PASSED");
        assert.equal(calls, 2);
        assert.equal(attempts.length, 1);
        assert.equal(attempts[0].errorType, "timeout");
        assert.match(attempts[0].errorMessage, /请求超时/);
        assert.equal(steps.length, 1);

        // 等到底层 Promise 的延迟拒绝真正发生，确认其已被 raceWithSignal 消费
        await new Promise((resolve) => setTimeout(resolve, 220));
        assert.deepEqual(unhandled, [], "底层 Promise 延迟拒绝不应成为未处理拒绝");
        assert.equal(calls, 2, "底层 Promise 后续完成不应触发额外尝试");
        assert.equal(attempts.length, 1, "底层 Promise 后续完成不应触发额外 onAttempt");
        assert.equal(steps.length, 1, "底层 Promise 后续完成不应触发额外 onStep");
    } finally {
        process.off("unhandledRejection", onUnhandled);
    }
});

test("retryOn: ['error'] 适配器重试间隔中取消立即终止", async () => {
    const controller = new AbortController();
    let calls = 0;
    const engine = createEngine({
        baseUrl: "https://mock.local",
        fetch: async () => { throw new Error("适配器步骤不应发起 HTTP 请求"); },
        adapters: {
            alwaysFails: {
                async execute() {
                    calls += 1;
                    throw new Error("连接失败");
                }
            }
        }
    });
    const scenario = defineScenario({
        name: "适配器间隔中取消",
        steps: [{
            name: "适配器轮询",
            adapter: "alwaysFails",
            retryUntil: { maxAttempts: 5, intervalMs: 10000, maxElapsedMs: 60000, retryOn: ["error"] }
        }]
    });
    const started = Date.now();
    const pending = engine.runScenario(scenario, { signal: controller.signal });
    await new Promise((resolve) => setTimeout(resolve, 120));
    controller.abort();
    const report = await pending;
    const elapsed = Date.now() - started;

    assert.equal(report.status, "CANCELLED");
    assert.equal(report.results[0].status, "CANCELLED");
    assert.equal(calls, 1);
    assert.ok(elapsed < 5000, `取消应立即生效，实际耗时 ${elapsed}ms`);
});

test("maxAttempts 用尽仍报网络错误 -> ERROR，尝试次数与 maxAttempts 一致", async () => {
    let calls = 0;
    const engine = createEngine({
        baseUrl: "https://mock.local",
        fetch: async () => {
            calls += 1;
            throw networkError("ECONNREFUSED");
        }
    });
    const report = await engine.runScenario(defineScenario({
        name: "重试次数耗尽",
        steps: [retryStep({ maxAttempts: 2, intervalMs: 100, retryOn: ["error"] })]
    }));

    assert.equal(calls, 2);
    assert.equal(report.results[0].status, "ERROR");
    assert.equal(report.results[0].timedOut, false);
    assert.match(report.results[0].error, /ECONNREFUSED/);
});

test("取消信号在 retryOn 重试间隔中立即终止，不等待完整 interval", async () => {
    const controller = new AbortController();
    let calls = 0;
    const engine = createEngine({
        baseUrl: "https://mock.local",
        fetch: async () => {
            calls += 1;
            throw networkError("ECONNREFUSED");
        }
    });
    const scenario = defineScenario({
        name: "间隔中取消",
        steps: [retryStep({ maxAttempts: 5, intervalMs: 10000, maxElapsedMs: 60000, retryOn: ["error"] })]
    });
    const started = Date.now();
    const pending = engine.runScenario(scenario, { signal: controller.signal });
    await new Promise((resolve) => setTimeout(resolve, 120));
    controller.abort();
    const report = await pending;
    const elapsed = Date.now() - started;

    assert.equal(report.status, "CANCELLED");
    assert.equal(report.results[0].status, "CANCELLED");
    assert.equal(calls, 1);
    assert.ok(elapsed < 5000, `取消应立即生效，实际耗时 ${elapsed}ms`);
});

test("不配置 retryOn 时网络错误仍立即失败（保持历史语义）", async () => {
    let calls = 0;
    const engine = createEngine({
        baseUrl: "https://mock.local",
        fetch: async () => {
            calls += 1;
            throw networkError("ECONNREFUSED");
        }
    });
    const report = await engine.runScenario(defineScenario({
        name: "默认不重试错误",
        steps: [retryStep({ maxAttempts: 5, intervalMs: 100 })]
    }));

    assert.equal(calls, 1);
    assert.equal(report.results[0].status, "ERROR");
    assert.match(report.results[0].error, /ECONNREFUSED/);
});

test("定义期拒绝非法 retryOn（非数组/未知取值）", () => {
    const withRetry = (retryUntil) => defineScenario({
        name: "非法 retryOn",
        steps: [{ name: "s", path: "x", retryUntil, assertions: [{ path: "ok", equals: true }] }]
    });

    assert.throws(() => withRetry({ retryOn: "error" }), /retryOn 必须是数组/);
    assert.throws(() => withRetry({ retryOn: ["assertion", "bogus"] }), /retryOn 项只支持/);
    // 空数组合法：表示只尝试一次、不重试
    withRetry({ retryOn: [] });
});
