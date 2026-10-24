import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {
    auditEntries,
    auditRepository,
    parseLsFilesEol
} from "../scripts/check-eol.mjs";

const root = path.resolve(import.meta.dirname, "..");
const gitAvailable = spawnSync("git", ["--version"], { encoding: "utf8" }).status === 0;

function git(cwd, args, input) {
    const result = spawnSync("git", args, { cwd, encoding: "utf8", input });
    assert.equal(result.status, 0, `git ${args.join(" ")} 失败：${(result.stderr || "").trim()}`);
    return result.stdout;
}

function makeGitRepo(t) {
    const repo = fs.mkdtempSync(path.join(os.tmpdir(), "scenario-test-eol-"));
    t.after(() => fs.rmSync(repo, { recursive: true, force: true }));
    git(repo, ["init", "-q"]);
    fs.writeFileSync(path.join(repo, ".gitattributes"), "* text=auto eol=lf\n", "utf8");
    return repo;
}

function attributeRules() {
    return fs.readFileSync(path.join(root, ".gitattributes"), "utf8")
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter((line) => line && !line.startsWith("#"));
}

test(".gitattributes 声明仓库级行尾策略：文本 LF、脚本 CRLF、生成物口径、二进制", () => {
    const rules = attributeRules();
    assert.ok(rules.includes("* text=auto eol=lf"), "缺少全局文本 LF 规则");
    assert.ok(rules.includes("*.ps1 text eol=crlf"), "PowerShell 脚本须保留 CRLF");
    // 生成物显式口径（与构建脚本写入的 \n 对齐），避免被全局规则之外的改动漂移
    assert.ok(rules.includes("dist/** text=auto eol=lf"), "dist/ 生成物须显式锁定 LF");
    assert.ok(rules.includes("src/version.generated.js text=auto eol=lf"), "version.generated.js 须显式锁定 LF");
    assert.ok(rules.includes("src/browser/tailwind.generated.js text=auto eol=lf"), "tailwind.generated.js 须显式锁定 LF");
    for (const ext of ["png", "jpg", "jpeg", "gif", "ico"]) {
        assert.ok(rules.includes(`*.${ext} binary`), `图片 *.${ext} 须按二进制处理`);
    }
});

test("ls-files --eol 解析：区分 LF / CRLF / 二进制", () => {
    const stdout = [
        "i/lf    w/lf    attr/text=auto eol=lf \tsrc/a.js",
        "i/lf    w/crlf  attr/text=auto eol=lf \tdist/b.json",
        "i/lf    w/crlf  attr/text eol=crlf     \tscripts/install.ps1",
        "i/-text w/-text attr/-text             \tdocs/images/c.png"
    ].join("\0") + "\0";
    const entries = parseLsFilesEol(stdout);
    assert.deepEqual(entries.map((entry) => entry.file), [
        "src/a.js",
        "dist/b.json",
        "scripts/install.ps1",
        "docs/images/c.png"
    ]);
    assert.deepEqual(entries[2], { file: "scripts/install.ps1", index: "lf", worktree: "crlf", attr: "text eol=crlf" });
});

test("auditEntries：工作区 CRLF 幻影、索引 CRLF、脚本 CRLF 的判定极性", () => {
    const entries = [
        // 合规：文本 LF
        { file: "src/a.js", index: "lf", worktree: "lf", attr: "text=auto eol=lf" },
        // 合规：脚本检出 CRLF、入库仍 LF
        { file: "scripts/install.ps1", index: "lf", worktree: "crlf", attr: "text eol=crlf" },
        // 幻影：策略要求 LF，工作区却是 CRLF（git status M / diff 空）
        { file: "dist/b.json", index: "lf", worktree: "crlf", attr: "text=auto eol=lf" },
        // 索引侧污染：入库未归一为 LF
        { file: "docs/c.md", index: "crlf", worktree: "lf", attr: "text=auto eol=lf" },
        // 二进制：不参与审计
        { file: "docs/images/d.png", index: "-text", worktree: "-text", attr: "-text" }
    ];
    assert.deepEqual(auditEntries(entries), [
        { file: "dist/b.json", side: "worktree", expected: "lf", actual: "crlf" },
        { file: "docs/c.md", side: "index", expected: "lf", actual: "crlf" }
    ]);
});

test(
    "仓库无 CRLF 幻影改动（索引与工作区行尾均遵循 .gitattributes）",
    { skip: fs.existsSync(path.join(root, ".git")) ? false : "非 git 工作区，跳过行尾审计" },
    () => {
        let problems;
        try {
            problems = auditRepository(root);
        } catch (error) {
            // 环境无 git 命令时跳过，避免非仓库消费方（npm 包解包）误报
            if (error.code === "GIT_UNAVAILABLE") return;
            throw error;
        }
        const detail = problems
            .map(({ file, side, expected, actual }) => `  ${file}（${side}：期望 ${expected}，实际 ${actual}）`)
            .join("\n");
        assert.deepEqual(problems, [], `发现行尾漂移，请运行 \`npm run check:eol\` 并按提示修复：\n${detail}`);
    }
);

test(
    "auditRepository 检出索引内 CRLF：强制写入的 CRLF blob 在干净检出后仍失败",
    { skip: gitAvailable ? false : "环境无 git，跳过行尾审计集成用例" },
    (t) => {
        const repo = makeGitRepo(t);
        // 普通 git add 会把 CRLF 归一为 LF；这里用 --no-filters 模拟绕过归一后真正入库的 CRLF blob。
        const blob = git(repo, ["hash-object", "-w", "--no-filters", "--stdin"], "alpha\r\nbeta\r\n").trim();
        git(repo, ["update-index", "--add", "--cacheinfo", `100644,${blob},sample.txt`]);
        // 模拟 eol=lf 的干净检出：工作区为 LF，但索引仍是 CRLF。
        fs.writeFileSync(path.join(repo, "sample.txt"), "alpha\nbeta\n", "utf8");

        assert.deepEqual(auditRepository(repo), [
            { file: "sample.txt", side: "index", expected: "lf", actual: "crlf" }
        ]);
    }
);

test(
    "普通 CRLF-only 编辑被 Git 归一：干净检出后索引与工作区均为 LF",
    { skip: gitAvailable ? false : "环境无 git，跳过行尾审计集成用例" },
    (t) => {
        const repo = makeGitRepo(t);
        const file = path.join(repo, "sample.txt");
        fs.writeFileSync(file, "alpha\r\nbeta\r\n", "utf8");
        git(repo, ["add", "sample.txt"]);
        // 暂存后工作区仍是 CRLF（本地会看到幻影），但索引已按 eol=lf 归一。
        assert.match(git(repo, ["ls-files", "--eol"]), /^i\/lf\s+w\/crlf/m);

        // 干净检出按索引重写工作区，CI 看到的是 LF，因此普通 CRLF-only 编辑不会形成可审计的 PR 差异。
        fs.rmSync(file);
        git(repo, ["checkout-index", "-f", "--", "sample.txt"]);
        assert.match(git(repo, ["ls-files", "--eol"]), /^i\/lf\s+w\/lf/m);
        assert.deepEqual(auditRepository(repo), []);
    }
);
