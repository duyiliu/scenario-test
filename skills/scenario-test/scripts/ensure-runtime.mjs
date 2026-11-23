#!/usr/bin/env node
// 按需安装 Skill 运行时：Skill 本身只有文本（约 26 KB），运行时在第一次真正要用
// CLI 时才下载，落到用户级版本目录 ~/.scenario-test/runtime/<版本>/。
//
// 与安装脚本共用同一份发布包和同一个落点：
//   <来源>/scenario-test-runtime-v<版本>.tar.gz      整包
//   <来源>/scenario-test-runtime-v<版本>.tar.gz.sha256 整包哈希
// 包里带 release.json，解压后逐文件再核一次。
//
// 为什么不装进 Skill 目录：skills CLI 每次 add/update 都会重建该目录，
// 1.2 MB 会反复下载；多 Agent（Codex/Claude）各装一份就是多份。放在用户级
// ~/.scenario-test 后，跨 Agent、跨版本共享，安装脚本也落到这里。
//
// 用法：
//   node ensure-runtime.mjs                        # 用 SKILL.md 的 metadata.version
//   node ensure-runtime.mjs --version 0.16.0       # 显式版本
//   node ensure-runtime.mjs --source <内网目录>     # 内网制品目录
//   node ensure-runtime.mjs --check                # 只检查，不下载
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import zlib from "node:zlib";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";

const skillRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const runtimeRoot = path.join(os.homedir(), ".scenario-test", "runtime");
const DEFAULT_BASE = "https://github.com/duyiliu/scenario-test/releases/download";

export const RUNTIME_FILES = [
    "scenario-test-cli.cjs",
    "scenario-test.umd.js",
    "scenario-test.d.ts",
    "scenario-test-capabilities.json",
    "AI_SCENARIO_PROMPT.md",
    "SCENARIO_PATTERNS.md"
];

function parseArgs(argv) {
    const options = { version: null, source: null, check: false };
    for (let i = 0; i < argv.length; i += 1) {
        const key = argv[i];
        if (key === "--check") { options.check = true; continue; }
        if (key !== "--version" && key !== "--source") {
            throw new Error(`未知参数：${key}（仅支持 --version、--source、--check）`);
        }
        const value = argv[i + 1];
        if (!value || value.startsWith("--")) throw new Error(`${key} 缺少值`);
        options[key.slice(2)] = value;
        i += 1;
    }
    return options;
}

// 版本来源的唯一事实是 SKILL.md 的 metadata.version：Skill 与运行时永远同版本，
// 避免"Skill 是 0.16.0、运行时是 0.15.0"这种错配。
function skillVersion() {
    const skillMd = fs.readFileSync(path.join(skillRoot, "SKILL.md"), "utf8");
    const match = /^\s*version:\s*"?([0-9][^"\n]*)"?\s*$/m.exec(skillMd);
    if (!match) throw new Error("SKILL.md 缺少 metadata.version，无法确定运行时版本");
    return match[1].trim();
}

function sha256(buffer) {
    return createHash("sha256").update(buffer).digest("hex");
}

function runtimeDirFor(version) {
    return path.join(runtimeRoot, version);
}

// 就绪判定：目录存在、release.json 可读且版本一致、清单里的文件全在。
// 不校验哈希（那是安装时的一次性动作），否则每次探测都要读 1.2 MB。
export function inspectRuntime(version) {
    const dir = runtimeDirFor(version);
    const manifestPath = path.join(dir, "release.json");
    if (!fs.existsSync(manifestPath)) {
        return { status: "missing", version, dir, reason: "release.json 不存在" };
    }
    let manifest;
    try {
        manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
    } catch (error) {
        return { status: "corrupt", version, dir, reason: `release.json 无法解析：${error.message}` };
    }
    if (manifest.version !== version) {
        return { status: "corrupt", version, dir, reason: `release.json 版本是 ${manifest.version}` };
    }
    const missing = RUNTIME_FILES.filter((name) => !fs.existsSync(path.join(dir, name)));
    if (missing.length) {
        return { status: "corrupt", version, dir, reason: `缺少文件：${missing.join("、")}` };
    }
    return { status: "ready", version, dir, manifest };
}

async function fetchBuffer(url) {
    const response = await fetch(url, { redirect: "follow" });
    if (!response.ok) {
        throw new Error(`下载失败 ${response.status} ${response.statusText}：${url}`);
    }
    return Buffer.from(await response.arrayBuffer());
}

// 只解 ustar 里的普通文件条目。发布包由 scripts/build-runtime.mjs 生成，
// 不含目录项与链接；这里仍然显式拒绝非普通文件，避免把恶意条目写到任意路径。
function extractTarGz(archive) {
    const tar = zlib.gunzipSync(archive);
    const files = new Map();
    let offset = 0;
    let longName = null;
    while (offset + 512 <= tar.length) {
        const header = tar.subarray(offset, offset + 512);
        if (header.every((byte) => byte === 0)) break;
        const readString = (start, length) => {
            const slice = header.subarray(start, start + length);
            const end = slice.indexOf(0);
            return slice.subarray(0, end === -1 ? slice.length : end).toString("utf8");
        };
        const name = readString(0, 100);
        const prefix = readString(345, 155);
        const size = Number.parseInt(readString(124, 12).trim() || "0", 8);
        const type = String.fromCharCode(header[156] || 0x30);
        const fullName = prefix ? `${prefix}/${name}` : name;
        const bodyStart = offset + 512;
        const body = tar.subarray(bodyStart, bodyStart + size);
        if (type === "L") {
            // GNU 长文件名：内容就是下一个条目的真名
            longName = body.toString("utf8").replace(/\0+$/, "");
        } else if (type === "0" || type === "\0") {
            const entryName = longName ?? fullName;
            longName = null;
            const base = path.basename(entryName);
            if (entryName !== base || base.includes("..")) {
                throw new Error(`发布包含非法路径：${entryName}`);
            }
            files.set(base, Buffer.from(body));
        } else if (type !== "5") {
            throw new Error(`发布包含不支持的文件类型：${type}（${fullName}）`);
        }
        offset = bodyStart + Math.ceil(size / 512) * 512;
    }
    return files;
}

export async function ensureRuntime({ version = null, source = null, check = false } = {}) {
    const targetVersion = version ?? skillVersion();
    const current = inspectRuntime(targetVersion);
    if (current.status === "ready") return { ...current, installed: false };
    if (check) return { ...current, installed: false };

    const base = (source ?? `${DEFAULT_BASE}/v${targetVersion}`).replace(/\/+$/, "");
    const archiveName = `scenario-test-runtime-v${targetVersion}.tar.gz`;
    const report = (line) => process.stderr.write(`${line}\n`);
    report(`ℹ 下载 scenario-test 运行时 ${targetVersion}（约 1.2 MB）…`);

    const archive = await fetchBuffer(`${base}/${archiveName}`);
    const checksumBody = await fetchBuffer(`${base}/${archiveName}.sha256`);
    const expectedArchiveHash = checksumBody.toString("utf8").trim().split(/\s+/)[0].toLowerCase();
    if (!/^[0-9a-f]{64}$/.test(expectedArchiveHash)) {
        throw new Error(`${archiveName}.sha256 内容不是合法的 SHA-256`);
    }
    const actualArchiveHash = sha256(archive);
    if (actualArchiveHash !== expectedArchiveHash) {
        throw new Error(`运行时发布包校验失败：期望 ${expectedArchiveHash}，实际 ${actualArchiveHash}`);
    }

    const files = extractTarGz(archive);
    if (!files.has("release.json")) throw new Error("运行时发布包缺少 release.json，拒绝安装");
    const manifest = JSON.parse(files.get("release.json").toString("utf8"));
    if (manifest.version !== targetVersion) {
        throw new Error(`release.json 版本不匹配：${manifest.version} != ${targetVersion}`);
    }
    for (const name of RUNTIME_FILES) {
        const body = files.get(name);
        if (!body) throw new Error(`运行时发布包缺少文件：${name}`);
        const want = String(manifest.sha256?.[name] ?? "").toLowerCase();
        if (!want) throw new Error(`release.json 缺少 ${name} 的 SHA-256`);
        if (sha256(body) !== want) throw new Error(`运行时文件校验失败：${name}`);
    }

    // 原子落盘：先写 <版本>.staging-<pid>，全部写完再 rename 成正式目录。
    // 中断只会留下 staging 目录，不会让下次探测误判为 ready。
    fs.mkdirSync(runtimeRoot, { recursive: true });
    const staging = `${runtimeDirFor(targetVersion)}.staging-${process.pid}`;
    fs.rmSync(staging, { recursive: true, force: true });
    fs.mkdirSync(staging, { recursive: true });
    try {
        for (const [name, body] of files) fs.writeFileSync(path.join(staging, name), body);
        const target = runtimeDirFor(targetVersion);
        fs.rmSync(target, { recursive: true, force: true });
        fs.renameSync(staging, target);
    } catch (error) {
        fs.rmSync(staging, { recursive: true, force: true });
        throw error;
    }

    report(`✓ 运行时已就绪：${runtimeDirFor(targetVersion)}`);
    return { ...inspectRuntime(targetVersion), installed: true };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
    try {
        const result = await ensureRuntime(parseArgs(process.argv.slice(2)));
        if (result.status !== "ready") {
            console.error(`运行时未就绪：${result.reason}`);
            process.exitCode = 1;
        } else {
            console.log(JSON.stringify({ status: result.status, version: result.version, dir: result.dir, cli: path.join(result.dir, "scenario-test-cli.cjs") }, null, 2));
        }
    } catch (error) {
        console.error(`安装场景测试运行时失败：${error.message}`);
        console.error(`  目标：${DEFAULT_BASE}/v${process.env.SCENARIO_TEST_VERSION ?? "<版本>"}`);
        console.error("  补救：用 --source 指向内网制品目录；或手动把发布包放到该目录对应位置后重试。");
        process.exitCode = 1;
    }
}
