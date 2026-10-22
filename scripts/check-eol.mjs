#!/usr/bin/env node
// 行尾策略审计：只读，不改动任何文件。
//
// 背景：.gitattributes 只保证「入库」与「检出」时按策略转换，无法阻止工作区文件
// 被外部工具写成 CRLF。此时 `git status` 会标记 M，而 `git diff`（经 clean 过滤
// 归一后）为空——即 CRLF 幻影改动。本脚本用 `git ls-files --eol` 同时读取索引与
// 工作区行尾，把这种漂移显式暴露出来。
//
// 退出码：0 全部符合策略；1 存在漂移；2 无法执行 git。
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

export const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const RECORD_PATTERN = /^i\/(\S+)\s+w\/(\S+)\s+attr\/([^\t]*)\t([\s\S]+)$/;
const EOL_CRLF = /(?:^|\s)eol=crlf(?:\s|$)/;

/**
 * 解析 `git ls-files -z --eol` 的输出（记录以 NUL 分隔）。
 * @returns {{file: string, index: string, worktree: string, attr: string}[]}
 */
export function parseLsFilesEol(stdout) {
    const entries = [];
    for (const record of stdout.split("\0")) {
        if (!record) continue;
        const match = RECORD_PATTERN.exec(record);
        if (!match) continue;
        const [, index, worktree, attr, file] = match;
        entries.push({ file, index, worktree, attr: attr.trim() });
    }
    return entries;
}

/**
 * 按 .gitattributes 策略推导期望行尾。
 * 返回 null 表示二进制（不参与行尾审计）。
 */
export function expectedEol(entry) {
    const attr = entry.attr;
    if (!attr || attr.includes("-text") || attr.includes("binary")) return null;
    return EOL_CRLF.test(attr) ? "crlf" : "lf";
}

/**
 * 审计单条 `git ls-files --eol` 记录。
 * 索引侧文本一律归一为 LF（入库口径）；工作区侧按属性期望（默认 LF，.ps1 为 CRLF）。
 * @returns {{file: string, side: "index"|"worktree", expected: string, actual: string}[]}
 */
export function auditEntries(entries) {
    const problems = [];
    for (const entry of entries) {
        const expected = expectedEol(entry);
        if (expected === null) continue;
        if (entry.index !== "lf") {
            problems.push({ file: entry.file, side: "index", expected: "lf", actual: entry.index });
        }
        if (entry.worktree !== expected) {
            problems.push({ file: entry.file, side: "worktree", expected, actual: entry.worktree });
        }
    }
    return problems;
}

/** 在指定仓库执行审计；git 不可用时抛出 code=GIT_UNAVAILABLE 的错误。 */
export function auditRepository(cwd = REPO_ROOT) {
    const result = spawnSync("git", ["ls-files", "-z", "--eol"], { cwd, encoding: "utf8" });
    if (result.error || result.status !== 0) {
        const detail = result.error ? result.error.message : (result.stderr || "").trim();
        const error = new Error(`无法执行 git ls-files --eol：${detail}`);
        error.code = "GIT_UNAVAILABLE";
        throw error;
    }
    return auditEntries(parseLsFilesEol(result.stdout));
}

export function formatProblems(problems) {
    return problems.map(({ file, side, expected, actual }) => {
        const sideName = side === "index" ? "索引" : "工作区";
        return `  ${file}（${sideName}：期望 ${expected}，实际 ${actual}）`;
    }).join("\n");
}

export function main(cwd = REPO_ROOT) {
    let problems;
    try {
        problems = auditRepository(cwd);
    } catch (error) {
        if (error.code === "GIT_UNAVAILABLE") {
            console.error(`[check:eol] ${error.message}`);
            return 2;
        }
        throw error;
    }
    if (problems.length === 0) {
        console.log("[check:eol] 行尾策略通过：索引与工作区无 CRLF 幻影改动");
        return 0;
    }
    console.error(`[check:eol] 发现 ${problems.length} 处行尾漂移（git status 会标记 M 但 diff 为空）：`);
    console.error(formatProblems(problems));
    console.error("[check:eol] 修复：工作区漂移用 `git checkout -- <路径>` 按 .gitattributes 重写；索引漂移用 `git add --renormalize .`。");
    return 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
    process.exitCode = main();
}
