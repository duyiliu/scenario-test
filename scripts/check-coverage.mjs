// 实际执行 `npm run test:coverage` 的验证入口：覆盖率命令必须只报告 src/，
// 并因配置的阈值不足而非零退出。本脚本用于把该行为纳入 check/CI，避免只依赖
// 单测内的轻量探针或口头结论。
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const packageInfo = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
const coverageScript = packageInfo.scripts["test:coverage"];

function fail(message, output = "") {
    console.error(`[check:coverage] FAIL：${message}`);
    if (output) console.error(output);
    process.exit(1);
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
if (result.status === 0) fail("覆盖率命令预期因阈值不足失败，但实际通过；请复核阈值或覆盖率基线", output);

const threshold = output.match(/Error: [\d.]+% (line|branch) coverage does not meet threshold of \d+%\./);
if (!threshold) fail("覆盖率命令非零退出，但不是因为配置的覆盖率阈值不足", output);

const start = output.indexOf("# start of coverage report");
const end = output.indexOf("# end of coverage report", start);
if (start < 0 || end <= start) fail("未找到覆盖率报告区间", output);

const report = output.slice(start, end);
if (!/^# src\s/m.test(report)) fail("覆盖率报告未包含 src/", report);
const leaked = report.match(/^# (?:dist|tests|scripts)(?:\s|$)/m);
if (leaked) fail(`覆盖率报告混入非 src 目录：${leaked[0]}`, report);

console.log(`[check:coverage] PASS：${threshold[0]}；报告仅含 src/`);
