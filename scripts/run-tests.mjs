// 跨平台测试入口：Windows PowerShell/cmd 不会展开 `tests/*.test.js` 通配，
// Node 18/20 的 `--test` 也不支持 glob，故在 JS 里枚举测试文件后显式传给 node --test。
import { readdirSync } from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const testFiles = readdirSync(path.join(root, "tests"))
    .filter((name) => name.endsWith(".test.js"))
    .sort()
    .map((name) => path.join("tests", name));

if (testFiles.length === 0) {
    console.error("未找到 tests/*.test.js 测试文件");
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
