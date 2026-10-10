// CLI run 失败断言的 diff 视图：短值保持单行 expected=... actual=...（55a5df3 既有口径），
// 长值/多行字符串/复杂结构降级为可读分块：字符串按真实换行拆行（行内容 JSON 转义防 CRLF
// 与不可见字符打乱终端对齐）、对象/数组两空格缩进展开，行数超限截断；字符串值额外定位
// 首个差异字符（1 基）并给出前后上下文窗口。本模块纯格式化、无 I/O，供 cli.js 输出层调用。

// 短值上限：序列化长度 ≤ 该值的 expected/actual 保持既有单行格式
export const SHORT_VALUE_LIMIT = 80;
// 分块展开的最大行数，超出截断（完整值可经编程接口 runScenario 返回的断言结果获取）
const MAX_LINES = 20;
// 字符串差异定位的上下文窗口：首个差异字符前后各保留的字符数
const CONTEXT_RADIUS = 40;
const MAX_LINE_WIDTH = 240;
const LINE_TRUNCATED_MARK = "…（本行已截断）";

function isPlainObject(value) {
    return value !== null && typeof value === "object" && !Array.isArray(value);
}

// 单值是否适合单行展示：undefined/null/标量/短序列化均算短；超长字符串与复杂结构走分块
function isShortValue(value) {
    if (value === undefined) return true;
    try {
        const serialized = JSON.stringify(value ?? null) ?? String(value);
        return serialized.length <= SHORT_VALUE_LIMIT;
    } catch {
        // 循环引用等无法序列化的值视为长值，走分块路径（prettyLines 的 catch 会回落 String）
        return false;
    }
}

export function formatFailureValue(value) {
    if (!isShortValue(value)) return "（长值，见下方）";
    return JSON.stringify(value) ?? String(value);
}

// 字符串值分块：按真实换行拆行（含转义字符的 JSON 形态），行号 1 基右侧对齐
// （示例：  12 | abc）。行内容经 JSON.stringify 转义，CR/控制字符/不可见字符均以字面量透出，
// 避免终端把 CRLF 渲染成断行破坏对齐，也让「看起来一样其实含 \r」的差异可见。
function splitStringLines(text, prefix) {
    const raw = String(text).split(/\r\n|\n|\r/);
    const width = String(raw.length).length;
    return raw.map((line, index) => `${prefix}${String(index + 1).padStart(width)} | ${JSON.stringify(line).slice(1, -1)}`);
}

// 非字符串值（对象/数组/数字等）分块：pretty JSON 逐行，行数超限截断并提示
function prettyLines(value) {
    let text;
    try {
        text = JSON.stringify(value, null, 2) ?? String(value);
    } catch {
        // 循环引用等极端值：回落 String，保证输出永不因格式化本身抛错
        text = String(value);
    }
    const lines = text.split("\n");
    if (lines.length > MAX_LINES) {
        return [
            ...lines.slice(0, MAX_LINES),
            `…（共 ${lines.length} 行，已截断）`
        ];
    }
    return lines;
}

// 首个差异定位：仅对 expected/actual 均为字符串且不等时计算，返回多行定位块（无差异返回空数组）
// 输出形如：
//   ↑ 首个差异在第 3 个字符（长度 12 vs 15）：
//   ↑ 期望 …abc«d»efg…
//   ↑ 实际 …abc«X»efg…
// 差异字符用 «» 包裹，两侧各留 CONTEXT_RADIUS 字符窗口；超长时省略号提示
export function firstDifferenceLines(expected, actual, prefix) {
    if (typeof expected !== "string" || typeof actual !== "string" || expected === actual) return [];
    const maxLength = Math.max(expected.length, actual.length);
    let index = 0;
    while (index < maxLength && expected[index] === actual[index]) {
        index += 1;
    }
    // 差异定位块固定 3 行，不参与截断；窗口内字符经 JSON.stringify 转义保证单行宽度可控
    const window = (text) => {
        const start = Math.max(0, index - CONTEXT_RADIUS);
        const end = Math.min(text.length, index + CONTEXT_RADIUS);
        const head = start > 0 ? "…" : "";
        const tail = end < text.length ? "…" : "";
        // 三段分别转义后再拼接：整体转义会让 \n 等字符膨胀为两字符，使高亮偏移漂移错位
        const escape = (part) => JSON.stringify(part).slice(1, -1);
        return `${head}${escape(text.slice(start, index))}«${escape(text.slice(index, index + 1))}»${escape(text.slice(index + 1, end))}${tail}`;
    };
    return [
        `${prefix}↑ 首个差异在第 ${index + 1} 个字符（长度 ${expected.length} vs ${actual.length}）：`,
        `${prefix}↑ 期望 ${window(expected)}`,
        `${prefix}↑ 实际 ${window(actual)}`
    ];
}

// 断言失败 diff 视图的统一入口：返回行数组（不直接打印，测试可对行级断言）。
// 短值：返回空数组，由调用方继续用既有单行 expected=... actual=... 格式；
// 长值：返回 expected/actual 分块 + 字符串差异定位块。prefix 用于 each 明细缩进对齐。
export function failureDiffLines(expected, actual, prefix = "") {
    if (isShortValue(expected) && isShortValue(actual)) return [];
    const lines = [];
    if (!isShortValue(expected)) {
        lines.push(`${prefix}  期望值（expected）:`);
        lines.push(...expandValueLines(expected, `${prefix}    `, prefix.length));
    }
    if (!isShortValue(actual)) {
        lines.push(`${prefix}  实际值（actual）:`);
        lines.push(...expandValueLines(actual, `${prefix}    `, prefix.length));
    }
    // 仅当 expected/actual 均为字符串（最常见：bodyText/长文案比对）时给首个差异定位
    lines.push(...firstDifferenceLines(
        typeof expected === "string" ? expected : undefined,
        typeof actual === "string" ? actual : undefined,
        `${prefix}  `
    ));
    return lines;
}

// 值展开为行：多行字符串用 | 前缀逐行，其余 pretty JSON；行数超限截断
function expandValueLines(value, prefix, baseLength) {
    if (typeof value === "string") {
        const lines = splitStringLines(value, `${prefix}| `).map((line) => capContentLine(line, baseLength));
        if (lines.length > MAX_LINES) {
            return [
                ...lines.slice(0, MAX_LINES),
                `${prefix}…（共 ${lines.length} 行，已截断）`
            ];
        }
        return lines;
    }
    return prettyLines(value).map((line) => capContentLine(`${prefix}${line}`, baseLength));
}

function capContentLine(line, baseLength) {
    if (line.length <= baseLength + MAX_LINE_WIDTH) return line;
    return `${line.slice(0, baseLength + MAX_LINE_WIDTH - LINE_TRUNCATED_MARK.length)}${LINE_TRUNCATED_MARK}`;
}
