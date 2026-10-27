import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {
    CONTRACT_VERSION,
    buildCapabilities,
    contract,
    defineScenario,
    evaluateAssertion,
    validateAssertion
} from "../src/index.js";
import { buildMarkdownReport, eachDetailRows } from "../src/browser/ui/ui-view.js";
import { buildDoctorReport } from "../src/doctor.js";
import * as nodeApi from "../src/node.js";

const runtime = { vars: {}, lastResponse: null, lastResponseBody: null };
const response = (body, status = 200) => ({ status, headers: {}, body, bodyText: "" });

function shapeFailures(result) {
    return (result.detail || []).flatMap((item) => item.assertions);
}

test("contract v17：shape 操作符与 jsonSchema-lite 键/类型名单对外投射", () => {
    assert.equal(CONTRACT_VERSION, 17);
    assert.ok(contract.assertions.operators.shape, "contract 缺少 shape 操作符");
    assert.equal(contract.assertions.operators.shape.valueType, "any");
    assert.deepEqual(contract.assertions.shape.types, ["object", "array", "string", "number", "integer", "boolean", "null"]);
    assert.deepEqual(
        contract.assertions.shape.keys,
        ["type", "required", "properties", "items", "enum", "additionalProperties"]
    );
    const caps = buildCapabilities(contract);
    assert.ok(caps.assertions.operators.shape);
    assert.deepEqual(caps.assertions.shape.types, [...contract.assertions.shape.types]);
    assert.deepEqual(caps.assertions.shape.keys, [...contract.assertions.shape.keys]);
});

test("shape：必填字段、类型、嵌套数组元素全部通过", () => {
    const definition = {
        path: "data",
        shape: {
            type: "object",
            required: ["id", "items"],
            properties: {
                id: { type: "integer" },
                name: { type: "string", enum: ["demo"] },
                items: {
                    type: "array",
                    items: {
                        type: "object",
                        required: ["sku"],
                        properties: { sku: { type: "string" }, qty: { type: "number" } }
                    }
                }
            }
        }
    };
    const result = evaluateAssertion(
        definition,
        response({ data: { id: 1, name: "demo", items: [{ sku: "A", qty: 1.5 }, { sku: "B", qty: 2 }] } }),
        runtime
    );
    assert.equal(result.passed, true);
    assert.ok(!("detail" in result), "通过时不得携带 detail");
});

test("shape：缺失必填、类型不符、嵌套数组元素失败均给出字段级明细", () => {
    const result = evaluateAssertion(
        {
            path: "data",
            shape: {
                type: "object",
                required: ["id", "items"],
                properties: {
                    id: { type: "integer" },
                    items: {
                        type: "array",
                        items: { type: "object", required: ["sku"], properties: { sku: { type: "string" } } }
                    }
                }
            }
        },
        response({ data: { id: "not-int", items: [{ sku: "A" }, { sku: 42 }] } }),
        runtime
    );
    assert.equal(result.passed, false);
    assert.ok(Array.isArray(result.detail), "失败时必须携带 detail");
    // detail.path 相对断言实际值（与 each 的 index 相对元素一致）
    assert.deepEqual(result.detail.map((item) => item.path), ["id", "items[1].sku"]);

    const [typeFailure, nestedFailure] = shapeFailures(result);
    assert.equal(typeFailure.expectedType, "integer");
    assert.equal(typeFailure.actualType, "string");
    assert.match(typeFailure.reason, /期望 integer，实际 string/);
    assert.equal(typeFailure.actual, "not-int");
    assert.equal(nestedFailure.expectedType, "string");
    assert.equal(nestedFailure.actualType, "integer");
    assert.equal(nestedFailure.actual, 42);

    // detail 可 JSON 序列化（CLI/report/工作台均直接透出）
    assert.equal(JSON.parse(JSON.stringify(result)).detail[1].path, "items[1].sku");
});

test("shape：required 缺失字段定位到字段名且不影响默认新增字段", () => {
    const result = evaluateAssertion(
        {
            shape: {
                type: "object",
                required: ["id", "name"],
                properties: { id: { type: "integer" } },
                additionalProperties: true
            }
        },
        response({ id: 1, extra: true }),
        runtime
    );
    assert.equal(result.passed, false);
    assert.equal(result.detail.length, 1);
    assert.equal(result.detail[0].path, "name");
    assert.equal(result.detail[0].assertions[0].reason, "缺少必填字段");
});

test("shape：additionalProperties 默认 true，声明 false 时未知键失败", () => {
    const schema = { type: "object", required: ["id"], properties: { id: { type: "integer" } } };
    assert.equal(evaluateAssertion({ shape: schema }, response({ id: 1, extra: true }), runtime).passed, true);

    const strict = evaluateAssertion(
        { shape: { ...schema, additionalProperties: false } },
        response({ id: 1, extra: true }),
        runtime
    );
    assert.equal(strict.passed, false);
    assert.equal(strict.detail[0].path, "extra");
    assert.match(strict.detail[0].assertions[0].reason, /未声明键 "extra"/);
});

test("shape：enum 深比较、全部基础类型与 null", () => {
    assert.equal(evaluateAssertion({ shape: { enum: [{ a: 1, b: 2 }] } }, response({ b: 2, a: 1 }), runtime).passed, true);
    assert.equal(evaluateAssertion({ shape: { enum: ["UP"] } }, response("DOWN"), runtime).passed, false);
    for (const [value, type] of [
        [{}, "object"],
        [[], "array"],
        ["x", "string"],
        [1.5, "number"],
        [2, "integer"],
        [true, "boolean"],
        [null, "null"]
    ]) {
        assert.equal(evaluateAssertion({ shape: { type } }, response(value), runtime).passed, true, `${type} 应通过`);
    }
    assert.equal(evaluateAssertion({ shape: { type: "integer" } }, response(1.5), runtime).passed, false);
});

test("shape：可在 each 子断言内嵌套，失败明细递归携带字段路径", () => {
    const result = evaluateAssertion(
        {
            path: "users",
            each: {
                shape: {
                    type: "object",
                    required: ["id", "age"],
                    properties: { id: { type: "integer" }, age: { type: "integer" } }
                }
            }
        },
        response({ users: [{ id: 1, age: 20 }, { id: "B3", age: 22 }] }),
        runtime
    );
    assert.equal(result.passed, false);
    assert.deepEqual(result.detail.map((item) => item.index), [1], "外层 each 只定位失败元素");
    const inner = result.detail[0].assertions[0];
    assert.equal(inner.passed, false);
    assert.equal(inner.detail[0].path, "id");
    assert.match(inner.detail[0].assertions[0].reason, /期望 integer，实际 string/);
});

test("shape：与 exists/matches 等值级操作符组合无副作用", () => {
    const result = evaluateAssertion(
        {
            path: "data.id",
            exists: true,
            matches: "^\\d+$",
            shape: { type: "integer" }
        },
        response({ data: { id: 1 } }),
        runtime
    );
    assert.equal(result.passed, true);
    assert.ok(!("detail" in result));

    const existsFailure = evaluateAssertion(
        { path: "data", exists: false, shape: { type: "object" } },
        response({ data: {} }),
        runtime
    );
    assert.equal(existsFailure.passed, false);
    assert.ok(!("detail" in existsFailure), "shape 通过时即使其它操作符失败也不产生 shape 明细");
});

test("shape：未识别键/非法 type/非法子 schema 定义期即拒", () => {
    const context = { scenarioName: "S1", stepNo: 1, stepName: "步骤A", assertionNo: 1 };
    assert.throws(
        () => validateAssertion({ path: "data", shape: { type: "object", unknownKey: true } }, context),
        /shape 包含未知键 "unknownKey".*允许的 shape 键/
    );
    assert.throws(
        () => validateAssertion({ path: "data", shape: { type: "date" } }, context),
        /shape.type 只支持 object\/array\/string\/number\/integer\/boolean\/null/
    );
    assert.throws(
        () => validateAssertion({ path: "data", shape: { required: "id" } }, context),
        /required 必须是非空字符串数组/
    );
    assert.throws(
        () => validateAssertion({ path: "data", shape: { properties: { id: { type: "object", typo: 1 } } } }, context),
        /shape\.properties\.id 包含未知键 "typo"/
    );
    assert.throws(
        () => validateAssertion({ path: "data", shape: { items: { type: "date" } } }, context),
        /shape\.items\.type 只支持/
    );
    assert.throws(
        () => validateAssertion({ path: "data", shape: { additionalProperties: "false" } }, context),
        /additionalProperties 必须是布尔值/
    );
    // 通过 defineScenario 同样在定义期拒绝（doctor/loader 共用 registry）
    assert.throws(
        () => defineScenario({
            name: "shape 非法",
            steps: [{ name: "查", path: "x", assertions: [{ path: "data", shape: { typo: true } }] }]
        }),
        /shape 包含未知键 "typo"/
    );
});

test("shape 明细按字段路径展示（断言表与 Markdown 报告，而非「第 N 项」）", () => {
    const detail = [{
        index: 0,
        path: "items[0].sku",
        actual: 42,
        assertions: [{
            name: "items[0].sku",
            passed: false,
            expected: "string",
            actual: 42,
            actualType: "integer",
            reason: "类型不符：期望 string，实际 integer"
        }]
    }];
    const html = eachDetailRows(detail, "");
    assert.ok(html.includes("↳ items[0].sku</td>"), "断言表应显示字段路径");
    assert.ok(!html.includes("第 1 项"), "shape 明细不应误用 each 的项序号");
    const md = buildMarkdownReport({
        steps: [{
            stepNo: 1,
            name: "查列表",
            method: "GET",
            path: "/list",
            status: 200,
            passed: false,
            durationFmt: "1ms",
            error: "",
            warnings: [],
            assertions: [{ name: "结构", passed: false, expected: {}, actual: {}, detail }],
            response: {}
        }]
    });
    assert.match(md, /- items\[0\]\.sku失败: 期望 string,实得 42/);
    assert.ok(md.includes("原因: 类型不符：期望 string，实际 integer"));
});

test("doctor 同步：合法 shape 场景通过，未识别 shape 键在场景注册期 FAIL", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "scenario-test-shape-doctor-"));
    try {
        const configPath = path.join(dir, "scenario.config.js");
        fs.writeFileSync(configPath, `ScenarioTest.registerConfig(ScenarioTest.defineConfig({
            envs: [{ key: "local", name: "本地", baseUrl: "http://127.0.0.1:1" }],
            defaultEnvKey: "local",
            scenarios: [
                { id: "shape-ok", name: "shape ok", url: "scenarios/shape-ok.js" },
                { id: "shape-bad", name: "shape bad", url: "scenarios/shape-bad.js" }
            ]
        }));`, "utf8");
        fs.mkdirSync(path.join(dir, "scenarios"));
        fs.writeFileSync(path.join(dir, "scenarios/shape-ok.js"), `ScenarioTest.registerScenario("shape-ok", ScenarioTest.defineScenario({
            name: "shape ok",
            steps: [{ name: "查", path: "x", status: 200, assertions: [{ path: "data", shape: { type: "object", required: ["id"] } }] }]
        }));`, "utf8");
        fs.writeFileSync(path.join(dir, "scenarios/shape-bad.js"), `ScenarioTest.registerScenario("shape-bad", ScenarioTest.defineScenario({
            name: "shape bad",
            steps: [{ name: "查", path: "x", status: 200, assertions: [{ path: "data", shape: { type: "object", typo: true } }] }]
        }));`, "utf8");
        const report = buildDoctorReport({ configPath, api: nodeApi, configDir: dir });
        const ok = report.checks.find((check) => check.name === "scenario-register" && check.status === "PASS");
        const bad = report.checks.find((check) => check.name === "scenario-register" && check.status === "FAIL");
        assert.ok(ok, "合法 shape 场景应注册成功");
        assert.ok(bad, "非法 shape 场景应在 doctor 场景注册期 FAIL");
        assert.match(bad.message, /shape 包含未知键 "typo"/);
    } finally {
        fs.rmSync(dir, { recursive: true, force: true });
    }
});
