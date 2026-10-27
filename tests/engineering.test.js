import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root = path.resolve(import.meta.dirname, "..");

test("#48 测试脚本分层：unit/browser/all/coverage 与阈值显式声明", () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
    assert.match(pkg.scripts.test, /node --test tests\/\*\.test\.js/);
    assert.equal(pkg.scripts["test:unit"], pkg.scripts.test);
    assert.match(pkg.scripts["test:browser"], /browser\.test\.mjs/);
    assert.match(pkg.scripts["test:ui-style"], /ui-style\.test\.mjs/);
    assert.match(pkg.scripts["test:all"], /test:unit/);
    assert.match(pkg.scripts["test:all"], /test:browser/);
    assert.match(pkg.scripts["test:all"], /test:ui-style/);
    assert.match(pkg.scripts.check, /test:browser/, "check 不应静默漏掉浏览器测试");
    assert.match(pkg.scripts["check:all"], /check:eol/);
    const coverage = pkg.scripts["test:coverage"];
    assert.match(coverage, /test-coverage-include="src\/\*\*"/);
    assert.match(coverage, /test-coverage-exclude="src\/browser\/\*\*"/);
    assert.match(coverage, /test-coverage-lines=90/);
    assert.match(coverage, /test-coverage-branches=80/);
});

test("#47 CI：push master / PR 触发，覆盖 unit 矩阵、覆盖率与浏览器测试", () => {
    const workflow = fs.readFileSync(path.join(root, ".github/workflows/ci.yml"), "utf8");
    assert.match(workflow, /on:\s*\n\s*push:/);
    assert.match(workflow, /pull_request/);
    assert.match(workflow, /os: \[ubuntu-latest, windows-latest\]/);
    assert.match(workflow, /node: \[20, 22\]/);
    assert.match(workflow, /npm run test:unit/);
    assert.match(workflow, /npm run test:coverage/);
    assert.match(workflow, /npm run test:browser/);
    assert.match(workflow, /npm run check:eol/);
    assert.match(workflow, /playwright install/);
});
