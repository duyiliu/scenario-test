// 数据驱动执行的数据集读取（#70）：JSON 数组 / JSONL / CSV，无第三方依赖。
// 每行必须是对象；CSV 首行为表头，单元格保持字符串（模板与请求体按字符串使用）。
import fs from "node:fs";
import path from "node:path";

function isPlainObject(value) {
    return value !== null && typeof value === "object" && !Array.isArray(value);
}

// RFC 4180 风格解析：支持双引号包裹、"" 转义与单元格内换行
export function parseCsv(text) {
    const rows = [];
    let row = [];
    let cell = "";
    let quoted = false;
    const source = String(text).replace(/^\uFEFF/, "");
    for (let index = 0; index < source.length; index += 1) {
        const char = source[index];
        if (quoted) {
            if (char === '"') {
                if (source[index + 1] === '"') { cell += '"'; index += 1; }
                else quoted = false;
            } else {
                cell += char;
            }
            continue;
        }
        if (char === '"') { quoted = true; continue; }
        if (char === ",") { row.push(cell); cell = ""; continue; }
        if (char === "\n" || char === "\r") {
            if (char === "\r" && source[index + 1] === "\n") index += 1;
            row.push(cell);
            rows.push(row);
            row = [];
            cell = "";
            continue;
        }
        cell += char;
    }
    row.push(cell);
    rows.push(row);
    // 丢弃末尾纯空行（文件以换行结尾时产生）
    while (rows.length && rows[rows.length - 1].every((value) => value === "")) rows.pop();
    return rows;
}

function normalizeRows(rows, source) {
    if (!Array.isArray(rows) || rows.length === 0) {
        throw new Error(`数据集为空或不是数组: ${source}`);
    }
    rows.forEach((row, index) => {
        if (!isPlainObject(row) || Array.isArray(row)) {
            throw new Error(`数据集第 ${index + 1} 行必须是对象（当前 ${JSON.stringify(row)}）: ${source}`);
        }
    });
    return rows;
}

function parseJson(text, source) {
    let parsed;
    try {
        parsed = JSON.parse(text);
    } catch (error) {
        throw new Error(`数据集 JSON 解析失败（${source}）: ${error.message}`);
    }
    // 兼容 { rows: [...] } 包装
    if (isPlainObject(parsed) && Array.isArray(parsed.rows)) return normalizeRows(parsed.rows, source);
    return normalizeRows(parsed, source);
}

function parseJsonl(text, source) {
    const rows = [];
    String(text).split(/\r?\n/).forEach((line, index) => {
        const trimmed = line.trim();
        if (!trimmed) return;
        try {
            rows.push(JSON.parse(trimmed));
        } catch (error) {
            throw new Error(`数据集 JSONL 第 ${index + 1} 行解析失败（${source}）: ${error.message}`);
        }
    });
    return normalizeRows(rows, source);
}

export function parseDatasetText(text, format, source = "<dataset>") {
    if (format === "csv") {
        const table = parseCsv(text);
        if (!table.length) throw new Error(`数据集为空: ${source}`);
        const headers = table.shift().map((header) => String(header).trim());
        if (!headers.length || headers.some((header) => !header)) {
            throw new Error(`CSV 表头不能为空: ${source}`);
        }
        if (new Set(headers).size !== headers.length) {
            throw new Error(`CSV 表头存在重复列: ${source}`);
        }
        return table.map((cells, index) => {
            if (cells.length !== headers.length) {
                throw new Error(`CSV 第 ${index + 2} 行列数（${cells.length}）与表头（${headers.length}）不一致: ${source}`);
            }
            return Object.fromEntries(headers.map((header, column) => [header, cells[column]]));
        });
    }
    return format === "jsonl" ? parseJsonl(text, source) : parseJson(text, source);
}

export function loadDataset(filePath) {
    const source = path.resolve(filePath);
    if (!fs.existsSync(source)) throw new Error(`数据集文件不存在: ${source}`);
    const text = fs.readFileSync(source, "utf8");
    const extension = path.extname(source).toLowerCase();
    const format = extension === ".csv" ? "csv" : (extension === ".jsonl" || extension === ".ndjson" ? "jsonl" : "json");
    const rows = parseDatasetText(text, format, source);
    return { rows, format, file: source };
}
