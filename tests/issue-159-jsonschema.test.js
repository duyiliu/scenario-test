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

test("contract v24：contains 与 jsonSchema 操作符及关键字/格式名单对外投射", () => {
    assert.ok(CONTRACT_VERSION >= 24, "contains/jsonSchema 自 contract v24 起可用");
    assert.equal(contract.assertions.operators.contains.valueType, "string");
    assert.equal(contract.assertions.operators.jsonSchema.valueType, "any");
    for (const key of ["type", "enum", "const", "minimum", "pattern", "format", "properties", "items", "contains", "anyOf", "oneOf", "not", "$ref", "definitions"]) {
        assert.ok(contract.assertions.jsonSchema.keys.includes(key), `jsonSchema.keys 缺少 ${key}`);
    }
    for (const format of ["date-time", "date", "email", "uuid", "uri"]) {
        assert.ok(contract.assertions.jsonSchema.formats.includes(format), `jsonSchema.formats 缺少 ${format}`);
    }
    const caps = buildCapabilities(contract);
    assert.ok(caps.assertions.operators.contains);
    assert.ok(caps.assertions.operators.jsonSchema);
    assert.deepEqual(caps.assertions.jsonSchema.formats, [...contract.assertions.jsonSchema.formats]);
    assert.deepEqual(caps.assertions.jsonSchema.keys, [...contract.assertions.jsonSchema.keys]);
});

// ===== contains（字符串包含，与 startsWith/endsWith 同族）=====

test("contains：字符串实际值按大小写敏感匹配子串", () => {
    assert.equal(evaluateAssertion({ path: "msg", contains: "ell" }, response({ msg: "hello" }), runtime).passed, true);
    assert.equal(evaluateAssertion({ path: "msg", contains: "ELL" }, response({ msg: "hello" }), runtime).passed, false);
    // null/undefined 实际值视为空串（与 startsWith 同口径）
    assert.equal(evaluateAssertion({ path: "msg", contains: "x" }, response({}), runtime).passed, false);
    // 数字实际值字符串化后比较（与 startsWith/endsWith 同口径）
    assert.equal(evaluateAssertion({ contains: "23" }, response(12345), runtime).passed, true);
});

test("contains：数组/对象实际值拒绝字符串化，给出可操作原因", () => {
    // "[1,2]".includes("1") 的字符串化路径恒真 —— 必须失败而非假绿
    const arrayResult = evaluateAssertion({ contains: "1" }, response([9, 9]), runtime);
    assert.equal(arrayResult.passed, false);
    assert.match(arrayResult.reason, /includes|each/);
    const objectResult = evaluateAssertion({ contains: "a" }, response({ a: 1 }), runtime);
    assert.equal(objectResult.passed, false);
    assert.match(objectResult.reason, /equals|path/);
});

// ===== jsonSchema：类型/enum/const/数值 =====

test("jsonSchema：type 单值与数组并集、integer/number 区分、enum/const 深比较", () => {
    assert.equal(evaluateAssertion({ jsonSchema: { type: ["string", "null"] } }, response(null), runtime).passed, true);
    assert.equal(evaluateAssertion({ jsonSchema: { type: ["string", "null"] } }, response(1), runtime).passed, false);
    assert.equal(evaluateAssertion({ jsonSchema: { type: "integer" } }, response(1.5), runtime).passed, false);
    // enum/const 键序不敏感深比较（与 equals 同底座）
    assert.equal(evaluateAssertion({ jsonSchema: { const: { a: 1, b: [2] } } }, response({ b: [2], a: 1 }), runtime).passed, true);
    assert.equal(evaluateAssertion({ jsonSchema: { enum: ["A", "B"] } }, response("C"), runtime).passed, false);
    const typeFail = evaluateAssertion({ jsonSchema: { type: "integer" } }, response("x"), runtime);
    assert.equal(typeFail.detail[0].path, "(根)");
    assert.match(typeFail.detail[0].assertions[0].reason, /期望 integer，实际 string/);
});

test("jsonSchema：数值边界（含 exclusive* draft-07 数值口径）与 multipleOf", () => {
    const schema = { minimum: 1, maximum: 10 };
    assert.equal(evaluateAssertion({ jsonSchema: schema }, response(0), runtime).passed, false);
    assert.equal(evaluateAssertion({ jsonSchema: schema }, response(5), runtime).passed, true);
    const exclusive = evaluateAssertion({ jsonSchema: { exclusiveMinimum: 0, exclusiveMaximum: 2 } }, response(2), runtime);
    assert.equal(exclusive.passed, false);
    assert.match(exclusive.detail[0].assertions[0].reason, /exclusiveMaximum/);
    // multipleOf 浮点容差：0.3 / 0.1 的 IEEE 残差不误报
    assert.equal(evaluateAssertion({ jsonSchema: { multipleOf: 0.1 } }, response(0.3), runtime).passed, true);
    assert.equal(evaluateAssertion({ jsonSchema: { multipleOf: 0.25 } }, response(0.3), runtime).passed, false);
});

// ===== jsonSchema：字符串 =====

test("jsonSchema：minLength/maxLength/pattern/format（format 仅约束字符串）", () => {
    assert.equal(evaluateAssertion({ jsonSchema: { minLength: 3, maxLength: 5 } }, response("ab"), runtime).passed, false);
    assert.equal(evaluateAssertion({ jsonSchema: { pattern: "^ORD-\\d{4}$" } }, response("ORD-0042"), runtime).passed, true);
    assert.equal(evaluateAssertion({ jsonSchema: { pattern: "^ORD-\\d{4}$" } }, response("ord-42"), runtime).passed, false);
    // format 仅约束字符串实际值：非字符串跳过（由 type 判定），不因 format 误报
    assert.equal(evaluateAssertion({ jsonSchema: { format: "email" } }, response(123), runtime).passed, true);
    for (const [format, good, bad] of [
        ["date-time", "2026-11-16T22:30:00Z", "2026-13-40T99:99:99Z"],
        ["date", "2026-02-28", "2026-02-30"],
        ["time", "23:59:59", "25:00:00"],
        ["email", "qa@example.com", "not-an-email"],
        ["uri", "https://api.example.com/v1", "not a uri"],
        ["uuid", "550e8400-e29b-41d4-a716-446655440000", "550e8400e29b41d4a716446655440000"],
        ["ipv4", "192.168.1.1", "192.168.1.300"],
        ["ipv6", "2001:db8::1", "2001:db8::1::2"]
    ]) {
        assert.equal(evaluateAssertion({ jsonSchema: { format } }, response(good), runtime).passed, true, `${format} 应通过 ${good}`);
        assert.equal(evaluateAssertion({ jsonSchema: { format } }, response(bad), runtime).passed, false, `${format} 应拒绝 ${bad}`);
    }
});

// ===== jsonSchema：对象 =====

test("jsonSchema：required/properties/patternProperties/additionalProperties/propertyNames", () => {
    const schema = {
        type: "object",
        required: ["id"],
        properties: { id: { type: "integer" } },
        patternProperties: { "^x-": { type: "string" } },
        additionalProperties: false
    };
    assert.equal(evaluateAssertion({ jsonSchema: schema }, response({ id: 1, "x-tag": "v" }), runtime).passed, true);
    const failed = evaluateAssertion({ jsonSchema: schema }, response({ id: "1", "x-num": 2, extra: true }), runtime);
    assert.equal(failed.passed, false);
    const paths = failed.detail.map((item) => item.path);
    assert.ok(paths.includes("id"), `缺少 id 类型失败明细：${paths}`);
    assert.ok(paths.includes('["x-num"]'), `缺少 patternProperties 失败明细：${paths}`);
    assert.ok(paths.includes("extra"), `缺少 additionalProperties 失败明细：${paths}`);
    // patternProperties 命中的键不受 additionalProperties:false 误伤（上例 x-tag 通过已验证）
    // propertyNames：校验键名本身
    const names = evaluateAssertion(
        { jsonSchema: { propertyNames: { pattern: "^[a-z][a-z0-9_]*$" } } },
        response({ ok_name: 1, "Bad-Key": 2 }), runtime
    );
    assert.equal(names.passed, false);
    assert.equal(names.detail[0].path, '["Bad-Key"]');
    assert.match(names.detail[0].assertions[0].reason, /propertyNames/);
    // additionalProperties 子 schema：未声明键必须满足子 schema
    const typed = evaluateAssertion(
        { jsonSchema: { properties: { id: { type: "integer" } }, additionalProperties: { type: "string" } } },
        response({ id: 1, note: 5 }), runtime
    );
    assert.equal(typed.passed, false);
    assert.equal(typed.detail[0].path, "note");
});

test("jsonSchema：缺 type 时按对象键隐式推断 object（与 shape 同口径防假绿）", () => {
    const result = evaluateAssertion(
        { jsonSchema: { properties: { id: { type: "integer" } } } },
        response("not-an-object"), runtime
    );
    assert.equal(result.passed, false);
    assert.match(result.detail[0].assertions[0].reason, /期望 object/);
});

// ===== jsonSchema：数组 =====

test("jsonSchema：minItems/maxItems/uniqueItems/items（单 schema 与元组 + additionalItems）", () => {
    assert.equal(evaluateAssertion({ jsonSchema: { minItems: 2 } }, response([1]), runtime).passed, false);
    assert.equal(evaluateAssertion({ jsonSchema: { maxItems: 1 } }, response([1, 2]), runtime).passed, false);
    // uniqueItems 深比较判重：1 与 "1" 按 JSON 语义是不同值，同值才判重
    assert.equal(evaluateAssertion({ jsonSchema: { uniqueItems: true } }, response([1, "1", 2]), runtime).passed, true);
    const unique = evaluateAssertion({ jsonSchema: { uniqueItems: true } }, response([1, 1, 2]), runtime);
    assert.equal(unique.passed, false);
    assert.equal(unique.detail[0].path, "[1]");
    // 对象元素按深比较判重
    assert.equal(evaluateAssertion({ jsonSchema: { uniqueItems: true } }, response([{ a: 1 }, { a: 1 }]), runtime).passed, false);
    // 单 schema items 逐元素下钻
    const items = evaluateAssertion(
        { jsonSchema: { items: { type: "object", required: ["sku"] } } },
        response([{ sku: "A" }, {}]), runtime
    );
    assert.equal(items.passed, false);
    assert.equal(items.detail[0].path, "[1].sku");
    // 元组 items + additionalItems:false
    const tuple = evaluateAssertion(
        { jsonSchema: { items: [{ type: "integer" }, { type: "string" }], additionalItems: false } },
        response([1, "x", true]), runtime
    );
    assert.equal(tuple.passed, false);
    assert.equal(tuple.detail[0].path, "[2]");
    // 元组 + additionalItems 子 schema：越界项按子 schema 校验
    const tupleSub = evaluateAssertion(
        { jsonSchema: { items: [{ type: "integer" }], additionalItems: { type: "string" } } },
        response([1, "ok", 9]), runtime
    );
    assert.equal(tupleSub.passed, false);
    assert.equal(tupleSub.detail[0].path, "[2]");
});

test("jsonSchema：数组 contains 子 schema 至少命中一个元素", () => {
    const schema = { contains: { type: "object", required: ["id"], properties: { id: { type: "integer" } } } };
    assert.equal(evaluateAssertion({ jsonSchema: schema }, response([{ id: 1 }, { name: "x" }]), runtime).passed, true);
    const miss = evaluateAssertion({ jsonSchema: schema }, response([{ name: "x" }]), runtime);
    assert.equal(miss.passed, false);
    assert.match(miss.detail[0].assertions[0].reason, /contains/);
    assert.equal(evaluateAssertion({ jsonSchema: { contains: { type: "integer" } } }, response([]), runtime).passed, false);
});

// ===== jsonSchema：组合与条件 =====

test("jsonSchema：allOf/anyOf/oneOf/not 与 if-then-else", () => {
    assert.equal(evaluateAssertion({ jsonSchema: { allOf: [{ type: "integer" }, { minimum: 2 }] } }, response(1), runtime).passed, false);
    assert.equal(evaluateAssertion({ jsonSchema: { anyOf: [{ type: "string" }, { type: "integer" }] } }, response(1), runtime).passed, true);
    const anyOfFail = evaluateAssertion({ jsonSchema: { anyOf: [{ type: "string" }, { type: "integer" }] } }, response(true), runtime);
    assert.equal(anyOfFail.passed, false);
    assert.match(anyOfFail.detail[0].assertions[0].reason, /anyOf/);
    // anyOf 分支失败原因下钻：detail 仍是分层明细（path + assertions）
    assert.ok(Array.isArray(anyOfFail.detail[0].assertions[0].detail), "anyOf 应透出分支明细");
    // oneOf 恰好一个
    assert.equal(evaluateAssertion({ jsonSchema: { oneOf: [{ type: "integer" }, { minimum: 0 }] } }, response(5), runtime).passed, false);
    assert.equal(evaluateAssertion({ jsonSchema: { oneOf: [{ type: "integer" }, { minimum: 0 }] } }, response(-5), runtime).passed, true);
    // not
    assert.equal(evaluateAssertion({ jsonSchema: { not: { type: "null" } } }, response(null), runtime).passed, false);
    assert.equal(evaluateAssertion({ jsonSchema: { not: { type: "null" } } }, response(1), runtime).passed, true);
    // if/then/else：type=A 时要求 code；否则要求 reason
    const cond = {
        if: { properties: { type: { const: "A" } }, required: ["type"] },
        then: { required: ["code"] },
        else: { required: ["reason"] }
    };
    assert.equal(evaluateAssertion({ jsonSchema: cond }, response({ type: "A" }), runtime).passed, false);
    assert.equal(evaluateAssertion({ jsonSchema: cond }, response({ type: "B" }), runtime).passed, false);
    assert.equal(evaluateAssertion({ jsonSchema: cond }, response({ type: "A", code: 0 }), runtime).passed, true);
    assert.equal(evaluateAssertion({ jsonSchema: cond }, response({ type: "B", reason: "r" }), runtime).passed, true);
});

// ===== jsonSchema：$ref =====

test("jsonSchema：本地 $ref（definitions/$defs）与循环引用防护", () => {
    const schema = {
        definitions: { id: { type: "integer", minimum: 1 } },
        properties: { orderId: { $ref: "#/definitions/id" } }
    };
    assert.equal(evaluateAssertion({ jsonSchema: schema }, response({ orderId: 0 }), runtime).passed, false);
    assert.equal(evaluateAssertion({ jsonSchema: schema }, response({ orderId: 7 }), runtime).passed, true);
    // 递归结构：node 的 children 元素仍是 node
    const tree = {
        $defs: { node: { type: "object", required: ["name"], properties: { name: { type: "string" }, children: { type: "array", items: { $ref: "#/$defs/node" } } } } },
        $ref: "#/$defs/node"
    };
    const badTree = evaluateAssertion({ jsonSchema: tree }, response({ name: "root", children: [{ name: 1 }] }), runtime);
    assert.equal(badTree.passed, false);
    assert.equal(badTree.detail[0].path, "children[0].name");
    assert.equal(evaluateAssertion({ jsonSchema: tree }, response({ name: "root", children: [{ name: "leaf" }] }), runtime).passed, true);
    // 不存在的指针按断言失败透出（非异常）
    const dangling = evaluateAssertion({ jsonSchema: { $ref: "#/definitions/missing" } }, response({}), runtime);
    assert.equal(dangling.passed, false);
    assert.match(dangling.detail[0].assertions[0].reason, /不存在的定义/);
    // 间接循环 a→b→a：防死循环，透出循环原因
    const cyclic = {
        definitions: { a: { $ref: "#/definitions/b" }, b: { $ref: "#/definitions/a" } },
        $ref: "#/definitions/a"
    };
    const cyclicResult = evaluateAssertion({ jsonSchema: cyclic }, response({}), runtime);
    assert.equal(cyclicResult.passed, false);
    assert.match(cyclicResult.detail[0].assertions[0].reason, /循环/);
});

// ===== 运行期模板与组合 =====

test("jsonSchema：期望值支持 {{ }} 模板解析；与 equals/matches 组合无副作用", () => {
    const rt = { vars: { min: 3 }, lastResponse: null, lastResponseBody: null };
    const result = evaluateAssertion(
        { path: "total", jsonSchema: { type: "integer", minimum: "{{vars.min}}" } },
        response({ total: 2 }), rt
    );
    assert.equal(result.passed, false);
    const combined = evaluateAssertion(
        { path: "data.code", matches: "^A", contains: "OK", jsonSchema: { type: "string" } },
        response({ data: { code: "A-OK-1" } }), runtime
    );
    assert.equal(combined.passed, true);
    assert.ok(!("detail" in combined));
});

// ===== 定义期校验 =====

test("jsonSchema：未识别键/非法取值/非法子 schema 定义期即拒", () => {
    const context = { scenarioName: "S1", stepNo: 1, stepName: "步骤A", assertionNo: 1 };
    assert.throws(
        () => validateAssertion({ jsonSchema: { type: "object", unknownKey: true } }, context),
        /jsonSchema 包含未知键 "unknownKey"/
    );
    assert.throws(
        () => validateAssertion({ jsonSchema: { type: "date" } }, context),
        /jsonSchema\.type 只支持/
    );
    assert.throws(
        () => validateAssertion({ jsonSchema: { exclusiveMinimum: true } }, context),
        /exclusiveMinimum 必须是有限 number/
    );
    assert.throws(
        () => validateAssertion({ jsonSchema: { minItems: -1 } }, context),
        /minItems 必须是非负整数/
    );
    assert.throws(
        () => validateAssertion({ jsonSchema: { multipleOf: 0 } }, context),
        /multipleOf 必须是有限正数/
    );
    assert.throws(
        () => validateAssertion({ jsonSchema: { pattern: "([a-z" } }, context),
        /pattern 不是合法正则表达式/
    );
    assert.throws(
        () => validateAssertion({ jsonSchema: { format: "hostname" } }, context),
        /format 只支持/
    );
    // 元组 items 是合法声明，不应抛错
    assert.doesNotThrow(
        () => validateAssertion({ jsonSchema: { items: [{ type: "integer" }] } }, context)
    );
    assert.throws(
        () => validateAssertion({ jsonSchema: { items: { type: "integer" }, additionalItems: false } }, context),
        /additionalItems 仅在 items 为数组/
    );
    assert.throws(
        () => validateAssertion({ jsonSchema: { then: { required: ["a"] } } }, context),
        /then\/else 需与 if 配套/
    );
    assert.throws(
        () => validateAssertion({ jsonSchema: { $ref: "https://example.com/schema.json" } }, context),
        /\$ref 只支持本地指针/
    );
    assert.throws(
        () => validateAssertion({ jsonSchema: { anyOf: [] } }, context),
        /anyOf 必须是非空 schema 数组/
    );
    assert.throws(
        () => validateAssertion({ jsonSchema: { title: "仅注解" } }, context),
        /至少需要声明一个校验键/
    );
    assert.throws(
        () => validateAssertion({ jsonSchema: { properties: { id: { type: "object", typo: 1 } } } }, context),
        /jsonSchema\.properties\.id 包含未知键 "typo"/
    );
    // 运行期模板解析出非法定义时按断言失败透出（非抛异常）
    const rt = { vars: { bad: "hostname" }, lastResponse: null, lastResponseBody: null };
    const runtimeBad = evaluateAssertion({ jsonSchema: { format: "{{vars.bad}}" } }, response("x"), rt);
    assert.equal(runtimeBad.passed, false);
    assert.match(runtimeBad.detail[0].assertions[0].reason, /format 只支持/);
});

test("jsonSchema：可在 each 子断言内嵌套；失败明细可 JSON 序列化并复用渲染", () => {
    const result = evaluateAssertion(
        {
            path: "users",
            each: { jsonSchema: { type: "object", required: ["id"], properties: { id: { type: "integer" } } } }
        },
        response({ users: [{ id: 1 }, { id: "x" }] }), runtime
    );
    assert.equal(result.passed, false);
    assert.deepEqual(result.detail.map((item) => item.index), [1]);
    const inner = result.detail[0].assertions[0];
    assert.equal(inner.detail[0].path, "id");
    // detail 可 JSON 序列化（CLI/report/工作台直接透出）
    assert.equal(JSON.parse(JSON.stringify(result)).detail[0].index, 1);
});

test("jsonSchema 明细经断言表与 Markdown 报告渲染（复用 each/shape 分层通路）", () => {
    const result = evaluateAssertion(
        { jsonSchema: { anyOf: [{ type: "string" }, { type: "integer" }] } },
        response(true), runtime
    );
    const html = eachDetailRows(result.detail, "");
    assert.ok(html.includes("↳ (根)</td>"), "断言表应显示字段路径");
    assert.ok(html.includes("anyOf"), "断言表应显示组合键原因");
    const md = buildMarkdownReport({
        steps: [{
            stepNo: 1, name: "查", method: "GET", path: "/x", status: 200,
            passed: false, durationFmt: "1ms", error: "", warnings: [],
            assertions: [result], response: {}
        }]
    });
    assert.match(md, /anyOf/);
});

test("doctor 同步：合法 jsonSchema 场景通过，未识别键在场景注册期 FAIL", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "scenario-test-jsonschema-doctor-"));
    try {
        const configPath = path.join(dir, "scenario.config.js");
        fs.writeFileSync(configPath, `ScenarioTest.registerConfig(ScenarioTest.defineConfig({
            envs: [{ key: "local", name: "本地", baseUrl: "http://127.0.0.1:1" }],
            defaultEnvKey: "local",
            scenarios: [
                { id: "js-ok", name: "js ok", url: "scenarios/js-ok.js" },
                { id: "js-bad", name: "js bad", url: "scenarios/js-bad.js" }
            ]
        }));`, "utf8");
        fs.mkdirSync(path.join(dir, "scenarios"));
        fs.writeFileSync(path.join(dir, "scenarios/js-ok.js"), `ScenarioTest.registerScenario("js-ok", ScenarioTest.defineScenario({
            name: "js ok",
            steps: [{ name: "查", path: "x", status: 200, assertions: [{ path: "data", jsonSchema: { type: "object", required: ["id"], properties: { id: { type: "integer" } } } }] }]
        }));`, "utf8");
        fs.writeFileSync(path.join(dir, "scenarios/js-bad.js"), `ScenarioTest.registerScenario("js-bad", ScenarioTest.defineScenario({
            name: "js bad",
            steps: [{ name: "查", path: "x", status: 200, assertions: [{ path: "data", jsonSchema: { type: "object", typo: true } }] }]
        }));`, "utf8");
        const report = buildDoctorReport({ configPath, api: nodeApi, configDir: dir });
        const ok = report.checks.find((check) => check.name === "scenario-register" && check.status === "PASS");
        const bad = report.checks.find((check) => check.name === "scenario-register" && check.status === "FAIL");
        assert.ok(ok, "合法 jsonSchema 场景应注册成功");
        assert.ok(bad, "非法 jsonSchema 场景应在 doctor 场景注册期 FAIL");
        assert.match(bad.message, /jsonSchema 包含未知键 "typo"/);
    } finally {
        fs.rmSync(dir, { recursive: true, force: true });
    }
});

test("defineScenario 定义期拒绝非法 jsonSchema；合法场景三端同管线（engine 复用 core）", () => {
    assert.throws(
        () => defineScenario({
            name: "js 非法",
            steps: [{ name: "查", path: "x", assertions: [{ jsonSchema: { minimum: "x" } }] }]
        }),
        /minimum 必须是有限 number/
    );
    // when 对象形式同样走断言求值管线，jsonSchema 在 when 内可用
    const scenario = defineScenario({
        name: "js 合法",
        steps: [{ name: "查", path: "x", assertions: [{ jsonSchema: { type: "object" } }] }]
    });
    assert.ok(scenario.steps[0].assertions[0].jsonSchema);
});
