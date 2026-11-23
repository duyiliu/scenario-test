// 发布前自检：从本地 HTTP 服务按真实下载路径重新拉取发布包，解包并核对
// 整包 sidecar 与包内 release.json。与安装脚本、ensure-runtime.mjs 同一套
// 校验语义，把"发布出去才发现装不上"提前到 CI 里。
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import zlib from "node:zlib";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { RUNTIME_FILES } from "./build-runtime.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const releaseDir = path.join(root, "release");
const packageInfo = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
const archiveName = `scenario-test-runtime-v${packageInfo.version}.tar.gz`;
const archivePath = path.join(releaseDir, archiveName);
const checksumPath = `${archivePath}.sha256`;

function sha256(buffer) {
    return createHash("sha256").update(buffer).digest("hex");
}

function fail(message) {
    console.error(`✗ ${message}`);
    process.exitCode = 1;
}

if (!fs.existsSync(archivePath)) fail(`缺少发布包：${archivePath}（先运行 npm run build:runtime）`);
if (!fs.existsSync(checksumPath)) fail(`缺少整包校验文件：${checksumPath}`);

if (!process.exitCode) {
    const archive = fs.readFileSync(archivePath);
    const expected = fs.readFileSync(checksumPath, "utf8").trim().split(/\s+/)[0].toLowerCase();
    if (sha256(archive) !== expected) fail("整包 SHA-256 与 sidecar 不一致");

    // 走一次 HTTP：确认服务端能按字节原样返回（杜绝行尾/编码在传输层被改写）
    const server = http.createServer((request, response) => {
        const name = decodeURIComponent(new URL(request.url, "http://127.0.0.1").pathname.replace(/^\/+/, ""));
        if (name === archiveName) {
            response.writeHead(200, { "Content-Type": "application/octet-stream" });
            response.end(archive);
        } else if (name === `${archiveName}.sha256`) {
            response.writeHead(200, { "Content-Type": "text/plain; charset=utf-8" });
            response.end(`${expected}  ${archiveName}\n`);
        } else {
            response.writeHead(404).end("not found");
        }
    });

    await new Promise((resolve, reject) => {
        server.once("error", reject);
        server.listen(0, "127.0.0.1", resolve);
    });

    try {
        const base = `http://127.0.0.1:${server.address().port}`;
        const fetched = Buffer.from(await (await fetch(`${base}/${archiveName}`)).arrayBuffer());
        const sidecar = (await (await fetch(`${base}/${archiveName}.sha256`)).text()).trim().split(/\s+/)[0].toLowerCase();
        if (sha256(fetched) !== sidecar) fail("经 HTTP 取回的包与 sidecar 不一致");

        // 解包并核对包内清单
        const tar = zlib.gunzipSync(fetched);
        const files = new Map();
        for (let offset = 0; offset + 512 <= tar.length;) {
            const header = tar.subarray(offset, offset + 512);
            if (header.every((byte) => byte === 0)) break;
            const readString = (start, length) => {
                const slice = header.subarray(start, start + length);
                const end = slice.indexOf(0);
                return slice.subarray(0, end === -1 ? slice.length : end).toString("utf8");
            };
            const name = readString(0, 100);
            const size = Number.parseInt(readString(124, 12).trim() || "0", 8);
            files.set(name, tar.subarray(offset + 512, offset + 512 + size));
            offset += 512 + Math.ceil(size / 512) * 512;
        }

        if (!files.has("release.json")) {
            fail("发布包缺少 release.json");
        } else {
            const manifest = JSON.parse(files.get("release.json").toString("utf8"));
            if (manifest.version !== packageInfo.version) fail(`release.json 版本 ${manifest.version} 与 package.json ${packageInfo.version} 不一致`);
            for (const name of RUNTIME_FILES) {
                const body = files.get(name);
                if (!body) { fail(`发布包缺少 ${name}`); continue; }
                const want = String(manifest.sha256?.[name] ?? "").toLowerCase();
                if (!want) { fail(`release.json 缺少 ${name} 的 SHA-256`); continue; }
                if (sha256(body) !== want) fail(`${name} 与 release.json 哈希不一致`);
            }
            if (!process.exitCode) {
                console.log(`✓ 发布包自检通过：${archiveName}（${RUNTIME_FILES.length + 1} 个文件，${(fetched.length / 1024).toFixed(1)} KB）`);
            }
        }
    } finally {
        await new Promise((resolve) => server.close(resolve));
    }
}
