import assert from "node:assert/strict";
import test from "node:test";
import { resolveString, resolve, collectMissingTemplateVars } from "../src/core.js";

// Issue #112：整串模板正则用 .+? 吞掉中间的 }}，把多个模板当成一个表达式求值，
// 结果 undefined → 空串。完全由模板拼接的 path/header/body 会静默变成空串。
test("#112：整串多模板按拼接解析，不再被吞成单个表达式", () => {
    const runtime = { vars: { a: "users", b: "42", c: "detail" } };
    assert.equal(resolveString("{{vars.a}}/{{vars.b}}", runtime), "users/42");
    assert.equal(resolveString("{{vars.a}}-{{vars.b}}", runtime), "users-42");
    assert.equal(resolveString("{{vars.a}}/{{vars.b}}/{{vars.c}}", runtime), "users/42/detail");
    // 带外层空白与紧凑写法
    assert.equal(resolveString("  {{vars.a}}/{{vars.b}}  ", runtime), "  users/42  ");
    assert.equal(resolveString("{{vars.a}}{{vars.b}}", runtime), "users42");
    // 单模板快速路径保持原语义：非字符串值按原值返回（数字不转字符串）
    assert.equal(resolveString("{{vars.b}}", runtime), "42");
});

test("#112：整串单模板保留原类型，多模板拼接对象/数字按字符串化规则", () => {
    const runtime = { vars: { user: { id: 7 }, n: 42 } };
    assert.deepEqual(resolveString("{{vars.user}}", runtime), { id: 7 });
    // 多模板拼接走 replace 分支：对象 JSON 化、数字字符串化、缺失变空串
    assert.equal(resolveString("{{vars.user}}/{{vars.n}}", runtime), '{"id":7}/42');
    assert.equal(resolveString("{{vars.missing}}/{{vars.n}}", runtime), "/42");
    // 嵌套 resolve 与 resolveString 同口径
    assert.deepEqual(resolve({ path: "{{vars.user}}/{{vars.n}}", list: ["{{vars.n}}x"] }, runtime), { path: '{"id":7}/42', list: ["42x"] });
});

test("#121：{{suite.x}} 不再误报 vars.suite 未定义", () => {
    const missing = collectMissingTemplateVars(
        { path: "/u/{{suite.token}}/{{vars.missing}}", header: "{{suite}}", other: "{{suiteVars.token}}" },
        {}
    );
    assert.deepEqual([...missing].sort(), ["missing", "suiteVars"]);
});
