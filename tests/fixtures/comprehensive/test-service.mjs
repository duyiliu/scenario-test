// 综合测试用本地 HTTP 服务（无真实账号、无外网依赖）。
//
// 设计约束：
//   - 每个用例各自 startService()，监听 127.0.0.1 的临时端口，close() 后端口立即释放；
//   - 所有响应完全由请求参数决定（计数类路由用显式重置），保证可复跑与确定性；
//   - 记录收到的请求（headers/body/cookie），供断言「请求侧真实发生了什么」，
//     而不是只断言被测库自己的返回值。
import http from "node:http";

function json(response, status, payload, headers = {}) {
    response.writeHead(status, { "Content-Type": "application/json; charset=utf-8", ...headers });
    response.end(JSON.stringify(payload));
}

// 极简 multipart 解析：只服务于测试，提取字段名与内容，不追求 RFC 完整性
function parseMultipart(raw, contentType) {
    const match = /boundary=(.+)$/.exec(String(contentType || ""));
    if (!match) return { fields: {}, files: [] };
    const boundary = `--${match[1].replace(/^"|"$/g, "")}`;
    const fields = {};
    const files = [];
    for (const part of raw.split(boundary)) {
        const nameMatch = /name="([^"]+)"/.exec(part);
        if (!nameMatch) continue;
        const filenameMatch = /filename="([^"]*)"/.exec(part);
        const separator = part.indexOf("\r\n\r\n");
        if (separator < 0) continue;
        const content = part.slice(separator + 4, part.lastIndexOf("\r\n"));
        if (filenameMatch) files.push({ field: nameMatch[1], filename: filenameMatch[1], content });
        else fields[nameMatch[1]] = content;
    }
    return { fields, files };
}

export async function startService(options = {}) {
    const hits = [];
    // flaky 计数按 key 隔离：用例之间互不干扰，重置用 reset()
    const counters = new Map();
    // 同时在处理中的请求数与其峰值：并发测试用它做「不依赖机器负载」的独立 oracle，
    // 比对比两次子进程墙钟耗时稳定得多（进程启动/GC 抖动会淹没 100ms 级差异）
    let inFlight = 0;
    let maxInFlight = 0;
    const state = { hiddenOrderId: options.hiddenOrderId || "order-404" };

    const server = http.createServer((request, response) => {
        const chunks = [];
        request.on("data", (chunk) => chunks.push(chunk));
        request.on("end", () => {
            const rawBody = Buffer.concat(chunks);
            const url = new URL(request.url, "http://127.0.0.1");
            const hit = {
                method: request.method,
                path: url.pathname,
                query: Object.fromEntries(url.searchParams),
                headers: request.headers,
                cookie: request.headers.cookie || "",
                body: rawBody.length ? rawBody.toString("utf8") : "",
                bodyBytes: rawBody.length
            };
            hits.push(hit);
            inFlight += 1;
            maxInFlight = Math.max(maxInFlight, inFlight);
            const path = url.pathname;
            response.on("close", () => { inFlight -= 1; });
            const counter = (key) => {
                const value = (counters.get(key) || 0) + 1;
                counters.set(key, value);
                return value;
            };

            if (path === "/health") {
                return json(response, 200, {
                    status: "UP",
                    version: "1.4.2",
                    components: [{ name: "db", status: "UP" }, { name: "cache", status: "UP" }],
                    tags: ["core", "ops"],
                    meta: { region: "cn-north", replica: 3 }
                });
            }
            if (path === "/ops/order") {
                const id = url.searchParams.get("id");
                if (!id || id === state.hiddenOrderId) {
                    return json(response, 200, { code: "NOT_FOUND", message: `订单 ${id} 不存在` });
                }
                return json(response, 200, {
                    code: "SUCCESS",
                    data: {
                        id,
                        amount: Number(url.searchParams.get("amount") || 128.5),
                        items: [{ sku: "A-1", qty: 2 }, { sku: "B-2", qty: 1 }],
                        buyer: { name: "测试买家", level: "VIP" }
                    }
                });
            }
            if (path === "/echo") {
                return json(response, 200, {
                    method: request.method,
                    path,
                    query: hit.query,
                    headers: hit.headers,
                    body: hit.body
                });
            }
            if (path === "/status") {
                // 显式返回任意状态码：用于「无断言时 HTTP 500 不得假绿」等场景
                const status = Number(url.searchParams.get("code") || 200);
                return json(response, status, { code: status >= 400 ? "FAIL" : "SUCCESS" });
            }
            if (path === "/biz") {
                // HTTP 200 + 业务失败：典型假绿入口
                return json(response, 200, { code: "FAIL", message: "库存不足", data: null });
            }
            if (path === "/login") {
                return json(response, 200, { ok: true }, {
                    "Set-Cookie": ["sid=sess-abc-123456; Path=/; HttpOnly", "theme=dark; Path=/"]
                });
            }
            if (path === "/secure-cookie") {
                return json(response, 200, { ok: true }, {
                    "Set-Cookie": ["secureToken=hidden-insecure; Path=/; Secure"]
                });
            }
            if (path === "/cross-site-cookie") {
                // Domain 指向其他站点：Jar 必须丢弃，不得把 cookie 带过去
                return json(response, 200, { ok: true }, {
                    "Set-Cookie": "leak=1; Domain=example.com; Path=/"
                });
            }
            if (path === "/logout") {
                return json(response, 200, { ok: true }, {
                    "Set-Cookie": "sid=; Path=/; Max-Age=0"
                });
            }
            if (path === "/me") {
                return json(response, 200, { cookie: hit.cookie, sid: /(?:^|; )sid=([^;]*)/.exec(hit.cookie)?.[1] || null });
            }
            if (path === "/upload") {
                const parsed = parseMultipart(rawBody.toString("latin1"), request.headers["content-type"]);
                return json(response, 200, {
                    fields: parsed.fields,
                    files: parsed.files.map((file) => ({
                        field: file.field,
                        filename: file.filename,
                        size: Buffer.from(file.content, "latin1").length,
                        marker: file.content.includes("UPLOAD-MARKER")
                    })),
                    totalBytes: rawBody.length
                });
            }
            if (path === "/download") {
                const name = url.searchParams.get("name") || "report.txt";
                const payload = Buffer.from(`file:${name}\nline2\n`, "utf8");
                response.writeHead(200, {
                    "Content-Type": "application/octet-stream",
                    "Content-Length": String(payload.length),
                    "Content-Disposition": `attachment; filename="${name}"`
                });
                return response.end(payload);
            }
            if (path === "/flaky") {
                // 前 failures 次返回 500，之后返回 200：重试语义的确定性探针
                const key = url.searchParams.get("key") || "default";
                const failures = Number(url.searchParams.get("failures") || 2);
                const attempt = counter(`flaky:${key}`);
                if (attempt <= failures) return json(response, 500, { code: "RETRY", attempt });
                return json(response, 200, { code: "SUCCESS", attempt });
            }
            if (path === "/flaky-error") {
                // 前 failures 次直接断开连接（网络错误），之后成功
                const key = url.searchParams.get("key") || "default";
                const failures = Number(url.searchParams.get("failures") || 1);
                const attempt = counter(`flaky-error:${key}`);
                if (attempt <= failures) {
                    request.socket.destroy();
                    return undefined;
                }
                return json(response, 200, { code: "SUCCESS", attempt });
            }
            if (path === "/slow") {
                const ms = Number(url.searchParams.get("ms") || 200);
                // 用 response 的 close 而非 request 的 close 清理定时器：请求体读完时
                // request 流就会 close，那会把响应一起取消掉，导致调用方永久挂起
                const timer = setTimeout(() => {
                    if (!response.writableEnded && !response.destroyed) json(response, 200, { code: "SLOW_OK", ms });
                }, ms);
                response.on("close", () => clearTimeout(timer));
                return undefined;
            }
            if (path === "/paged") {
                const total = Number(url.searchParams.get("total") || 5);
                return json(response, 200, {
                    list: Array.from({ length: total }, (_, index) => ({ id: index + 1, name: `item-${index + 1}` })),
                    virtual: Array.from({ length: total }, (_, index) => (index % 2 === 0 ? { id: index + 1 } : { name: `gap-${index}` }))
                });
            }
            if (path === "/big") {
                const bytes = Number(url.searchParams.get("bytes") || 1024);
                response.writeHead(200, { "Content-Type": "text/plain" });
                return response.end("a".repeat(bytes));
            }
            if (path === "/token") {
                return json(response, 200, {
                    accessToken: "token-value-123456",
                    clientSecret: "secret-value-abcdef",
                    plain: "plain-value-visible"
                });
            }
            return json(response, 404, { code: "NO_ROUTE", path });
        });
    });

    await new Promise((resolve, reject) => {
        server.once("error", reject);
        server.listen(options.port || 0, "127.0.0.1", resolve);
    });
    const port = server.address().port;

    return {
        port,
        baseUrl: `http://127.0.0.1:${port}`,
        hits,
        get maxInFlight() {
            return maxInFlight;
        },
        reset() {
            hits.length = 0;
            counters.clear();
            maxInFlight = 0;
            // keep-alive 连接可能复用到下一次用例，这里顺手断开，保证关闭时端口立即释放
            server.closeIdleConnections?.();
        },
        async close() {
            server.closeAllConnections?.();
            await new Promise((resolve) => server.close(resolve));
        }
    };
}

// 供 CLI 子进程夹具使用：把服务地址写进配置，避免用例各自拼字符串
export function envFor(baseUrl, key = "local", name = "本地") {
    return { key, name, baseUrl };
}
