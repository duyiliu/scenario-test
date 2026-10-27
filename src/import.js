// HAR / curl → 场景草稿
//
// 只做“真实流量 → 可重放步骤”的转换，不执行网络请求、不运行 shell。
// 生成物仍是标准场景文件（registerScenario + defineScenario），可直接由
// node:vm 加载；敏感请求头一律替换为 {{vars.*}} 占位，避免凭据落盘。
import fs from "node:fs";
import path from "node:path";

export const DEFAULT_MAX_IMPORT_ENTRIES = 50;

// 静态资源扩展名：HAR 通常混入页面、JS/CSS、字体、图片等，不是业务 API。
const STATIC_EXTENSIONS = new Set([
    ".js", ".mjs", ".cjs", ".css", ".map", ".html", ".htm", ".xhtml",
    ".png", ".jpg", ".jpeg", ".gif", ".webp", ".avif", ".bmp", ".ico", ".svg",
    ".woff", ".woff2", ".ttf", ".otf", ".eot",
    ".mp3", ".wav", ".ogg", ".mp4", ".webm", ".mov",
    ".pdf", ".zip", ".gz", ".br"
]);

// 由浏览器/传输层生成的头，照抄进场景只会带来冲突或误导。
const IGNORED_REQUEST_HEADERS = new Set([
    "host", "content-length", "connection", "proxy-connection",
    "accept-encoding", "transfer-encoding", "upgrade", "te", "trailer",
    "priority"
]);

// 敏感头：值不落盘，改用场景 vars 占位。name 统一按小写匹配。
const SENSITIVE_HEADER_NAMES = new Set([
    "authorization", "proxy-authorization", "cookie", "set-cookie",
    "x-api-key", "api-key", "apikey", "x-apikey",
    "x-auth-token", "x-access-token", "x-token",
    "x-client-secret", "x-secret"
]);

const SENSITIVE_QUERY_NAMES = new Set([
    "token", "access_token", "refresh_token", "id_token",
    "api_key", "apikey", "key", "secret", "client_secret",
    "password", "passwd", "pwd", "signature", "sign", "sig",
    "authorization", "auth", "session", "sessionid", "cookie"
]);

const BINARY_MIME_PATTERN = /^(?:image\/|audio\/|video\/|font\/)|application\/(?:octet-stream|pdf|zip|gzip)$/i;
const MULTIPART_MIME_PATTERN = /^multipart\//i;

export class ImportError extends Error {
    constructor(message, hint) {
        super(message);
        this.name = "ImportError";
        this.hint = hint || "";
    }
}

function isEmpty(value) {
    return value === undefined || value === null || value === "";
}

function safeText(value) {
    return String(value ?? "")
        .replace(/\r\n?/g, "\n")
        .replace(/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f-\x9f]/g, " ")
        .replace(/\n+/g, " ")
        .trim();
}

function normalizeHeaders(headers) {
    const pairs = [];
    if (Array.isArray(headers)) {
        for (const item of headers) {
            if (!item) continue;
            // HAR 使用 { name, value }，curl 解析器内部使用 [name, value]；两者统一收口。
            if (Array.isArray(item) && item.length >= 2) {
                pairs.push([String(item[0]), String(item[1])]);
                continue;
            }
            if (typeof item !== "object" || item.name === undefined || item.value === undefined) continue;
            pairs.push([String(item.name), String(item.value)]);
        }
    } else if (headers && typeof headers === "object") {
        for (const [name, value] of Object.entries(headers)) {
            if (value === undefined || value === null) continue;
            pairs.push([String(name), Array.isArray(value) ? value.join(", ") : String(value)]);
        }
    }
    const result = [];
    const seen = new Map();
    for (const [rawName, rawValue] of pairs) {
        const name = rawName.trim();
        if (!name || name.startsWith(":") || IGNORED_REQUEST_HEADERS.has(name.toLowerCase())) continue;
        const lower = name.toLowerCase();
        const value = rawValue.trim();
        if (seen.has(lower)) {
            const existing = seen.get(lower);
            // Cookie 的多个头按 curl/HTTP 语义分号合并，其余按逗号合并。
            existing.value = `${existing.value}${lower === "cookie" ? "; " : ", "}${value}`;
            continue;
        }
        const entry = { name, value };
        seen.set(lower, entry);
        result.push(entry);
    }
    return result;
}

function headerVariableName(name) {
    const normalized = String(name).toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
    return normalized || "secret";
}

function maskSensitiveHeaders(headers) {
    const vars = {};
    const notices = [];
    const usedNames = new Set();
    const result = {};
    for (const { name, value } of headers) {
        const lower = name.toLowerCase();
        const sensitive = SENSITIVE_HEADER_NAMES.has(lower)
            || lower.endsWith("-token") || lower.endsWith("_token") || lower.includes("token")
            || lower.endsWith("-secret") || lower.endsWith("_secret") || lower.includes("secret")
            || lower.endsWith("-key") || lower.endsWith("_key") || lower.includes("apikey")
            || lower.includes("auth");
        if (!sensitive || value.includes("{{")) {
            result[name] = value;
            continue;
        }
        let variableName = headerVariableName(name);
        let suffix = 2;
        while (usedNames.has(variableName)) {
            variableName = `${headerVariableName(name)}_${suffix}`;
            suffix += 1;
        }
        usedNames.add(variableName);
        result[name] = `{{vars.${variableName}}}`;
        vars[variableName] = "";
        notices.push(`${name} 已替换为 {{vars.${variableName}}}`);
    }
    return { headers: result, vars, notices };
}

function isSensitiveQueryName(name) {
    const lower = String(name).toLowerCase();
    return SENSITIVE_QUERY_NAMES.has(lower)
        || lower.endsWith("_token")
        || lower.endsWith("-token")
        || lower.endsWith("_key")
        || lower.endsWith("-key")
        || lower.endsWith("_secret")
        || lower.endsWith("-secret");
}

function maskQueryParams(value) {
    const vars = {};
    const notices = [];
    const usedNames = new Set();
    const entries = [];
    for (const [name, raw] of value) {
        if (!isSensitiveQueryName(name) || String(raw).includes("{{")) {
            entries.push([name, raw]);
            continue;
        }
        let variableName = headerVariableName(name);
        let suffix = 2;
        while (usedNames.has(variableName)) {
            variableName = `${headerVariableName(name)}_${suffix}`;
            suffix += 1;
        }
        usedNames.add(variableName);
        entries.push([name, `{{vars.${variableName}}}`]);
        vars[variableName] = "";
        notices.push(`查询参数 ${name} 已替换为 {{vars.${variableName}}}`);
    }
    // Object.fromEntries 走 CreateDataProperty，__proto__ 等 query 名不会改写对象原型。
    return { params: Object.fromEntries(entries), vars, notices };
}

function parseHttpUrl(raw, label) {
    let parsed;
    try {
        parsed = new URL(String(raw));
    } catch {
        throw new ImportError(`${label}不是合法的 URL: ${safeText(raw)}`);
    }
    if (!/^https?:$/i.test(parsed.protocol) || !parsed.hostname) {
        throw new ImportError(`${label}只支持 http(s) URL: ${safeText(raw)}`);
    }
    return parsed;
}

function redactUrlForComment(raw) {
    let parsed;
    try {
        parsed = new URL(String(raw));
    } catch {
        return safeText(raw);
    }
    parsed.username = "";
    parsed.password = "";
    for (const key of Array.from(parsed.searchParams.keys())) {
        if (isSensitiveQueryName(key)) parsed.searchParams.set(key, "<redacted>");
    }
    return parsed.toString();
}

function urlToStepPath(parsed) {
    return parsed.pathname || "/";
}

function queryFromUrl(parsed) {
    const values = new Map();
    // URLSearchParams 会解码一次；buildUrl 再按同一规范编码，保留业务值原貌。
    // 同名参数保留数组语义（tags=1&tags=2），与 DSL 的 params 口径一致。
    for (const [name, value] of parsed.searchParams) {
        if (!values.has(name)) values.set(name, value);
        else if (Array.isArray(values.get(name))) values.get(name).push(value);
        else values.set(name, [values.get(name), value]);
    }
    return Array.from(values);
}

function isStaticOrPreflight(entry) {
    const request = entry?.request || {};
    const method = String(request.method || "GET").toUpperCase();
    if (method === "OPTIONS") return true;
    const headers = Array.isArray(request.headers) ? request.headers : [];
    if (headers.some((header) => String(header?.name || "").toLowerCase() === "access-control-request-method")) return true;
    let parsed;
    try {
        parsed = new URL(String(request.url || ""));
    } catch {
        return true;
    }
    if (!/^https?:$/i.test(parsed.protocol)) return true;
    const extension = path.extname(parsed.pathname).toLowerCase();
    if (STATIC_EXTENSIONS.has(extension)) return true;
    const mimeType = String(entry?.response?.content?.mimeType || "");
    if (/^text\/html(?:;|$)/i.test(mimeType)) return true;
    return /^(?:image\/|audio\/|video\/|font\/|text\/css$|application\/(?:javascript|pdf|zip|gzip)$)/i.test(mimeType);
}

function bodyFromHar(request, notes, headers) {
    const postData = request?.postData;
    if (!postData || (isEmpty(postData.text) && !Array.isArray(postData.params))) return { body: undefined };
    const mimeType = String(postData.mimeType || "");
    let text = postData.text;
    if (postData.encoding === "base64") {
        notes.push(`请求体为 base64 编码的二进制内容，已省略（原 MIME: ${mimeType || "unknown"}）`);
        removeContentType(headers);
        return { body: undefined };
    }
    if (isEmpty(text) && Array.isArray(postData.params) && postData.params.length) {
        if (MULTIPART_MIME_PATTERN.test(mimeType)) {
            notes.push(`请求体为 multipart/form-data，已省略（含文件/二进制字段，请人工改用 fileUpload）`);
            removeContentType(headers);
            return { body: undefined };
        }
        if (/x-www-form-urlencoded/i.test(mimeType)) {
            text = postData.params
                .map((item) => `${encodeURIComponent(String(item.name ?? ""))}=${encodeURIComponent(String(item.value ?? ""))}`)
                .join("&");
        }
    }
    if (isEmpty(text)) return { body: undefined };
    const bodyText = String(text);
    if (BINARY_MIME_PATTERN.test(mimeType) || MULTIPART_MIME_PATTERN.test(mimeType)
        || bodyText.includes("\u0000") || bodyText.includes("\uFFFD")) {
        notes.push(`请求体为二进制或不支持的格式（MIME: ${mimeType || "unknown"}），已省略；需要时请手工补充 fileUpload/原始 body`);
        removeContentType(headers);
        return { body: undefined };
    }
    if (/json/i.test(mimeType) || /^[\[{]/.test(bodyText.trim())) {
        try {
            return { body: JSON.parse(bodyText) };
        } catch {
            return { body: bodyText };
        }
    }
    return { body: bodyText };
}

function removeContentType(headers) {
    for (const key of Object.keys(headers)) {
        if (key.toLowerCase() === "content-type") delete headers[key];
    }
}

function harEntryToStep(entry, index) {
    const request = entry?.request || {};
    const method = String(request.method || "GET").toUpperCase();
    const parsed = parseHttpUrl(request.url, `HAR 第 ${index + 1} 条请求`);
    const query = queryFromUrl(parsed);
    const maskedQuery = maskQueryParams(query);
    const maskedHeaders = maskSensitiveHeaders(normalizeHeaders(request.headers));
    const notes = [];
    const body = bodyFromHar(request, notes, maskedHeaders.headers);
    const responseStatus = Number(entry?.response?.status);
    const validResponseStatus = Number.isInteger(responseStatus) && responseStatus >= 100 && responseStatus <= 599;
    const status = validResponseStatus ? responseStatus : 200;
    if (!validResponseStatus) {
        notes.push("HAR 未提供有效响应状态，status: 200 为占位值，请人工确认");
    }
    let requestBody = body.body;
    if (requestBody !== undefined && ["GET", "HEAD"].includes(method)) {
        notes.push(`${method} 请求体已省略（DSL 不允许 GET/HEAD 携带 body）`);
        removeContentType(maskedHeaders.headers);
        requestBody = undefined;
    }
    const requestDefinition = {};
    if (Object.keys(maskedHeaders.headers).length) requestDefinition.headers = maskedHeaders.headers;
    if (requestBody !== undefined) requestDefinition.body = requestBody;
    const step = {
        name: `${method} ${urlToStepPath(parsed)}`,
        method,
        path: urlToStepPath(parsed)
    };
    if (Object.keys(maskedQuery.params).length) step.params = maskedQuery.params;
    if (Object.keys(requestDefinition).length) step.request = requestDefinition;
    step.status = status;
    return {
        step,
        notes: [
            `源请求: ${method} ${redactUrlForComment(request.url)}`,
            `status: ${status} 来自 HAR 观测值，请人工确认断言是否适应其他环境`,
            ...maskedHeaders.notices,
            ...maskedQuery.notices,
            ...notes
        ],
        vars: { ...maskedHeaders.vars, ...maskedQuery.vars },
        binaryBody: notes.some((note) => note.includes("二进制") || note.includes("multipart"))
    };
}

function normalizeHar(input) {
    let har = input;
    if (typeof har === "string") {
        try {
            har = JSON.parse(har);
        } catch (error) {
            throw new ImportError(`HAR 不是合法 JSON: ${error.message}`, "请确认导出的是浏览器/代理生成的完整 HAR 文件。");
        }
    }
    if (!har || typeof har !== "object" || !har.log || !Array.isArray(har.log.entries)) {
        throw new ImportError("HAR 缺少 log.entries 数组", "请确认文件来自浏览器 Network 面板或抓包工具的 HAR 导出。");
    }
    return har;
}

export function parseHostFilter(value) {
    return String(value || "")
        .split(",")
        .map((item) => item.trim().toLowerCase())
        .filter(Boolean);
}

export function createHarDraft(input, options = {}) {
    const har = normalizeHar(input);
    const maxEntries = Number.isFinite(Number(options.maxEntries)) && Number(options.maxEntries) > 0
        ? Math.floor(Number(options.maxEntries))
        : DEFAULT_MAX_IMPORT_ENTRIES;
    const hostList = Array.isArray(options.hosts) ? options.hosts : (options.hosts ? [options.hosts] : []);
    const hosts = new Set(hostList.map((host) => String(host).toLowerCase()));
    const stats = {
        total: har.log.entries.length,
        imported: 0,
        filteredStatic: 0,
        filteredHost: 0,
        filteredInvalid: 0,
        omittedByLimit: 0,
        binaryBodies: 0,
        maskedFields: 0
    };
    const records = [];
    const vars = {};
    for (let entryIndex = 0; entryIndex < har.log.entries.length; entryIndex += 1) {
        const entry = har.log.entries[entryIndex];
        const request = entry?.request;
        if (!request || isEmpty(request.url)) {
            stats.filteredInvalid += 1;
            continue;
        }
        if (isStaticOrPreflight(entry)) {
            stats.filteredStatic += 1;
            continue;
        }
        let host;
        try {
            host = new URL(String(request.url)).host.toLowerCase();
        } catch {
            stats.filteredInvalid += 1;
            continue;
        }
        let hostname = "";
        try { hostname = new URL(String(request.url)).hostname.toLowerCase(); } catch { /* host 已在上面解析 */ }
        if (hosts.size && !hosts.has(host) && !hosts.has(hostname)) {
            stats.filteredHost += 1;
            continue;
        }
        if (records.length >= maxEntries) {
            stats.omittedByLimit += 1;
            continue;
        }
        let record;
        try {
            record = harEntryToStep(entry, entryIndex);
        } catch (error) {
            if (error instanceof ImportError) {
                stats.filteredInvalid += 1;
                continue;
            }
            throw error;
        }
        records.push(record);
        Object.assign(vars, record.vars);
        stats.imported += 1;
        stats.binaryBodies += record.binaryBody ? 1 : 0;
        stats.maskedFields += record.notes.filter((note) => note.includes("已替换为 {{vars.")).length;
    }
    return {
        scenario: {
            name: "导入流量（待人工确认）",
            ...(Object.keys(vars).length ? { vars } : {}),
            steps: records.map((record) => record.step)
        },
        stepNotes: records.map((record) => record.notes),
        stats,
        source: options.source || "HAR"
    };
}

export function tokenizeCurl(command) {
    const text = String(command || "");
    const tokens = [];
    let current = "";
    let quote = "";
    let hasToken = false;
    const push = () => {
        if (!hasToken) return;
        tokens.push(current);
        current = "";
        hasToken = false;
    };
    for (let index = 0; index < text.length; index += 1) {
        const char = text[index];
        const next = text[index + 1];
        if (quote === "'") {
            if (char === "'") quote = "";
            else current += char;
            hasToken = true;
            continue;
        }
        if (quote === "\"") {
            if (char === "\"") {
                quote = "";
            } else if (char === "\\" && ["\"", "\\", "$", "`"].includes(next)) {
                current += next;
                index += 1;
            } else {
                current += char;
            }
            hasToken = true;
            continue;
        }
        if (char === "'" || char === "\"") {
            quote = char;
            hasToken = true;
            continue;
        }
        if (char === "\\") {
            if (next === "\n") {
                index += 1;
                continue;
            }
            if (next === "\r" && text[index + 2] === "\n") {
                index += 2;
                continue;
            }
            if (next !== undefined) {
                current += next;
                index += 1;
                hasToken = true;
            }
            continue;
        }
        // PowerShell 使用反引号、cmd 使用 ^ 续行；只在行尾生效，避免误伤普通字符。
        if ((char === "`" || char === "^")
            && (next === "\n" || (next === "\r" && text[index + 2] === "\n"))) {
            index += next === "\r" ? 2 : 1;
            continue;
        }
        if (/\s/.test(char)) {
            push();
            continue;
        }
        current += char;
        hasToken = true;
    }
    if (quote) throw new ImportError("curl 命令中的引号未闭合", "请检查单引号/双引号是否成对后再重试。");
    push();
    if (tokens[0] === "$" || tokens[0] === ">" || /^PS[^>]*>$/i.test(tokens[0] || "")) tokens.shift();
    if (tokens.length && /(?:^|[\\/])curl(?:\.exe)?$/i.test(tokens[0])) tokens.shift();
    return tokens;
}

const CURL_OPTIONS_WITH_VALUE = new Set([
    "--max-time", "--connect-timeout", "--retry", "--retry-delay", "--proxy", "-x",
    "--cacert", "--cert", "--key", "--output", "-o", "--output-dir", "--write-out", "-w"
]);

function curlHeaderValue(value) {
    const separator = String(value).indexOf(":");
    if (separator <= 0) return null;
    return [String(value).slice(0, separator).trim(), String(value).slice(separator + 1).trim()];
}

export function createCurlDraft(command, options = {}) {
    const tokens = tokenizeCurl(command);
    if (!tokens.length) throw new ImportError("curl 命令为空", "示例：scenario-test import --curl \"curl -X GET https://api.example.com/health\"");
    let method = "";
    let methodExplicit = false;
    let url = "";
    let hasData = false;
    let isGet = false;
    let isHead = false;
    const headerPairs = [];
    const dataParts = [];
    const formParts = [];
    const notes = [];
    for (let index = 0; index < tokens.length; index += 1) {
        const token = tokens[index];
        const takeValue = (option) => {
            const value = tokens[index + 1];
            if (value === undefined) throw new ImportError(`curl 选项 ${option} 缺少参数值`);
            index += 1;
            return value;
        };
        if (token === "-X" || token === "--request") {
            method = takeValue(token).toUpperCase();
            methodExplicit = true;
        } else if (token === "-H" || token === "--header") {
            const pair = curlHeaderValue(takeValue(token));
            if (pair) headerPairs.push(pair);
        } else if (["-d", "--data", "--data-raw", "--data-binary", "--data-ascii", "--data-urlencode"].includes(token)) {
            dataParts.push(takeValue(token));
            hasData = true;
        } else if (token === "--json") {
            dataParts.push(takeValue(token));
            hasData = true;
            headerPairs.push(["Content-Type", "application/json"]);
            headerPairs.push(["Accept", "application/json"]);
        } else if (token === "-F" || token === "--form") {
            formParts.push(takeValue(token));
            hasData = true;
        } else if (token === "-b" || token === "--cookie") {
            headerPairs.push(["Cookie", takeValue(token)]);
        } else if (token === "-u" || token === "--user") {
            const credentials = takeValue(token);
            headerPairs.push(["Authorization", `Basic ${Buffer.from(credentials).toString("base64")}`]);
        } else if (token === "-A" || token === "--user-agent") {
            headerPairs.push(["User-Agent", takeValue(token)]);
        } else if (token === "-e" || token === "--referer") {
            headerPairs.push(["Referer", takeValue(token)]);
        } else if (token === "--url") {
            url = takeValue(token);
        } else if (token === "-G" || token === "--get") {
            isGet = true;
        } else if (token === "-I" || token === "--head") {
            isHead = true;
        } else if (token === "-L" || token === "--location" || token === "-k" || token === "--insecure"
            || token === "-s" || token === "--silent" || token === "-S" || token === "--show-error"
            || token === "--compressed" || token === "-i" || token === "--include" || token === "-v" || token === "--verbose") {
            // 只在导入阶段忽略；不影响生成的请求。
        } else if (CURL_OPTIONS_WITH_VALUE.has(token)) {
            takeValue(token);
        } else if (token.startsWith("--") && token.includes("=")) {
            // --max-time=10 这类写法无需再跳值。
        } else if (token.startsWith("-")) {
            // 不认识的开关：忽略，避免把 curl 的展示类参数当成 URL。
        } else if (!url) {
            url = token;
        }
    }
    if (!url) throw new ImportError("无法从 curl 命令中识别 URL", "请确认命令包含完整 URL，或使用 --url 明确指定。");
    if (!method) method = isHead ? "HEAD" : (hasData ? "POST" : "GET");
    if (isGet && !methodExplicit) method = "GET";
    if (isHead) method = "HEAD";
    if (isGet && method === "GET") hasData = true;
    let parsed = parseHttpUrl(url, "curl 命令中的 URL");
    if (parsed.username || parsed.password) {
        notes.push("URL 中的用户名/密码已移除；如需认证请通过 vars 提供 Authorization");
        parsed = new URL(parsed.toString());
        parsed.username = "";
        parsed.password = "";
    }
    const formData = formParts.length > 0;
    if (formData) notes.push("curl -F/--form 为 multipart/form-data，请人工改用 fileUpload 或补充表单字段");
    let body;
    if (!formData && dataParts.length) {
        const rawBody = dataParts.join("&");
        if (rawBody.startsWith("@")) {
            notes.push("curl 请求体引用 @文件，已省略；请人工改用 fileUpload 或原始 body");
        } else if (["GET", "HEAD"].includes(method) || isGet) {
            if (isGet || method === "GET") {
                const extra = new URLSearchParams(rawBody);
                for (const [name, value] of extra) parsed.searchParams.append(name, value);
                notes.push("curl -G/GET 的 -d 数据已转为 query 参数");
            } else {
                notes.push(`${method} 请求体已省略（DSL 不允许 GET/HEAD 携带 body）`);
            }
        } else {
            const contentType = headerPairs.find(([name]) => name.toLowerCase() === "content-type")?.[1] || "";
            if (/json/i.test(contentType) || /^[\[{]/.test(rawBody.trim())) {
                try {
                    body = JSON.parse(rawBody);
                } catch {
                    body = rawBody;
                }
            } else {
                body = rawBody;
            }
        }
    }
    // curl 的 -d/--data-binary 默认使用 application/x-www-form-urlencoded；显式 Header 优先。
    if (body !== undefined && typeof body === "string" && !/^[\[{]/.test(body.trim())
        && !headerPairs.some(([name]) => name.toLowerCase() === "content-type")) {
        headerPairs.push(["Content-Type", "application/x-www-form-urlencoded"]);
    }
    const maskedHeaders = maskSensitiveHeaders(normalizeHeaders(headerPairs));
    const query = queryFromUrl(parsed);
    const maskedQuery = maskQueryParams(query);
    const requestDefinition = {};
    if (Object.keys(maskedHeaders.headers).length) requestDefinition.headers = maskedHeaders.headers;
    if (body !== undefined) requestDefinition.body = body;
    const step = {
        name: `${method} ${urlToStepPath(parsed)}`,
        method,
        path: urlToStepPath(parsed)
    };
    if (Object.keys(maskedQuery.params).length) step.params = maskedQuery.params;
    if (Object.keys(requestDefinition).length) step.request = requestDefinition;
    step.status = 200;
    const vars = { ...maskedHeaders.vars, ...maskedQuery.vars };
    return {
        scenario: {
            name: "导入 curl 请求（待人工确认）",
            ...(Object.keys(vars).length ? { vars } : {}),
            steps: [step]
        },
        stepNotes: [[
            `来源: curl 导入（敏感头已脱敏）`,
            "curl 未提供响应状态，status: 200 为占位值，请按实际接口调整",
            ...maskedHeaders.notices,
            ...maskedQuery.notices,
            ...notes
        ]],
        stats: {
            total: 1,
            imported: 1,
            filteredStatic: 0,
            filteredHost: 0,
            filteredInvalid: 0,
            omittedByLimit: 0,
            binaryBodies: notes.some((note) => note.includes("省略")) ? 1 : 0,
            maskedFields: maskedHeaders.notices.length + maskedQuery.notices.length
        },
        source: options.source || "curl 命令"
    };
}

function indent(text, prefix) {
    return String(text).split("\n").map((line) => `${prefix}${line}`).join("\n");
}

function indentAfterFirst(text, prefix) {
    const lines = String(text).split("\n");
    return `${lines[0]}${lines.slice(1).map((line) => `\n${prefix}${line}`).join("")}`;
}

function comment(text, prefix) {
    return `${prefix}// ${safeText(text)}`;
}

function renderStep(step, notes, indentText) {
    const lines = [];
    for (const note of notes || []) lines.push(comment(note, indentText));
    // JSON 是合法的 JS 字面量；缩进后与手写场景格式一致。
    const literal = JSON.stringify(step, null, 4);
    lines.push(indent(literal, indentText) + ",");
    return lines.join("\n");
}

export function renderDraftFile(draft, meta = {}) {
    const id = String(meta.id || "imported-scenario");
    const generatedAt = meta.generatedAt || new Date().toISOString();
    const stats = draft.stats || {};
    const scenario = draft.scenario || {};
    const lines = [];
    lines.push(`// 由 scenario-test import 生成（${safeText(draft.source || "unknown")}）`);
    lines.push(`// 生成时间：${safeText(generatedAt)}`);
    lines.push("// ⚠️ 草稿文件：status 来自流量观测或占位值，请人工核对步骤、认证、动态字段与断言后再纳入回归。");
    if (stats.total !== undefined) {
        const filtered = (stats.filteredStatic || 0) + (stats.filteredInvalid || 0);
        lines.push(`// 扫描 ${stats.total} 条请求，导入 ${stats.imported || 0} 条；过滤静态资源/预检/无效请求 ${filtered} 条，主机过滤 ${stats.filteredHost || 0} 条，超出上限 ${stats.omittedByLimit || 0} 条。`);
    }
    if ((stats.maskedFields || 0) > 0) {
        lines.push("// 敏感请求头/查询参数已替换为 {{vars.*}} 占位；请在 scenario.config.js 的 vars 或 --vars 中提供真实值，切勿提交明文凭据。");
    }
    if ((stats.binaryBodies || 0) > 0) {
        lines.push("// 二进制/不支持格式的请求体已省略，对应步骤上方有说明；需要时请手工补充 fileUpload 或原始 body。");
    }
    lines.push(`ScenarioTest.registerScenario(${JSON.stringify(id)}, ScenarioTest.defineScenario({`);
    lines.push(`    name: ${JSON.stringify(scenario.name || "导入场景草稿")},`);
    if (scenario.vars && Object.keys(scenario.vars).length) {
        const varsLiteral = JSON.stringify(scenario.vars, null, 4);
        lines.push(`    vars: ${indentAfterFirst(varsLiteral, "    ")},`);
    }
    lines.push("    steps: [");
    (scenario.steps || []).forEach((step, index) => {
        lines.push(renderStep(step, draft.stepNotes?.[index], "        "));
    });
    lines.push("    ]");
    lines.push("}));");
    lines.push("");
    return lines.join("\n");
}

export function readHarFile(filePath) {
    try {
        return fs.readFileSync(filePath === "-" ? 0 : filePath, "utf8");
    } catch (error) {
        throw new ImportError(`无法读取 HAR 文件: ${filePath}（${error.message}）`, "请确认路径存在且当前用户有读取权限。");
    }
}
