// 有界字段差异证据；不复制整棵响应树，不改变断言判定。
export function structuralDiff(expected, actual) {
    const entries = [];
    let visited = 0;
    let truncated = false;
    const type = (v) => v === null ? "null" : Array.isArray(v) ? "array" : typeof v;
    const preview = (v) => {
        if (Array.isArray(v)) return `Array(length ${v.length})`;
        if (v && typeof v === "object") return "Object";
        return typeof v === "string" && v.length > 240 ? "（长字符串已省略）" : v;
    };
    function walk(a, b, path, depth, hasA = true, hasB = true) {
        if (path.length > 2000 || ++visited > 2000 || entries.length >= 50 || depth > 30) { truncated = true; return; }
        if (hasA && hasB && Object.is(a, b)) return;
        const at = type(a), bt = type(b);
        if (hasA && hasB && at === bt && (at === "object" || at === "array")) {
            // 迭代器按预算停止，避免先复制超大键集合。
            for (const key in a) {
                if (!Object.hasOwn(a, key)) continue;
                walk(a[key], b[key], path + (at === "array" ? `[${key}]` : `[${JSON.stringify(key)}]`), depth + 1, true, Object.hasOwn(b, key));
                if (truncated) return;
            }
            for (const key in b) {
                if (!Object.hasOwn(b, key) || Object.hasOwn(a, key)) continue;
                walk(undefined, b[key], path + (bt === "array" ? `[${key}]` : `[${JSON.stringify(key)}]`), depth + 1, false, true);
                if (truncated) return;
            }
            if (at !== "array" || a.length === b.length) return;
            // 稀疏数组也保留长度差异。
            walk(a.length, b.length, path + ".length", depth + 1);
            return;
        }
        entries.push({ path, expected: hasA ? preview(a) : undefined, actual: hasB ? preview(b) : undefined, expectedType: hasA ? at : "missing", actualType: hasB ? bt : "missing" });
    }
    walk(expected, actual, "$", 0);
    return { entries, truncated };
}

function esc(value) {
    return String(value ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

// 工作台和离线报告共用，值只作为文本呈现。期望/实际分色标注（期望红/实际绿，
// 与 diff 惯例「移除侧红/新增侧绿」一致），字段级差异一眼定位。
export function renderStructuralDiff(diff) {
    if (!diff) return "";
    const rows = diff.entries.map((item) => `<details open><summary>${esc(item.path)} (${esc(item.expectedType)} → ${esc(item.actualType)})</summary><pre><span class="diff-expected">期望: ${esc(JSON.stringify(item.expected))}</span>\n<span class="diff-actual">实际: ${esc(JSON.stringify(item.actual))}</span></pre></details>`).join("");
    return `<details open class="structural-diff"><summary>字段差异（${diff.entries.length}${diff.truncated ? "+" : ""} 处）</summary>${rows}${diff.truncated ? "<p>差异证据已截断</p>" : ""}</details>`;
}

// 结构化 diff 的纯文本投影：CLI 文本输出与工作台 Markdown 诊断报告共用同一数据源，
// 保证「--json 的 diff.entries」与两侧文本展示口径一致（同一份字段路径/类型/期望实际证据）。
// 每行一个差异条目：path（期望类型 → 实际类型）: 期望 X / 实际 Y；值与路径由调用方注入
// formatValue/formatPath 做各自出口转义（CLI 走 escapeInlineText 系、Markdown 走 mdInline），
// 本函数只保证行结构，调用前应先对 diff 做输出脱敏（redactSecrets/redactKnownOutput）。
export function structuralDiffLines(diff, options = {}) {
    if (!diff || !Array.isArray(diff.entries) || !diff.entries.length) return [];
    // undefined 侧按 missing 语义直接标注「（缺失）」，不给 formatValue 传递以避免
    // 不同出口对 undefined 的文本化差异（空串/"undefined"）
    const present = (value) => (value === undefined ? "（缺失）" : (options.formatValue ? options.formatValue(value) : String(value)));
    const showPath = options.formatPath || ((path) => String(path));
    const lines = [`字段差异（${diff.entries.length}${diff.truncated ? "+" : ""} 处）:`];
    for (const entry of diff.entries) {
        lines.push(`  - ${showPath(entry.path)}（${entry.expectedType} → ${entry.actualType}）: 期望 ${present(entry.expected)} / 实际 ${present(entry.actual)}`);
    }
    if (diff.truncated) lines.push("  - …（差异证据已截断）");
    return lines;
}

export function assertionDiff(definition, expected, actual) {
    if (Object.hasOwn(definition, "equals")) return structuralDiff(expected, actual);
    if (Object.hasOwn(definition, "notEquals")) {
        return { entries: [{ path: "$（要求不同，实际相等）", expected: "不同的值", actual: "两侧相等", expectedType: "notEquals", actualType: "equal" }], truncated: false };
    }
    if (Object.hasOwn(definition, "oneOf") && Array.isArray(expected)) {
        const entries = [];
        let truncated = expected.length > 5;
        for (const [i, candidate] of expected.slice(0, 5).entries()) {
            const diff = structuralDiff(candidate, actual);
            entries.push(...diff.entries.map(entry => ({ ...entry, path: `候选 ${i + 1} · ${entry.path}` })));
            truncated ||= diff.truncated;
        }
        return { entries: entries.slice(0, 50), truncated: truncated || entries.length > 50 };
    }
    return undefined;
}
