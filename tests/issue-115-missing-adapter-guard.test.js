import assert from "node:assert/strict";
import test from "node:test";
import { createEngine } from "../src/engine.js";
import { defineScenario, registerAdapter, clearAdapters } from "../src/registry.js";

// Issue #115：未匹配适配器且缺少 HTTP 字段时，executeHttp 用空 path 请求 baseUrl
// 根路径，隐式 2xx 断言通过——适配器名/插件拼错会静默 PASSED。
test("#115：无适配器命中且无 HTTP 字段的步骤报错，不再静默 GET 根路径", async () => {
    const requests = [];
    const scenario = defineScenario({
        name: "拼错的适配器步骤",
        steps: [{ name: "本地准备（拼错）", preparLocal: true }]
    });
    const report = await createEngine({
        baseUrl: "https://mock.local",
        fetch: async (url) => { requests.push(String(url)); return new Response("{}", { status: 200 }); }
    }).runScenario(scenario);
    assert.equal(report.passed, false);
    assert.equal(report.results[0].status, "ERROR");
    assert.match(report.results[0].error, /未匹配任何适配器/);
    assert.match(report.results[0].error, /HTTP 执行字段/);
    assert.deepEqual(requests, [], "不应发出任何 HTTP 请求");
});

test("#115：匹配到适配器时私有键仍正常交给适配器", async () => {
    clearAdapters();
    const executed = [];
    registerAdapter("local", {
        matches: (step) => Boolean(step.prepareLocal),
        async execute({ step }) {
            executed.push(step.name);
            return { method: "LOCAL", path: "local", response: { status: "LOCAL", headers: {}, body: { ok: true }, bodyText: null } };
        }
    });
    try {
        const scenario = defineScenario({ name: "适配器步骤", steps: [{ name: "本地准备", prepareLocal: true }] });
        const report = await createEngine({ baseUrl: "https://mock.local", fetch: async () => { throw new Error("不应发 HTTP"); } }).runScenario(scenario);
        assert.equal(report.passed, true);
        assert.deepEqual(executed, ["本地准备"]);
    } finally {
        clearAdapters();
    }
});
