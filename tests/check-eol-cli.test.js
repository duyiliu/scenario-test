import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { main } from "../scripts/check-eol.mjs";

// check:eol 是 CI 的廉价门禁（工作流行尾审计），脚本注释承诺的退出码
// 0/1/2 至今只有单元级断言。这里直接锁 main() 的进程契约，防止门禁
// 在 git 不可用或工作区漂移时静默返回 0。

function makeDirectory(prefix) {
    return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
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

test("check:eol main：非 git 目录返回 2，不把无法审计当成通过", () => {
    const directory = makeDirectory("scenario-test-eol-nogit-");
    const originalError = console.error;
    let stderr = "";
    console.error = (message) => { stderr += `${message}\n`; };
    try {
        assert.equal(main(directory), 2);
    } finally {
        console.error = originalError;
        fs.rmSync(directory, { recursive: true, force: true });
    }
    assert.match(stderr, /\[check:eol\] 无法执行 git ls-files --eol/);
});

test("check:eol main：索引与工作区均为 LF 时返回 0", () => {
    const directory = makeDirectory("scenario-test-eol-clean-");
    try {
        initRepository(directory);
        assert.equal(main(directory), 0);
    } finally {
        fs.rmSync(directory, { recursive: true, force: true });
    }
});

test("check:eol main：工作区 CRLF 幻影改动返回 1，并指出期望/实际行尾", () => {
    const directory = makeDirectory("scenario-test-eol-drift-");
    const originalError = console.error;
    let stderr = "";
    console.error = (message) => { stderr += `${message}\n`; };
    try {
        initRepository(directory);
        fs.writeFileSync(path.join(directory, "clean.txt"), "line\r\n", "utf8");
        assert.equal(main(directory), 1);
    } finally {
        console.error = originalError;
        fs.rmSync(directory, { recursive: true, force: true });
    }
    assert.match(stderr, /clean\.txt（工作区：期望 lf，实际 crlf）/);
});
