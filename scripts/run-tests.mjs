// 跨平台测试入口：Windows PowerShell/cmd 不会展开 `tests/*.test.js` 通配符，
// 故在 JS 里枚举测试文件后显式传给 node --test（与 Node 版本无关的固定做法）。
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

// 单测试超时：任一测试超过该时长即记为失败（testTimeoutFailure）并继续汇总，
// 避免半成品代码的 hang（如 server.listen 永不关闭）把整轮 npm test 无限拖死。
// 正常单测试远低于 120s；需要放宽时可用 TEST_TIMEOUT_MS 覆盖。
const testTimeoutMs = Number.parseInt(process.env.TEST_TIMEOUT_MS || "120000", 10);

const result = spawnSync(
    process.execPath,
    ["--test", `--test-timeout=${testTimeoutMs}`, ...process.argv.slice(2), ...testFiles],
    {
        cwd: root,
        stdio: "inherit"
    }
);

if (result.error) {
    console.error(result.error.message);
    process.exit(1);
}
process.exit(result.status ?? 1);
