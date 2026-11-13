// E2E 安装链：真实执行安装脚本（install.sh / install.ps1），
// 验证「下载 → SHA-256 校验 → 用户级运行时落盘 → init → doctor → 文件清单」全链。
// 只走 127.0.0.1 本地静态源与临时目录，无外网、无污染真实用户目录。
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { startStaticSource } from "./helpers/static-source.mjs";
import { installerForPlatform, installArgs, installEnv, run, makeTempDir, removeDir } from "./helpers/proc.mjs";

let source;
const sandboxes = [];

function sandbox() {
    const dir = makeTempDir();
    sandboxes.push(dir);
    return dir;
}

before(async () => {
    source = await startStaticSource();
});

after(async () => {
    for (const dir of sandboxes.splice(0)) removeDir(dir);
    if (source) await source.close();
});

// 平台分发：unix → install.sh；windows → install.ps1；其余平台无对应脚本 → skip。
const installer = installerForPlatform();

test("install 正例：自定义源 + 清单校验 → init → doctor PASS → 文件清单", { skip: !installer && "本平台无安装脚本" }, async () => {
    const home = path.join(sandbox(), "home");
    const project = path.join(sandbox(), "project");
    const targetDir = "scenario-test";
    fs.mkdirSync(project, { recursive: true });

    const args = installArgs(installer, { projectDir: project, targetDir, source: source.baseUrl });
    const env = installEnv({ home, manifestUrl: source.manifestUrl });
    const result = await run(installer.command, args, { env, cwd: project });
    const combined = result.stdout + result.stderr;

    assert.equal(result.code, 0, `安装应成功。\nstdout:\n${result.stdout}\nstderr:\n${result.stderr}`);
    assert.match(combined, /校验通过/, "应输出 SHA-256 校验通过");
    assert.match(combined, /健康检查通过|健康检查/, "应执行 doctor 并通过");

    // v23：项目目录只落场景数据，不含运行时副本
    const target = path.join(project, targetDir);
    for (const f of ["scenario.config.js", "README.md", "start-scenario-test.cmd"]) {
        assert.ok(fs.existsSync(path.join(target, f)), `项目应生成 ${f}`);
    }
    assert.ok(!fs.existsSync(path.join(target, ".scenario-test")), "v23 项目内不应有 .scenario-test 运行时副本");

    // 用户级运行时目录落在隔离 home 下
    const runtimeDir = path.join(home, ".scenario-test", "runtime");
    for (const f of ["scenario-test-cli.cjs", "scenario-test.umd.js", "scenario-test.d.ts", "scenario-test-capabilities.json"]) {
        assert.ok(fs.existsSync(path.join(runtimeDir, f)), `用户级运行时应含 ${f}`);
    }

    // doctor 独立再跑一次，确认运行时 CLI 可用且对 config 通过
    const cli = path.join(runtimeDir, "scenario-test-cli.cjs");
    const doctor = await run(process.execPath, [cli, "doctor", "--config", path.join(target, "scenario.config.js")], { env });
    assert.equal(doctor.code, 0, `doctor 应通过。\n${doctor.stdout}\n${doctor.stderr}`);
});

test("install 反例：下载内容被篡改 → SHA-256 校验失败、exit 非零、不残留半成品", { skip: !installer && "本平台无安装脚本" }, async () => {
    const badSource = await startStaticSource({ tamperFiles: ["scenario-test-cli.cjs"] });
    try {
        const home = path.join(sandbox(), "home");
        const project = path.join(sandbox(), "project");
        fs.mkdirSync(project, { recursive: true });

        const args = installArgs(installer, { projectDir: project, targetDir: "scenario-test", source: badSource.baseUrl });
        const env = installEnv({ home, manifestUrl: badSource.manifestUrl });
        const result = await run(installer.command, args, { env, cwd: project });

        assert.notEqual(result.code, 0, `篡改应使安装失败。\nstdout:\n${result.stdout}`);
        assert.match(result.stdout + result.stderr, /校验失败|校验|SHA-256/i, "应报校验失败语义");
        // 校验失败在替换用户级目录之前：隔离 home 下不应有运行时文件
        const runtimeDir = path.join(home, ".scenario-test", "runtime");
        assert.ok(!fs.existsSync(path.join(runtimeDir, "scenario-test-cli.cjs")), "校验失败不应落用户级运行时");
    } finally {
        await badSource.close();
    }
});

test("install 反例：源不可达 → exit 非零且错误可定位", { skip: !installer && "本平台无安装脚本" }, async () => {
    const home = path.join(sandbox(), "home");
    const project = path.join(sandbox(), "project");
    fs.mkdirSync(project, { recursive: true });
    const deadSource = "http://127.0.0.1:1"; // 保留端口，连接被拒

    const args = installArgs(installer, { projectDir: project, targetDir: "scenario-test", source: deadSource });
    const env = installEnv({ home, manifestUrl: `${deadSource}/release.json` });
    const result = await run(installer.command, args, { env, cwd: project, timeoutMs: 60000 });

    assert.notEqual(result.code, 0, "源不可达应失败");
    assert.match(result.stdout + result.stderr, /下载失败|无法|失败|error/i, "应有可定位错误");
});
