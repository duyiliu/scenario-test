// serve 静态服务器 + 同源接口代理（从 cli.js 拆出，便于单测与维护，#33）
//
// 安全边界：
//   - Host 白名单阻断 DNS rebinding；
//   - safeFile 同时做词法/真实路径越界校验；
//   - 双向剔除 hop-by-hop 头与 Connection 点名的字段（RFC 7230 §6.1）；
//   - 上游空闲超时可配置，默认 30s；响应已开始后失败只销毁连接，不二次写头。
import fs from "node:fs";
import http from "node:http";
import https from "node:https";
import path from "node:path";
import * as runtimeVersion from "../version.generated.js";
import { contract } from "../contract.js";
import { isRealPathWithinRoot } from "../utils/path-validator.js";

export const HOP_BY_HOP_HEADERS = new Set([
    "connection", "keep-alive", "proxy-authenticate", "proxy-authorization",
    "te", "trailer", "transfer-encoding", "upgrade", "host"
]);

// 浏览器告诉 serve 当前选中的环境 key（内部头，转发前剔除）
export const PROXY_ENV_HEADER = "x-scenario-test-env";
export const DEFAULT_PROXY_TIMEOUT_MS = 30000;
export const MAX_PROXY_TIMEOUT_MS = 600000;

export function contentType(filePath) {
    return ({
        ".html": "text/html; charset=utf-8",
        ".js": "application/javascript; charset=utf-8",
        ".json": "application/json; charset=utf-8",
        ".css": "text/css; charset=utf-8",
        ".svg": "image/svg+xml",
        ".png": "image/png",
        ".jpg": "image/jpeg",
        ".webp": "image/webp",
        ".txt": "text/plain; charset=utf-8"
    })[path.extname(filePath).toLowerCase()] || "application/octet-stream";
}

export function safeFile(root, relativePath) {
    const candidate = path.resolve(root, relativePath);
    const relative = path.relative(root, candidate);
    if (!relative || relative.startsWith("..") || path.isAbsolute(relative)) return null;
    // serve 真实读文件：junction/符号链接在词法层不可见，按真实位置再判一次
    return isRealPathWithinRoot(root, candidate) ? candidate : null;
}

function injectServeMarkers(html, { e2eNavigation = false } = {}) {
    const marker = "<script>window.__SCENARIO_TEST_SERVE_PROXY__ = true;</script>";
    const headPattern = /<head(?:\s[^>]*)?>/i;
    let content = headPattern.test(html)
        ? html.replace(headPattern, function (head) { return head + marker; })
        : marker + html;
    if (e2eNavigation && !html.includes("data-scenario-test-e2e")) {
        const navigation = '<nav data-scenario-test-e2e aria-label="测试类型" style="display:flex;gap:20px;padding:12px 24px;background:#fff;border-bottom:1px solid #e2e8f0;font:14px system-ui"><a href="/" style="color:#334155">HTTP 场景</a><a href="/e2e/" style="color:#2563eb">浏览器 E2E</a></nav>';
        content = /<body(?:\s[^>]*)?>/i.test(content)
            ? content.replace(/<body(?:\s[^>]*)?>/i, (body) => body + navigation)
            : navigation + content;
    }
    return content;
}

export function serveStaticFile(response, filePath, { e2eNavigation = false } = {}) {
    const headers = { "Cache-Control": "no-store", "Content-Type": contentType(filePath) };
    if (path.extname(filePath).toLowerCase() !== ".html") {
        const stream = fs.createReadStream(filePath);
        stream.on("error", () => {
            if (response.headersSent) { response.destroy(); return; }
            response.writeHead(500);
            response.end("Internal Server Error");
        });
        stream.on("open", () => {
            response.writeHead(200, headers);
            stream.pipe(response);
        });
        // 客户端中断时销毁文件流，避免大文件继续读到尾部（#119）
        response.on("close", () => {
            if (!response.writableEnded) stream.destroy();
        });
        return;
    }
    fs.readFile(filePath, "utf8", function (error, html) {
        if (error) {
            response.writeHead(500);
            response.end("Internal Server Error");
            return;
        }
        const content = injectServeMarkers(html, { e2eNavigation });
        response.writeHead(200, headers);
        response.end(content);
    });
}

// Host 白名单：serve 绑定 127.0.0.1 仅供本机回环访问。校验 Host 头可阻断 DNS rebinding 等
// 跨源读取（攻击域名解析到 127.0.0.1 后，浏览器请求仍会携带攻击者的 Host），
// 与 vite/webpack-dev-server 的 host 校验同类加固
export function isAllowedServeHost(hostHeader, port) {
    const host = String(hostHeader || "").trim().toLowerCase();
    return [`127.0.0.1:${port}`, `localhost:${port}`, `[::1]:${port}`, "127.0.0.1", "localhost", "[::1]"].includes(host);
}

// 代理请求来源校验（#119）：serve 绑定回环地址，跨站页面仍可发起写请求（读响应受 CORS 限制，
// 但 DELETE/POST 等副作用已经发生）。Origin/Referer 存在时必须指向本机 serve origin；
// 两者都缺省（curl/脚本/同源 GET）放行；Origin: null（沙箱/file://）一律拒绝。
export function isProxyOriginAllowed(headers, hostHeader, port) {
    const localHosts = new Set([
        String(hostHeader || "").trim().toLowerCase(),
        `127.0.0.1:${port}`, `localhost:${port}`, `[::1]:${port}`,
        "127.0.0.1", "localhost", "[::1]"
    ].filter(Boolean));
    const check = (raw, label) => {
        const text = String(raw || "").trim();
        if (!text || text === "null") return !text;
        let parsed;
        try {
            parsed = new URL(text);
        } catch {
            return false;
        }
        return localHosts.has(parsed.host.toLowerCase());
    };
    const origin = headers.origin;
    const referer = headers.referer || headers.referrer;
    // Origin 可能是重定向链的空格分隔列表：任一跨站即拒绝
    if (origin !== undefined) {
        return String(origin).split(/\s+/).filter(Boolean).every((item) => check(item, "Origin"));
    }
    if (referer !== undefined) return check(referer, "Referer");
    return true;
}

// RFC 7230 §6.1：Connection 头点名的字段同样是逐跳的，需随静态名单一并剔除
export function connectionNamedHeaders(connectionValue) {
    return String(connectionValue || "")
        .split(",")
        .map((item) => item.trim().toLowerCase())
        .filter(Boolean);
}

function trimUrl(url) {
    return String(url || "").replace(/\/+$/, "");
}

// serve 启动时的默认目标（与 run 的 selectEnvironment 一致：未知环境直接报错）
export function resolveStartupProxyTarget(config, envKey, baseUrlOverride) {
    // 显式 --env 但配置没有 envs：不静默回落顶层 baseUrl（与 run 的 --env 同口径）
    if (envKey && !config.envs?.length) {
        return { error: `配置未声明 envs，无法使用 --env ${envKey}` };
    }
    if (config.envs?.length) {
        const selectedKey = envKey || config.defaultEnvKey;
        const environment = config.envs.find((item) => item.key === selectedKey);
        if (!environment) {
            const keys = config.envs.map((item) => item.key);
            return { error: `未找到环境 ${selectedKey}，可用值: ${keys.join(", ")}` };
        }
        const overridden = Boolean(baseUrlOverride);
        return {
            key: overridden ? `${environment.key}（--base-url 覆盖）` : environment.key,
            envKey: environment.key,
            // 环境缺省（或纯空白）baseUrl 时回退顶层 baseUrl，与 doctor/run 同口径（#61）
            target: trimUrl(overridden ? baseUrlOverride : environment.baseUrl || config.baseUrl || "")
        };
    }
    return {
        key: config.defaultEnvKey || "default",
        envKey: config.defaultEnvKey || "default",
        target: trimUrl(baseUrlOverride || config.baseUrl || "")
    };
}

// 按请求选择代理目标（#60）：--base-url 固定覆盖；否则以浏览器头里的环境 key 为准，
// 缺省回落到启动环境。绝不接受浏览器传入的任意 URL。
export function resolveRequestProxyTarget(options) {
    const { config, defaultTarget, defaultEnvKey, overrideBaseUrl, envKey } = options;
    if (overrideBaseUrl) return defaultTarget;
    if (config.envs?.length) {
        const selectedKey = String(envKey || defaultEnvKey || config.defaultEnvKey || "").trim();
        const environment = config.envs.find((item) => item.key === selectedKey);
        if (!environment) {
            const keys = config.envs.map((item) => item.key);
            throw new Error(`未知环境 ${selectedKey || "(空)"}，可用值: ${keys.join(", ")}`);
        }
        const target = trimUrl(environment.baseUrl || config.baseUrl || "");
        if (!target) throw new Error(`环境 ${environment.key} 未配置 baseUrl`);
        return { key: environment.key, envKey: environment.key, target };
    }
    if (envKey && envKey !== defaultEnvKey) {
        throw new Error(`配置未声明环境 ${envKey}，无法切换代理目标`);
    }
    return defaultTarget;
}

// 同源代理来源头重写（#67）：仅当 Origin/Referer 的 host 等于本次请求的本地 Host 时，
// 改写为目标源；外部来源原样转发；没有该头时不注入。
export function rewriteProxyOriginHeaders(headers, localHost, targetUrl) {
    let targetOrigin;
    try {
        targetOrigin = new URL(targetUrl).origin;
    } catch {
        return headers;
    }
    const local = String(localHost || "").trim().toLowerCase();
    for (const name of Object.keys(headers)) {
        const lower = name.toLowerCase();
        if (lower !== "origin" && lower !== "referer") continue;
        let parsed;
        try {
            parsed = new URL(String(headers[name]));
        } catch {
            continue;
        }
        if (parsed.host.toLowerCase() !== local) continue;
        headers[name] = lower === "origin"
            ? targetOrigin
            : `${targetOrigin}${parsed.pathname}${parsed.search}`;
    }
    return headers;
}

function proxyTransport(targetUrl) {
    try {
        const protocol = new URL(targetUrl).protocol;
        if (protocol === "https:") return https;
        if (protocol === "http:") return http;
    } catch {
        return null;
    }
    return null;
}

function abortProxyResponse(response) {
    if (response.destroyed || response.writableEnded) return;
    response.destroy();
}

export function respondProxyError(response, message) {
    // 响应已开始（writeHead + pipe 进行中）时二次 writeHead 会抛 ERR_HTTP_HEADERS_SENT，
    // 从事件回调冒泡成 uncaughtException 直接杀死 serve 进程；此时只能断开连接
    if (response.headersSent) { abortProxyResponse(response); return; }
    response.writeHead(502, { "Content-Type": "text/plain; charset=utf-8" });
    response.end(message);
}

export function buildProxyRequestHeaders(request, targetUrl) {
    const headers = {};
    const requestCloseNamed = new Set(connectionNamedHeaders(request.headers.connection));
    for (const [name, value] of Object.entries(request.headers)) {
        const lower = String(name).toLowerCase();
        if (lower === PROXY_ENV_HEADER) continue;
        if (!HOP_BY_HOP_HEADERS.has(lower) && !requestCloseNamed.has(lower)) headers[name] = value;
    }
    rewriteProxyOriginHeaders(headers, request.headers.host, targetUrl);
    return headers;
}

export function proxyRequest(request, response, targetUrl, options = {}) {
    const timeoutMs = Number.isFinite(Number(options.timeoutMs)) && Number(options.timeoutMs) > 0
        ? Number(options.timeoutMs)
        : DEFAULT_PROXY_TIMEOUT_MS;
    // 默认校验上游 https 证书；仅显式 insecure（--insecure）才放宽，避免非自签环境被 MITM
    const verifyUpstreamCert = options.insecure !== true;
    const transport = proxyTransport(targetUrl);
    if (!transport) {
        respondProxyError(
            response,
            `Bad Gateway: 接口代理目标无效: ${targetUrl}\n` +
            "请检查环境 baseUrl，必须带协议前缀（http:// 或 https://）"
        );
        return;
    }
    const headers = buildProxyRequestHeaders(request, targetUrl);
    let upstream;
    try {
        // 保持原拼接语义：targetUrl 已去尾部斜杠，若带路径前缀则原样保留
        upstream = transport.request(targetUrl + request.url, {
            method: request.method,
            headers,
            // serve 是本地联调代理：内网自签证书需显式 --insecure 才跳过校验，
            // 默认按 Node 默认策略校验证书（#119）
            ...(transport === https ? { rejectUnauthorized: verifyUpstreamCert } : {})
        }, (upstreamResponse) => {
            // 响应方向同样剔除 hop-by-hop 头，避免把上游连接语义（transfer-encoding/keep-alive 等）透传给浏览器；
            // Connection 点名的自定义字段同样剔除
            const responseHeaders = {};
            const upstreamCloseNamed = new Set(connectionNamedHeaders(upstreamResponse.headers.connection));
            for (const [name, value] of Object.entries(upstreamResponse.headers)) {
                const lower = String(name).toLowerCase();
                if (!HOP_BY_HOP_HEADERS.has(lower) && !upstreamCloseNamed.has(lower)) responseHeaders[name] = value;
            }
            response.writeHead(upstreamResponse.statusCode || 502, responseHeaders);
            // 响应已开始后上游传输中途断连/重置：不能再写 502（二次 writeHead 会抛
            // ERR_HTTP_HEADERS_SENT），直接销毁下游连接，让浏览器立即失败而不是无限等待
            upstreamResponse.on("error", () => abortProxyResponse(response));
            upstreamResponse.on("aborted", () => abortProxyResponse(response));
            upstreamResponse.pipe(response);
        });
    } catch (error) {
        // 请求构造阶段（非法 URL 等）可能同步抛错，此处兜底为 502
        respondProxyError(response, `Bad Gateway: 接口代理请求构造失败: ${error.message}`);
        return;
    }
    upstream.setTimeout(timeoutMs, () => {
        upstream.destroy(new Error("接口代理超时"));
    });
    upstream.on("error", () => {
        respondProxyError(response, "Bad Gateway: 无法连接接口代理目标或代理超时");
    });
    // 客户端中断（关闭页面/取消请求）时必须销毁上游请求：否则持续输出或长轮询会
    // 一直占用到空闲超时甚至更久（#119）
    request.on("aborted", () => upstream.destroy());
    response.on("close", () => {
        if (!response.writableEnded) upstream.destroy();
    });
    request.pipe(upstream);
}

// 扩展不强制来源校验的安全方法（页面导航/资源加载允许外部链接跳入）；
// 写方法在交给扩展前统一按代理口径校验本机来源，阻断跨站页面向回环地址发起副作用请求
const EXTENSION_SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

// ===== 工作台场景编辑持久化（YIL-199）=====
// 两个写接口与 UMD 虚拟路由同层：浏览器工作台 POST 场景文件源码/清单条目，
// serve 校验本机来源 + 场景文件白名单后才写盘。独立打开 index.html（无 serve）
// 时工作台降级为剪贴板复制源码，不会触达这两个接口。
export const SCENARIO_FILE_PATTERN = /^scenarios(?:\/[A-Za-z0-9][A-Za-z0-9_-]*)*\/[A-Za-z0-9][A-Za-z0-9_-]*\.js$/;
export const SCENARIO_ID_PATTERN = /^[a-z0-9][a-z0-9-]{0,79}$/;
const MAX_SCENARIO_WRITE_BYTES = 512 * 1024;

function sendJson(response, status, body) {
    response.writeHead(status, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" });
    response.end(JSON.stringify(body));
}

function scenarioWriteError(status, message) {
    const error = new Error(message);
    error.status = status;
    return error;
}

function readJsonBody(request) {
    return new Promise((resolve, reject) => {
        let raw = "";
        request.on("data", (chunk) => {
            raw += chunk;
            if (raw.length > MAX_SCENARIO_WRITE_BYTES) {
                reject(scenarioWriteError(413, "请求体过大"));
                request.destroy();
            }
        });
        request.on("end", () => {
            try { resolve(JSON.parse(raw || "{}")); }
            catch { reject(scenarioWriteError(400, "请求体不是合法 JSON")); }
        });
        request.on("error", reject);
    });
}

// 配置清单项对应的场景文件相对路径（与浏览器端 entry.file || entry.path || entry.url 同口径）
function scenarioEntryFile(entry) {
    if (typeof entry === "string") return entry;
    if (!entry || typeof entry !== "object") return "";
    return String(entry.file || entry.path || entry.url || "");
}

// 保存场景文件：file 必须在配置清单内（create 除外——新文件只受形态白名单约束），
// 写盘前再过一次词法/真实路径越界与私有路径校验。返回 { file, created }
export function writeScenarioFile(workspace, config, payload) {
    const file = String(payload && payload.file || "").trim();
    if (!SCENARIO_FILE_PATTERN.test(file)) {
        throw scenarioWriteError(400, `非法场景文件路径（仅允许 scenarios/**/*.js）: ${file}`);
    }
    const content = payload && payload.content;
    if (typeof content !== "string" || !content.trim()) {
        throw scenarioWriteError(400, "场景文件内容为空");
    }
    if (Buffer.byteLength(content, "utf8") > MAX_SCENARIO_WRITE_BYTES) {
        throw scenarioWriteError(413, "场景文件内容过大");
    }
    const create = payload && payload.create === true;
    const listed = (config && Array.isArray(config.scenarios) ? config.scenarios : [])
        .some((entry) => scenarioEntryFile(entry) === file);
    const target = path.resolve(workspace, file);
    if (!isRealPathWithinRoot(path.resolve(workspace), target)) {
        throw scenarioWriteError(403, `场景文件路径越出工作区: ${file}`);
    }
    if (!create && !listed) {
        throw scenarioWriteError(403, `场景文件不在配置清单中，已拒绝写入: ${file}`);
    }
    if (create && fs.existsSync(target)) {
        throw scenarioWriteError(409, `场景文件已存在，请换一个路径: ${file}`);
    }
    if (!create && !fs.existsSync(target)) {
        throw scenarioWriteError(404, `场景文件不存在: ${file}`);
    }
    fs.writeFileSync(target, content, "utf8");
    return { file, created: create };
}

// 在文本中定位 `scenarios:` 的数组字面量并返回 [start(含'['), end(']'之后))；
// 允许字符串/注释中的 "scenarios" 误导时仍按首个键名匹配——配置文件由 init 模板
// 与 AI 按固定形态维护，形态不匹配时直接报错而不是猜测。
function locateScenariosArray(source) {
    const match = /(^|[^A-Za-z0-9_$])scenarios\s*:/.exec(source);
    if (!match) return null;
    const colonAt = match.index + match[0].length - 1;
    let pos = colonAt + 1;
    while (pos < source.length && /\s/.test(source[pos])) pos += 1;
    if (source[pos] !== "[") return null;
    // 配对扫描：跳过字符串/模板串/行注释/块注释，只跟踪 [ ] 深度
    let depth = 0;
    for (let i = pos; i < source.length; i += 1) {
        const ch = source[i];
        const next = source[i + 1];
        if (ch === '"' || ch === "'" || ch === "`") {
            const quote = ch;
            i += 1;
            while (i < source.length) {
                if (source[i] === "\\") { i += 2; continue; }
                if (source[i] === quote) break;
                i += 1;
            }
            continue;
        }
        if (ch === "/" && next === "/") { i = source.indexOf("\n", i); if (i < 0) return null; continue; }
        if (ch === "/" && next === "*") { i = source.indexOf("*/", i + 2); if (i < 0) return null; i += 1; continue; }
        if (ch === "[") depth += 1;
        else if (ch === "]") {
            depth -= 1;
            if (depth === 0) return [pos, i + 1];
        }
    }
    return null;
}

// 向 scenario.config.js 的 scenarios 数组追加一条清单项并写盘；id/url 重复按 409 拒绝
export function insertConfigScenarioEntry(workspace, configFile, config, payload) {
    const id = String(payload && payload.id || "").trim();
    const name = String(payload && payload.name || "").trim();
    const file = String(payload && payload.file || "").trim();
    if (!SCENARIO_ID_PATTERN.test(id)) {
        throw scenarioWriteError(400, `非法场景 id（小写字母/数字/短横线，80 字符内）: ${id}`);
    }
    if (!SCENARIO_FILE_PATTERN.test(file)) {
        throw scenarioWriteError(400, `非法场景文件路径（仅允许 scenarios/**/*.js）: ${file}`);
    }
    if (!name) throw scenarioWriteError(400, "场景名称不能为空");
    const entries = config && Array.isArray(config.scenarios) ? config.scenarios : [];
    if (entries.some((entry) => entry && typeof entry === "object" && entry.id === id)) {
        throw scenarioWriteError(409, `场景 id 已存在于清单: ${id}`);
    }
    if (entries.some((entry) => scenarioEntryFile(entry) === file)) {
        throw scenarioWriteError(409, `场景文件已存在于清单: ${file}`);
    }
    const configPath = path.resolve(workspace, configFile || "scenario.config.js");
    if (!isRealPathWithinRoot(path.resolve(workspace), configPath) || !fs.existsSync(configPath)) {
        throw scenarioWriteError(500, `配置文件不存在: ${configFile}`);
    }
    const source = fs.readFileSync(configPath, "utf8");
    const span = locateScenariosArray(source);
    if (!span) {
        throw scenarioWriteError(500, "无法定位 scenario.config.js 的 scenarios 数组，请手动维护清单");
    }
    const inner = source.slice(span[0] + 1, span[1] - 1);
    // 数组项沿用 8 空格缩进（与 init 模板一致）；末项无尾逗号时先补逗号再插新项
    const trimmedInner = inner.replace(/\s+$/, "");
    const needsComma = trimmedInner.length > 0 && !trimmedInner.endsWith(",");
    const entryLine = `${needsComma ? "," : ""}\n        { id: ${JSON.stringify(id)}, name: ${JSON.stringify(name)}, url: ${JSON.stringify(file)} }`;
    const updated = source.slice(0, span[1] - 1) + (trimmedInner.length === 0 ? "\n" : "") + entryLine + source.slice(span[1] - 1);
    fs.writeFileSync(configPath, updated, "utf8");
    // 内存清单同步追加：否则新注册的场景在 serve 重启前仍被「不在清单中」挡住保存
    entries.push({ id, name, url: file });
    return { id, name, file };
}

// POST /__scenario-test__/scenario-file 与 /__scenario-test__/config-scenarios 的统一入口；
// 返回 true 表示已接管（含校验失败），false 表示非编辑路径
export async function handleScenarioEditRequest(request, response, pathname, context) {
    if (pathname !== "/__scenario-test__/scenario-file" && pathname !== "/__scenario-test__/config-scenarios") return false;
    if (request.method !== "POST") {
        response.writeHead(405, { "Content-Type": "application/json; charset=utf-8", "Allow": "POST" });
        response.end(JSON.stringify({ ok: false, error: "仅接受 POST" }));
        return true;
    }
    try {
        const payload = await readJsonBody(request);
        const result = pathname === "/__scenario-test__/scenario-file"
            ? writeScenarioFile(context.workspace, context.config, payload)
            : insertConfigScenarioEntry(context.workspace, context.configFile, context.config, payload);
        sendJson(response, 200, { ok: true, ...result });
    } catch (error) {
        sendJson(response, error.status || 500, { ok: false, error: error.message });
    }
    return true;
}

export function isPrivateServePath(pathname) {
    const segments = pathname.replaceAll("\\", "/").split("/").filter(Boolean);
    return segments.some((segment) => {
        const lower = segment.toLowerCase();
        return lower.includes(":") || lower === ".git" || lower === ".auth" || lower === "node_modules" ||
            lower === "e2e-evidence" || lower === "e2e-results" || lower === "test-results" ||
            lower === "playwright-report" || lower === ".env" || lower.startsWith(".env.") ||
            lower === "storage-state.json" || lower === "storagestate.json" ||
            lower.endsWith(".pem") || lower.endsWith(".key");
    });
}

// v23 起项目不再落 index.html：工作台页由运行时内置提供，UMD 走 /__scenario-test__/ 虚拟路由。
// 项目（或仓库示例）根目录存在 index.html 时仍优先用磁盘文件，兼容旧项目与自研页面。
function renderWorkbenchPage(configFileName) {
    const configFile = configFileName || "scenario.config.js";
    return `<!doctype html>
<html lang="zh-CN">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>场景测试</title>
</head>
<body style="margin:0">
    <div id="scenario-test" style="height:100vh"></div>
    <script src="/__scenario-test__/scenario-test.umd.js"></script>
    <script src="/${configFile}"></script>
    <script>
        ScenarioTest.createApp({ mount: "#scenario-test", config: ScenarioTest.getConfig() });
    </script>
</body>
</html>`;
}

// 依次询问各扩展是否接管；返回 true 表示已有人处理（返回 true 或响应已结束均算接管）
async function dispatchToExtensions(extensions, request, response, pathname, hostHeader, port) {
    const method = String(request.method || "GET").toUpperCase();
    if (!EXTENSION_SAFE_METHODS.has(method) &&
        !isProxyOriginAllowed(request.headers, hostHeader, port)) {
        response.writeHead(403, { "Content-Type": "text/plain; charset=utf-8" });
        response.end("Forbidden: 扩展接口只接受本机工作台来源的写请求");
        return true;
    }
    for (const extension of extensions) {
        let handled;
        try {
            handled = await extension.handle(request, response, pathname);
        } catch (extensionError) {
            if (response.headersSent) { abortProxyResponse(response); return true; }
            response.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
            response.end(`扩展 ${extension.name} 处理失败: ${extensionError.message}`);
            return true;
        }
        if (handled === true || response.writableEnded || response.destroyed) return true;
    }
    return false;
}

// 静态服务 + 同源代理。proxyTarget 形如 { key, envKey, target }；
// extensions 形如 [{ name, handle(request, response, pathname) => boolean }]，
// 在静态文件与代理之前优先接管请求（见 src/cli/serve-extensions.js）。
export function createServeServer(options) {
    const {
        workspace,
        libraryDist,
        port,
        config,
        configFile = "scenario.config.js",
        defaultTarget,
        overrideBaseUrl = "",
        proxyTimeoutMs = DEFAULT_PROXY_TIMEOUT_MS,
        insecure = false,
        extensions = []
    } = options;
    const identity = Object.freeze({
        version: runtimeVersion.VERSION,
        buildId: runtimeVersion.BUILD_ID ?? "source-unbuilt",
        contractVersion: contract.contractVersion,
        pid: process.pid,
        workspace: path.resolve(workspace),
        startedAt: new Date().toISOString(),
        extensions: extensions.map((extension) => extension.name)
    });
    const server = http.createServer(async (request, response) => {
        try {
            if (!isAllowedServeHost(request.headers.host, port)) {
                response.writeHead(403);
                response.end("Forbidden");
                return;
            }
            const pathname = decodeURIComponent(new URL(request.url, "http://127.0.0.1").pathname);
            if (pathname === "/__scenario-test__/status") {
                if (request.method !== "GET" && request.method !== "HEAD") {
                    response.writeHead(405, { Allow: "GET, HEAD" }); response.end(); return;
                }
                response.writeHead(200, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" });
                response.end(request.method === "HEAD" ? undefined : JSON.stringify(identity));
                return;
            }
            // 工作台场景编辑写接口：与扩展写方法同口径，先校验本机来源再落盘（YIL-199）
            if (pathname === "/__scenario-test__/scenario-file" || pathname === "/__scenario-test__/config-scenarios") {
                if (!isProxyOriginAllowed(request.headers, request.headers.host, port)) {
                    response.writeHead(403, { "Content-Type": "application/json; charset=utf-8" });
                    response.end(JSON.stringify({ ok: false, error: "场景编辑接口只接受本机工作台来源的写请求" }));
                    return;
                }
                if (await handleScenarioEditRequest(request, response, pathname, { workspace, configFile, config })) return;
            }
            // 兼容唯一公开 npm UMD 路径，其他依赖/状态文件不进入静态层或代理。
            if (pathname !== "/node_modules/@yc_yzkj/scenario-test/dist/scenario-test.umd.js" && isPrivateServePath(pathname)) {
                response.writeHead(403); response.end("Forbidden"); return;
            }
            if (extensions.length &&
                await dispatchToExtensions(extensions, request, response, pathname, request.headers.host, port)) {
                return;
            }
            // 工作台兜底页：项目无 index.html 时由运行时内置提供（v23 运行时去项目化）；
            // 磁盘存在 index.html（旧项目/仓库示例/自定义页面）仍优先，行为不变。
            if ((pathname === "/" || pathname === "/index.html") && !fs.existsSync(path.join(workspace, "index.html"))) {
                const html = injectServeMarkers(renderWorkbenchPage(configFile), { e2eNavigation: extensions.some((extension) => extension.name === "e2e") });
                response.writeHead(200, { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" });
                response.end(html);
                return;
            }
            let filePath;
            const publicRuntime = ["/__scenario-test__/scenario-test.umd.js", "/dist/scenario-test.umd.js", "/node_modules/@yc_yzkj/scenario-test/dist/scenario-test.umd.js"].includes(pathname);
            if (pathname === "/__scenario-test__/scenario-test.umd.js") filePath = path.join(libraryDist, "scenario-test.umd.js");
            else if (pathname === "/dist/scenario-test.umd.js") {
                // 仓库内示例的 index.html 引用 ../../dist/scenario-test.umd.js（浏览器规范化为 /dist/...）
                filePath = path.join(libraryDist, "scenario-test.umd.js");
            }
            else if (pathname === "/node_modules/@yc_yzkj/scenario-test/dist/scenario-test.umd.js") {
                // 兼容 npm 包路径引用；运行时副本优先由项目 .scenario-test/ 提供
                filePath = path.join(libraryDist, "scenario-test.umd.js");
            }
            else {
                const relativePath = pathname === "/" ? "index.html" : pathname.replace(/^\/+/, "");
                filePath = safeFile(workspace, relativePath);
            }
            if (!filePath) { response.writeHead(403); response.end("Forbidden"); return; }
            if (!publicRuntime && isPrivateServePath(path.relative(workspace, filePath))) {
                response.writeHead(403); response.end("Forbidden"); return;
            }
            fs.stat(filePath, (error, stat) => {
                if (error || !stat.isFile()) {
                    // 静态文件未命中且配置了接口代理时，按同源请求转发到后端，绕开浏览器 CORS
                    if (!defaultTarget?.target) { response.writeHead(404); response.end("Not Found"); return; }
                    // 跨站页面可向回环地址发起写请求：来源不是本机 serve origin 时直接拒绝
                    if (!isProxyOriginAllowed(request.headers, request.headers.host, port)) {
                        response.writeHead(403, { "Content-Type": "text/plain; charset=utf-8" });
                        response.end("Forbidden: 代理只接受本机工作台来源的请求");
                        return;
                    }
                    let target;
                    try {
                        target = resolveRequestProxyTarget({
                            config,
                            defaultTarget,
                            defaultEnvKey: defaultTarget.envKey,
                            overrideBaseUrl,
                            envKey: request.headers[PROXY_ENV_HEADER]
                        });
                    } catch (targetError) {
                        respondProxyError(response, `Bad Gateway: ${targetError.message}`);
                        return;
                    }
                    proxyRequest(request, response, target.target, { timeoutMs: proxyTimeoutMs, insecure });
                    return;
                }
                // 检查真实路径，不能用公开名称的 junction 绕过私有目录限制。
                let realPath;
                try { realPath = fs.realpathSync(filePath); }
                catch { response.writeHead(404); response.end("Not Found"); return; }
                if (!publicRuntime && isPrivateServePath(path.relative(workspace, realPath))) {
                    response.writeHead(403); response.end("Forbidden"); return;
                }
                serveStaticFile(response, filePath, { e2eNavigation: pathname === "/" && extensions.some((extension) => extension.name === "e2e") });
            });
        } catch {
            response.writeHead(400);
            response.end("Bad Request");
        }
    });
    let disposal;
    server.disposeExtensions = () => disposal ??= Promise.allSettled(
        extensions.map((extension) => Promise.resolve().then(() => extension.dispose?.()))
    ).then((results) => {
        const failures = results.filter((result) => result.status === "rejected");
        if (failures.length) throw new AggregateError(failures.map((result) => result.reason), "serve 扩展清理失败");
    });
    // close 事件作为兜底；有 SSE 的调用方应先 await disposeExtensions 再 close。
    server.on("close", () => { server.disposeExtensions().catch((error) => server.emit("extensionDisposeError", error)); });
    return server;
}
