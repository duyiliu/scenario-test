// 验证脚本分层与 CI 口径：防止默认命令再次静默漏掉 .mjs 用例或覆盖率混入 dist/tests。
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const packageInfo = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
const scripts = packageInfo.scripts;

test("test:unit 同时收集 .test.js 与 .unit.test.mjs，浏览器 .mjs 用例由独立脚本显式执行", () => {
    assert.match(scripts["test:unit"], /tests\/\*\.test\.js/);
    assert.match(scripts["test:unit"], /tests\/\*\.unit\.test\.mjs/);
    assert.equal(scripts.test, "npm run test:unit");
    assert.match(scripts["test:browser"], /tests\/browser\.test\.mjs/);
    assert.match(scripts["test:ui-style"], /tests\/ui-style\.test\.mjs/);
});

test("test:all 汇总单元与浏览器用例，check 只跑单元，check:all 跑全量", () => {
    assert.equal(scripts["test:all"], "npm run test:unit && npm run test:browser && npm run test:ui-style");
    assert.match(scripts.check, /npm run build/);
    assert.match(scripts.check, /npm run test:unit/);
    assert.doesNotMatch(scripts.check, /test:browser|test:ui-style|test:all/);
    assert.equal(scripts["check:all"], "npm run build && npm run test:all");
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

test("CI 执行全量验证命令而不是仅跑 check", () => {
    const workflow = fs.readFileSync(path.join(root, ".github/workflows/ci.yml"), "utf8");
    assert.match(workflow, /npm ci/);
    assert.match(workflow, /npm run check:all/);
    assert.doesNotMatch(workflow, /npm run check\s*$/m, "CI 不得只运行 check 而漏掉浏览器测试");
});
