// jsonSchema 断言（contract v24）+ contains 别名操作符测试
//
// 覆盖：定义期校验（未知键/$ref/非法关键字/顶层空 schema 即拒）、
// 求值语义（type 数组/数值/字符串/对象/数组/组合器/format）、
// 失败明细结构（复用 each/shape 分层渲染），以及 contains 与 includes 的同口径别名语义。
import assert from "node:assert/strict";
import test from "node:test";
import {
    evaluateAssertion,
    evaluateJsonSchema,
    validateAssertion
} from "../src/core.js";

function runtimeWith(vars = {}) {
    return { vars, lastResponse: null, lastResponseBody: null };
}

const runtime = runtimeWith({ minAge: 18, schemaFromVar: { type: "integer", minimum: 0 } });

function responseWith(body) {
    return { status: 200, headers: {}, body, bodyText: "" };
}

const response = responseWith({
    text: "abc",
    items: [1, 2, 3],
    user: { name: "x", age: 20, email: "a@b.co", tags: ["a", "a"] },
    order: { status: "PAID", paidAt: "2026-11-16T10:00:00Z", lines: [{ sku: "A", qty: 2 }] },
    nullable: null,
    meta: { "x-trace": "t1", debug: true },
    pair: ["id-1", 42, "overflow"],
    emptyArr: []
});

test("contains 别名：字符串子串与数组成员与 includes 同口径", () => {
    // 字符串子串（大小写敏感、非字符串实际值先字符串化）
    assert.equal(evaluateAssertion({ path: "text", contains: "b" }, response, runtime).passed, true);
    assert.equal(evaluateAssertion({ path: "text", contains: "B" }, response, runtime).passed, false);
    assert.equal(evaluateAssertion({ path: "items[0]", contains: "1" }, response, runtime).passed, true);
    // 数组成员：深比较（与 includes 一致，类型敏感）
    assert.equal(evaluateAssertion({ path: "items", contains: 2 }, response, runtime).passed, true);
    assert.equal(evaluateAssertion({ path: "items", contains: "2" }, response, runtime).passed, false);
    assert.equal(evaluateAssertion({ path: "items", contains: 9 }, response, runtime).passed, false);
    assert.equal(evaluateAssertion({ path: "items", contains: { x: 1 } }, response, runtime).passed, false);
    // 期望值模板变量照常解析
    assert.equal(evaluateAssertion({ path: "items", contains: "{{vars.minAge}}" }, response, runtime).passed, false);
    // 对象实际值：失败并透出按操作符名的语义化引导（不混淆为 includes 文案）
    const objectActual = evaluateAssertion({ path: "user", contains: 1 }, response, runtime);
    assert.equal(objectActual.passed, false);
    assert.match(objectActual.reason, /^contains 不支持对象类型的实际值/);
    // 缺失路径（undefined 实际值）：按空串处理，非空期望必失败
    assert.equal(evaluateAssertion({ path: "missing", contains: "x" }, response, runtime).passed, false);
    // 通过时保持既有四字段形状（不含 detail/reason）
    const ok = evaluateAssertion({ path: "text", contains: "ab" }, response, runtime);
    assert.deepEqual(Object.keys(ok), ["name", "passed", "actual", "expected"]);
});

test("jsonSchema 求值：type/required/properties/enum/const 与字段级明细", () => {
    const schema = {
        type: "object",
        required: ["name", "age", "missing"],
        properties: {
            name: { type: "string", minLength: 1 },
            age: { type: "integer", minimum: 0, maximum: 150 },
            email: { format: "email" }
        },
        additionalProperties: false
    };
    const failed = evaluateAssertion({ path: "user", jsonSchema: schema }, response, runtime);
    assert.equal(failed.passed, false);
    const paths = failed.detail.map((d) => d.path);
    // 缺 required.missing + additionalProperties:false 报的 tags（未在 properties 声明；email 已声明不受影响）
    assert.ok(paths.includes("missing"), `明细应包含 missing，实际 ${paths.join(",")}`);
    assert.deepEqual(paths.filter((p) => p !== "missing"), ["tags"], `additionalProperties 应只报未声明键，实际 ${paths.join(",")}`);
    // 明细项复用 each/shape 分层结构（index/path/actual/assertions），可 JSON 序列化
    const first = failed.detail.find((d) => d.path === "missing");
    assert.equal(first.actual, undefined);
    assert.equal(first.assertions[0].passed, false);
    assert.equal(first.assertions[0].reason, "缺少必填字段");
    assert.doesNotThrow(() => JSON.parse(JSON.stringify(failed)));

    // 全部满足时通过且不携带 detail（保持四字段形状）
    const ok = evaluateAssertion(
        { path: "user", jsonSchema: { ...schema, required: ["name", "age"] } },
        responseWith({ user: { name: "x", age: 20, email: "a@b.co" } }),
        runtime
    );
    assert.equal(ok.passed, true);
    assert.ok(!("detail" in ok));

    // type 数组（可空类型写法）
    assert.equal(evaluateAssertion({ path: "nullable", jsonSchema: { type: ["string", "null"] } }, response, runtime).passed, true);
    assert.equal(evaluateAssertion({ path: "text", jsonSchema: { type: ["integer", "null"] } }, response, runtime).passed, false);

    // const / enum 深比较
    assert.equal(evaluateAssertion({ path: "order.status", jsonSchema: { const: "PAID" } }, response, runtime).passed, true);
    assert.equal(evaluateAssertion({ path: "order.status", jsonSchema: { const: "NEW" } }, response, runtime).passed, false);
    assert.equal(evaluateAssertion({ path: "items", jsonSchema: { enum: [[1, 2, 3], [3, 2, 1]] } }, response, runtime).passed, true);
    assert.equal(evaluateAssertion({ path: "items", jsonSchema: { enum: [[1, 2]] } }, response, runtime).passed, false);
});

test("jsonSchema 数值/字符串关键字与「未匹配类型不生效」的规范口径", () => {
    assert.equal(evaluateAssertion({ path: "user.age", jsonSchema: { type: "integer", minimum: 18, exclusiveMaximum: 150 } }, response, runtime).passed, true);
    assert.equal(evaluateAssertion({ path: "user.age", jsonSchema: { minimum: 30 } }, response, runtime).passed, false);
    assert.equal(evaluateAssertion({ path: "user.age", jsonSchema: { exclusiveMinimum: 20 } }, response, runtime).passed, false);
    assert.equal(evaluateAssertion({ path: "user.age", jsonSchema: { multipleOf: 10 } }, response, runtime).passed, true);
    assert.equal(evaluateAssertion({ path: "user.age", jsonSchema: { multipleOf: 3 } }, response, runtime).passed, false);
    // 判别：minimum 对字符串实际值不生效（JSON Schema 关键字按类型分派），不是「不校验就失败」
    assert.equal(evaluateAssertion({ path: "text", jsonSchema: { minimum: 30 } }, response, runtime).passed, true);
    // 字符串关键字仅对 string 生效
    assert.equal(evaluateAssertion({ path: "text", jsonSchema: { minLength: 2, maxLength: 3, pattern: "^a" } }, response, runtime).passed, true);
    assert.equal(evaluateAssertion({ path: "text", jsonSchema: { minLength: 4 } }, response, runtime).passed, false);
    assert.equal(evaluateAssertion({ path: "text", jsonSchema: { pattern: "^z" } }, response, runtime).passed, false);
    // 判别：minLength 对数字不生效（不会被当成「不存在」而失败）
    assert.equal(evaluateAssertion({ path: "user.age", jsonSchema: { minLength: 5 } }, response, runtime).passed, true);
});

test("jsonSchema 数组关键字：items 单模式/元组、contains、uniqueItems、minItems/maxItems", () => {
    assert.equal(evaluateAssertion({ path: "items", jsonSchema: { type: "array", items: { type: "integer" } } }, response, runtime).passed, true);
    const badItem = evaluateAssertion({ path: "items", jsonSchema: { items: { minimum: 2 } } }, response, runtime);
    assert.equal(badItem.passed, false);
    // 明细 path 相对断言值本身（与 shape 同口径：items[0] 的 0 基下标根路径为 [0]）
    assert.deepEqual(badItem.detail.map((d) => d.path), ["[0]"]);
    // 元组 + additionalItems:false
    const tuple = evaluateAssertion(
        { path: "pair", jsonSchema: { type: "array", items: [{ type: "string" }, { type: "integer" }], additionalItems: false } },
        response,
        runtime
    );
    assert.equal(tuple.passed, false);
    assert.deepEqual(tuple.detail.map((d) => d.path), ["[2]"]);
    // 元组长度不足时只校验存在项
    assert.equal(evaluateAssertion(
        { path: "pair", jsonSchema: { items: [{ type: "string" }, { type: "integer" }, { type: "string" }] } },
        responseWith({ pair: ["id-1"] }),
        runtime
    ).passed, true);
    // contains 子模式：至少一项匹配
    assert.equal(evaluateAssertion({ path: "items", jsonSchema: { contains: { type: "integer", minimum: 3 } } }, response, runtime).passed, true);
    const noMatch = evaluateAssertion({ path: "items", jsonSchema: { contains: { type: "string" } } }, response, runtime);
    assert.equal(noMatch.passed, false);
    assert.match(noMatch.detail[0].reason, /contains：3 个元素均不匹配/);
    // 空数组 + contains 必失败（some 语义）
    assert.equal(evaluateAssertion({ path: "emptyArr", jsonSchema: { contains: {} } }, response, runtime).passed, false);
    // uniqueItems：深比较去重，路径定位到重复的后一项
    const dup = evaluateAssertion({ path: "user.tags", jsonSchema: { uniqueItems: true } }, response, runtime);
    assert.equal(dup.passed, false);
    assert.deepEqual(dup.detail.map((d) => d.path), ["[1]"]);
    // minItems/maxItems
    assert.equal(evaluateAssertion({ path: "items", jsonSchema: { minItems: 3, maxItems: 3 } }, response, runtime).passed, true);
    assert.equal(evaluateAssertion({ path: "items", jsonSchema: { minItems: 4 } }, response, runtime).passed, false);
});

test("jsonSchema 对象进阶键：patternProperties/propertyNames/dependentRequired/dependentSchemas/min-maxProperties", () => {
    // patternProperties：按正则键名匹配校验，且匹配的键不受 additionalProperties 约束
    const patterned = evaluateAssertion(
        { path: "meta", jsonSchema: { type: "object", patternProperties: { "^x-": { type: "string" } }, additionalProperties: { type: "boolean" } } },
        response,
        runtime
    );
    assert.equal(patterned.passed, true);
    // patternProperties 子模式不匹配时按字段路径报错
    const badPattern = evaluateAssertion(
        { path: "meta", jsonSchema: { patternProperties: { "^x-": { type: "integer" } } } },
        response,
        runtime
    );
    assert.equal(badPattern.passed, false);
    assert.deepEqual(badPattern.detail.map((d) => d.path), ['["x-trace"]']);
    // propertyNames：键名本身套子模式（length 键 4 字符不满足 maxLength:3）
    const badNames = evaluateAssertion(
        { path: "meta", jsonSchema: { propertyNames: { maxLength: 3 } } },
        response,
        runtime
    );
    assert.equal(badNames.passed, false);
    assert.deepEqual(badNames.detail.map((d) => d.path), ['["x-trace"]', "debug"]);
    // dependentRequired：status 存在时要求 paidAt
    assert.equal(evaluateAssertion(
        { path: "order", jsonSchema: { type: "object", dependentRequired: { status: ["paidAt"] } } },
        response,
        runtime
    ).passed, true);
    const missingDep = evaluateAssertion(
        { path: "order", jsonSchema: { dependentRequired: { status: ["paidAt", "paidBy"] } } },
        response,
        runtime
    );
    assert.equal(missingDep.passed, false);
    assert.deepEqual(missingDep.detail.map((d) => d.path), ["paidBy"]);
    // dependentSchemas：键存在时对整体对象套子模式
    const depSchema = evaluateAssertion(
        { path: "order", jsonSchema: { dependentSchemas: { status: { required: ["nonexist"] } } } },
        response,
        runtime
    );
    assert.equal(depSchema.passed, false);
    assert.deepEqual(depSchema.detail.map((d) => d.path), ["nonexist"]);
    // minProperties/maxProperties
    assert.equal(evaluateAssertion({ path: "user", jsonSchema: { minProperties: 4, maxProperties: 4 } }, response, runtime).passed, true);
    assert.equal(evaluateAssertion({ path: "user", jsonSchema: { maxProperties: 2 } }, response, runtime).passed, false);
});

test("jsonSchema 组合器：allOf/anyOf/oneOf/not/if-then-else 与 boolean 子模式", () => {
    // allOf：全部子模式满足；子失败明细按原路径透出
    assert.equal(evaluateAssertion(
        { path: "user", jsonSchema: { type: "object", allOf: [{ required: ["name"] }, { properties: { age: { minimum: 0 } } }] } },
        response,
        runtime
    ).passed, true);
    const allOfFail = evaluateAssertion(
        { path: "user", jsonSchema: { allOf: [{ required: ["name"] }, { required: ["zz"] }] } },
        response,
        runtime
    );
    assert.equal(allOfFail.passed, false);
    assert.deepEqual(allOfFail.detail.map((d) => d.path), ["zz"]);
    // anyOf：任一匹配即过；全不匹配时单条汇总失败
    assert.equal(evaluateAssertion(
        { path: "text", jsonSchema: { anyOf: [{ type: "integer" }, { type: "string", pattern: "^a" }] } },
        response,
        runtime
    ).passed, true);
    const anyOfFail = evaluateAssertion(
        { path: "text", jsonSchema: { anyOf: [{ type: "integer" }, { pattern: "^z" }] } },
        response,
        runtime
    );
    assert.equal(anyOfFail.passed, false);
    assert.match(anyOfFail.detail[0].reason, /anyOf：2 个子模式均不匹配/);
    // oneOf：恰好一个匹配；匹配 0 个或 2 个都失败
    assert.equal(evaluateAssertion(
        { path: "text", jsonSchema: { oneOf: [{ type: "integer" }, { type: "string" }] } },
        response,
        runtime
    ).passed, true);
    const twoMatched = evaluateAssertion(
        { path: "items", jsonSchema: { oneOf: [{ type: "array" }, { minItems: 1 }] } },
        response,
        runtime
    );
    assert.equal(twoMatched.passed, false);
    assert.match(twoMatched.detail[0].reason, /oneOf：匹配了 2 个子模式/);
    // not：匹配被禁止子模式即失败
    assert.equal(evaluateAssertion({ path: "text", jsonSchema: { not: { type: "integer" } } }, response, runtime).passed, true);
    assert.equal(evaluateAssertion({ path: "text", jsonSchema: { not: { type: "string" } } }, response, runtime).passed, false);
    // if/then/else：多态响应（PAID 必须有 paidAt；否则必须有 name）
    const polymorphic = {
        type: "object",
        if: { properties: { status: { const: "PAID" } }, required: ["status"] },
        then: { required: ["paidAt"] },
        else: { required: ["refundedAt"] }
    };
    assert.equal(evaluateAssertion({ path: "order", jsonSchema: polymorphic }, response, runtime).passed, true);
    const missingThen = evaluateAssertion(
        { path: "order", jsonSchema: polymorphic },
        responseWith({ order: { status: "PAID" } }),
        runtime
    );
    assert.equal(missingThen.passed, false);
    assert.deepEqual(missingThen.detail.map((d) => d.path), ["paidAt"]);
    const missingElse = evaluateAssertion(
        { path: "order", jsonSchema: polymorphic },
        responseWith({ order: { status: "REFUNDED" } }),
        runtime
    );
    assert.equal(missingElse.passed, false);
    assert.deepEqual(missingElse.detail.map((d) => d.path), ["refundedAt"]);
    // boolean 子模式：items:false 表示数组必须为空（唯一合法位置）
    assert.equal(evaluateAssertion({ path: "emptyArr", jsonSchema: { type: "array", items: false } }, response, runtime).passed, true);
    const nonEmpty = evaluateAssertion({ path: "items", jsonSchema: { type: "array", items: false } }, response, runtime);
    assert.equal(nonEmpty.passed, false);
    assert.deepEqual(nonEmpty.detail.map((d) => d.path), ["[0]", "[1]", "[2]"]);
    // additionalProperties:false + 空对象：无额外键时通过
    assert.equal(evaluateAssertion({ path: "order", jsonSchema: { type: "object", properties: { status: { type: "string" } }, additionalProperties: true } }, response, runtime).passed, true);
});

test("jsonSchema format 白名单内求值：命中校验、类型不匹配不生效", () => {
    assert.equal(evaluateAssertion({ path: "order.paidAt", jsonSchema: { format: "date-time" } }, response, runtime).passed, true);
    const badDate = evaluateAssertion(
        { path: "t", jsonSchema: { format: "date-time" } },
        responseWith({ t: "2026-02-30T10:00:00Z" }), // 2 月 30 日非法
        runtime
    );
    assert.equal(badDate.passed, false);
    assert.equal(evaluateAssertion({ path: "user.email", jsonSchema: { format: "email" } }, response, runtime).passed, true);
    assert.equal(evaluateAssertion({ path: "text", jsonSchema: { format: "email" } }, response, runtime).passed, false);
    // uuid / ipv4 / uri
    assert.equal(evaluateAssertion({ path: "v", jsonSchema: { format: "uuid" } }, responseWith({ v: "123e4567-e89b-42d3-a456-426614174000" }), runtime).passed, true);
    assert.equal(evaluateAssertion({ path: "v", jsonSchema: { format: "uuid" } }, responseWith({ v: "not-uuid" }), runtime).passed, false);
    assert.equal(evaluateAssertion({ path: "v", jsonSchema: { format: "ipv4" } }, responseWith({ v: "192.168.1.1" }), runtime).passed, true);
    assert.equal(evaluateAssertion({ path: "v", jsonSchema: { format: "ipv4" } }, responseWith({ v: "192.168.1.256" }), runtime).passed, false);
    assert.equal(evaluateAssertion({ path: "v", jsonSchema: { format: "uri" } }, responseWith({ v: "https://example.com/a?b=1" }), runtime).passed, true);
    // 类型不匹配不生效（规范口径）：format 对非期望类型的实际值跳过
    assert.equal(evaluateAssertion({ path: "items", jsonSchema: { format: "email" } }, response, runtime).passed, true);
    // int32/int64 数值格式
    assert.equal(evaluateAssertion({ path: "user.age", jsonSchema: { format: "int32" } }, response, runtime).passed, true);
    assert.equal(evaluateAssertion({ path: "v", jsonSchema: { format: "int64" } }, responseWith({ v: 1.5 }), runtime).passed, false);
});

test("jsonSchema 期望值模板解析与非法解析结果按断言失败处理（不抛异常）", () => {
    // schema 内嵌值支持 {{vars.*}} 模板
    assert.equal(evaluateAssertion(
        { path: "user.age", jsonSchema: { type: "integer", minimum: "{{vars.minAge}}" } },
        response,
        runtime
    ).passed, true);
    // 整个 schema 经模板解析仍是对象时正常求值
    assert.equal(evaluateAssertion(
        { path: "user.age", jsonSchema: "{{vars.schemaFromVar}}" },
        response,
        runtime
    ).passed, true);
    // 模板把关键字值解析成非法类型：定义期放过（含 {{），运行期校验转断言失败 + 明细
    const badResolved = evaluateAssertion(
        { path: "user", jsonSchema: { type: "object", required: "{{vars.minAge}}" } },
        response,
        runtime
    );
    assert.equal(badResolved.passed, false);
    assert.match(badResolved.detail[0].reason, /required 必须是非空字符串数组/);
    // 解析为非对象（字符串）：按断言失败处理
    const nonObject = evaluateAssertion(
        { path: "user", jsonSchema: "{{vars.minAge}}" },
        response,
        runtime
    );
    assert.equal(nonObject.passed, false);
    assert.match(nonObject.detail[0].reason, /jsonSchema 定义必须是对象/);
});

test("jsonSchema 定义期校验：未知键/$ref/非法关键字/顶层无约束 即拒", () => {
    const rejected = [
        [{ jsonSchema: { typ: "object" } }, /未知键 "typ"/],
        [{ jsonSchema: { $ref: "#/definitions/x" } }, /未知键 "\$ref"|\$ref 不解析/],
        [{ jsonSchema: {} }, /至少需要声明一个约束关键字/],
        [{ jsonSchema: { title: "only-annotation" } }, /至少需要声明一个约束关键字/],
        [{ jsonSchema: true }, /顶层必须是对象/],
        [{ jsonSchema: "schema" }, /必须是对象或 boolean/],
        [{ jsonSchema: { type: "any" } }, /type 只支持/],
        [{ jsonSchema: { type: [] } }, /type 只支持/],
        [{ jsonSchema: { required: ["a", "a"] } }, /不能包含重复项/],
        [{ jsonSchema: { format: "iban" } }, /format 只支持/],
        [{ jsonSchema: { exclusiveMinimum: true } }, /必须是有限 number/],
        [{ jsonSchema: { multipleOf: 0 } }, /必须是大于 0/],
        [{ jsonSchema: { minItems: -1 } }, /必须是非负整数/],
        [{ jsonSchema: { pattern: "[" } }, /不是合法正则/],
        [{ jsonSchema: { patternProperties: { "[": { type: "string" } } } }, /不是合法正则/],
        [{ jsonSchema: { additionalItems: false } }, /仅当 items 为数组/],
        [{ jsonSchema: { allOf: [] } }, /必须是非空子模式数组/],
        [{ jsonSchema: { if: { type: "object" } } }, /声明 if 必须同时声明 then 或 else/],
        [{ jsonSchema: { then: { type: "object" } } }, /声明 then\/else 必须同时声明 if/],
        [{ jsonSchema: { items: [{ type: "string" }, "x"] } }, /必须是对象或 boolean/],
        [{ jsonSchema: { dependentRequired: { a: [1] } } }, /必须是非空字符串数组/],
        [{ jsonSchema: { enum: [] } }, /必须是非空数组/]
    ];
    for (const [definition, pattern] of rejected) {
        assert.throws(
            () => validateAssertion({ path: "user", ...definition }, {}),
            (error) => error instanceof TypeError && pattern.test(error.message),
            `应拒绝 ${JSON.stringify(definition).slice(0, 80)}`
        );
    }
    // 合法复杂定义不抛（防误伤）
    assert.doesNotThrow(() => validateAssertion({
        path: "order",
        jsonSchema: {
            $schema: "http://json-schema.org/draft-07/schema#",
            definitions: { money: { type: "number", minimum: 0 } },
            type: "object",
            required: ["status"],
            properties: { status: { enum: ["PAID", "NEW"] }, lines: { type: "array", items: { type: "object" } } },
            anyOf: [{ required: ["paidAt"] }, { required: ["status"] }]
        }
    }, {}));
});

test("jsonSchema 在 each 子断言与 when 对象形式中可用（同一求值管线）", () => {
    // each 子断言内嵌 jsonSchema：每个元素按对象结构校验
    const lines = [{ sku: "A", qty: 2 }, { sku: "B" }];
    const eachSchema = evaluateAssertion(
        { path: "order.lines", each: { jsonSchema: { type: "object", required: ["sku", "qty"] } } },
        response,
        runtime
    );
    assert.equal(eachSchema.passed, true);
    const eachFail = evaluateAssertion(
        { path: "order.lines", each: { jsonSchema: { type: "object", required: ["qty"] } } },
        responseWith({ order: { lines } }),
        runtime
    );
    assert.equal(eachFail.passed, false);
    // 外层 detail 定位失败元素（index=1），内层子断言 detail 定位字段
    assert.deepEqual(eachFail.detail.map((d) => d.index), [1]);
    assert.deepEqual(eachFail.detail[0].assertions[0].detail.map((d) => d.path), ["qty"]);
});

test("evaluateJsonSchema 直出明细与 evaluateShape 同结构", () => {
    const details = evaluateJsonSchema({ type: "object", required: ["a"] }, { b: 1 });
    assert.equal(details.length, 1);
    assert.equal(details[0].path, "a");
    assert.equal(details[0].assertions[0].passed, false);
    assert.equal(details[0].index, 0);
    assert.deepEqual(evaluateJsonSchema({ type: "string" }, "x"), []);
    // boolean 子模式（内嵌语义）：true 恒过、false 恒报
    assert.deepEqual(evaluateJsonSchema(true, { a: 1 }), []);
    assert.equal(evaluateJsonSchema(false, { a: 1 }).length, 1);
});
