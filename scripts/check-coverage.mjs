// 实际执行 `npm run test:coverage` 的验证入口：覆盖率命令必须只报告 src/，
// 并因配置的阈值不足而非零退出。本脚本用于把该行为纳入 check/CI，避免只依赖
// 单测内的轻量探针或口头结论。
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { evaluateCoverageRun, supportsCoverageThresholds } from "./coverage-policy.mjs";

const root = fileURLToPath(new URL("..", import.meta.url));
const packageInfo = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
const coverageScript = packageInfo.scripts["test:coverage"];

function fail(message, output = "") {
    console.error(`[check:coverage] FAIL：${message}`);
    if (output) console.error(output);
    process.exit(1);
}

if (!supportsCoverageThresholds(process.versions.node)) {
    fail(`check:coverage 需要 Node.js 22.8+（当前 ${process.versions.node}）；内置覆盖率过滤与阈值参数不可用`);
}

// package.json 中的覆盖率命令无空格参数，直接移除双引号后按空白切分即可还原参数；
// 第一段固定为 node，替换为当前 process.execPath 以保证与运行环境一致。
const tokens = coverageScript.replace(/"/g, "").split(/\s+/).filter(Boolean);
if (tokens[0] !== "node" || !tokens.includes("--experimental-test-coverage")) {
    fail(`test:coverage 脚本格式不符合预期：${coverageScript}`);
}

const env = { ...process.env };
for (const key of Object.keys(env)) {
    if (key.startsWith("NODE_TEST")) delete env[key];
}

const result = spawnSync(process.execPath, tokens.slice(1), {
    cwd: root,
    env,
    encoding: "utf8",
    maxBuffer: 50 * 1024 * 1024,
    timeout: 180000
});
const output = `${result.stdout ?? ""}\n${result.stderr ?? ""}`;
if (result.error) fail(`覆盖率命令执行失败：${result.error.message}`, output);

const verdict = evaluateCoverageRun({ status: result.status, output });
if (!verdict.ok) fail(verdict.message, output);

console.log(`[check:coverage] PASS：${verdict.threshold}；测试失败 0；报告仅含 src/`);
