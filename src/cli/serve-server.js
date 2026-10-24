import fs from "node:fs";
import http from "node:http";
import https from "node:https";
import path from "node:path";
import { isRealPathWithinRoot } from "../utils/path-validator.js";

// serve 的静态服务 + 同源接口代理从 cli.js 拆出：这一层是安全敏感的网路边界面
// （Host 白名单 / 路径穿越 / hop-by-hop 头剥离），transport 与端口可注入后可直接单测。

// 上游空闲超时：响应头尚未发出时返回 502；传输中途超时/断连则无法再写响应头，
// 只能销毁下游连接。参数化（如 --proxy-timeout）需扩展 contract，暂以常量 + README 说明为准。
export const PROXY_TIMEOUT_MS = 30000;

// 转发时剔除 hop-by-hop 头（RFC 7230 §6.1），避免把客户端连接语义泄漏给上游；
// Node 会按 targetUrl 重建 host/connection，显式删除可防止冲突。
export const HOP_BY_HOP_HEADERS = new Set([
    "connection", "keep-alive", "proxy-authenticate", "proxy-authorization",
    "te", "trailer", "transfer-encoding", "upgrade", "host"
]);

// RFC 7230 §6.1：Connection 头点名的字段同样是逐跳的，需随静态名单一并剔除
export function connectionNamedHeaders(connectionValue) {
    return String(connectionValue || "")
        .split(",")
        .map((item) => item.trim().toLowerCase())
        .filter(Boolean);
}

// 请求/响应两个方向共用同一套剥离规则，避免两处名单漂移
function headerValue(headers, name) {
    if (!headers) return undefined;
    if (headers[name] !== undefined) return headers[name];
    const matched = Object.keys(headers).find((key) => key.toLowerCase() === name);
    return matched === undefined ? undefined : headers[matched];
}

export function filterProxyHeaders(headers, hopByHopHeaders = HOP_BY_HOP_HEADERS) {
    const named = new Set(connectionNamedHeaders(headerValue(headers, "connection")));
    const filtered = {};
    for (const [name, value] of Object.entries(headers || {})) {
        const lower = String(name).toLowerCase();
        if (!hopByHopHeaders.has(lower) && !named.has(lower)) filtered[name] = value;
    }
    return filtered;
}

// 响应已开始时无法再写状态码：只销毁连接，让浏览器立即失败而不是挂起
export function abortProxyResponse(response) {
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

// 按代理目标协议选择转发模块；无法识别（缺 http(s):// 前缀或非法 URL）时返回 null，
// 由调用方降级为 502 提示——代理目标错误属于配置问题，不应让 serve 进程退出。
export function proxyTransport(targetUrl, transports = { http, https }) {
    try {
        const protocol = new URL(targetUrl).protocol;
        if (protocol === "https:") return transports.https;
        if (protocol === "http:") return transports.http;
    } catch {
        return null;
    }
    return null;
}

export function proxyRequest(request, response, targetUrl, options = {}) {
    const transport = options.transport || proxyTransport(targetUrl, options.transports);
    if (!transport) {
        respondProxyError(
            response,
            `Bad Gateway: 接口代理目标无效: ${targetUrl}\n` +
            "请检查环境 baseUrl，必须带协议前缀（http:// 或 https://）"
        );
        return;
    }
    const hopByHopHeaders = options.hopByHopHeaders || HOP_BY_HOP_HEADERS;
    const headers = filterProxyHeaders(request.headers, hopByHopHeaders);
    const timeoutMs = options.timeoutMs ?? PROXY_TIMEOUT_MS;
    const secure = options.secure ?? transport === https;
    let upstream;
    try {
        // 保持原拼接语义：targetUrl 已去尾部斜杠，若带路径前缀则原样保留
        upstream = transport.request(targetUrl + request.url, {
            method: request.method,
            headers,
            // serve 是本地联调代理，内网 https 后端普遍使用自签证书；
            // 与 vite/webpack-dev-server 的 proxy secure:false 同语义，放宽上游证书校验
            ...(secure ? { rejectUnauthorized: false } : {})
        }, (upstreamResponse) => {
            // 响应方向同样剔除 hop-by-hop 头，避免把上游连接语义（transfer-encoding/keep-alive 等）透传给浏览器；
            // Connection 点名的自定义字段同样剔除
            response.writeHead(
                upstreamResponse.statusCode || 502,
                filterProxyHeaders(upstreamResponse.headers, hopByHopHeaders)
            );
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

// Host 白名单：serve 绑定 127.0.0.1 仅供本机回环访问。校验 Host 头可阻断 DNS rebinding 等
// 跨源读取（攻击域名解析到 127.0.0.1 后，浏览器请求仍会携带攻击者的 Host），
// 与 vite/webpack-dev-server 的 host 校验同类加固
export function isAllowedServeHost(hostHeader, port) {
    const host = String(hostHeader || "").trim().toLowerCase();
    return [`127.0.0.1:${port}`, `localhost:${port}`, `[::1]:${port}`, "127.0.0.1", "localhost", "[::1]"].includes(host);
}

export function safeFile(root, relativePath) {
    const candidate = path.resolve(root, relativePath);
    const relative = path.relative(root, candidate);
    if (!relative || relative.startsWith("..") || path.isAbsolute(relative)) return null;
    // serve 真实读文件：junction/符号链接在词法层不可见，按真实位置再判一次
    return isRealPathWithinRoot(root, candidate) ? candidate : null;
}

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

function resolveStaticPath(pathname, { workspace, libraryDist }) {
    if (pathname === "/__scenario-test__/scenario-test.umd.js") return path.join(libraryDist, "scenario-test.umd.js");
    // 仓库内示例的 index.html 引用 ../../dist/scenario-test.umd.js（浏览器规范化为 /dist/...）
    if (pathname === "/dist/scenario-test.umd.js") return path.join(libraryDist, "scenario-test.umd.js");
    // 兼容 npm 包路径引用；运行时副本优先由项目 .scenario-test/ 提供
    if (pathname === "/node_modules/@yc_yzkj/scenario-test/dist/scenario-test.umd.js") {
        return path.join(libraryDist, "scenario-test.umd.js");
    }
    const relativePath = pathname === "/" ? "index.html" : pathname.replace(/^\/+/, "");
    return safeFile(workspace, relativePath);
}

export function createServeRequestHandler(options = {}) {
    const { workspace, libraryDist, port, proxyTarget = "" } = options;
    return function handleServeRequest(request, response) {
        try {
            if (!isAllowedServeHost(request.headers.host, port)) {
                response.writeHead(403);
                response.end("Forbidden");
                return;
            }
            const pathname = decodeURIComponent(new URL(request.url, "http://127.0.0.1").pathname);
            const filePath = resolveStaticPath(pathname, { workspace, libraryDist });
            if (!filePath) { response.writeHead(403); response.end("Forbidden"); return; }
            fs.stat(filePath, (error, stat) => {
                if (error || !stat.isFile()) {
                    // 静态文件未命中且配置了接口代理时，按同源请求转发到后端，绕开浏览器 CORS
                    if (proxyTarget) { proxyRequest(request, response, proxyTarget, options); return; }
                    response.writeHead(404); response.end("Not Found"); return;
                }
                serveStaticFile(response, filePath);
            });
        } catch {
            response.writeHead(400);
            response.end("Bad Request");
        }
    };
}

// 端口与 transport 均由调用方注入：生产走固定端口 + 真实 http(s)，测试可直接 listen(0) 或替换 transport
export function createServeServer(options = {}) {
    return http.createServer(createServeRequestHandler(options));
}
