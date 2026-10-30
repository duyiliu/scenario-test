import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import test from "node:test";

// Issue #118：resolveInitDirectory 只做字符串归一化与词法 path.relative，
// --dir "sub/.." 归一化到项目根后照样写入（--force 覆盖项目原有文件）；
// 项目内预置 scenario-test 为指向项目外的 junction 时 writeProjectFile 会跟随链接写到界外。

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const cli = path.join(root, "src", "cli.js");

function runInit(project, ...args) {
    return spawnSync(process.execPath, [cli, "init", "--project", project, ...args], { encoding: "utf8" });
}

function makeProject() {
    return fs.mkdtempSync(path.join(os.tmpdir(), "scenario-test-issue-118-"));
}

test("#118：--dir 归一化到项目根本身时拒绝，不向项目根写文件", () => {
    const project = makeProject();
    try {
        fs.writeFileSync(path.join(project, "index.html"), "PROJECT-OWNED", "utf8");
        for (const directory of ["sub/..", ".", "./", "a/b/../.."]) {
            const result = runInit(project, "--dir", directory, "--no-input");
            assert.notEqual(result.status, 0, `--dir ${directory} 应被拒绝`);
            assert.match(`${result.stdout}${result.stderr}`, /--dir 必须是项目内的相对目录/);
        }
        assert.equal(fs.readFileSync(path.join(project, "index.html"), "utf8"), "PROJECT-OWNED", "不得覆盖项目根文件");
        assert.equal(fs.existsSync(path.join(project, "scenario.config.js")), false, "不得向项目根写配置");
    } finally {
        fs.rmSync(project, { recursive: true, force: true });
    }
});

test("#118：目标目录是指向项目外的 junction/符号链接时拒绝写入", () => {
    const project = makeProject();
    const outside = makeProject();
    try {
        fs.symlinkSync(outside, path.join(project, "scenario-test"), process.platform === "win32" ? "junction" : "dir");
        const result = runInit(project, "--dir", "scenario-test", "--no-input");
        assert.notEqual(result.status, 0, "指向项目外的链接目标应被拒绝");
        assert.match(`${result.stdout}${result.stderr}`, /越界/);
        assert.deepEqual(fs.readdirSync(outside), [], "项目外目录不得被写入任何文件");
    } finally {
        fs.rmSync(project, { recursive: true, force: true });
        fs.rmSync(outside, { recursive: true, force: true });
    }
});

test("#118：项目内正常相对目录仍可初始化", () => {
    const project = makeProject();
    try {
        const result = runInit(project, "--dir", "custom/scenario-test", "--no-input");
        assert.equal(result.status, 0, `${result.stdout}${result.stderr}`);
        assert.equal(fs.existsSync(path.join(project, "custom/scenario-test/scenario.config.js")), true);
    } finally {
        fs.rmSync(project, { recursive: true, force: true });
    }
});
