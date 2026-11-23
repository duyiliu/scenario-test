// 把 dist/ 打成一个可直接下载的运行时发布包：
//   release/scenario-test-runtime-v<版本>.tar.gz
//   release/scenario-test-runtime-v<版本>.tar.gz.sha256
//
// 包的形态由消费方决定，改这里前先看两个消费方：
//   - scripts/install.ps1 / install.sh：下载 tar.gz → 校验 sidecar → 解压到
//     ~/.scenario-test/runtime/<版本>/
//   - skills/scenario-test/scripts/ensure-runtime.mjs：同一 URL、同一校验、同一落点
//
// tar 由本文件按 ustar 直接写出而不是 shell 调 tar：条目排序、mtime 归零、uid/gid 归零，
// 因此同一份 dist/ 重复构建得到逐字节相同的包，sidecar 哈希可复现，发布可核对。
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dist = path.join(root, "dist");

// 包内文件清单：顺序即 tar 内顺序，改动会改变包哈希，属发布动作的一部分。
export const RUNTIME_FILES = [
    "scenario-test-cli.cjs",
    "scenario-test.umd.js",
    "scenario-test.d.ts",
    "scenario-test-capabilities.json",
    "AI_SCENARIO_PROMPT.md",
    "SCENARIO_PATTERNS.md"
];

const MANIFEST_NAME = "release.json";

function sha256(buffer) {
    return createHash("sha256").update(buffer).digest("hex");
}

// ustar 头：奇数编号字段用八进制 ASCII + NUL 填充，校验和字段先按空格占位再回填。
function writeOctal(buffer, offset, length, value) {
    const text = value.toString(8).padStart(length - 1, "0");
    buffer.write(text, offset, length - 1, "ascii");
    buffer[offset + length - 1] = 0;
}

function tarHeader({ name, size, mode = 0o644, type = "0" }) {
    const header = Buffer.alloc(512, 0);
    let remaining = name;
    let prefix = "";
    if (Buffer.byteLength(name, "utf8") > 100) {
        // ustar 的 name 上限 100 字节，超长时切到 prefix 字段（255 字节）保持兼容。
        const bytes = Buffer.from(name, "utf8");
        let splitAt = bytes.length - 100;
        while (splitAt < bytes.length && (bytes[splitAt] & 0xc0) === 0x80) splitAt += 1;
        prefix = bytes.subarray(0, splitAt).toString("utf8").replace(/\/+$/, "");
        remaining = bytes.subarray(splitAt).toString("utf8");
    }
    header.write(remaining, 0, 100, "utf8");
    writeOctal(header, 100, 8, mode);
    writeOctal(header, 108, 8, 0);
    writeOctal(header, 116, 8, 0);
    writeOctal(header, 124, 12, size);
    writeOctal(header, 136, 12, 0);
    header.fill(0x20, 148, 156);
    header.write(type, 156, 1, "ascii");
    header.write("ustar", 257, 6, "ascii");
    header.write("00", 263, 2, "ascii");
    header.write("root", 265, 32, "ascii");
    header.write("root", 297, 32, "ascii");
    writeOctal(header, 329, 8, 0);
    writeOctal(header, 337, 8, 0);
    header.write(prefix, 345, 155, "utf8");
    let checksum = 0;
    for (const byte of header) checksum += byte;
    header.write(checksum.toString(8).padStart(6, "0"), 148, 6, "ascii");
    header[154] = 0;
    header[155] = 0x20;
    return header;
}

function padTo512(buffer) {
    const remainder = buffer.length % 512;
    return remainder === 0 ? buffer : Buffer.concat([buffer, Buffer.alloc(512 - remainder, 0)]);
}

export function createTarGz(entries) {
    const parts = [];
    for (const { name, content } of entries) {
        parts.push(tarHeader({ name, size: content.length }));
        parts.push(padTo512(content));
    }
    // ustar 归档以两个全零块结尾。
    parts.push(Buffer.alloc(1024, 0));
    return zlib.gzipSync(Buffer.concat(parts), { level: 9 });
}

function readPackageJson() {
    return JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
}

export function buildRuntime({ outDir = path.join(root, "release") } = {}) {
    const packageInfo = readPackageJson();
    const version = packageInfo.version;

    const missing = RUNTIME_FILES.filter((name) => !fs.existsSync(path.join(dist, name)));
    if (missing.length) {
        throw new Error(`dist/ 缺少运行时文件：${missing.join("、")}（先运行 npm run build）`);
    }

    const contents = new Map();
    for (const name of RUNTIME_FILES) {
        contents.set(name, fs.readFileSync(path.join(dist, name)));
    }

    const manifest = {
        package: packageInfo.name,
        version,
        // source 指向本次发布的 GitHub Release 资产目录，供 release.json 自证来源。
        source: `https://github.com/duyiliu/scenario-test/releases/download/v${version}/scenario-test-runtime-v${version}.tar.gz`,
        generatedAt: new Date().toISOString(),
        sha256: Object.fromEntries([...contents].map(([name, body]) => [name, sha256(body)]))
    };
    const manifestBody = Buffer.from(`${JSON.stringify(manifest, null, 2)}\n`, "utf8");

    const entries = [
        ...RUNTIME_FILES.map((name) => ({ name, content: contents.get(name) })),
        { name: MANIFEST_NAME, content: manifestBody }
    ];
    const archive = createTarGz(entries);
    const archiveName = `scenario-test-runtime-v${version}.tar.gz`;

    fs.mkdirSync(outDir, { recursive: true });
    fs.writeFileSync(path.join(outDir, archiveName), archive);
    fs.writeFileSync(path.join(outDir, `${archiveName}.sha256`), `${sha256(archive)}  ${archiveName}\n`, "utf8");

    return {
        version,
        archiveName,
        archivePath: path.join(outDir, archiveName),
        checksumPath: path.join(outDir, `${archiveName}.sha256`),
        manifest
    };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
    const outArgIndex = process.argv.indexOf("--out");
    const outDir = outArgIndex > 0 ? path.resolve(root, process.argv[outArgIndex + 1]) : path.join(root, "release");
    try {
        const result = buildRuntime({ outDir });
        const sizeKb = (fs.statSync(result.archivePath).size / 1024).toFixed(1);
        console.log(`运行时发布包：${result.archiveName}（${sizeKb} KB）`);
        console.log(`清单哈希：${result.manifest.sha256["scenario-test-cli.cjs"].slice(0, 16)}…`);
    } catch (error) {
        console.error(`构建运行时发布包失败：${error.message}`);
        process.exitCode = 1;
    }
}
