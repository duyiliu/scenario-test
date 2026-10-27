import assert from "node:assert/strict";
import test from "node:test";
import {
    CONTRACT_VERSION,
    buildCapabilities,
    contract,
    createEngine,
    defineScenario,
    renderCapabilitiesText
} from "../src/index.js";
import { createProjectFiles } from "../src/init-templates.js";

function jsonResponse(body, status = 200) {
    return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

function retryStep(retryUntil, extra = {}) {
    return {
        name: "轮询任务",
        path: "job",
        retryUntil,
        assertions: [{ name: "就绪", path: "ready", equals: true }],
        ...extra
    };
}

function alwaysFailEngine() {
    let calls = 0;
    const engine = createEngine({
        baseUrl: "https://mock.local",
        fetch: async () => {
            calls += 1;
            return jsonResponse({ ready: false });
        }
    });
    return { engine, calls: () => calls };
}

test("contract v17 声明 retryUntil 退避键并投射到 capabilities/AI Prompt", () => {
    assert.equal(CONTRACT_VERSION, 17);
    assert.deepEqual(contract.retryUntil.keys, [
        "maxAttempts", "intervalMs", "maxElapsedMs", "retryOn", "intervalFactor", "maxIntervalMs"
    ]);
    assert.match(contract.retryUntil.note, /intervalFactor/);
    assert.match(contract.retryUntil.note, /maxIntervalMs/);

    const capabilities = buildCapabilities(contract);
    assert.deepEqual(capabilities.retryUntil.keys, [...contract.retryUntil.keys]);
    const text = renderCapabilitiesText(capabilities);
    assert.match(text, /intervalFactor/);
    assert.match(text, /maxIntervalMs/);

    const files = createProjectFiles("scenario-test");
    const prompt = files["scenario-test/.scenario-test/AI_SCENARIO_PROMPT.md"];
    const patterns = files["scenario-test/.scenario-test/SCENARIO_PATTERNS.md"];
    const readme = files["scenario-test/README.md"];
    for (const content of [prompt, patterns, readme]) {
        assert.match(content, /intervalFactor/);
        assert.match(content, /maxIntervalMs/);
    }
});

test("intervalFactor 指数退避并按 maxIntervalMs 封顶，onAttempt 报告实际间隔", async () => {
    const { engine, calls } = alwaysFailEngine();
    const intervals = [];
    const report = await engine.runScenario(defineScenario({
        name: "指数退避",
        steps: [retryStep({
            maxAttempts: 4,
            intervalMs: 100,
            intervalFactor: 2,
            maxIntervalMs: 250,
            maxElapsedMs: 60000
        })]
    }), {
        onAttempt: (info) => { intervals.push(info.intervalMs); }
    });

    assert.equal(report.status, "FAILED");
    assert.equal(calls(), 4);
    // 第 1/2/3 次重试等待：100、200、250（400 被 maxIntervalMs 封顶，第 4 次尝试后不再等待）
    assert.deepEqual(intervals, [100, 200, 250]);
});

test("未声明 intervalFactor 时保持固定间隔（默认 1）", async () => {
    const { engine } = alwaysFailEngine();
    const intervals = [];
    await engine.runScenario(defineScenario({
        name: "固定间隔",
        steps: [retryStep({ maxAttempts: 3, intervalMs: 100, maxElapsedMs: 60000 })]
    }), {
        onAttempt: (info) => { intervals.push(info.intervalMs); }
    });
    assert.deepEqual(intervals, [100, 100]);
});

test("maxIntervalMs 低于 100ms 时仍应用最小间隔下限", async () => {
    const { engine, calls } = alwaysFailEngine();
    const intervals = [];
    await engine.runScenario(defineScenario({
        name: "下限优先",
        steps: [retryStep({
            maxAttempts: 2,
            intervalMs: 0,
            intervalFactor: 2,
            maxIntervalMs: 50,
            maxElapsedMs: 60000
        })]
    }), {
        onAttempt: (info) => { intervals.push(info.intervalMs); }
    });
    assert.equal(calls(), 2);
    assert.deepEqual(intervals, [100]);
});

test("退避等待按 maxElapsedMs 剩余额度截断，不在总时限后睡完整间隔", async () => {
    const { engine } = alwaysFailEngine();
    const intervals = [];
    const started = Date.now();
    const report = await engine.runScenario(defineScenario({
        name: "总时限截断退避",
        steps: [retryStep({
            maxAttempts: 5,
            intervalMs: 1000,
            intervalFactor: 2,
            maxElapsedMs: 150
        })]
    }), {
        onAttempt: (info) => { intervals.push(info.intervalMs); }
    });
    const elapsed = Date.now() - started;

    assert.equal(report.results[0].status, "TIMEOUT");
    assert.match(report.results[0].error, /重试超时/);
    assert.ok(intervals.length >= 1);
    assert.ok(
        intervals.every((intervalMs) => intervalMs <= 150),
        `onAttempt 应报告截断后的等待时长，实际 ${JSON.stringify(intervals)}ms`
    );
    assert.ok(elapsed < 800, `总时限应约束退避等待，实际耗时 ${elapsed}ms`);
});

test("总时限截断的等待结束后直接 TIMEOUT，不因定时器提前触发多跑一次", async () => {
    const originalPerformance = globalThis.performance;
    let fixedNow = 0;
    globalThis.performance = { now: () => fixedNow };
    try {
        let calls = 0;
        const intervals = [];
        const engine = createEngine({
            baseUrl: "https://mock.local",
            fetch: async () => {
                calls += 1;
                // 用可控时钟模拟「请求很快返回、但等待结束后仍未到总时限」的计时器提前竞态
                fixedNow = 10;
                throw new Error("ECONNREFUSED");
            }
        });
        const report = await engine.runScenario(defineScenario({
            name: "截断等待不追加尝试",
            steps: [retryStep({
                maxAttempts: 5,
                intervalMs: 1000,
                maxElapsedMs: 50,
                retryOn: ["error"]
            })]
        }), {
            onAttempt: (info) => { intervals.push(info.intervalMs); }
        });

        assert.equal(report.results[0].status, "TIMEOUT");
        assert.equal(report.results[0].timedOut, true);
        assert.equal(calls, 1, "总时限已无法容纳下一次尝试，不应再发请求");
        assert.deepEqual(intervals, [40], "onAttempt 应报告按剩余额度截断后的等待时长");
    } finally {
        globalThis.performance = originalPerformance;
    }
});

test("定义期校验 intervalFactor ≥1 与 maxIntervalMs ≥ intervalMs", () => {
    const withRetry = (retryUntil) => defineScenario({
        name: "退避校验",
        steps: [retryStep(retryUntil)]
    });

    for (const intervalFactor of [0, 0.5, -1, NaN, Infinity, "abc"]) {
        assert.throws(
            () => withRetry({ intervalMs: 100, intervalFactor }),
            /intervalFactor 必须是 ≥1 的有限数字/,
            `intervalFactor=${String(intervalFactor)} 应被拒绝`
        );
    }
    for (const maxIntervalMs of [-1, NaN, Infinity, "abc"]) {
        assert.throws(
            () => withRetry({ intervalMs: 100, maxIntervalMs }),
            /maxIntervalMs 必须是 ≥ intervalMs 的有限数字/,
            `maxIntervalMs=${String(maxIntervalMs)} 应被拒绝`
        );
    }
    assert.throws(
        () => withRetry({ intervalMs: 100, maxIntervalMs: 99 }),
        /maxIntervalMs 必须是 ≥ intervalMs 的有限数字/
    );
    // 未声明 intervalMs 时按默认 2000ms 校验上限，避免用户误以为上限能压低基础间隔
    assert.throws(
        () => withRetry({ maxIntervalMs: 1000 }),
        /maxIntervalMs 必须是 ≥ intervalMs 的有限数字/
    );

    // 边界合法：factor=1、maxIntervalMs=intervalMs、intervalMs=0/maxIntervalMs=0
    withRetry({ intervalMs: 100, intervalFactor: 1, maxIntervalMs: 100 });
    withRetry({ intervalMs: 0, maxIntervalMs: 0 });
});
