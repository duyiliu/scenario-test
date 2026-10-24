import assert from "node:assert/strict";
import test from "node:test";
import { clone, createEngine, defineScenario, resolve, resolveClone } from "../src/index.js";

function jsonResponse(body, status = 200) {
    return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

// 旧实现（clone + resolve）是本次优化的语义基准：resolveClone 必须逐项等价
function legacyResolveClone(value, runtime) {
    return resolve(clone(value), runtime);
}

const runtime = {
    vars: {
        token: "T-1",
        payload: { ok: true, nested: { id: 7 } }
    },
    lastResponse: null,
    lastResponseBody: null
};

// ==================== 回归测试：clone 既有语义必须完整保留 ====================

test("resolveClone 与 resolve(clone(...)) 等价：模板、undefined 键、数字标准化、嵌套结构", () => {
    const input = {
        url: "do/{{vars.token}}",
        plain: "{{vars.token}}",
        flag: false,
        nil: null,
        nan: NaN,
        infinity: Infinity,
        negativeInfinity: -Infinity,
        negativeZero: -0,
        missing: undefined,
        list: [1, undefined, "{{vars.token}}", [undefined, { a: undefined, b: "{{vars.payload}}" }]],
        nested: { deep: { value: "pre-{{vars.token}}-post" } },
        // 整串模板解析出的对象按引用共享（与 resolve 一致，clone 不复制解析结果）
        payloadRef: "{{vars.payload}}"
    };
    const actual = resolveClone(input, runtime);
    assert.deepEqual(actual, legacyResolveClone(input, runtime));
    assert.equal(actual.payloadRef, runtime.vars.payload);
    assert.ok(Object.is(actual.negativeZero, 0), "clone 会把 -0 归一为 0");
    assert.equal(actual.nan, null);
    assert.equal(actual.infinity, null);
    assert.equal(actual.negativeInfinity, null);
});

test("resolveClone：undefined 键剥离、数组空位/undefined 补 null（与 JSON 语义一致）", () => {
    const sparse = [1, , 3];
    const actual = resolveClone({ a: undefined, b: 1, list: [undefined, "x", sparse] }, runtime);
    assert.deepEqual(actual, { b: 1, list: [null, "x", [1, null, 3]] });
    assert.equal(Object.prototype.hasOwnProperty.call(actual, "a"), false);
    assert.deepEqual(actual, legacyResolveClone({ a: undefined, b: 1, list: [undefined, "x", sparse] }, runtime));
});

test("resolveClone：Date/Map/Set/带 toJSON 的对象沿用 clone 的 JSON 序列化结果", () => {
    const at = new Date("2024-01-02T03:04:05.000Z");
    const input = {
        at,
        list: [at],
        map: new Map([["a", 1]]),
        set: new Set([1]),
        custom: { toJSON() { return { token: "{{vars.token}}", dropped: undefined }; } }
    };
    const actual = resolveClone(input, runtime);
    assert.deepEqual(actual, legacyResolveClone(input, runtime));
    assert.equal(actual.at, at.toISOString());
    assert.equal(actual.list[0], at.toISOString());
    assert.deepEqual(actual.map, {});
    assert.deepEqual(actual.set, {});
    assert.deepEqual(actual.custom, { token: "T-1" });
});

test("resolveClone：循环引用抛 TypeError，与 clone 行为一致", () => {
    const objectCycle = { name: "self" };
    objectCycle.self = objectCycle;
    const arrayCycle = [];
    arrayCycle.push(arrayCycle);

    assert.throws(() => resolveClone(objectCycle, runtime), TypeError);
    assert.throws(() => legacyResolveClone(objectCycle, runtime), TypeError);
    assert.throws(() => resolveClone(arrayCycle, runtime), TypeError);
    assert.throws(() => legacyResolveClone(arrayCycle, runtime), TypeError);
    // 兄弟节点重复引用不是循环引用，必须正常完成
    const shared = { v: "{{vars.token}}" };
    assert.deepEqual(resolveClone({ a: shared, b: shared }, runtime), { a: { v: "T-1" }, b: { v: "T-1" } });
});

test("resolveClone：非 JSON 类型（BigInt）与 clone 一样抛 TypeError", () => {
    assert.throws(() => resolveClone({ big: 1n }, runtime), TypeError);
    assert.throws(() => legacyResolveClone({ big: 1n }, runtime), TypeError);
});

test("resolveClone：对象内的 function/symbol 值被丢弃，数组内补 null（与 clone 一致）", () => {
    const symbol = Symbol("s");
    const input = { fn() {}, sym: symbol, list: [() => {}, symbol, "{{vars.token}}"] };
    const actual = resolveClone(input, runtime);
    assert.deepEqual(actual, legacyResolveClone(input, runtime));
    // JSON.stringify 在数组中的 function/symbol 变成 null（Symbol 键/值均无法序列化）
    assert.deepEqual(actual, { list: [null, null, "T-1"] });
});

test("resolveClone：__proto__ 作为自有数据键保留，且不污染原型链", () => {
    const input = JSON.parse('{"__proto__": {"polluted": true}, "value": "{{vars.token}}"}');
    const actual = resolveClone(input, runtime);
    assert.deepEqual(actual, legacyResolveClone(input, runtime));
    assert.equal(Object.getPrototypeOf(actual), Object.prototype);
    assert.equal(Object.prototype.hasOwnProperty.call(actual, "__proto__"), true);
    assert.deepEqual(Object.getOwnPropertyDescriptor(actual, "__proto__").value, { polluted: true });
    assert.equal(actual.value, "T-1");
    assert.equal({}.polluted, undefined);
    assert.equal(Object.prototype.polluted, undefined);
});

test("resolveClone：容器全新（修改结果不污染输入）", () => {
    const input = { nested: { list: [{ v: "{{vars.token}}" }] } };
    const actual = resolveClone(input, runtime);
    actual.nested.list[0].v = "changed";
    actual.nested.extra = 1;
    assert.deepEqual(input, { nested: { list: [{ v: "{{vars.token}}" }] } });
});

// ==================== 引擎接入：HTTP 与适配器路径 ====================

test("HTTP 请求体沿用 clone 语义：undefined 键剥离、Date → ISO 串、模板解析", async () => {
    const at = new Date("2024-01-02T03:04:05.000Z");
    let seenBody = null;
    const engine = createEngine({
        baseUrl: "https://mock.local",
        fetch: async (url, init) => {
            seenBody = JSON.parse(init.body);
            return jsonResponse({ ok: true });
        }
    });
    const scenario = defineScenario({
        name: "请求体语义",
        vars: { token: "T-1" },
        steps: [{
            name: "提交",
            method: "POST",
            path: "/echo",
            request: {
                body: {
                    token: "{{vars.token}}",
                    drop: undefined,
                    at,
                    nested: { keep: 1, drop: undefined }
                }
            },
            assertions: [{ path: "ok", equals: true }]
        }]
    });
    const report = await engine.runScenario(scenario);
    assert.equal(report.passed, true);
    assert.deepEqual(seenBody, { token: "T-1", at: at.toISOString(), nested: { keep: 1 } });
});

test("适配器 execute 每次尝试收到独立副本：修改不泄漏回原始步骤，重试仍看到原始定义", async () => {
    const received = [];
    const adapter = {
        async execute({ step }) {
            // 先快照本轮收到的解析结果，再修改副本
            received.push({ step, args: { ...step.request.args } });
            // 修改副本：不得回写原始步骤定义，也不得影响下一次尝试
            step.request.args.token = "mutated";
            step.request.args.extra = "leak";
            delete step.request.args.keep;
            return { response: { status: 200, headers: {}, body: { attempt: received.length }, bodyText: null } };
        }
    };
    const originalArgs = { token: "{{vars.token}}", keep: "keep", drop: undefined };
    const scenario = defineScenario({
        name: "副本不可变",
        vars: { token: "T-1" },
        steps: [{
            name: "轮询",
            adapter: "copy-adapter",
            request: { args: originalArgs },
            retryUntil: { maxAttempts: 2, intervalMs: 100 },
            assertions: [{ path: "attempt", equals: 2 }]
        }]
    });
    const report = await createEngine({
        fetch: async () => { throw new Error("适配器步骤不应发起 HTTP"); },
        adapters: { "copy-adapter": adapter }
    }).runScenario(scenario);

    assert.equal(report.passed, true);
    assert.equal(received.length, 2);
    // 每次尝试都是新解析出的副本：第二轮看到原始模板值，而不是上一轮写入的 mutation
    assert.deepEqual(received[0].args, { token: "T-1", keep: "keep" });
    assert.deepEqual(received[1].args, { token: "T-1", keep: "keep" });
    assert.notEqual(received[0].step, received[1].step);
    assert.notEqual(received[0].step.request, received[1].step.request);
    // 原始步骤定义（含模板串与值为 undefined 的键）未被改动
    assert.equal(scenario.steps[0].request.args.token, "{{vars.token}}");
    assert.equal(scenario.steps[0].request.args.keep, "keep");
    assert.equal(scenario.steps[0].request.args.extra, undefined);
    assert.equal(Object.prototype.hasOwnProperty.call(scenario.steps[0].request.args, "drop"), true);
    assert.equal(originalArgs.token, "{{vars.token}}");
});
