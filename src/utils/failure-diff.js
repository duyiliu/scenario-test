// CLI run 失败断言的 diff 视图：短值保持单行 expected=... actual=...（55a5df3 既有口径）。
// 两侧均超限且同为字符串/同为结构值时升级为行级对齐 hunk（GH-10）：仅展开差异行 ±2 行
// 上下文，- 标注期望行、+ 标注实际行、空格标注上下文行（类 diff 工具），hunk 之间以省略
// 提示行分隔；类型不同/规模超护栏/无行级差异时退回既有逐侧分块：字符串按真实换行拆行
// （行内容 JSON 转义防 CRLF 与不可见字符打乱终端对齐）、对象/数组两空格缩进展开，行数
// 超限截断；字符串值额外定位首个差异字符（1 基）并给出前后上下文窗口。本模块纯格式化、
// 无 I/O，供 cli.js 输出层调用。

// 短值上限：序列化长度 ≤ 该值的 expected/actual 保持既有单行格式
export const SHORT_VALUE_LIMIT = 80;
// 分块展开的最大行数，超出截断（完整值可经编程接口 runScenario 返回的断言结果获取）
const MAX_LINES = 20;
// hunk 上下文：每个差异行前后各保留的相同行数（类 diff 工具的 hunk 口径）
const HUNK_CONTEXT = 2;
// 行级 LCS 对齐的规模护栏：对齐中段规模（行数乘积）或两侧总行数超限时退回逐侧分块，
// 防止病态输入（两侧上千行且几乎全不同）造成 O(n·m) 动态规划的内存/耗时失控
const MAX_DIFF_CELLS = 4000000;
const MAX_DIFF_TOTAL_LINES = 200000;
// hunk 之间被跳过的相同行的提示行
const HUNK_SKIPPED_MARK = "…（中间相同行已省略）";
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

// JSON.stringify 不转义 C1 控制字符（\x7f-\x9f，含 8 位 CSI U+009B）与 Unicode 行分隔符
// （U+2028 LINE SEPARATOR / U+2029 PARAGRAPH SEPARATOR——支持它们的终端会把其渲染成
// 新行，破坏「换行折字面量」不变量）。统一补 \uXXXX 字面转义
export function escapeC1(text) {
    return text.replace(/[\x7f-\x9f\u2028\u2029]/g, (c) => `\\u${c.charCodeAt(0).toString(16).padStart(4, "0")}`);
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

// 字符串原始行的转义：行内容 JSON 转义，CR/控制字符/不可见字符均以字面量透出，
// 避免终端把 CRLF 渲染成断行破坏对齐，也让「看起来一样其实含 \r」的差异可见
function escapeStringLineContent(line) {
    return defuseCiCommandMarkers(escapeC1(JSON.stringify(line).slice(1, -1)));
}

// pretty JSON 行的转义：行本身已是 JSON 源码文本，仅补控制字符与 CI 命令标记转义
function escapeJsonLineContent(line) {
    return defuseCiCommandMarkers(escapeC1(line));
}

// 字符串值分块：按真实换行拆行（含转义字符的 JSON 形态），行号 1 基右侧对齐
// （示例：  12 | abc）
function splitStringLines(text, prefix) {
    const raw = String(text).split(/\r\n|\n|\r/);
    const width = String(raw.length).length;
    return raw.map((line, index) => `${prefix}${String(index + 1).padStart(width)} | ${escapeStringLineContent(line)}`);
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
    const lines = text.split("\n").map(escapeJsonLineContent);
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
// 两侧均超限且同为字符串/同为结构值：行级对齐 hunk（仅展开差异行 ±2 行上下文），比
// 逐侧全量展开显著省行；不适合对齐（类型不同/规模超护栏/无行级差异）退回既有逐侧分块。
// prefix 用于 each 明细缩进对齐。
export function failureDiffLines(expected, actual, prefix = "") {
    if (isShortValue(expected) && isShortValue(actual)) return [];
    const lines = [];
    const bothLong = !isShortValue(expected) && !isShortValue(actual);
    const aligned = bothLong ? alignedDiffLines(expected, actual, prefix) : null;
    if (aligned) {
        lines.push(...aligned);
    } else {
        if (!isShortValue(expected)) {
            lines.push(`${prefix}  期望值（expected）:`);
            lines.push(...expandValueLines(expected, `${prefix}    `, prefix.length));
        }
        if (!isShortValue(actual)) {
            lines.push(`${prefix}  实际值（actual）:`);
            lines.push(...expandValueLines(actual, `${prefix}    `, prefix.length));
        }
    }
    // 仅当 expected/actual 均为字符串（最常见：bodyText/长文案比对）时给首个差异定位
    lines.push(...firstDifferenceLines(
        typeof expected === "string" ? expected : undefined,
        typeof actual === "string" ? actual : undefined,
        `${prefix}  `
    ));
    return lines;
}

// 值拆为原始行（未转义）：与既有分块同口径——字符串按真实换行拆行；其余值 pretty JSON，
// 循环引用等无法序列化的值回落 String()
function valueToRawLines(value, isStringValue) {
    if (isStringValue) return String(value).split(/\r\n|\n|\r/);
    let text;
    try {
        text = JSON.stringify(value, null, 2) ?? String(value);
    } catch {
        text = String(value);
    }
    return text.split("\n");
}

// 行级 LCS 对齐：先修剪公共前后缀，再对中段做 O(n·m) 动态规划。
// 返回 ops 数组：{ t: "=", e, a } 公同行 / { t: "-", e } 期望独有行 / { t: "+", a } 实际独有行
// （e/a 为 0 基行号）；规模超护栏返回 null，调用方退回逐侧分块
function diffLineOps(expectedLines, actualLines) {
    if (expectedLines.length + actualLines.length > MAX_DIFF_TOTAL_LINES) return null;
    let start = 0;
    const minLines = Math.min(expectedLines.length, actualLines.length);
    while (start < minLines && expectedLines[start] === actualLines[start]) start += 1;
    let endA = expectedLines.length;
    let endB = actualLines.length;
    while (endA > start && endB > start && expectedLines[endA - 1] === actualLines[endB - 1]) {
        endA -= 1;
        endB -= 1;
    }
    const midA = endA - start;
    const midB = endB - start;
    if ((midA + 1) * (midB + 1) > MAX_DIFF_CELLS) return null;
    const ops = [];
    for (let i = 0; i < start; i += 1) ops.push({ t: "=", e: i, a: i });
    // lcs[i][j]：expectedLines[start+i..endA) 与 actualLines[start+j..endB) 的 LCS 长度（后缀表，
    // 一维压缩按行步进）；Int32 足以容纳 ≤ MAX_DIFF_TOTAL_LINES/2 的长度
    const stride = midB + 1;
    const lcs = new Int32Array((midA + 1) * stride);
    for (let i = midA - 1; i >= 0; i -= 1) {
        for (let j = midB - 1; j >= 0; j -= 1) {
            lcs[i * stride + j] = expectedLines[start + i] === actualLines[start + j]
                ? lcs[(i + 1) * stride + (j + 1)] + 1
                : Math.max(lcs[(i + 1) * stride + j], lcs[i * stride + (j + 1)]);
        }
    }
    let i = 0;
    let j = 0;
    while (i < midA && j < midB) {
        if (expectedLines[start + i] === actualLines[start + j]) {
            ops.push({ t: "=", e: start + i, a: start + j });
            i += 1;
            j += 1;
        } else if (lcs[(i + 1) * stride + j] >= lcs[i * stride + (j + 1)]) {
            // 平局优先删期望行：被替换行呈现为相邻的 -/+ 对
            ops.push({ t: "-", e: start + i });
            i += 1;
        } else {
            ops.push({ t: "+", a: start + j });
            j += 1;
        }
    }
    while (i < midA) {
        ops.push({ t: "-", e: start + i });
        i += 1;
    }
    while (j < midB) {
        ops.push({ t: "+", a: start + j });
        j += 1;
    }
    for (let k = 0; k < expectedLines.length - endA; k += 1) ops.push({ t: "=", e: endA + k, a: endB + k });
    return ops;
}

// 行级对齐视图（hunk）：仅展开差异行 ±HUNK_CONTEXT 行上下文，- 期望行 / + 实际行 /
// 空格上下文行；相邻差异之间相同行 ≤ 2×HUNK_CONTEXT 时上下文重叠，合并为一个 hunk，
// 否则以省略提示行分隔。行号列宽按本次输出的最大行号计算，缺失侧补空格保持对齐。
// 返回 null 表示不适合行级对齐（类型不同/规模超护栏/无行级差异），调用方退回逐侧分块
function alignedDiffLines(expected, actual, prefix) {
    const bothStrings = typeof expected === "string" && typeof actual === "string";
    if (!bothStrings && !(typeof expected !== "string" && typeof actual !== "string")) return null;
    const expectedLines = valueToRawLines(expected, bothStrings);
    const actualLines = valueToRawLines(actual, bothStrings);
    const ops = diffLineOps(expectedLines, actualLines);
    if (!ops) return null;
    const groups = [];
    let previousChange = -1;
    for (let index = 0; index < ops.length; index += 1) {
        if (ops[index].t === "=") continue;
        if (groups.length === 0 || index - previousChange - 1 > HUNK_CONTEXT * 2) {
            groups.push({ from: index, to: index });
        } else {
            groups[groups.length - 1].to = index;
        }
        previousChange = index;
    }
    if (groups.length === 0) return null;
    // 展开 ±2 上下文窗口（钳制到边界）；hunk 之间插入省略提示行占位（null）
    const rendered = [];
    groups.forEach((group, groupIndex) => {
        if (groupIndex > 0) rendered.push(null);
        const from = Math.max(0, group.from - HUNK_CONTEXT);
        const to = Math.min(ops.length - 1, group.to + HUNK_CONTEXT);
        for (let index = from; index <= to; index += 1) rendered.push(ops[index]);
    });
    let expectedWidth = 1;
    let actualWidth = 1;
    for (const op of rendered) {
        if (!op) continue;
        if (op.e !== undefined) expectedWidth = Math.max(expectedWidth, String(op.e + 1).length);
        if (op.a !== undefined) actualWidth = Math.max(actualWidth, String(op.a + 1).length);
    }
    // 公共行的内容取期望侧（两侧原始行相等，转义后一致）；字符串/JSON 行用各自转义口径
    const escapeContent = bothStrings ? escapeStringLineContent : escapeJsonLineContent;
    const lines = [`${prefix}  行级差异（仅展开差异行 ±${HUNK_CONTEXT} 行上下文，- 期望行 / + 实际行）:`];
    for (const op of rendered) {
        if (!op) {
            lines.push(`${prefix}    ${HUNK_SKIPPED_MARK}`);
            continue;
        }
        const expectedCell = op.e === undefined ? " ".repeat(expectedWidth) : String(op.e + 1).padStart(expectedWidth);
        const actualCell = op.a === undefined ? " ".repeat(actualWidth) : String(op.a + 1).padStart(actualWidth);
        const content = op.t === "+" ? escapeContent(actualLines[op.a]) : escapeContent(expectedLines[op.e]);
        lines.push(capContentLine(`${prefix}    ${op.t === "=" ? " " : op.t} ${expectedCell} ${actualCell} | ${content}`, prefix.length));
    }
    // 输出总量保留 20 行截断兜底（完整值可经编程接口 runScenario 返回的断言结果获取）
    if (lines.length > MAX_LINES) {
        const total = lines.length;
        return [...lines.slice(0, MAX_LINES), `${prefix}    …（共 ${total} 行，已截断）`];
    }
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
