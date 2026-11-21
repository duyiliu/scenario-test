import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

// check:eol 是 CI 的廉价门禁（工作流行尾审计），脚本注释承诺的退出码
// 0/1/2 至今只有单元级断言。这里直接跑脚本进程，锁定 CI 实际消费的
// 退出码，防止门禁在 git 不可用或工作区漂移时静默返回 0。

const script = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../scripts/check-eol.mjs");

function makeDirectory(prefix) {
    return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

function runGate(cwd) {
    const env = { ...process.env };
    delete env.GIT_DIR;
    delete env.GIT_WORK_TREE;
    // 脚本以自身位置推导 REPO_ROOT，必须把它放进被测目录的 scripts/ 下，
    // 否则进程会去审计本仓库而不是临时 fixture。
    const installed = path.join(cwd, "scripts", "check-eol.mjs");
    fs.mkdirSync(path.dirname(installed), { recursive: true });
    fs.copyFileSync(script, installed);
    return spawnSync(process.execPath, [installed], { cwd, encoding: "utf8", env });
}

function runGit(cwd, ...args) {
    const result = spawnSync("git", args, { cwd, encoding: "utf8" });
    assert.equal(result.status, 0, `git ${args.join(" ")} 失败：${result.stderr}`);
}

function initRepository(directory) {
    runGit(directory, "init", "--quiet");
    fs.writeFileSync(path.join(directory, ".gitattributes"), "* text=auto eol=lf\n", "utf8");
    fs.writeFileSync(path.join(directory, "clean.txt"), "line\n", "utf8");
    runGit(directory, "add", ".gitattributes", "clean.txt");
}

test("check:eol 进程：非 git 目录退出 2，不把无法审计当成通过", () => {
    const directory = makeDirectory("scenario-test-eol-nogit-");
    try {
        const result = runGate(directory);
        assert.equal(result.status, 2);
        assert.match(result.stderr, /\[check:eol\] 无法执行 git ls-files --eol/);
    } finally {
        fs.rmSync(directory, { recursive: true, force: true });
    }
});

test("check:eol 进程：索引与工作区均为 LF 时退出 0", () => {
    const directory = makeDirectory("scenario-test-eol-clean-");
    try {
        initRepository(directory);
        const result = runGate(directory);
        assert.equal(result.status, 0, result.stderr);
        assert.match(result.stdout, /\[check:eol\] 行尾策略通过/);
    } finally {
        fs.rmSync(directory, { recursive: true, force: true });
    }
});

test("check:eol 进程：工作区 CRLF 幻影改动退出 1，并指出期望/实际行尾", () => {
    const directory = makeDirectory("scenario-test-eol-drift-");
    try {
        initRepository(directory);
        fs.writeFileSync(path.join(directory, "clean.txt"), "line\r\n", "utf8");
        const result = runGate(directory);
        assert.equal(result.status, 1);
        assert.match(result.stderr, /clean\.txt（工作区：期望 lf，实际 crlf）/);
    } finally {
        fs.rmSync(directory, { recursive: true, force: true });
    }
});
