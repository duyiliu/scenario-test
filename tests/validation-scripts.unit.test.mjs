// 验证脚本分层与 CI 口径：防止默认命令再次静默漏掉 .mjs 用例或覆盖率混入 dist/tests。
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { supportsCoverageThresholds } from "../scripts/coverage-policy.mjs";

const root = fileURLToPath(new URL("..", import.meta.url));
const packageInfo = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
const scripts = packageInfo.scripts;
const supportsCoverage = supportsCoverageThresholds(process.versions.node);

test("test:unit 同时收集 .test.js 与 .unit.test.mjs，浏览器 .mjs 用例由独立脚本显式执行", () => {
    assert.match(scripts["test:unit"], /tests\/\*\.test\.js/);
    assert.match(scripts["test:unit"], /tests\/\*\.unit\.test\.mjs/);
    assert.equal(scripts.test, "npm run test:unit");
    assert.match(scripts["test:browser"], /tests\/browser\.test\.mjs/);
    assert.match(scripts["test:ui-style"], /tests\/ui-style\.test\.mjs/);
});

test("test:all 汇总单元与浏览器用例，check/check:all 都验证覆盖率预期失败路径", () => {
    assert.equal(scripts["test:all"], "npm run test:unit && npm run test:browser && npm run test:ui-style");
    assert.equal(scripts["check:coverage"], "node scripts/check-coverage.mjs");
    assert.match(scripts.check, /npm run build/);
    assert.match(scripts.check, /npm run test:unit/);
    assert.match(scripts.check, /npm run check:coverage/);
    assert.doesNotMatch(scripts.check, /test:browser|test:ui-style|test:all/);
    assert.equal(scripts["check:all"], "npm run check && npm run test:browser && npm run test:ui-style");
});

test("test:coverage 仅统计 src/，并启用 line 90 / branch 80 阈值", () => {
    assert.match(scripts["test:coverage"], /--experimental-test-coverage/);
    assert.match(scripts["test:coverage"], /--test-coverage-include="src\/\*\*\/\*\.js"/);
    assert.doesNotMatch(scripts["test:coverage"], /--test-coverage-include="(?:dist|tests|scripts)\//);
    assert.match(scripts["test:coverage"], /--test-coverage-lines=90/);
    assert.match(scripts["test:coverage"], /--test-coverage-branches=80/);
    assert.match(scripts["test:coverage"], /tests\/\*\.test\.js/);
    assert.match(scripts["test:coverage"], /tests\/\*\.unit\.test\.mjs/);
});

test("test:coverage 实际只报告 src/，并因阈值不足以非零状态退出", {
    skip: supportsCoverage ? false : "需要 Node.js 22.8+ 的覆盖率过滤与阈值参数"
}, () => {
    const include = scripts["test:coverage"].match(/--test-coverage-include="([^"]+)"/);
    const lines = scripts["test:coverage"].match(/--test-coverage-lines=(\d+)/);
    const branches = scripts["test:coverage"].match(/--test-coverage-branches=(\d+)/);
    assert.ok(include && lines && branches, "覆盖率脚本缺少 include 或阈值参数");

    const env = { ...process.env };
    for (const key of Object.keys(env)) {
        if (key.startsWith("NODE_TEST")) delete env[key];
    }

    // 用只加载 src/ 入口的探针复现真实命令：避免递归运行整套单测，同时锁定
    // “报告不包含 dist/tests/scripts”与“阈值不足必须失败”两个验收行为。
    const result = spawnSync(process.execPath, [
        "--test",
        "--experimental-test-coverage",
        `--test-coverage-include=${include[1]}`,
        `--test-coverage-lines=${lines[1]}`,
        `--test-coverage-branches=${branches[1]}`,
        path.join(root, "tests/fixtures/coverage-probe.mjs")
    ], { cwd: root, env, encoding: "utf8", maxBuffer: 10 * 1024 * 1024 });
    const output = `${result.stdout}\n${result.stderr}`;

    assert.notEqual(result.status, 0, output);
    assert.match(output, new RegExp(`line coverage does not meet threshold of ${lines[1]}%`));
    const start = output.indexOf("# start of coverage report");
    const end = output.indexOf("# end of coverage report", start);
    assert.ok(start >= 0 && end > start, output);
    const report = output.slice(start, end);
    assert.match(report, /^# src\s/m, "覆盖率报告应包含 src/");
    assert.doesNotMatch(report, /^# (?:dist|tests|scripts)(?:\s|$)/m, "覆盖率报告不得混入 dist/tests/scripts");
});

test("CI 执行全量验证命令而不是仅跑 check", () => {
    const workflow = fs.readFileSync(path.join(root, ".github/workflows/ci.yml"), "utf8");
    assert.match(workflow, /npm ci/);
    assert.match(workflow, /npm run check:all/);
    assert.doesNotMatch(workflow, /npm run check\s*$/m, "CI 不得只运行 check 而漏掉浏览器测试");
});
