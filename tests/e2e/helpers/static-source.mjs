// 本地"发布源"：把当前 checkout 构建出的 dist/ 打成与真实发布一致的整包
// （scenario-test-runtime-v<版本>.tar.gz + .sha256），经 http://127.0.0.1
// 提供给安装脚本下载。设计约束见 docs/design-e2e-test-integration.md §2.2：
//   - 包与清单必须由被测 checkout 现场生成：E2E 验证的是安装脚本的校验逻辑，
//     不是已发布产物的新鲜度；
//   - 只绑 127.0.0.1、listen 0 随机端口、无外网；
//   - 被测产物必须是已构建的 dist/，缺失即报错，不在测试内重建。
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import { buildRuntime, RUNTIME_FILES } from "../../../scripts/build-runtime.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");

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

export async function startStaticSource(options = {}) {
    const version = options.version ?? detectPinnedVersion();
    const tampered = new Set(options.tamperFiles || []);

    // 与真实发布走同一条打包路径：E2E 因此覆盖了 build-runtime 的实际产物布局，
    // 而不是另外拼一份"测试版"文件集合。
    const releaseDir = fs.mkdtempSync(path.join(repoRoot, ".e2e-release-"));
    let built;
    try {
        built = buildRuntime({ outDir: releaseDir });
    } catch (error) {
        fs.rmSync(releaseDir, { recursive: true, force: true });
        throw new Error(`被测产物缺失，先运行 npm run build：${error.message}`);
    }

    const archiveBody = fs.readFileSync(built.archivePath);
    const archiveChecksum = crypto.createHash("sha256").update(archiveBody).digest("hex");
    // 篡改模拟的是"包在传输中被替换"：把整包哈希写成错的值，安装脚本的 sidecar
    // 校验必须挡住。包内单文件被改的情形由解析 release.json 的第二层挡住。
    const servedChecksum = tampered.size > 0 ? "0".repeat(64) : archiveChecksum;

    const server = http.createServer((request, response) => {
        const url = new URL(request.url, "http://127.0.0.1");
        const name = decodeURIComponent(url.pathname.replace(/^\/+/, ""));
        if (name === `${built.archiveName}.sha256`) {
            response.writeHead(200, { "Content-Type": "text/plain; charset=utf-8" });
            response.end(`${servedChecksum}  ${built.archiveName}\n`);
            return;
        }
        if (name === built.archiveName) {
            response.writeHead(200, { "Content-Type": "application/octet-stream" });
            response.end(archiveBody);
            return;
        }
        response.writeHead(404, { "Content-Type": "text/plain" });
        response.end("not found");
    });

    await new Promise((resolve, reject) => {
        server.once("error", reject);
        server.listen(0, "127.0.0.1", resolve);
    });
    const port = server.address().port;
    const baseUrl = `http://127.0.0.1:${port}`;

    return {
        baseUrl,
        version,
        archiveName: built.archiveName,
        manifest: built.manifest,
        close: () => new Promise((resolve) => {
            server.close(() => {
                fs.rmSync(releaseDir, { recursive: true, force: true });
                resolve();
            });
        })
    };
}

export { RUNTIME_FILES };
