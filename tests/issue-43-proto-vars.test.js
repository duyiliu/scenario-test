import assert from "node:assert/strict";
import test from "node:test";
import {
    applyExtract,
    applyGeneratedVar,
    createEngine,
    defineScenario,
    getByPath
} from "../src/index.js";

const RESERVED_NAMES = ["__proto__", "constructor", "prototype"];

function jsonResponse(body, status = 200) {
    return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

function rawScenario(extra = {}) {
    return { name: "R", steps: [{ name: "s", path: "x" }], ...extra };
}

test("定义期拒绝生成变量/环境变量/extract 使用原型链保留名", () => {
    for (const name of RESERVED_NAMES) {
        const generated = new RegExp(`场景 R 的 generatedVars 第 1 项 name "${name}".*保留变量`);
        assert.throws(
            () => defineScenario(rawScenario({ generatedVars: [{ name, type: "enum", values: ["x"] }] })),
            generated
        );

        // 用 JSON.parse 构造自有 __proto__ 键（对象字面量会走原型 setter，不产生自有键）
        const envVars = JSON.parse(`{"${name}":"ENV_X"}`);
        assert.throws(
            () => defineScenario(rawScenario({ envVars })),
            new RegExp(`场景 R 的 envVars "${name}".*保留变量`)
        );

        assert.throws(
            () => defineScenario(rawScenario({ steps: [{ name: "s", path: "x", extract: [{ name, path: "a" }] }] })),
            new RegExp(`步骤 s 的 extract 第 1 项 name "${name}".*保留变量`)
        );
    }
});

test("applyGeneratedVar 直接写入 __proto__ 不改变原型，且普通值不会被静默丢弃", () => {
    const vars = {};
    const identifiers = { runId: "issue-43-seed", runNo: "000043" };

    applyGeneratedVar({ name: "__proto__", type: "enum", values: [{ polluted: true }] }, vars, identifiers);
    assert.equal(Object.getPrototypeOf(vars), Object.prototype, "对象值不得改写 vars 原型");
    assert.equal(Object.prototype.hasOwnProperty.call(vars, "__proto__"), true);
    assert.deepEqual(Object.getOwnPropertyDescriptor(vars, "__proto__").value, { polluted: true });
    assert.equal(Object.prototype.polluted, undefined);

    applyGeneratedVar({ name: "__proto__", type: "enum", values: ["plain"] }, vars, identifiers);
    assert.equal(Object.getPrototypeOf(vars), Object.prototype);
    assert.equal(vars["__proto__"], "plain", "原始值必须作为自有键可读，而不是被 setter 丢弃");
    assert.deepEqual(Object.keys(vars), ["__proto__"]);
});

test("绕过定义期直接 runScenario：generatedVars/envVars 的 __proto__ 仍在运行期被拒绝且不污染原型", async () => {
    const engine = createEngine({
        baseUrl: "https://mock.local",
        fetch: async () => jsonResponse({ ok: true })
    });

    await assert.rejects(
        engine.runScenario(rawScenario({ generatedVars: [{ name: "__proto__", type: "enum", values: ["x"] }] })),
        /保留变量/
    );
    await assert.rejects(
        engine.runScenario(rawScenario({ envVars: JSON.parse('{"__proto__":"ENV_X"}') })),
        /保留变量/
    );
    await assert.rejects(
        engine.runScenario(rawScenario({ vars: JSON.parse('{"__proto__":{"polluted":true}}') })),
        /保留变量/
    );
    assert.equal(Object.prototype.polluted, undefined, "运行期拒绝前不得发生原型污染");
});

test("JSON 响应体中的自有 __proto__ 字段仍可按普通路径读取", () => {
    const body = JSON.parse('{"__proto__":{"polluted":true},"id":"1"}');
    assert.equal(getByPath(body, '["__proto__"].polluted'), true);
    assert.equal(getByPath(body, "id"), "1");

    const runtime = { vars: {}, lastResponse: null, lastResponseBody: null };
    const result = applyExtract(
        { extract: [{ name: "flag", path: '["__proto__"].polluted' }] },
        { status: 200, headers: {}, body, bodyText: "" },
        runtime
    );
    assert.deepEqual(result.failures, []);
    assert.deepEqual(result.warnings, []);
    assert.equal(runtime.vars.flag, true);
    assert.equal(Object.getPrototypeOf(runtime.vars), Object.prototype);
});
