// 跨平台测试入口：Windows PowerShell/cmd 不会展开 `tests/*.test.js` 通配符，
// 故在 JS 里枚举测试文件后显式传给 node --test（与 Node 版本无关的固定做法）。
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

// v24 起构建产物不再入库（dist/、src/**/*.generated.js 都在 .gitignore 里），
// 因此 clone 后直接 npm test 必须能自愈：产物缺失或比源码旧就先构建一次。
// 判据用 mtime 而非哈希：构建本身 0.5 秒，多跑一次无感，读 154 KB 算哈希反而更慢。
const SENTINELS = [
    "dist/scenario-test-cli.cjs",
    "dist/scenario-test.d.ts",
    "dist/scenario-test-capabilities.json",
    "dist/AI_SCENARIO_PROMPT.md",
    "src/version.generated.js",
    "src/browser/tailwind.generated.js",
    "src/e2e/ui/app.generated.js",
    "src/e2e/ui/style.generated.js"
];

function newestMtime(directory) {
    let newest = 0;
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
        const file = path.join(directory, entry.name);
        if (entry.isDirectory()) newest = Math.max(newest, newestMtime(file));
        else if (!entry.name.endsWith(".generated.js")) newest = Math.max(newest, statSync(file).mtimeMs);
    }
    return newest;
}

function needsBuild() {
    if (SENTINELS.some((relative) => !existsSync(path.join(root, relative)))) return "产物缺失";
    const builtAt = Math.min(...SENTINELS.map((relative) => statSync(path.join(root, relative)).mtimeMs));
    const sourceAt = Math.max(
        newestMtime(path.join(root, "src")),
        statSync(path.join(root, "package.json")).mtimeMs,
        statSync(path.join(root, "scripts/build.mjs")).mtimeMs
    );
    return sourceAt > builtAt ? "源码比产物新" : null;
}

const buildReason = needsBuild();
if (buildReason) {
    process.stderr.write(`ℹ ${buildReason}，先运行 npm run build…\n`);
    const built = spawnSync(process.execPath, [path.join(root, "scripts/build.mjs")], { cwd: root, stdio: "inherit" });
    if (built.error || built.status !== 0) {
        console.error("构建失败，无法运行测试");
        process.exit(1);
    }
}

// 允许 `npm test -- tests/engine.test.js` 只跑指定文件：显式传入的路径优先，
// 未传时才枚举全部。否则两者拼接会把全量也跑一遍，单文件调试失去意义。
const forwarded = process.argv.slice(2);
const explicitFiles = forwarded.filter((arg) => !arg.startsWith("-"));
const extraFlags = forwarded.filter((arg) => arg.startsWith("-"));
const testFiles = explicitFiles.length > 0
    ? explicitFiles
    : readdirSync(path.join(root, "tests"))
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
    ["--test", `--test-timeout=${testTimeoutMs}`, ...extraFlags, ...testFiles],
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
