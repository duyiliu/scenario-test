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

// 工作台和离线报告共用，值只作为文本呈现。
export function renderStructuralDiff(diff) {
    if (!diff) return "";
    const rows = diff.entries.map((item) => `<details open><summary>${esc(item.path)} (${esc(item.expectedType)} → ${esc(item.actualType)})</summary><pre>期望: ${esc(JSON.stringify(item.expected))}\n实际: ${esc(JSON.stringify(item.actual))}</pre></details>`).join("");
    return `<details open class="structural-diff"><summary>字段差异（${diff.entries.length}${diff.truncated ? "+" : ""} 处）</summary>${rows}${diff.truncated ? "<p>差异证据已截断</p>" : ""}</details>`;
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
