// 综合覆盖：断言操作符边界 + 提取语义（确定性、纯函数层）。
//
// 覆盖目标（与 docs/testing 覆盖矩阵 T02 对齐）：
//   A1 每个比较符的边界（等于/不等于边界，差一点点即失败，类型不隐式转换）
//   A2 length 与 equals/notEquals/oneOf 组合的证据口径（actual 回写、diff 用原始值）
//   A3 shape 结构断言的类型边界（integer 不接受 1.5、number 接受）
//   A4 extract：required/default/互斥、headers 大小写、通配段、suite 作用域、
//      target:duration、warning 不含响应内容
//   A5 generatedVars md5/signature（G3）：公开向量、独立对拍、拼装口径、非法参数
//
// 每个用例都用独立的可观测 oracle：断言结果对象的 passed/actual/expected，
// 而不是仅匹配错误文案。
import assert from "node:assert/strict";
import crypto from "node:crypto";
import test from "node:test";
import { applyExtract, applyGeneratedVar, evaluateAssertion, generateSignature, getByPath, md5 } from "../src/index.js";

// 独立实现（node:crypto）作为对拍 oracle：与被测的 blueimp-md5 是两套实现
function md5Hex(value) {
    return crypto.createHash("md5").update(value, "utf8").digest("hex");
}

let runtimeSeq = 0;
function runtime(vars = {}) {
    return { vars, suite: {}, runId: `run-${runtimeSeq++}` };
}
function response(body, extra = {}) {
    let bodyText;
    try {
        bodyText = typeof body === "string" ? body : JSON.stringify(body);
    } catch {
        // BigInt 等 JSON 不可表示值：走真实响应路径时 bodyText 也是文本，这里给个占位即可
        bodyText = String(body);
    }
    return { status: 200, headers: {}, body, bodyText, ...extra };
}
function evaluate(definition, body, vars = {}) {
    return evaluateAssertion(definition, response(body), runtime(vars), {});
}

// ==================== A1 比较符边界 ====================
test("A1 数值比较符在边界上取等/不取等：gt/lt 严格，gte/lte 含等号", () => {
    const cases = [
        // [操作符, 期望值, 实际值, 是否应通过]
        ["gt", 5, 5, false],
        ["gt", 5, 5.0000001, true],
        ["gte", 5, 5, true],
        ["gte", 5, 4.9999999, false],
        ["lt", 5, 5, false],
        ["lt", 5, 4.9999999, true],
        ["lte", 5, 5, true],
        ["lte", 5, 5.0000001, false],
        ["gt", 0, 0, false],
        ["gte", 0, 0, true],
        ["lt", 0, -0.0000001, true],
        ["lte", -1, -1, true]
    ];
    for (const [op, expected, actual, shouldPass] of cases) {
        const result = evaluate({ path: "n", [op]: expected }, { n: actual });
        assert.equal(result.passed, shouldPass, `${op} ${actual} vs ${expected} 期望 ${shouldPass ? "通过" : "失败"}`);
        assert.equal(result.actual, actual, `${op} 失败侧仍应保留实际值`);
    }
});

test("A1 数值比较符不做字符串隐式转换：字符串数字两侧都不放行", () => {
    // 实际值是字符串：真实 JSON 里 {"n":"11"} 很常见，不能当成 11 比较
    assert.equal(evaluate({ path: "n", gt: 10 }, { n: "11" }).passed, false);
    assert.equal(evaluate({ path: "n", gte: "11" }, { n: "11" }).passed, false);
    // 期望值写成字符串（含模板解析成字符串）也不放行
    assert.equal(evaluate({ path: "n", gt: "10" }, { n: 11 }).passed, false);
    assert.equal(evaluate({ path: "n", lt: "10" }, { n: 9 }).passed, false);
    // 布尔/空值不是有限数字
    assert.equal(evaluate({ path: "n", gt: 0 }, { n: true }).passed, false);
    assert.equal(evaluate({ path: "n", gt: 0 }, { n: null }).passed, false);
    assert.equal(evaluate({ path: "n", gt: 0 }, {}).passed, false);
    // 非有限数字（NaN/Infinity）不算可比
    assert.equal(evaluate({ path: "n", gt: 0 }, { n: Number.POSITIVE_INFINITY }).passed, false);
    assert.equal(evaluate({ path: "n", lt: 10 }, { n: Number.NaN }).passed, false);
    assert.equal(evaluate({ path: "n", lt: 10 }, { n: 1 }).expected, 10);
    assert.equal(evaluate({ path: "n", lt: Number.NaN }, { n: 1 }).passed, false);
});

test("A1 数值比较符接受模板变量解析出的数字，正例与反例都成立", () => {
    assert.equal(evaluate({ path: "n", gt: "{{vars.limit}}" }, { n: 11 }, { limit: 10 }).passed, true);
    assert.equal(evaluate({ path: "n", gt: "{{vars.limit}}" }, { n: 10 }, { limit: 10 }).passed, false);
    assert.equal(evaluate({ path: "n", gte: "{{vars.limit}}" }, { n: 10 }, { limit: 10 }).passed, true);
    // bigint 不是有限 number：既不通过与也不抛异常
    assert.doesNotThrow(() => evaluate({ path: "n", gt: 1 }, { n: 2n }));
    assert.equal(evaluate({ path: "n", gt: 1 }, { n: 2n }).passed, false);
});

test("A1 多操作符组合是 AND：任一不满足整体失败，失败时 expected 取最后一个求值操作符", () => {
    assert.equal(evaluate({ path: "n", gte: 5, lte: 10 }, { n: 7 }).passed, true);
    assert.equal(evaluate({ path: "n", gte: 5, lte: 10 }, { n: 4 }).passed, false);
    assert.equal(evaluate({ path: "n", gte: 5, lte: 10 }, { n: 11 }).passed, false);
    assert.equal(evaluate({ path: "n", gt: 0, lt: 10, notEquals: 5 }, { n: 5 }).passed, false);
    assert.equal(evaluate({ path: "n", gt: 0, lt: 10, notEquals: 5 }, { n: 6 }).passed, true);
});

test("A1 字符串边界：startsWith/endsWith 大小写敏感，null/undefined 视为空串", () => {
    assert.equal(evaluate({ path: "s", startsWith: "订单" }, { s: "订单已支付" }).passed, true);
    assert.equal(evaluate({ path: "s", startsWith: "订单" }, { s: "已支付订单" }).passed, false);
    assert.equal(evaluate({ path: "s", endsWith: "已完成" }, { s: "订单已完成" }).passed, true);
    assert.equal(evaluate({ path: "s", endsWith: "已完成" }, { s: "订单已完成X" }).passed, false);
    assert.equal(evaluate({ path: "s", startsWith: "abc" }, { s: "ABCdef" }).passed, false, "大小写敏感");
    // 缺失值按空串：startsWith "" 通过，startsWith 非空失败
    assert.equal(evaluate({ path: "s", startsWith: "" }, {}).passed, true);
    assert.equal(evaluate({ path: "s", endsWith: "" }, {}).passed, true);
    assert.equal(evaluate({ path: "s", startsWith: "a" }, {}).passed, false);
    // 空串是 exists:false 的判定依据之一，必须与 startsWith 的空串口径区分
    assert.equal(evaluate({ path: "s", exists: false, startsWith: "" }, { s: "" }).passed, true);
});

test("A1 equals 是 JSON 深比较：键序不敏感，但类型严格（1 ≠ \"1\" ≠ true）", () => {
    assert.equal(evaluate({ equals: { a: 1, b: [2, 3] } }, { b: [2, 3], a: 1 }).passed, true, "键序不影响相等");
    assert.equal(evaluate({ equals: { a: 1 } }, { a: "1" }).passed, false);
    assert.equal(evaluate({ equals: { a: 1 } }, { a: true }).passed, false);
    assert.equal(evaluate({ equals: [1, 2] }, [1, 2]).passed, true);
    assert.equal(evaluate({ equals: [1, 2] }, [2, 1]).passed, false, "数组顺序敏感");
    // undefined 键与 JSON 一致被忽略
    assert.equal(evaluate({ equals: {} }, { a: undefined }).passed, true);
    // -0 与 0 在 JSON 语义下相等
    assert.equal(evaluate({ path: "n", equals: 0 }, { n: -0 }).passed, true);
});

test("A1 exists 的判定边界：null/空串/(缺失) 都算不存在，false/0/空数组算存在", () => {
    const cases = [
        [undefined, false],
        [null, false],
        ["", false],
        [0, true],
        [false, true],
        [[], true],
        [{}, true],
        ["0", true]
    ];
    for (const [value, exists] of cases) {
        const body = value === undefined ? {} : { v: value };
        assert.equal(evaluate({ path: "v", exists: true }, body).passed, exists, `exists:true 对 ${JSON.stringify(value)}`);
        assert.equal(evaluate({ path: "v", exists: false }, body).passed, !exists, `exists:false 对 ${JSON.stringify(value)}`);
    }
});

// ==================== A2 length + equals 证据口径 ====================
test("A2 length 单独使用：容器长度精确比较，非容器失败，actual 回写为长度", () => {
    assert.equal(evaluate({ path: "l", length: 3 }, { l: [1, 2, 3] }).passed, true);
    assert.equal(evaluate({ path: "l", length: 2 }, { l: [1, 2, 3] }).passed, false);
    assert.equal(evaluate({ path: "s", length: 2 }, { s: "订单" }).passed, true, "字符串按字符数");
    assert.equal(evaluate({ path: "o", length: 2 }, { o: { a: 1, b: 2 } }).passed, true, "对象按键数");
    // 非容器：actual 保留原始值（不是 0，也不是 undefined）
    const numberCase = evaluate({ path: "n", length: 0 }, { n: 42 });
    assert.equal(numberCase.passed, false);
    assert.equal(numberCase.actual, 42);
    const nullCase = evaluate({ path: "n", length: 0 }, { n: null });
    assert.equal(nullCase.passed, false);
    // 空数组 length:0 通过（与 includes 空数组恒失败形成对照）
    assert.equal(evaluate({ path: "l", length: 0 }, { l: [] }).passed, true);
    assert.equal(evaluate({ path: "l", includes: 1 }, { l: [] }).passed, false);
});

test("A2 length 与 equals 组合：length 通过但 equals 失败，diff 必须用原始值而非长度", () => {
    // 这是「length 回写 actual」最容易造成证据污染的组合：
    // 若 diff 用回写后的 3 去比较，会给出 expected=[1,2,3] actual=3 的误导证据
    const result = evaluate({ path: "v", equals: [1, 2, 3], length: 3 }, { v: [1, 2, 4] });
    assert.equal(result.passed, false);
    assert.equal(result.actual, 3, "结果 actual 按 length 口径回写");
    assert.ok(Array.isArray(result.diff.entries), "失败必须给出字段差异证据");
    // 差异证据必须落在原始数组的叶子上（$[2]），而不是回写后的长度值
    assert.equal(result.diff.entries.length, 1);
    assert.equal(result.diff.entries[0].path, "$[2]");
    assert.equal(result.diff.entries[0].expected, 3);
    assert.equal(result.diff.entries[0].actual, 4);
});

test("A2 length 与 equals 组合：两者都通过才算通过", () => {
    assert.equal(evaluate({ path: "v", equals: [1, 2], length: 2 }, { v: [1, 2] }).passed, true);
    assert.equal(evaluate({ path: "v", equals: [1, 2], length: 3 }, { v: [1, 2] }).passed, false, "length 不符");
    assert.equal(evaluate({ path: "v", equals: [9, 9], length: 2 }, { v: [1, 2] }).passed, false, "equals 不符");
});

test("A2 length 与 notEquals/oneOf 组合：相等时 notEquals 失败给出「实际相等」证据", () => {
    const notEqualsSame = evaluate({ path: "v", notEquals: [1, 2], length: 2 }, { v: [1, 2] });
    assert.equal(notEqualsSame.passed, false, "notEquals 相等必须失败");
    assert.match(String(notEqualsSame.diff.entries[0].path), /实际相等/);
    // notEquals 不等但 length 不符 → 失败，但不应伪造 diff（notEquals 本身成立）
    const notEqualsButLength = evaluate({ path: "v", notEquals: [9], length: 5 }, { v: [1, 2] });
    assert.equal(notEqualsButLength.passed, false);
    assert.equal(notEqualsButLength.diff, undefined, "失败来自 length 时不能伪造 notEquals 差异");
    // oneOf：命中候选但 length 不符 → 只由 length 判失败
    const oneOfHit = evaluate({ path: "v", oneOf: [[1, 2], [3]], length: 5 }, { v: [1, 2] });
    assert.equal(oneOfHit.passed, false);
    assert.equal(oneOfHit.diff, undefined);
    // oneOf：未命中候选 → 每个候选都有差异证据，且实际值是原始数组
    const oneOfMiss = evaluate({ path: "v", oneOf: [[7], [8]], length: 2 }, { v: [1, 2] });
    assert.equal(oneOfMiss.passed, false);
    const candidatePrefixes = new Set(oneOfMiss.diff.entries.map((entry) => entry.path.split(" · ")[0]));
    assert.deepEqual([...candidatePrefixes].sort(), ["候选 1", "候选 2"], "每个候选都必须有差异证据");
    // 证据是原始数组的叶子值（1/2），不是回写后的长度 2
    const leafActuals = oneOfMiss.diff.entries.filter((entry) => entry.actualType === "number").map((entry) => entry.actual);
    assert.ok(leafActuals.includes(1));
    assert.equal(leafActuals.filter((value) => value === 2).length > 0, true);
    assert.equal(oneOfMiss.diff.entries.some((entry) => entry.path.endsWith("$.length")), true, "长度差异也要透出");
});

test("A2 length 的期望值只接受数字：字符串与 NaN 一律失败（不隐式转换）", () => {
    assert.equal(evaluate({ path: "l", length: "2" }, { l: [1, 2] }).passed, false);
    assert.equal(evaluate({ path: "l", length: Number.NaN }, { l: [1, 2] }).passed, false);
    assert.equal(evaluate({ path: "l", length: Number.POSITIVE_INFINITY }, { l: [1, 2] }).passed, false);
    assert.equal(evaluate({ path: "l", length: 2.5 }, { l: [1, 2] }).passed, false);
});

// ==================== A3 shape 结构断言边界 ====================
test("A3 shape：integer 拒绝小数、接受整数与整值浮点；number 两者都接受", () => {
    const intSchema = { type: "object", properties: { n: { type: "integer" } } };
    const numSchema = { type: "object", properties: { n: { type: "number" } } };
    assert.equal(evaluate({ shape: intSchema }, { n: 1 }).passed, true);
    assert.equal(evaluate({ shape: intSchema }, { n: 1.0 }).passed, true, "1.0 在 JS 里是整数");
    assert.equal(evaluate({ shape: intSchema }, { n: 1.5 }).passed, false);
    assert.equal(evaluate({ shape: intSchema }, { n: "1" }).passed, false);
    assert.equal(evaluate({ shape: numSchema }, { n: 1.5 }).passed, true);
    assert.equal(evaluate({ shape: numSchema }, { n: "1.5" }).passed, false);
    const failed = evaluate({ shape: intSchema }, { n: 1.5 });
    assert.equal(failed.detail[0].path, "n", "失败明细定位到字段路径");
    assert.equal(failed.detail[0].expectedType, "integer");
});

test("A3 shape：required 只检查键存在，null 算存在；additionalProperties:false 拒绝未知键", () => {
    const schema = {
        type: "object",
        required: ["id"],
        additionalProperties: false,
        properties: { id: { type: "string" } }
    };
    assert.equal(evaluate({ shape: schema }, { id: "a" }).passed, true);
    const withExtra = evaluate({ shape: schema }, { id: "a", extra: 1 });
    assert.equal(withExtra.passed, false, "未知键必须失败");
    assert.match(String(withExtra.detail[0].path), /extra/);
    // required 缺键失败；值为 null 时是 type 失败而非 required 失败
    const missing = evaluate({ shape: schema }, {});
    assert.equal(missing.passed, false);
    const nullValue = evaluate({ shape: { type: "object", required: ["id"] } }, { id: null });
    assert.equal(nullValue.passed, true, "required 只判键存在，类型由 properties 决定");
});

test("A3 shape：数组 items 逐元素校验，空数组通过，非数组失败", () => {
    const schema = { type: "object", properties: { list: { type: "array", items: { type: "string" } } } };
    assert.equal(evaluate({ shape: schema }, { list: ["a", "b"] }).passed, true);
    assert.equal(evaluate({ shape: schema }, { list: [] }).passed, true);
    const failed = evaluate({ shape: schema }, { list: ["a", 2] });
    assert.equal(failed.passed, false);
    assert.equal(failed.detail[0].path, "list[1]");
    assert.equal(evaluate({ shape: schema }, { list: "not-array" }).passed, false);
});

// ==================== A4 extract 语义 ====================
test("A4 extract required:true 路径缺失使步骤失败；缺失失败只报一次且不带响应内容", () => {
    const rt = runtime({});
    const result = applyExtract(
        { extract: [{ name: "token", path: "data.token", required: true }] },
        response({ data: { other: "SECRET-IN-BODY" } }),
        rt
    );
    assert.equal(result.failures.length, 1, "required 缺失必须产生 1 条失败");
    assert.equal(result.warnings.length, 0, "required 缺失不重复产生 warning");
    assert.match(result.failures[0].name, /提取 token（路径不存在）/);
    assert.equal(result.failures[0].calledWith, undefined);
    assert.equal(JSON.stringify(result).includes("SECRET-IN-BODY"), false, "失败信息不得回显响应内容");
    assert.equal(rt.vars.token, undefined);
});

test("A4 extract 未开 required：缺失只告警、不失败、变量为 undefined，告警不含响应内容", () => {
    const rt = runtime({});
    const result = applyExtract(
        { extract: [{ name: "missing", path: "a.b.c" }] },
        response({ a: { other: "LEAKME-VALUE" } }),
        rt
    );
    assert.equal(result.failures.length, 0);
    assert.equal(result.warnings.length, 1);
    assert.match(result.warnings[0], /不存在/);
    assert.equal(result.warnings[0].includes("LEAKME-VALUE"), false);
    assert.equal(rt.vars.missing, undefined);
    assert.equal("missing" in rt.vars, true, "变量必须显式写入 undefined（否则下游 exist 语义不一致）");
});

test("A4 extract default 兜底：互斥校验、支持模板引用先提取的变量、JSON null 不触发兜底", () => {
    // required + default 互斥
    const rt = runtime({});
    assert.throws(
        () => applyExtract({ extract: [{ name: "x", path: "a", required: true, default: 1 }] }, response({}), rt),
        /互斥/
    );
    // default 支持模板，且能引用同步骤先提取的变量
    const rt2 = runtime({});
    const ok = applyExtract({
        extract: [
            { name: "first", path: "a", default: "seed" },
            { name: "second", path: "b", default: "{{vars.first}}-suffix" }
        ]
    }, response({}), rt2);
    assert.deepEqual(ok.failures, []);
    assert.deepEqual(ok.warnings, []);
    assert.equal(rt2.vars.first, "seed");
    assert.equal(rt2.vars.second, "seed-suffix");
    // JSON 字面量 null 是真实响应值，不触发 default
    const rt3 = runtime({});
    applyExtract({ extract: [{ name: "v", path: "a", default: "fallback" }] }, response({ a: null }), rt3);
    assert.equal(rt3.vars.v, null);
});

test("A4 extract 来源优先级：target/header 简写 > from；from:headers 首段大小写不敏感", () => {
    const rt = runtime({});
    const res = response({ bodyField: "from-body" }, {
        status: 201,
        durationMs: 42,
        headers: { "Content-Type": "text/plain; charset=utf-8", "X-Trace-Id": "trace-1" }
    });
    applyExtract({
        extract: [
            { name: "byStatus", target: "status" },
            { name: "byDuration", target: "duration" },
            { name: "byHeader", header: "x-trace-id" },
            { name: "byHeadersPath", from: "headers", path: "content-TYPE" },
            { name: "byFromResponse", from: "response", path: "durationMs" },
            { name: "byBodyText", from: "bodyText", path: "" }
        ]
    }, res, rt);
    assert.equal(rt.vars.byStatus, 201);
    assert.equal(rt.vars.byDuration, 42);
    assert.equal(rt.vars.byHeader, "trace-1");
    assert.equal(rt.vars.byHeadersPath, "text/plain; charset=utf-8");
    assert.equal(rt.vars.byFromResponse, 42);
    // 空 path 取整个来源（下游在用写法），bodyText 是原始文本
    assert.equal(typeof rt.vars.byBodyText, "string");
});

test("A4 extract 通配段 [*]：跳过缺子路径元素、空数组产 []、非数组按缺失处理", () => {
    const cases = [
        { body: { items: [{ id: 1 }, { name: "x" }, { id: 3 }] }, expect: [1, 3], label: "跳过缺 id 的元素" },
        { body: { items: [] }, expect: [], label: "空数组产空数组" },
        { body: { items: [{ sub: [{ id: 1 }] }, { sub: [{ id: 2 }, { z: 0 }] }] }, path: "items[*].sub[*].id", expect: [1, 2], label: "连续通配展平" }
    ];
    for (const item of cases) {
        const rt = runtime({});
        const result = applyExtract(
            { extract: [{ name: "ids", path: item.path || "items[*].id", required: true }] },
            response(item.body),
            rt
        );
        assert.deepEqual(result.failures, [], `${item.label}：不应失败`);
        assert.deepEqual(rt.vars.ids, item.expect, item.label);
    }
    // 非数组（对象）按路径缺失处理：required 触发失败
    const rt = runtime({});
    const notArray = applyExtract(
        { extract: [{ name: "ids", path: "items[*].id", required: true }] },
        response({ items: { id: 5 } }),
        rt
    );
    assert.equal(notArray.failures.length, 1, "非数组不得静默产出空数组");
    assert.equal(getByPath({ items: { id: 5 } }, "items[*].id"), undefined);
});

test("A4 extract scope:suite 写入共享命名空间，不污染当前场景 vars", () => {
    const suite = {};
    const rt = { vars: {}, suite };
    const result = applyExtract(
        { extract: [{ name: "sessionId", path: "sid", scope: "suite" }] },
        response({ sid: "s-1" }),
        rt
    );
    assert.deepEqual(result.failures, []);
    assert.equal(suite.sessionId, "s-1", "写入 suite");
    assert.equal(rt.vars.sessionId, undefined, "默认 step 作用域之外的变量不写 vars");
    // suiteVars 与 suite 非同一对象时同步写入（兼容别名）
    const aliasSuite = {};
    const aliasVars = {};
    const rt2 = { vars: {}, suite: aliasSuite, suiteVars: aliasVars };
    applyExtract({ extract: [{ name: "t", path: "sid", scope: "suite" }] }, response({ sid: "s-2" }), rt2);
    assert.equal(aliasSuite.t, "s-2");
    assert.equal(aliasVars.t, "s-2");
});

test("A4 extract 拒绝保留变量名，且空响应体按缺失处理而不是写入 null", () => {
    assert.throws(
        () => applyExtract({ extract: [{ name: "runId", path: "a" }] }, response({ a: 1 }), runtime({})),
        /保留变量/
    );
    // 204 空响应体：无 path 取值时按缺失处理
    const rt = runtime({});
    const empty = applyExtract(
        { extract: [{ name: "body", required: true }] },
        { status: 204, headers: {}, body: null, bodyText: "" },
        rt
    );
    assert.equal(empty.failures.length, 1, "空响应体 required 必须失败");
    // 但 JSON 字面量 null（bodyText 非空）是真值
    const rt2 = runtime({});
    const literalNull = applyExtract(
        { extract: [{ name: "v", required: true }] },
        { status: 200, headers: {}, body: null, bodyText: "null" },
        rt2
    );
    assert.equal(literalNull.failures.length, 0);
    assert.equal(rt2.vars.v, null);
});

// ==================== A5 造数 md5 / signature（G3） ====================
test("A5 md5：公开测试向量 + 与 Node crypto 独立对拍（含中文与长输入）", () => {
    // 公开向量锚定算法本身（与依赖实现无关）
    assert.equal(md5(""), "d41d8cd98f00b204e9800998ecf8427e");
    assert.equal(md5("abc"), "900150983cd24fb0d6963f7d28e17f72");
    assert.equal(md5("message digest"), "f96b697d7cb7938d525a2f31aaf161d0");
    // 任意输入对拍：node:crypto 与 blueimp-md5 是两套独立实现
    for (const value of ["中文输入", "订单-2026-11-06-001", "x".repeat(1000), "42", "a b c"]) {
        assert.equal(md5(value), md5Hex(value), `对拍失败: ${value.slice(0, 24)}`);
    }
    // 口径：非字符串按 String() 转换；输出小写 32 位十六进制
    assert.equal(md5(42), md5("42"));
    assert.equal(md5(true), md5("true"));
    assert.match(md5("abc"), /^[0-9a-f]{32}$/);
});

test("A5 signature：按 key 排序拼装 apiSecret，输出大写 MD5（与 crypto 独立对拍）", () => {
    // 文档口径：key 升序、key=value 用 & 连接、末尾追加 apiSecret=<secret>、MD5 后大写
    const assemble = (params, secret) => Object.keys(params)
        .sort()
        .map((key) => `${key}=${params[key] == null ? "" : params[key]}`)
        .concat([`apiSecret=${secret == null ? "" : secret}`])
        .join("&");
    const expected = (params, secret) => md5Hex(assemble(params, secret)).toUpperCase();

    const signature = generateSignature({ b: "2", a: "1" }, "s3cret");
    assert.equal(signature, expected({ a: "1", b: "2" }, "s3cret"));
    assert.equal(signature, generateSignature({ a: "1", b: "2" }, "s3cret"), "key 顺序不得影响签名（必须按 key 排序）");
    // null/undefined 参数拼空串；0/false 保留原值；空密钥拼空串
    assert.equal(
        generateSignature({ a: null, b: undefined, c: 0, d: false }, "s"),
        expected({ a: "", b: "", c: 0, d: false }, "s")
    );
    assert.equal(generateSignature({ a: 1 }, ""), md5Hex("a=1&apiSecret=").toUpperCase());
    // 输出格式：大写 32 位十六进制；同输入确定性；换密钥必须变化
    assert.match(signature, /^[0-9A-F]{32}$/);
    assert.equal(generateSignature({ b: "2", a: "1" }, "s3cret"), signature, "同输入必须确定性");
    assert.notEqual(generateSignature({ b: "2", a: "1" }, "other-secret"), signature, "密钥不同签名必须不同");
});

test("A5 generatedVars md5/signature：parts/params 引用 vars，确定性输出，非法参数快速失败", () => {
    const vars = { a: "x", b: "y", apiSecret: "topsecret" };
    // md5：parts 是变量名列表，取 vars 中的值按声明顺序拼接
    applyGeneratedVar({ name: "hash", type: "md5", parts: ["a", "b"] }, vars, { runId: "run-1" });
    assert.equal(vars.hash, md5Hex("xy"));
    // 缺失变量按空串（与 signature 的 params 口径一致，不产生 "undefined" 字面量）
    applyGeneratedVar({ name: "hash2", type: "md5", parts: ["a", "notDeclared"] }, vars, { runId: "run-1" });
    assert.equal(vars.hash2, md5Hex("x"));
    // signature：params 把业务参数名映射到变量名，secretVar 指定密钥变量
    applyGeneratedVar({ name: "sig", type: "signature", params: { orderId: "a" }, secretVar: "apiSecret" }, vars, { runId: "run-1" });
    assert.equal(vars.sig, md5Hex("orderId=x&apiSecret=topsecret").toUpperCase());
    // 同 runId 再次求值仍稳定（确定性）
    applyGeneratedVar({ name: "sig2", type: "signature", params: { orderId: "a" }, secretVar: "apiSecret" }, vars, { runId: "run-1" });
    assert.equal(vars.sig2, vars.sig);
    // 缺密钥（未声明 / 空串）都必须快速失败，且错误消息点名变量而不回显其他密钥值
    assert.throws(
        () => applyGeneratedVar({ name: "bad", type: "signature", params: { orderId: "a" } }, { a: "x" }, { runId: "run-1" }),
        (error) => {
            assert.match(error.message, /签名生成失败/);
            assert.match(error.message, /缺少密钥变量 vars\.apiSecret/);
            return true;
        }
    );
    assert.throws(
        () => applyGeneratedVar({ name: "bad", type: "signature", params: { orderId: "a" }, secretVar: "apiSecret" }, { a: "x", apiSecret: "" }, { runId: "run-1" }),
        /缺少密钥变量/
    );
    assert.equal(JSON.stringify(vars).includes("bad"), false, "失败不得写入目标变量");
});
