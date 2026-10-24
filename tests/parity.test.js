// Node core（src/core.js）断言行为契约测试
//
// 背景：浏览器 legacy core 已统一到 src/core.js（legacy/core.js 已删除），
// 双端对拍完成使命。本文件保留历史构造的断言用例集（含假绿回归用例），
// 作为 src/core.js 的稳定回归快照，并补充对迁移后 UI 辅助模块的测试。
import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import * as nodeCore from "../src/core.js";
import { copyText, esc, fmt, safeJson } from "../src/browser/ui/ui-utils.js";
import { applyCurlProxyHeaders } from "../src/browser/ui/runtime.js";

function runtimeWith(vars = {}) {
    return { vars, lastResponse: null, lastResponseBody: null };
}

const response = {
    status: 200,
    headers: { "Content-Type": "application/json", "X-Total": "42" },
    body: {
        code: 200,
        total: 10,
        items: [1, 2, 3],
        list: [10, 20],
        obj: { x: 1 },
        empty: "",
        text: "abc",
        nothing: null,
        nested: { flag: true },
        matrix: [[1, 2], [3, 4]]
    },
    bodyText: JSON.stringify({ code: 200 })
};

const runtime = runtimeWith({
    expectedStatus: 200,
    candidates: [200, 201],
    nonArray: "nope",
    min: 5,
    list: [10, 20],
    obj: { x: 1 }
});

// 覆盖全部操作符 + 假绿回归场景
const assertionCases = [
    // exists
    { path: "code", exists: true },
    { path: "missing", exists: true },
    { path: "empty", exists: false },
    { path: "missing", exists: false },
    // equals / notEquals（含模板变量）
    { path: "code", equals: 200 },
    { path: "code", equals: "{{vars.expectedStatus}}" },
    { path: "obj", equals: { x: 1 } },
    { path: "code", notEquals: 201 },
    { path: "code", notEquals: 200 },
    { path: "obj", notEquals: { x: 1 } },
    // includes：数组深比较（假绿回归：actual=[10,20], includes=2 必须 FAIL）
    { path: "items", includes: 2 },
    { path: "items", includes: 9 },
    { path: "items", includes: "2" },
    { path: "list", includes: 20 },
    { path: "list", includes: 2 },
    { path: "list", includes: { x: 1 } },
    // includes：非数组走子串包含
    { path: "empty", includes: "" },
    { path: "total", includes: "1" },
    { path: "total", includes: 10 },
    // matches（无效正则已在 validateAssertion 定义期/执行期校验被拒，不在本表锁定）
    { path: "total", matches: "^10$" },
    { path: "total", matches: "^9$" },
    // oneOf：字面数组 / 模板变量 / 非数组 expected（假绿回归：必须 FAIL 而非跳过）
    { path: "code", oneOf: [200, 201] },
    { path: "code", oneOf: [201, 202] },
    { path: "code", oneOf: "{{vars.candidates}}" },
    { path: "total", oneOf: "{{vars.candidates}}" },
    { path: "code", oneOf: "{{vars.nonArray}}" },
    { path: "obj", oneOf: [{ x: 1 }, { y: 2 }] },
    { path: "obj", oneOf: [{ x: 2 }] },
    { path: "code", oneOf: "{{vars.list}}" },
    // 数值操作符（finite number 语义）
    { path: "total", gt: 9 },
    { path: "total", gt: 10 },
    { path: "total", gte: 10 },
    { path: "total", gte: 11 },
    { path: "total", lt: 11 },
    { path: "total", lt: 10 },
    { path: "total", lte: 10 },
    { path: "total", lte: 9 },
    { path: "total", gt: "9" },
    { path: "total", gt: "{{vars.min}}" },
    // startsWith / endsWith：前缀/后缀（大小写敏感，非字符串实际值先字符串化，null/undefined 视为空串）
    { path: "code", startsWith: "2" },
    { path: "code", startsWith: "{{vars.expectedStatus}}" },
    { path: "code", startsWith: "3" },
    // 判别用例："abc" 含 "b" 但非前缀——startsWith 被误实现为 includes 时此用例必失败
    { path: "text", startsWith: "b" },
    { header: "content-type", startsWith: "Application" },
    // 空串期望：空前缀/空后缀恒真
    { path: "text", startsWith: "" },
    { path: "text", endsWith: "" },
    // 缺失模板变量解析为空串 → 空前缀恒真（而非 "undefined" 字样导致失败）
    { path: "text", startsWith: "{{vars.missing}}" },
    // 显式 null 实际值：视为空串参与比较
    { path: "nothing", startsWith: "" },
    { path: "nothing", startsWith: "x" },
    { path: "nothing", endsWith: "" },
    { path: "total", endsWith: "0" },
    { path: "code", endsWith: "{{vars.expectedStatus}}" },
    { path: "total", endsWith: "1" },
    // 大小写敏感：后缀大写 "JSON" 对实际值 "application/json" 必失败
    { header: "content-type", endsWith: "JSON" },
    { path: "missing", startsWith: "" },
    // target / header / from 来源
    { target: "status", equals: 200 },
    { target: "status", equals: 201 },
    { header: "X-Total", equals: "42" },
    { header: "X-Missing", exists: false },
    { header: "content-type", matches: "^application/json" },
    { from: "vars", path: "min", equals: 5 },
    { from: "vars", path: "missing", exists: false },
    { from: "headers", path: "X-Total", equals: "42" },
    { from: "headers", path: "X-Missing", exists: false },
    { from: "bodyText", matches: "code" },
    { from: "bodyText", equals: JSON.stringify({ code: 200 }) },
    { path: "code", equals: 200 },
    { path: "nested.flag", equals: true },
    // each：数组逐项断言（expected 为子断言对象；对每个元素套用，任一元素失败则整体失败）
    { path: "items", each: { lt: 5 } },
    { path: "list", each: { gte: 10 } },
    { path: "list", each: { gt: 15 } },
    { path: "list", each: { equals: 10 } },
    { path: "code", each: { gte: 0 } },
    { path: "missing", each: { exists: true } },
    // 嵌套 each：外层数组元素仍是数组，内层逐项断言；matrix=[[1,2],[3,4]]
    { path: "matrix", each: { each: { lt: 5 } } },
    // 嵌套 each 判别：内层条件对最后一个元素必失败（内层 some 语义或外层 any 语义均会假绿）
    { path: "matrix", each: { each: { gt: 3 } } }
];

// 每个用例的期望 passed（与 assertionCases 顺序一一对应）。
// 逐条锁定极性，防止 includes 数组深比较 / oneOf 非数组 / exists 缺失路径等假绿回归。
const expectedPassed = [
    true,  // exists: code 存在
    false, // exists: missing 不存在
    true,  // exists:false 且 empty=""（空串视为不存在）
    true,  // exists:false 且 missing 不存在
    true,  // equals 200
    true,  // equals {{expectedStatus}}
    true,  // equals 对象深比较
    true,  // notEquals 201
    false, // notEquals 200
    false, // notEquals 对象深比较
    true,  // includes: items=[1,2,3] 含 2
    false, // includes: items 不含 9
    false, // includes: "2" 与数字 2 类型不同（深比较）
    true,  // includes: list=[10,20] 含 20
    false, // includes: list 含 2（假绿回归：数组不得字符串化）
    false, // includes: list 不含 {x:1}
    true,  // includes: 非数组 empty="" 含 ""
    true,  // includes: 非数组 10 含 "1"
    true,  // includes: 非数组 10 含 10
    true,  // matches ^10$
    false, // matches ^9$
    true,  // oneOf [200,201]
    false, // oneOf [201,202]
    true,  // oneOf {{candidates}}
    false, // oneOf {{candidates}} 对 total
    false, // oneOf {{nonArray}}（假绿回归：必须 FAIL 而非跳过）
    true,  // oneOf [{x:1},{y:2}]
    false, // oneOf [{x:2}]
    false, // oneOf {{list}} 对 code
    true,  // gt 9
    false, // gt 10
    true,  // gte 10
    false, // gte 11
    true,  // lt 11
    false, // lt 10
    true,  // lte 10
    false, // lte 9
    false, // gt "9" 字符串不参与数值比较
    true,  // gt {{min}}
    true,  // startsWith "2"（数字 200 字符串化）
    true,  // startsWith {{expectedStatus}} 模板变量
    false, // startsWith "3" 前缀不符
    false, // startsWith "b" 对 "abc"：含但非前缀（判别 startsWith 被顶替为 includes）
    false, // startsWith "Application" 大小写敏感
    true,  // startsWith "" 空串期望恒真
    true,  // endsWith "" 空串期望恒真
    true,  // startsWith {{vars.missing}} 缺失模板变量解析为空串 → 空前缀恒真
    true,  // null 实际值视为空串，空前缀恒真
    false, // null 实际值 + 非空前缀必失败
    true,  // null 实际值 + 空后缀恒真
    true,  // endsWith "0"（数字 10 字符串化）
    true,  // endsWith {{expectedStatus}} 模板变量
    false, // endsWith "1" 后缀不符
    false, // endsWith "JSON" 大小写敏感失败
    true,  // missing 路径 null/undefined 实际值视为空串（与 includes 口径一致）
    true,  // target:status equals 200
    false, // target:status equals 201
    true,  // header X-Total equals "42"
    true,  // header X-Missing exists:false
    true,  // header content-type matches
    true,  // from:vars min equals 5
    true,  // from:vars missing exists:false
    true,  // from:headers X-Total equals "42"
    true,  // from:headers X-Missing exists:false
    true,  // from:bodyText matches code
    true,  // from:bodyText equals 原始 JSON
    true,  // path code equals 200
    true,  // path nested.flag equals true
    true,  // each {lt:5} 对 items=[1,2,3]
    true,  // each {gte:10} 对 list=[10,20]
    false, // each {gt:15} 判别 vs includes：some 语义会因 20>15 通过，逐项语义必失败
    false, // each {equals:10} 第二项 20 不等
    false, // each 对非数组实际值（code=200）必失败——判别 vs gte（200>=0 会通过）
    false, // each 对 missing（undefined 非数组）必失败
    true,  // 嵌套 each {lt:5} 对 matrix=[[1,2],[3,4]]：全部元素通过
    false  // 嵌套 each {gt:3} 对 matrix：内层 [1,2] 首元素 1 不满足，判别内外层 any/some 语义假绿
];

test("断言求值极性：全部操作符逐条锁定 passed（含 includes/oneOf/exists 假绿回归）", () => {
    assert.equal(assertionCases.length, expectedPassed.length, "用例与期望值数量必须一致");
    assertionCases.forEach((definition, index) => {
        const result = nodeCore.evaluateAssertion(definition, response, runtime);
        assert.equal(
            result.passed,
            expectedPassed[index],
            `断言 ${JSON.stringify(definition)} 的 passed 应为 ${expectedPassed[index]}`
        );
    });
});

test("断言求值深比较语义：includes 数组不字符串化、oneOf 非数组必须失败、exists 空串为不存在、缺失模板变量解析为空串、null 实际值保留原始值", () => {
    // includes 数组深比较：actual=[10,20] 与 expected=2 类型/值均不匹配（历史假绿回归）
    const listIncludes = nodeCore.evaluateAssertion({ path: "list", includes: 2 }, response, runtime);
    assert.equal(listIncludes.passed, false);
    assert.deepEqual(listIncludes.actual, [10, 20]);

    // oneOf 非数组 expected：必须 FAIL 而非被跳过（historical 假绿）
    const oneOfNonArray = nodeCore.evaluateAssertion({ path: "code", oneOf: "{{vars.nonArray}}" }, response, runtime);
    assert.equal(oneOfNonArray.passed, false);
    assert.equal(oneOfNonArray.expected, "nope");

    // exists 空串视为不存在：actual="" 且 exists:false → 通过
    const existsEmpty = nodeCore.evaluateAssertion({ path: "empty", exists: false }, response, runtime);
    assert.equal(existsEmpty.passed, true);
    assert.equal(existsEmpty.actual, "");

    // startsWith 缺失模板变量：{{vars.missing}} 解析为空串（而非 "undefined"/"null" 字样），空前缀恒真
    const missingTemplate = nodeCore.evaluateAssertion({ path: "text", startsWith: "{{vars.missing}}" }, response, runtime);
    assert.equal(missingTemplate.passed, true);
    assert.equal(missingTemplate.expected, "");
    assert.equal(missingTemplate.actual, "abc");

    // 显式 null 实际值：按空串参与前缀比较，结果里保留原始 null（不偷换为字符串化结果）
    const nullActual = nodeCore.evaluateAssertion({ path: "nothing", startsWith: "x" }, response, runtime);
    assert.equal(nullActual.passed, false);
    assert.equal(nullActual.actual, null);
});

test("each 逐项断言：子断言数组与相对 path、空数组 every 语义、模板变量与非法形状 fail-fast", () => {
    const usersResponse = { status: 200, headers: {}, body: { users: [{ id: "a1", age: 20 }, { id: "b2", age: 30 }] }, bodyText: "" };

    // 子断言数组：每项需同时满足全部子断言；子断言 path 相对元素自身
    const multi = nodeCore.evaluateAssertion(
        { path: "users", each: [{ path: "id", matches: "^[ab]\\d$" }, { path: "age", gte: 18 }] },
        usersResponse,
        runtime
    );
    assert.equal(multi.passed, true);

    // 判别「对整体数组求值」vs「逐元素求值」：单个元素违规时必失败
    const badElement = nodeCore.evaluateAssertion(
        { path: "users", each: { path: "id", matches: "^[ab]\\d$" } },
        { ...usersResponse, body: { users: [{ id: "a1" }, { id: "B3" }] } },
        runtime
    );
    assert.equal(badElement.passed, false);

    // 空数组：every 语义恒通过（判别 vs includes/length 等「至少一项」误实现）
    const emptyList = nodeCore.evaluateAssertion(
        { path: "users", each: { exists: true } },
        { ...usersResponse, body: { users: [] } },
        runtime
    );
    assert.equal(emptyList.passed, true);

    // 子断言期望值支持 {{vars.*}} 模板变量
    const template = nodeCore.evaluateAssertion(
        { path: "users", each: { path: "age", gte: "{{vars.minAge}}" } },
        usersResponse,
        runtimeWith({ minAge: 18 })
    );
    assert.equal(template.passed, true);

    // 非数组实际值：断言失败而非抛异常（结果保留原始实际值）
    const nonArray = nodeCore.evaluateAssertion({ path: "nested", each: { exists: true } }, response, runtime);
    assert.equal(nonArray.passed, false);
    assert.deepEqual(nonArray.actual, { flag: true });

    // 非法形状定义期 fail-fast：非对象 / 数组含非对象项 / 子断言缺操作符，均抛 TypeError
    assert.throws(() => nodeCore.validateAssertion({ path: "users", each: "gte:18" }, {}), TypeError);
    assert.throws(() => nodeCore.validateAssertion({ path: "users", each: [{ equals: 1 }, "x"] }, {}), TypeError);
    assert.throws(() => nodeCore.validateAssertion({ path: "users", each: { notAnOperator: 1 } }, {}), TypeError);
});

test("each 失败明细：detail 透出失败元素下标与子断言结果，通过/非数组失败不携带", () => {
    // 失败极性：detail 存在且形状完整——失败元素 0 基下标、该元素值、全部子断言结果（含通过项）
    const failed = nodeCore.evaluateAssertion(
        { path: "users", each: [{ path: "id", matches: "^[ab]\\d$" }, { path: "age", gte: 18 }] },
        { status: 200, headers: {}, body: { users: [{ id: "a1", age: 20 }, { id: "B3", age: 22 }] }, bodyText: "" },
        runtime
    );
    assert.equal(failed.passed, false);
    assert.ok(Array.isArray(failed.detail), "each 失败时 detail 必须存在");
    assert.deepEqual(failed.detail.map((d) => d.index), [1], "仅失败元素计入明细，下标 0 基");
    assert.deepEqual(failed.detail[0].actual, { id: "B3", age: 22 });
    assert.equal(failed.detail[0].assertions.length, 2, "明细携带该元素全部子断言（含通过项）");
    const failedSubs = failed.detail[0].assertions.filter((sub) => !sub.passed);
    assert.equal(failedSubs.length, 1);
    assert.equal(failedSubs[0].expected, "^[ab]\\d$");
    assert.equal(failedSubs[0].actual, "B3");
    assert.equal(JSON.parse(JSON.stringify(failed)).detail[0].index, 1, "明细可 JSON 序列化（报告/工作台透出）");

    // 通过极性：detail 键不存在（而非仅 falsy），既有四字段形状保持不变
    const ok = nodeCore.evaluateAssertion(
        { path: "users", each: { path: "age", gte: 18 } },
        { status: 200, headers: {}, body: { users: [{ id: "a1", age: 20 }] }, bodyText: "" },
        runtime
    );
    assert.equal(ok.passed, true);
    assert.ok(!("detail" in ok), "通过时不得携带 detail 字段");
    assert.deepEqual(Object.keys(ok), ["name", "passed", "actual", "expected"], "通过时保持既有四字段形状");

    // 非数组实际值失败：无元素级明细（actual/expected 自身可定位），不挂 detail
    const nonArray = nodeCore.evaluateAssertion({ path: "code", each: { gte: 0 } }, response, runtime);
    assert.equal(nonArray.passed, false);
    assert.ok(!("detail" in nonArray), "非数组失败不携带 detail");

    // 嵌套 each：外层明细指向失败的外层元素，内层失败元素由子结果自身的 detail 描述
    const nested = nodeCore.evaluateAssertion(
        { path: "matrix", each: { each: { lt: 5 } } },
        { status: 200, headers: {}, body: { matrix: [[1, 2], [3, 9]] }, bodyText: "" },
        runtime
    );
    assert.equal(nested.passed, false);
    assert.deepEqual(nested.detail.map((d) => d.index), [1]);
    const inner = nested.detail[0].assertions[0];
    assert.equal(inner.passed, false);
    assert.deepEqual(inner.detail.map((d) => d.index), [1], "内层失败元素下标由内层 detail 描述");
    assert.equal(inner.detail[0].actual, 9);

    // buildAssertions 透传：步骤断言数组直接携带明细（报告 JSON 随 results.assertions 流出）
    const built = nodeCore.buildAssertions(
        { assertions: [{ path: "users", each: { path: "age", gte: 18 } }] },
        { status: 200, headers: {}, body: { users: [{ age: 15 }] }, bodyText: "" },
        runtime
    );
    assert.equal(built[0].passed, false);
    assert.ok(Array.isArray(built[0].detail));
});

test("buildAssertions 契约：step.status 简写与默认 2xx 注入", () => {
    const steps = [
        { name: "s1", status: 200, assertions: [{ path: "code", equals: 200 }] },
        { name: "s2", assertions: [{ path: "total", gte: 5 }] },
        { name: "s3" },
        { name: "s4", status: 201, assertions: [] },
        { name: "s5", status: 500, assertions: [{ path: "code", oneOf: [200, 201] }] }
    ];
    const expected = [2, 1, 1, 1, 2]; // s1: status+断言；s2: 仅断言；s3: 默认 2xx；s4: 仅 status；s5: status+断言
    steps.forEach((step, index) => {
        const results = nodeCore.buildAssertions(step, response, runtime, { stepName: step.name });
        assert.equal(results.length, expected[index], `步骤 ${step.name} 的断言数量不符`);
        results.forEach((item) => assert.equal(typeof item.passed, "boolean"));
    });
});

test("extract 契约：from 各来源 + status/header 简写 + required 语义", () => {
    const extractCases = [
        { name: "fromBodyPath", path: "code" },
        { name: "fromBodyWhole", path: "total" },
        { name: "fromBodyWholeNoPath" },
        { name: "fromHeadersPath", from: "headers", path: "X-Total" },
        { name: "fromHeadersWhole", from: "headers" },
        { name: "fromBodyText", from: "bodyText" },
        { name: "fromResponseStatus", from: "response", path: "status" },
        { name: "fromResponseHeaders", from: "response", path: "headers" },
        { name: "fromResponseBody", from: "response", path: "body.code" },
        { name: "statusTarget", target: "status" },
        { name: "headerItem", header: "Content-Type" },
        { name: "headerItemPath", header: "X-Total", path: "length" },
        { name: "missingRelaxed", path: "nope.deep" },
        { name: "missingRequired", path: "nope.deep", required: true },
        { name: "fromHeadersMissing", from: "headers", path: "X-Missing" },
        { name: "fromBodyTextMissing", from: "bodyText", path: "code" }
    ];
    for (const definition of extractCases) {
        const targetRuntime = runtimeWith();
        const result = nodeCore.applyExtract({ extract: [definition] }, response, targetRuntime);
        if (definition.required === true && definition.path === "nope.deep") {
            assert.equal(result.failures.length, 1, `extract ${definition.name} 应产生 failure`);
            assert.equal(result.warnings.length, 0);
        } else if (["missingRelaxed", "fromHeadersMissing", "fromBodyTextMissing"].includes(definition.name)) {
            assert.equal(result.warnings.length, 1, `extract ${definition.name} 应产生 warning`);
            assert.equal(result.failures.length, 0);
        } else {
            assert.equal(result.warnings.length, 0, `extract ${definition.name} 不应产生 warning`);
            assert.equal(result.failures.length, 0, `extract ${definition.name} 不应产生 failure`);
            assert.ok(definition.name in targetRuntime.vars, `extract ${definition.name} 应写入 vars`);
        }
    }
});

test("from:headers 配 path：头名大小写不敏感（与 header 简写口径一致）", () => {
    const ctx = { stepName: "头名大小写" };
    // HTTP/2 响应头全小写：path 任意大小写都应命中同一头（fixture 头键为 X-Total / Content-Type）
    const lower = nodeCore.evaluateAssertion({ from: "headers", path: "x-total", equals: "42" }, response, runtime, ctx);
    assert.equal(lower.passed, true);
    const upper = nodeCore.evaluateAssertion({ from: "headers", path: "X-TOTAL", exists: true }, response, runtime, ctx);
    assert.equal(upper.passed, true);
    // 判别 1：不实现（仍大小写敏感）时 x-total 取不到值，上行必失败
    // 判别 2：不存在的头不得因大小写折叠而误命中
    const missing = nodeCore.evaluateAssertion({ from: "headers", path: "x-missing", exists: false }, response, runtime, ctx);
    assert.equal(missing.passed, true);
    // 判别 3：大小写折叠仅限头名——body 路径仍精确匹配（body 键为 code，Code 必须取不到）
    const bodyCase = nodeCore.evaluateAssertion({ path: "Code", exists: true }, response, runtime, ctx);
    assert.equal(bodyCase.passed, false);
    // 回归：前导点路径（getByPath 接受 .key 形式）在头名折叠后剩余路径定位须正确
    assert.equal(nodeCore.getHeaderByPath(response.headers, ".x-total"), "42");
    assert.equal(nodeCore.getHeaderByPath(response.headers, ".X-TOTAL.length"), 2);
});

test("extract from:headers 配 path：头名大小写不敏感，通用 response 路径仍精确匹配", () => {
    const target = runtimeWith();
    const result = nodeCore.applyExtract(
        {
            extract: [
                { name: "lower", from: "headers", path: "x-total" },
                { name: "mixed", from: "headers", path: "CoNtEnT-tYpE" },
                { name: "deepOnValue", from: "headers", path: "X-TOTAL.length" },
                { name: "stillMissing", from: "headers", path: "X-Missing" },
                { name: "responseNavStillExact", from: "response", path: "headers.x-total" }
            ]
        },
        response,
        target
    );
    assert.equal(target.vars.lower, "42");
    assert.equal(target.vars.mixed, "application/json");
    assert.equal(target.vars.deepOnValue, 2);
    assert.equal(target.vars.stillMissing, undefined);
    // 边界：from:"response" 是通用路径导航，不套用头名折叠（本轮仅修正 from:"headers" 专用口径）
    assert.equal(target.vars.responseNavStillExact, undefined);
    assert.equal(result.failures.length, 0);
    assert.equal(result.warnings.length, 2); // stillMissing + responseNavStillExact
});

test("generatedVars 双端同源：浏览器 runtime 复用 core.applyGeneratedVar，不再自维护类型分支", () => {
    // 历史漂移回归防护：浏览器端曾缺 idcard/luhn/phone/uscc 四类型（工作台跑不了 CLI 能跑）。
    // 修复方式是把单定义赋值链收敛进 core.applyGeneratedVar——此处钉住结构，防重新分叉
    const source = fs.readFileSync(new URL("../src/browser/ui/runtime.js", import.meta.url), "utf8");
    assert.match(source, /core\.applyGeneratedVar\(/, "浏览器端必须调用 core.applyGeneratedVar");
    assert.equal(/def\.type === 'idcard'/.test(source), false, "runtime.js 不得再出现自维护的 idcard 分支");
    assert.equal(/def\.type === 'uscc'/.test(source), false, "runtime.js 不得再出现自维护的 uscc 分支");
    // 契约侧：所有声明类型均被 applyGeneratedVar 覆盖（走完一整链不抛「不支持」）
    const { contract } = nodeCore;
    for (const type of contract.generatedVars.types) {
        const vars = {};
        const identifiers = { runId: "parity-seed", runNo: "000001" };
        // 各类型最小合法定义（signature 依赖 vars 成员，给一个最小可用形态）
        const defs = {
            timestamp: { name: "x", type, offset: "0d" },
            uuid: { name: "x", type },
            uuidHex: { name: "x", type },
            idcard: { name: "x", type, birthDate: "1990-01-01", gender: "FEMALE", regionCode: "110101" },
            luhn: { name: "x", type },
            phone: { name: "x", type },
            uscc: { name: "x", type },
            md5: { name: "x", type, parts: [] },
            signature: { name: "x", type, params: {}, secretVar: "s" },
            enum: { name: "x", type, values: ["a", "b"] }
        };
        const definition = defs[type];
        if (!definition) throw new Error(`契约类型 ${type} 缺少 parity 探针定义`);
        if (type === "signature") vars.s = "secret";
        nodeCore.applyGeneratedVar(definition, vars, identifiers);
        assert.ok(vars.x !== undefined, `类型 ${type} 应产出 vars.x`);
    }
});

test("serve 代理 curl 头：同名头大小写不敏感覆盖，模板解析为外部绝对 URL 时不附带内部路由头", () => {
    const headers = { "X-Scenario-Test-Env": "local", "X-Other": "1" };
    applyCurlProxyHeaders(headers, "api/health?source=test", { "x-scenario-test-env": "prod" });
    assert.equal(headers["x-scenario-test-env"], "prod", "运行时路由头必须覆盖大小写不同的步骤同名头");
    assert.equal(headers["X-Scenario-Test-Env"], undefined, "不得同时保留大小写不同的同名头");
    assert.equal(Object.keys(headers).filter((key) => key.toLowerCase() === "x-scenario-test-env").length, 1);
    assert.equal(headers["X-Other"], "1");

    // 模板路径解析后是外部绝对 URL：即便声明了同名步骤头，也不注入本地环境路由头
    for (const absolutePath of ["https://external.example/api", "http://external.example/api", "//external.example/api"]) {
        const externalHeaders = { "X-Scenario-Test-Env": "local" };
        applyCurlProxyHeaders(externalHeaders, absolutePath, { "x-scenario-test-env": "prod" });
        assert.equal(externalHeaders["x-scenario-test-env"], undefined, `${absolutePath} 不应附带内部路由头`);
        assert.equal(externalHeaders["X-Scenario-Test-Env"], "local", "步骤自身同名头保持原样");
    }

    const direct = { "X-Trace": "t" };
    nodeCore.setHeaderValue(direct, "x-trace", "override");
    assert.deepEqual(direct, { "x-trace": "override" });
});

test("ui-utils：copyText 在无 DOM 的 Node 环境中返回 false", async () => {
    assert.equal(await copyText("测试内容"), false);
});

test("ui-utils：esc/fmt/safeJson 在无 DOM 环境可用且保留 legacy 语义", () => {
    assert.equal(esc("<b>&\"x\""), "&lt;b&gt;&amp;&quot;x&quot;");
    assert.equal(fmt(500), "500.00ms");
    assert.equal(fmt(1500), "1.50 s");
    assert.equal(fmt(Number.NaN), "-");
    assert.equal(safeJson({ a: 1 }), '{\n  "a": 1\n}');
    assert.equal(safeJson(undefined), undefined);
});
