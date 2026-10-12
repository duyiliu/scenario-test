import assert from "node:assert/strict";
import test from "node:test";
import { escapeInlineText, failureDiffLines, firstDifferenceLines, formatFailureValue, SHORT_VALUE_LIMIT } from "../src/utils/failure-diff.js";

test("短值返回空数组（保持既有单行 expected=... actual=... 格式）", () => {
    // 标量短值：不应产生任何分块行，调用方继续走单行输出
    assert.deepEqual(failureDiffLines(5, 9), []);
    assert.deepEqual(failureDiffLines("ok", "a\nb"), []);
    assert.deepEqual(failureDiffLines(true, undefined), []);
    // 双方均为 undefined/缺失：同样算短值
    assert.deepEqual(failureDiffLines(undefined, undefined), []);
    // 边界：序列化长度恰为上限算短值（不展开），超 1 字符即分块
    const boundary = "x".repeat(SHORT_VALUE_LIMIT - 2); // JSON.stringify 后含引号恰好 80
    assert.equal(JSON.stringify(boundary).length, SHORT_VALUE_LIMIT);
    const edgeLines = failureDiffLines(boundary, boundary + "y");
    assert.ok(!edgeLines.some((line) => line.includes("期望值（expected）")), "恰在上限的期望侧不展开");
    assert.ok(edgeLines.some((line) => line.includes("实际值（actual）")), "超上限的实际侧展开");
});

test("长值分块：仅超限一侧展开，短侧保持单行承载", () => {
    const longActual = "y".repeat(120);
    const lines = failureDiffLines("ok", longActual);
    assert.ok(lines.some((line) => line.includes("实际值（actual）")), "应有实际值分块标题");
    assert.ok(!lines.some((line) => line.includes("期望值（expected）")), "短侧不展开");
    // 长字符串按行拆分展示（无换行的长串单行 | 前缀）
    assert.ok(lines.some((line) => line.includes("| ") && line.includes("yyy")));
    // 单行格式化后的分块行仍不以 expected=/actual= 开头（避免与单行格式混淆）
    assert.ok(!lines.some((line) => /expected=|actual=/.test(line)));
});

test("多行字符串按真实换行拆行，行号 1 基对齐且行内容 JSON 转义", () => {
    // 行内容加长确保序列化超 80 触发分块（短多行串保持单行格式，见首条用例）
    const pad = "x".repeat(45);
    const expected = `line1-${pad}\nline2-${pad}\r\nline3-${pad}`;
    const actual = `line1-${pad}\nLINE2-${pad}\r\nline3-${pad}`;
    const lines = failureDiffLines(expected, actual, "");
    const numberLines = lines.filter((line) => line.includes("2 | "));
    assert.ok(numberLines.length >= 2, "期望/实际两侧应各有第 2 行内容行");
    // CRLF 作为行分隔符被消费（与终端渲染一致），行内容干净不再含 \r；
    // 不可见字符差异体现在别处：见下方「末尾 \r」用例
    assert.ok(numberLines.every((line) => !line.includes("\\r")), "行内容不应残留 \r");
    assert.ok(numberLines.some((line) => /line2-/.test(line)), "期望侧第 2 行为小写 line2");
    assert.ok(numberLines.some((line) => /LINE2/.test(line)), "实际侧第 2 行为大写 LINE2");
    // 两侧均为字符串：给首个差异定位（共同前缀 52 字符后 line2/LINE2 起异）
    assert.ok(lines.some((line) => line.includes("首个差异在第 53 个字符")), "应有首个差异定位行");
    assert.ok(lines.some((line) => line.includes("«l»") || line.includes("«L»")), "差异字符应以«»标注");
    // 长度信息以 vs 呈现（本例两串等长）
    assert.ok(lines.some((line) => line.includes("长度 156 vs 156")), "长度信息以 vs 呈现");
});

test("末尾不可见字符差异可见：actual 多出的 \\r 拆出空行，行数差异暴露差异", () => {
    // expected 无末尾 \r（1 行）、actual 有（拆成 2 行，第 2 行为空）——
    // 「看起来一样其实含 \r」的差异通过分块行数与空行行可见，这正是行内容转义拆行的价值
    const pad = "y".repeat(80);
    const lines = failureDiffLines(`ok-${pad}`, `ok-${pad}\r`, "");
    const expectedBlock = lines.findIndex((line) => line.includes("期望值（expected）"));
    const actualBlock = lines.findIndex((line) => line.includes("实际值（actual）"));
    assert.ok(expectedBlock >= 0 && actualBlock > expectedBlock, "两侧均展开且期望块在前");
    // 期望块 1 行内容（ok-…），实际块 2 行（第 2 行为空）
    const expectedContent = lines.slice(expectedBlock, actualBlock).filter((line) => line.includes("| "));
    assert.equal(expectedContent.length, 1, "期望块应恰好 1 行内容");
    assert.ok(lines.slice(actualBlock).filter((line) => line.includes("| ")).some((line) => /\| $/.test(line)), "实际块应有末尾空行");
});

test("字符串首个差异定位：行数、窗口截断、相同前缀计算", () => {
    // 完整覆盖：差异在末尾且总长小于窗口，无省略号
    const lines = firstDifferenceLines("abcdef", "abcxef", "  ");
    assert.equal(lines.length, 3);
    assert.match(lines[0], /首个差异在第 4 个字符（长度 6 vs 6）/);
    assert.match(lines[1], /期望 abc«d»ef/);
    assert.match(lines[2], /实际 abc«x»ef/);
    assert.ok(lines[1].startsWith("  ↑ 期望 "), "prefix 应作用于每行行首");
    // 超窗口截断：200+1 字符串，窗口 40 只能看到末尾附近，左省略号、右无（差异即末字符）
    const long = "a".repeat(200) + "1";
    const longLines = firstDifferenceLines(long, long.slice(0, -1) + "2", "");
    assert.match(longLines[1], /…a+«1»$/);
    assert.equal(longLines.length, 3);
    // 非字符串或相同字符串不产生定位行
    assert.deepEqual(firstDifferenceLines(5, 9, ""), []);
    assert.deepEqual(firstDifferenceLines("same", "same", ""), []);
    // 一方 undefined（对象值场景）：不产生定位行
    assert.deepEqual(firstDifferenceLines("abc", undefined, ""), []);
});

test("复杂结构长值：对象/数组两空格缩进展开，超 20 行截断", () => {
    const bigObject = { data: Array.from({ length: 30 }, (_, index) => ({ id: index, name: `item-${index}` })) };
    const lines = failureDiffLines({ id: 1 }, bigObject);
    // 短侧对象 { id: 1 } 序列化 9 字符，不展开；长侧展开
    assert.ok(lines.some((line) => line.includes("实际值（actual）")));
    // pretty JSON 缩进展开可读：应包含键名行
    assert.ok(lines.some((line) => line.includes('"name"')));
    // 超过 20 行截断并提示总行数
    assert.ok(lines.some((line) => line.includes("已截断")), "应有截断提示");
});

test("each 明细 prefix 对齐：分块行带缩进前缀", () => {
    const longActual = "z".repeat(100);
    const lines = failureDiffLines("ok", longActual, "      ");
    for (const line of lines) {
        assert.ok(line.startsWith("      "), `分块行应带 6 空格前缀: ${JSON.stringify(line.slice(0, 12))}`);
    }
});

test("循环引用等无法序列化的值回落 String() 不抛错", () => {
    const circular = { a: 1 };
    circular.self = circular;
    const lines = failureDiffLines({ ok: true }, circular);
    assert.ok(lines.length > 0, "应产生分块输出");
    assert.ok(lines.some((line) => line.includes("[object Object]")), "循环引用对象应降级为 String() 输出");
});

test("多行字符串超过 MAX_LINES 时截断并显示总行数", () => {
    const longMultiline = Array.from({ length: 25 }, (_, i) => `line-${i + 1}-padding-to-exceed-short-limit`).join("\n");
    const lines = failureDiffLines(longMultiline, "short");
    assert.ok(lines.some((line) => line.includes("共 25 行，已截断")), "应显示截断提示与总行数");
    const contentLines = lines.filter((line) => line.includes("| line-"));
    assert.ok(contentLines.length === 20, `应只展示前 20 行内容，实际: ${contentLines.length}`);
});

test("对象/数组超过 MAX_LINES 时截断", () => {
    const deepArray = Array.from({ length: 30 }, (_, i) => ({ index: i, padding: "x".repeat(10) }));
    const lines = failureDiffLines(deepArray, []);
    assert.ok(lines.some((line) => line.includes("共") && line.includes("行，已截断")), "应显示截断提示");
});

test("formatFailureValue：短值保持旧输出，长值降级固定占位", () => {
    assert.equal(formatFailureValue("ok"), '"ok"');
    assert.equal(formatFailureValue(5), "5");
    assert.equal(formatFailureValue(null), "null");
    assert.equal(formatFailureValue(undefined), "undefined");
    const boundary = "x".repeat(SHORT_VALUE_LIMIT - 2);
    assert.equal(formatFailureValue(boundary), JSON.stringify(boundary));
    assert.equal(formatFailureValue("x".repeat(SHORT_VALUE_LIMIT - 1)), "（长值，见下方）");
    const circular = { a: 1 };
    circular.self = circular;
    assert.equal(formatFailureValue(circular), "（长值，见下方）");
    assert.equal(formatFailureValue(10n), "（长值，见下方）");
    assert.equal(formatFailureValue(Symbol("s")), "Symbol(s)");
    assert.equal(formatFailureValue(function fn() {}), "function fn() {}");
});

test("超长单行内容按 240 字符截断（不计调用方 prefix），截断标记占宽", () => {
    const long = "a".repeat(20000);
    const lines = failureDiffLines("no", long, "    ");
    const contentLines = lines.filter((line) => line.includes("| "));
    assert.ok(contentLines.length >= 1, "应有字符串分块内容行");
    for (const line of contentLines) {
        assert.ok(line.length <= 240 + 4, `内容行（不计 prefix）应 ≤240，实际 ${line.length}`);
        assert.ok(line.includes("（本行已截断）"), "截断行应带截断标记");
    }
    assert.ok(!lines.some((line) => line.includes(long)), "完整 20k 值不得出现在任何输出行");
});

test("对象内超长字段同样限宽 240，截断标记可见", () => {
    const big = { id: 1, text: "a".repeat(20000) };
    const lines = failureDiffLines("no", big, "");
    const wide = lines.filter((line) => line.includes("aaaa"));
    assert.ok(wide.length >= 1, "应有含长字段内容的行");
    for (const line of wide) {
        assert.ok(line.length <= 240, `pretty JSON 行应 ≤240，实际 ${line.length}`);
    }
    assert.ok(wide.some((line) => line.includes("（本行已截断）")), "被截断的长字段行应带截断标记");
    assert.ok(lines.some((line) => line.includes('"id": 1')), "短字段行保持原样");
});

test("首差异在长字符串尾部时仍按原文定位真实索引与字符", () => {
    const expected = "a".repeat(20000);
    const actual = "a".repeat(19999) + "b";
    const lines = failureDiffLines(expected, actual, "");
    assert.ok(lines.some((line) => line.includes("首个差异在第 20000 个字符")), "差异索引应按未截断原文计算");
    assert.ok(lines.some((line) => line.includes("«b»")), "差异字符应高亮");
    assert.ok(lines.some((line) => line.includes("长度 20000 vs 20000")), "长度信息应按原文呈现");
});

test("escapeInlineText：Unicode 行分隔符 U+2028/U+2029 与 C1 控制符折叠为字面量", () => {
    // JSON.stringify 不转义 U+2028/U+2029，支持它们的终端会把其渲染为新行——
    // 破坏「换行折字面量」不变量，可伪造报告行/CI 命令行，必须补 \uXXXX 转义
    const out = escapeInlineText("a\u2028b\u2029c");
    assert.equal(out, "a\\u2028b\\u2029c");
    assert.ok(!out.includes("\u2028") && !out.includes("\u2029"), "原文不得残留真实行分隔符");
    // C1 控制符（含 8 位 CSI）同口径
    assert.equal(escapeInlineText("x\u009b]31m"), "x\\u009b]31m");
    // 常规字符原样透出
    assert.equal(escapeInlineText("plain-text"), "plain-text");
});
