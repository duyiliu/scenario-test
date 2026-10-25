// 跨平台测试入口：显式收集 tests/*.test.js 后交给 node:test。
//
// Windows 的 cmd.exe 不展开通配符，而 Node 20 的 --test 也不接受 glob（Node 22 才支持），
// 因此 `node --test tests/*.test.js` 会在 Windows + Node 20 的 CI 矩阵中报“找不到文件”。
// 这里用 fs 收集文件，保持原有“只跑 tests/*.test.js”的语义，并让 test:coverage 复用同一入口。
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

export const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

export function listTestFiles(root = REPO_ROOT) {
    const testsDir = path.join(root, "tests");
    return fs.readdirSync(testsDir)
        .filter((name) => name.endsWith(".test.js"))
        .sort()
        .map((name) => path.join(testsDir, name));
}

export function runTests(args = process.argv.slice(2), root = REPO_ROOT) {
    const result = spawnSync(
        process.execPath,
        ["--test", ...args, ...listTestFiles(root)],
        { cwd: root, stdio: "inherit" }
    );
    if (result.error) throw result.error;
    return result.status ?? 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
    process.exitCode = runTests();
}
