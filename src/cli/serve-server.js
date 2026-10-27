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

export function serveStaticFile(response, filePath) {
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
        return;
    }
    fs.readFile(filePath, "utf8", function (error, html) {
        if (error) {
            response.writeHead(500);
            response.end("Internal Server Error");
            return;
        }
        const marker = "<script>window.__SCENARIO_TEST_SERVE_PROXY__ = true;</script>";
        const headPattern = /<head(?:\s[^>]*)?>/i;
        const content = headPattern.test(html)
            ? html.replace(headPattern, function (head) { return head + marker; })
            : marker + html;
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
            // serve 是本地联调代理，内网 https 后端普遍使用自签证书；
            // 与 vite/webpack-dev-server 的 proxy secure:false 同语义，放宽上游证书校验
            ...(transport === https ? { rejectUnauthorized: false } : {})
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
    request.pipe(upstream);
}

// 静态服务 + 同源代理。proxyTarget 形如 { key, envKey, target }。
export function createServeServer(options) {
    const {
        workspace,
        libraryDist,
        port,
        config,
        defaultTarget,
        overrideBaseUrl = "",
        proxyTimeoutMs = DEFAULT_PROXY_TIMEOUT_MS
    } = options;
    return http.createServer((request, response) => {
        try {
            if (!isAllowedServeHost(request.headers.host, port)) {
                response.writeHead(403);
                response.end("Forbidden");
                return;
            }
            const pathname = decodeURIComponent(new URL(request.url, "http://127.0.0.1").pathname);
            let filePath;
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
            fs.stat(filePath, (error, stat) => {
                if (error || !stat.isFile()) {
                    // 静态文件未命中且配置了接口代理时，按同源请求转发到后端，绕开浏览器 CORS
                    if (!defaultTarget?.target) { response.writeHead(404); response.end("Not Found"); return; }
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
                    proxyRequest(request, response, target.target, { timeoutMs: proxyTimeoutMs });
                    return;
                }
                serveStaticFile(response, filePath);
            });
        } catch {
            response.writeHead(400);
            response.end("Bad Request");
        }
    });
}
