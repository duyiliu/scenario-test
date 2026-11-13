// 本地"CDN"：把当前 checkout 构建出的 dist/ 4 个运行时文件 + AI 规则文件经
// http://127.0.0.1 提供给安装脚本下载，并对这些文件实时算 SHA-256 动态生成
// release.json 清单。设计约束见 docs/design-e2e-test-integration.md §2.2：
//   - 清单必须动态生成（committed release.json 是发布产物，与 dist 存在合理时差，
//     E2E 验证的是"脚本的校验逻辑"，不是清单新鲜度）；
//   - 只绑 127.0.0.1、listen 0 随机端口、无外网；
//   - 被测产物必须是已构建的 dist/，缺失即报错，不在测试内重建。
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");

// 安装脚本 RUNTIME_FILES 的事实源：两个脚本各自下载这 6 个文件。
// 与 scripts/install.sh / install.ps1 的清单保持一致（重复是有意的——
// E2E 用独立副本防止"测试与被测脚本同改同漂"的双份假绿）。
const RUNTIME_FILES = [
    "scenario-test-cli.cjs",
    "scenario-test.umd.js",
    "scenario-test.d.ts",
    "scenario-test-capabilities.json",
    "AI_SCENARIO_PROMPT.md",
    "SCENARIO_PATTERNS.md"
];

function sha256(filePath) {
    return crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
}

// version 取「被执行安装脚本钉死的版本号」：
//   install.sh 的 SCENARIO_TEST_VERSION 默认值 / install.ps1 的 $ScenarioTestVersion 字面量。
// 这样 release.json 的 version 闸门锁正向匹配，同时反向用例靠"版本不一致"也能触发。
function detectPinnedVersion() {
    const sh = fs.readFileSync(path.join(repoRoot, "scripts/install.sh"), "utf8");
    const shMatch = /SCENARIO_TEST_VERSION:-([0-9]+\.[0-9]+\.[0-9]+)/.exec(sh);
    if (shMatch) return shMatch[1];
    const ps1 = fs.readFileSync(path.join(repoRoot, "scripts/install.ps1"), "utf8");
    const ps1Match = /\$ScenarioTestVersion\s*=\s*"([0-9]+\.[0-9]+\.[0-9]+)"/.exec(ps1);
    if (ps1Match) return ps1Match[1];
    const pkg = JSON.parse(fs.readFileSync(path.join(repoRoot, "package.json"), "utf8"));
    return pkg.version;
}

// 从 dist/ 与 skills runtime/ 收集可被下载的文件本体。
// 前 4 个来自 dist/（构建产物），后 2 个 AI 规则来自 skills runtime/（脚本原样下载）。
function resolveSourceFile(name) {
    const distPath = path.join(repoRoot, "dist", name);
    if (fs.existsSync(distPath)) return distPath;
    const skillPath = path.join(repoRoot, "skills/scenario-test/runtime", name);
    if (fs.existsSync(skillPath)) return skillPath;
    return null;
}

export async function startStaticSource(options = {}) {
    const version = options.version ?? detectPinnedVersion();
    const tampered = new Set(options.tamperFiles || []);
    const missing = [];

    const files = new Map();
    for (const name of RUNTIME_FILES) {
        const source = resolveSourceFile(name);
        if (!source) { missing.push(name); continue; }
        files.set(name, source);
    }
    if (missing.length) {
        throw new Error(`被测产物缺失，先运行 npm run build：${missing.join(", ")}`);
    }

    const manifest = {
        package: "@yc_yzkj/scenario-test",
        version,
        source: "e2e-local-static-source",
        generatedAt: new Date().toISOString(),
        sha256: {}
    };
    for (const name of RUNTIME_FILES) {
        manifest.sha256[name] = sha256(files.get(name));
    }
    const manifestBody = JSON.stringify(manifest, null, 2);

    const server = http.createServer((request, response) => {
        const url = new URL(request.url, "http://127.0.0.1");
        const name = decodeURIComponent(url.pathname.replace(/^\/+/, ""));
        if (name === "release.json") {
            response.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
            response.end(manifestBody);
            return;
        }
        const source = files.get(name);
        if (!source) {
            response.writeHead(404, { "Content-Type": "text/plain" });
            response.end("not found");
            return;
        }
        if (tampered.has(name)) {
            // 篡改：返回同长但内容不同的字节，触发 SHA-256 校验失败
            const body = fs.readFileSync(source);
            const corrupted = Buffer.from(body);
            corrupted[0] = corrupted[0] ^ 0xff;
            response.writeHead(200, { "Content-Type": "application/octet-stream" });
            response.end(corrupted);
            return;
        }
        response.writeHead(200, { "Content-Type": "application/octet-stream" });
        fs.createReadStream(source).pipe(response);
    });

    await new Promise((resolve, reject) => {
        server.once("error", reject);
        server.listen(0, "127.0.0.1", resolve);
    });
    const port = server.address().port;
    const baseUrl = `http://127.0.0.1:${port}`;

    return {
        baseUrl,
        manifestUrl: `${baseUrl}/release.json`,
        version,
        manifest,
        close: () => new Promise((resolve) => server.close(resolve))
    };
}
