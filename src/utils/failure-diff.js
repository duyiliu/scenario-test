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

// JSON.stringify 不转义 C1 控制字符（\x7f-\x9f，含 8 位 CSI U+009B）——服务端可控值
// （响应字段断言失败的 actual 等）原样透出仍会带裸 C1 进终端，统一补 \uXXXX 字面转义
export function escapeC1(text) {
    return text.replace(/[\x7f-\x9f]/g, (c) => `\\u${c.charCodeAt(0).toString(16).padStart(4, "0")}`);
}

// CI 工作流命令标记：GitHub Actions 旧格式 ##[、Azure DevOps ##vso[、TeamCity ##teamcity[
// 由 Runner 按整行 IndexOf 识别（而非行首），JSON 引号与缩进都挡不住——必须把标记
// 字节序本身打散：末尾 [ 转写为 unicode 转义形态（人类可读，Runner 无法识别）。
// GitHub 新格式 ::xxx:: 是行首识别，不在此处处理（见 cli.js escapeBodyLine）
const CI_COMMAND_MARKER = /##\[|##vso\[|##teamcity\[/gi;
export function defuseCiCommandMarkers(text) {
    return String(text).replace(CI_COMMAND_MARKER, (m) => `${m.slice(0, -1)}\\u005b`);
}

// 行内插值的可控文本（服务端响应内容、适配器返回值、错误消息等）：换行/控制
// 字符折为字面量防注入新行，CI 命令标记打散；不保留引号（行内已有上下文包裹）。
// cli.js / engine.js / registry.js 的诊断输出共用同一防线
export function escapeInlineText(value) {
    return escapeC1(defuseCiCommandMarkers(JSON.stringify(String(value ?? "")).slice(1, -1)));
}

export function formatFailureValue(value) {
    if (!isShortValue(value)) return "（长值，见下方）";
    return defuseCiCommandMarkers(escapeC1(JSON.stringify(value) ?? String(value)));
}

// 字符串值分块：按真实换行拆行（含转义字符的 JSON 形态），行号 1 基右侧对齐
// （示例：  12 | abc）。行内容经 JSON.stringify 转义，CR/控制字符/不可见字符均以字面量透出，
// 避免终端把 CRLF 渲染成断行破坏对齐，也让「看起来一样其实含 \r」的差异可见。
function splitStringLines(text, prefix) {
    const raw = String(text).split(/\r\n|\n|\r/);
    const width = String(raw.length).length;
    return raw.map((line, index) => `${prefix}${String(index + 1).padStart(width)} | ${defuseCiCommandMarkers(escapeC1(JSON.stringify(line).slice(1, -1)))}`);
}

// 非字符串值（对象/数组/数字等）分块：pretty JSON 逐行，行数超限截断并提示
function prettyLines(value) {
    let text;
    try {
        text = defuseCiCommandMarkers(escapeC1(JSON.stringify(value, null, 2) ?? String(value)));
    } catch {
        // 循环引用等极端值：回落 String，保证输出永不因格式化本身抛错
        text = defuseCiCommandMarkers(String(value));
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
        const escape = (part) => defuseCiCommandMarkers(escapeC1(JSON.stringify(part).slice(1, -1)));
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
