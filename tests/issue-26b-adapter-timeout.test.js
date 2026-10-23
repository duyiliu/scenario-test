import assert from "node:assert/strict";
import test from "node:test";
import { createEngine } from "../src/engine.js";

// Issue #26 B2：适配器步骤的 timeoutMs 此前完全不生效——executeHttp 有完整
// createRequestSignal 超时链路，executeAdapter 无任何超时控制，挂死的适配器
// （sleep/阻塞 IO）会让场景永久卡住（retryUntil.maxElapsedMs 只在 attempt 之间检查）。
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

// 不尊重 signal 的适配器（挂死型）同样被超时中断；父级取消信号同样竞速生效
test("B2：完全忽略 signal 的挂死适配器也会被超时中断", async () => {
    const engine = createEngine({
        adapters: {
            hung: {
                async execute() {
                    await new Promise(() => {});
                    return { status: 200, body: {} };
                }
            }
        }
    });
    const report = await engine.runScenario({
        name: "挂死适配器",
        steps: [{ name: "挂起", adapter: "hung", timeoutMs: 60 }]
    });
    assert.equal(report.results[0].status, "TIMEOUT");
    assert.equal(report.results[0].timedOut, true);
});

// 超时后 onError 钩子仍被调用（错误钩子不因竞速包装而丢失）
test("B2：适配器超时后 onError 钩子仍收到错误", async () => {
    let hookError = null;
    const engine = createEngine({
        adapters: {
            slow: {
                async execute() {
                    await new Promise((resolve) => setTimeout(resolve, 500));
                    return { status: 200, body: {} };
                },
                onError({ error }) {
                    hookError = error;
                }
            }
        }
    });
    await engine.runScenario({
        name: "超时钩子",
        steps: [{ name: "慢", adapter: "slow", timeoutMs: 50 }]
    });
    assert.ok(hookError, "onError 钩子应被调用");
});
