// 开发模式：监听 src 变化自动重建 dist，并提供静态服务预览 examples。
// 用法：node scripts/dev.mjs [--port 4300]
// 打开 http://127.0.0.1:4300/examples/basic/ 等示例页面，修改 src 保存后自动重建，刷新页面即可。
// 示例页面与 serve 命令一样走同源代理：HTML 注入 __SCENARIO_TEST_SERVE_PROXY__ 标记，
// 未命中静态文件的请求（/health、/slow 等 mock 端点）转发给自动拉起的 mock 子进程。
// mock 端口从 4310 起自动避让（可用 MOCK_PORT 指定），避免被本机其它程序（如 QQ）占住导致示例必坏。
import fs from "node:fs";
import http from "node:http";
import net from "node:net";
import path from "node:path";
import { spawn } from "node:child_process";

const root = path.resolve(import.meta.dirname, "..");
const srcDir = path.join(root, "src");
const port = Number(process.argv.find((item, index) => process.argv[index - 1] === "--port") || 4300);

let rebuildTimer = null;
let rebuilding = false;
let pending = false;

function rebuild() {
    if (rebuilding) { pending = true; return; }
    rebuilding = true;
    const startedAt = Date.now();
    const child = spawn(process.execPath, [path.join(root, "scripts/build.mjs")], { cwd: root, stdio: ["inherit", "pipe", "pipe"] });
    child.stdout.on("data", (chunk) => process.stdout.write(chunk));
    child.stderr.on("data", (chunk) => process.stderr.write(chunk));
    child.on("close", (code) => {
        rebuilding = false;
        if (code === 0) console.log(`[dev] 构建完成（${Date.now() - startedAt}ms），刷新浏览器查看效果`);
        else console.error(`[dev] 构建失败，退出码 ${code}`);
        if (pending) { pending = false; rebuild(); }
    });
}

function scheduleRebuild() {
    if (rebuildTimer) clearTimeout(rebuildTimer);
    rebuildTimer = setTimeout(rebuild, 300);
}

// build 每次都会写回 src 下的生成文件；watch 必须排除它们，否则构建产物写盘
// 再次触发重建事件，形成"构建→写盘→再构建"的自触发无限循环
const GENERATED_SOURCES = new Set(["version.generated.js", "browser/tailwind.generated.js"]);

function watchSources() {
    fs.watch(srcDir, { recursive: true }, (eventType, filename) => {
        // Windows 下 filename 用反斜杠分隔，统一归一化后再比对
        const normalized = String(filename || "").replace(/\\/g, "/");
        if (GENERATED_SOURCES.has(normalized)) return;
        if (/\.(js|mjs)$/.test(normalized)) {
            console.log(`[dev] 变更: ${normalized}，重建中...`);
            scheduleRebuild();
        }
    });
    console.log(`[dev] 监听 ${srcDir}，保存 src 下文件将自动重建 dist`);
}

function safeFile(relativePath) {
    const candidate = path.resolve(root, relativePath);
    const relative = path.relative(root, candidate);
    return relative && (relative.startsWith("..") || path.isAbsolute(relative)) ? null : candidate;
}

function contentType(filePath) {
    return ({
        ".html": "text/html; charset=utf-8",
        ".js": "application/javascript; charset=utf-8",
        ".cjs": "application/javascript; charset=utf-8",
        ".mjs": "application/javascript; charset=utf-8",
        ".json": "application/json; charset=utf-8",
        ".css": "text/css; charset=utf-8",
        ".map": "application/json; charset=utf-8",
        ".svg": "image/svg+xml",
        ".txt": "text/plain; charset=utf-8"
    })[path.extname(filePath).toLowerCase()] || "application/octet-stream";
}

function renderIndexHtml(serverPort) {
    return `<!doctype html>
<html lang="zh-CN">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>scenario-test 示例索引</title>
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
            background-color: #f8fafc;
            color: #1e293b;
            padding: 40px 20px;
            line-height: 1.5;
        }
        .container { max-width: 900px; margin: 0 auto; }
        header { margin-bottom: 32px; border-bottom: 1px solid #e2e8f0; padding-bottom: 20px; }
        h1 { font-size: 24px; font-weight: 700; color: #0f172a; margin-bottom: 8px; }
        p.desc { font-size: 14px; color: #64748b; }
        .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 20px; margin-top: 24px; }
        .card {
            background: #ffffff;
            border: 1px solid #e2e8f0;
            border-radius: 12px;
            padding: 24px;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            transition: all 0.2s ease;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
        }
        .card:hover {
            border-color: #3b82f6;
            box-shadow: 0 8px 20px rgba(59, 130, 246, 0.12);
            transform: translateY(-2px);
        }
        .badge {
            display: inline-block;
            font-size: 12px;
            font-weight: 600;
            padding: 2px 8px;
            border-radius: 9999px;
            margin-bottom: 12px;
            width: fit-content;
        }
        .badge-blue { background: #eff6ff; color: #2563eb; }
        .badge-emerald { background: #ecfdf5; color: #059669; }
        .badge-amber { background: #fffbeb; color: #d97706; }
        h2 { font-size: 18px; font-weight: 600; color: #1e293b; margin-bottom: 8px; }
        .summary { font-size: 13px; color: #475569; margin-bottom: 16px; min-height: 48px; }
        .notes { font-size: 12px; color: #94a3b8; background: #f1f5f9; padding: 8px 12px; border-radius: 6px; margin-bottom: 16px; }
        .btn {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            background: #2563eb;
            color: #ffffff;
            text-decoration: none;
            padding: 10px 16px;
            border-radius: 8px;
            font-size: 14px;
            font-weight: 500;
            transition: background-color 0.15s ease;
        }
        .btn:hover { background: #1d4ed8; }
        footer { margin-top: 40px; text-align: center; font-size: 12px; color: #94a3b8; }
    </style>
</head>
<body>
    <div class="container">
        <header>
            <h1>场景测试工作台（开发调试）</h1>
            <p class="desc">当前服务运行于 http://127.0.0.1:${serverPort}，请选择要调试或体验的场景示例：</p>
        </header>

        <div class="grid">
            <div class="card">
                <div>
                    <span class="badge badge-blue">入门推荐</span>
                    <h2>1. Basic 基础示例</h2>
                    <p class="summary">包含最小配置、健康检查、基础断言与清理步骤。适合快速验证 UI 工作台与核心 DSL 功能。</p>
                    <div class="notes">无需第三方服务（dev 自动启动本地 Mock 并同源代理）</div>
                </div>
                <a class="btn" href="/examples/basic/">进入 Basic 工作台 →</a>
            </div>

            <div class="card">
                <div>
                    <span class="badge badge-emerald">完整流程</span>
                    <h2>2. Complete 完整流程</h2>
                    <p class="summary">包含用户登录、Token 提取注入、重试机制、条件跳过等完整生命周期。</p>
                    <div class="notes">dev 模式自动提供本地 Mock（手动运行: <code>node .\\examples\\complete\\mock-server.cjs</code>）</div>
                </div>
                <a class="btn" href="/examples/complete/">进入 Complete 工作台 →</a>
            </div>

            <div class="card">
                <div>
                    <span class="badge badge-amber">安全进阶</span>
                    <h2>3. Security Best Practices</h2>
                    <p class="summary">展示环境变量安全映射、路径穿越安全防护、插件安全校验与错误遮蔽规范。</p>
                    <div class="notes">安全规则与最佳配置参考</div>
                </div>
                <a class="btn" href="/examples/security-best-practices/">进入 Security 工作台 →</a>
            </div>

            <div class="card">
                <div>
                    <span class="badge badge-blue">目录结构</span>
                    <h2>4. 多层目录示例</h2>
                    <p class="summary">场景按 common/auth/order/refund/task 多级目录组织，用于验证左侧目录树的层级、折叠与排序。</p>
                    <div class="notes">复用 Basic 的本地 Mock（dev 自动同源代理）</div>
                </div>
                <a class="btn" href="/examples/tree-demo/">进入目录树工作台 →</a>
            </div>
        </div>

        <footer>
            <span>示例请求由本地 Mock 经同源代理提供 · @yc_yzkj/scenario-test 开发预览</span>
        </footer>
    </div>
</body>
</html>`;
}

function startServer() {
    const server = http.createServer((request, response) => {
        try {
            const pathname = decodeURIComponent(new URL(request.url, "http://127.0.0.1").pathname);
            if (pathname === "/" || pathname === "/examples" || pathname === "/examples/") {
                response.writeHead(200, { "Cache-Control": "no-store", "Content-Type": "text/html; charset=utf-8" });
                response.end(renderIndexHtml(port));
                return;
            }
            const relativePath = pathname.replace(/^\/+/, "");
            let filePath = safeFile(relativePath);
            if (filePath) {
                const stat = fs.existsSync(filePath) ? fs.statSync(filePath) : null;
                if (stat && stat.isDirectory()) filePath = path.join(filePath, "index.html");
            }
            if (!filePath) { response.writeHead(403); response.end("Forbidden"); return; }
            fs.stat(filePath, (error, stat) => {
                // 未命中静态文件（/health、/slow 等示例 mock 端点）转发给 mock 子进程
                if (error || !stat.isFile()) { proxyToMock(request, response); return; }
                const headers = { "Cache-Control": "no-store", "Content-Type": contentType(filePath) };
                if (path.extname(filePath).toLowerCase() !== ".html") {
                    response.writeHead(200, headers);
                    fs.createReadStream(filePath).pipe(response);
                    return;
                }
                fs.readFile(filePath, "utf8", (readError, html) => {
                    if (readError) { response.writeHead(500); response.end("Internal Server Error"); return; }
                    // 与 serve 命令一致：注入同源代理标记，工作台请求走当前源，免 CORS 且不受 mock 端口影响
                    const marker = "<script>window.__SCENARIO_TEST_SERVE_PROXY__ = true;</script>";
                    const headPattern = /<head(?:\s[^>]*)?>/i;
                    const content = headPattern.test(html)
                        ? html.replace(headPattern, (head) => head + marker)
                        : marker + html;
                    response.writeHead(200, headers);
                    response.end(content);
                });
            });
        } catch {
            response.writeHead(400);
            response.end("Bad Request");
        }
    });
    server.listen(port, "127.0.0.1", () => {
        console.log(`[dev] 工作台服务: http://127.0.0.1:${port}/`);
        console.log(`[dev] 示例页面: http://127.0.0.1:${port}/examples/basic/`);
        console.log(`[dev] 按 Ctrl+C 停止`);
    });
}

let mockChild = null;
let mockPort = 0;

function checkPortFree(port) {
    return new Promise((resolve) => {
        const probe = net.createServer();
        probe.once("error", () => resolve(false));
        probe.once("listening", () => probe.close(() => resolve(true)));
        probe.listen(port, "127.0.0.1");
    });
}

async function pickMockPort() {
    if (process.env.MOCK_PORT) return Number(process.env.MOCK_PORT);
    for (let candidate = 4310; candidate <= 4329; candidate += 1) {
        if (await checkPortFree(candidate)) return candidate;
    }
    return 0;
}

async function ensureMockServer() {
    mockPort = await pickMockPort();
    if (!mockPort) {
        console.warn("[dev] 4310-4329 端口均被占用，示例 Mock 服务未启动（可用 MOCK_PORT 指定其它端口）");
        return;
    }
    mockChild = spawn(
        process.execPath,
        [path.join(root, "examples", "complete", "mock-server.cjs")],
        { cwd: root, stdio: ["ignore", "pipe", "pipe"], env: { ...process.env, MOCK_PORT: String(mockPort) } }
    );
    mockChild.stdout.on("data", (chunk) => process.stdout.write(chunk));
    mockChild.stderr.on("data", (chunk) => process.stderr.write(chunk));
    mockChild.on("close", (code) => {
        mockChild = null;
        if (code) console.warn(`[dev] Mock 服务异常退出（code ${code}），示例接口请求将返回 502`);
    });
    console.log(`[dev] 已启动示例 Mock 服务: http://127.0.0.1:${mockPort}（示例请求经同源代理转发）`);
}

function stopMockServer() {
    if (mockChild) {
        mockChild.kill();
        mockChild = null;
    }
}

process.on("exit", stopMockServer);
process.on("SIGINT", () => { stopMockServer(); process.exit(0); });
process.on("SIGTERM", () => { stopMockServer(); process.exit(0); });

// 与 serve 命令一致：剔除 hop-by-hop 头，避免把客户端连接语义泄漏给上游
const HOP_BY_HOP_HEADERS = new Set(["connection", "keep-alive", "transfer-encoding", "upgrade", "host"]);

function proxyToMock(request, response) {
    if (!mockChild || !mockPort) {
        response.writeHead(502, { "Content-Type": "text/plain; charset=utf-8" });
        response.end("Mock 服务未启动（端口被占用或启动失败），示例接口不可用");
        return;
    }
    const headers = { ...request.headers };
    for (const name of HOP_BY_HOP_HEADERS) delete headers[name];
    const upstream = http.request(
        { host: "127.0.0.1", port: mockPort, path: request.url, method: request.method, headers },
        (res) => {
            const resHeaders = { ...res.headers };
            for (const name of HOP_BY_HOP_HEADERS) delete resHeaders[name];
            response.writeHead(res.statusCode || 502, resHeaders);
            res.pipe(response);
        }
    );
    upstream.on("error", (error) => {
        if (response.headersSent) { response.destroy(); return; }
        response.writeHead(502, { "Content-Type": "text/plain; charset=utf-8" });
        response.end(`Mock 服务不可用: ${error.code || error.message}`);
    });
    request.pipe(upstream);
}

rebuild();
watchSources();
startServer();
ensureMockServer();