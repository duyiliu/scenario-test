// 跨平台 E2E 入口：枚举 tests/e2e/*.test.mjs 显式传给 node --test
// （与 run-tests.mjs 同构，解决 Windows glob 不展开问题）。
import { readdirSync } from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const e2eDir = path.join(root, "tests", "e2e");

if (!fsExists(e2eDir)) {
    console.error("tests/e2e/ 不存在");
    process.exit(1);
}

const testFiles = readdirSync(e2eDir)
    .filter((name) => name.endsWith(".test.mjs"))
    .sort()
    .map((name) => path.join("tests", "e2e", name));

if (testFiles.length === 0) {
    console.error("未找到 tests/e2e/*.test.mjs 测试文件");
    process.exit(1);
}

const result = spawnSync(process.execPath, ["--test", ...process.argv.slice(2), ...testFiles], {
    cwd: root,
    stdio: "inherit"
});

if (result.error) {
    console.error(result.error.message);
    process.exit(1);
}
process.exit(result.status ?? 1);

function fsExists(p) {
    try { return readdirSync(p) && true; } catch { return false; }
}
