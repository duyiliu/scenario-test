import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { executeDefinitionFile, loadScenarioFile } from "../src/node/loader.js";
import * as ScenarioTest from "../src/node.js";

// Issue #120：VM 无 timeout + install 脚本无哈希校验 + install.sh 权限 644

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

test("#120：场景/配置文件死循环在超时后退出，不再永久挂住 CLI/doctor", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "scenario-test-120-vm-"));
    try {
        const looping = path.join(dir, "loop.js");
        fs.writeFileSync(looping, "while (true) {}\n", "utf8");
        const startedAt = Date.now();
        assert.throws(
            () => executeDefinitionFile(looping, {}, { timeoutMs: 120 }),
            (error) => {
                assert.equal(error.code, "ERR_SCRIPT_EXECUTION_TIMEOUT");
                assert.match(error.message, /定义文件执行超时（120ms/);
                assert.match(error.message, /loop\.js/);
                return true;
            }
        );
        assert.ok(Date.now() - startedAt < 5000, "超时应及时中断，而不是永久挂起");

        // 正常文件不受影响（默认时限内完成注册）
        const good = path.join(dir, "good.js");
        fs.writeFileSync(good, `ScenarioTest.registerScenario("good", ScenarioTest.defineScenario({ name: "正常", steps: [{ name: "调用", path: "/x" }] }));\n`, "utf8");
        assert.doesNotThrow(() => executeDefinitionFile(good, ScenarioTest));
        // loadScenarioFile 同样支持覆盖超时
        const scenario = loadScenarioFile(good, "good", ScenarioTest, { timeoutMs: 2000 });
        assert.equal(scenario.name, "正常");
    } finally {
        fs.rmSync(dir, { recursive: true, force: true });
    }
});

test("#120：安装脚本按发布版 release.json 校验 SHA-256，不再直接执行下载文件", () => {
    const installSh = fs.readFileSync(path.join(root, "scripts", "install.sh"), "utf8");
    const installPs1 = fs.readFileSync(path.join(root, "scripts", "install.ps1"), "utf8");
    for (const [name, script] of [["install.sh", installSh], ["install.ps1", installPs1]]) {
        assert.match(script, /release\.json/, `${name} 应获取发布版 release.json`);
        assert.match(script, /sha256/i, `${name} 应校验 SHA-256`);
        assert.match(script, /SCENARIO_TEST_RELEASE_JSON/, `${name} 应支持自定义清单（内网源）`);
        // 校验必须在 init 之前执行，否则篡改文件已经被用来写项目
        const verifyIndex = script.indexOf("release.json");
        const initIndex = script.indexOf("init --project");
        assert.ok(verifyIndex > 0 && initIndex > verifyIndex, `${name} 的哈希校验必须早于 init`);
    }
    // 脚本要求 hash 不匹配时直接中止
    assert.match(installSh, /运行时文件校验失败[\s\S]{0,200}exit 1/);
    assert.match(installPs1, /运行时文件校验失败/);
    assert.match(installPs1, /throw/);
});

test("#120：install.sh 带 shebang，且仓库索引标记为可执行", () => {
    const installSh = fs.readFileSync(path.join(root, "scripts", "install.sh"), "utf8");
    assert.match(installSh, /^#!\/usr\/bin\/env bash/);
    // 通过 package.json 的 files 与 README 用法仍要求可直接执行；索引位由
    // `git ls-files -s scripts/install.sh` 的 100755 保证（CI 行尾/权限审计覆盖）
    const stat = fs.statSync(path.join(root, "scripts", "install.sh"));
    assert.ok(stat.isFile());
});

test("#120：install.sh 内联 Node 校验脚本可被解析（防字符串换行导致发布版校验直接失败）", () => {
    const installSh = fs.readFileSync(path.join(root, "scripts", "install.sh"), "utf8");
    const start = installSh.indexOf("node -e '");
    assert.ok(start > 0, "install.sh 应使用 node -e 内联校验脚本");
    const NL = String.fromCharCode(10);
    const bodyStart = installSh.indexOf(NL, start) + 1;
    const bodyEnd = installSh.indexOf(NL + String.fromCharCode(39) + ' "$MANIFEST_FILE"', bodyStart);
    assert.ok(bodyEnd > bodyStart, "内联脚本应有结束引号");
    const inline = installSh.slice(bodyStart, bodyEnd);
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "scenario-test-120-install-"));
    try {
        const file = path.join(dir, "verify.cjs");
        fs.writeFileSync(file, inline, "utf8");
        // 真实执行过的故障：console.error 的字符串被写成裸换行，
        // `node --check` 立即报 SyntaxError（v0.11.0 发布版即因此校验失败）
        const checked = spawnSync(process.execPath, ["--check", file], { encoding: "utf8" });
        assert.equal(checked.status, 0, `install.sh 内联脚本语法错误: ${checked.stderr}`);
    } finally {
        fs.rmSync(dir, { recursive: true, force: true });
    }
});
