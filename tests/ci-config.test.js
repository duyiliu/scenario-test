import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root = path.resolve(import.meta.dirname, "..");
const workflowPath = path.join(root, ".github/workflows/ci.yml");
const workflow = fs.readFileSync(workflowPath, "utf8");
const lines = workflow.split(/\r?\n/);

function jobSection(name) {
    const start = lines.findIndex((line) => line === `  ${name}:`);
    assert.notEqual(start, -1, `CI 工作流缺少 ${name} job`);
    const section = [lines[start]];
    for (let index = start + 1; index < lines.length; index += 1) {
        // job 头固定为两个空格缩进，遇到下一个 job 即结束
        if (/^  [A-Za-z0-9_-]+:\s*$/.test(lines[index])) break;
        section.push(lines[index]);
    }
    return section.join("\n");
}

function runCommands(section) {
    return section
        .split(/\r?\n/)
        .map((line) => line.match(/^\s+(?:- )?run: (.+)$/)?.[1])
        .filter(Boolean);
}

test("CI 工作流在 push master 与 pull_request 上触发，并支持手动运行", () => {
    assert.match(workflow, /^on:\s*$/m);
    assert.match(workflow, /^  push:\s*\n    branches: \[master\]$/m, "push 触发须限定 master");
    assert.match(workflow, /^  pull_request:\s*$/m, "所有 PR 须触发 CI");
    assert.match(workflow, /^  workflow_dispatch:\s*$/m, "CI 须支持手动触发");
});

test("unit 矩阵覆盖 Node 20/22 × ubuntu/windows，执行构建、单测与行尾审计并缓存 npm", () => {
    const unit = jobSection("unit_tests");
    assert.match(unit, /runs-on: \$\{\{ matrix\.os \}\}/);
    assert.match(unit, /os: \[ubuntu-latest, windows-latest\]/, "unit 须覆盖 ubuntu 与 windows");
    assert.match(unit, /node: \[20, 22\]/, "unit 须覆盖 Node 20 与 22");
    assert.match(unit, /fail-fast: false/, "单个矩阵失败不应取消其他组合");
    assert.match(unit, /cache: npm/, "setup-node 须缓存 npm");
    assert.deepEqual(runCommands(unit), [
        "npm ci",
        "npm run build",
        "npm test",
        "npm run check:eol"
    ]);

    const gate = jobSection("unit");
    assert.match(gate, /name: unit$/m, "聚合检查须命名为 unit");
    assert.match(gate, /needs: unit_tests/);
    assert.match(gate, /if: always\(\)/, "矩阵失败时仍须执行聚合检查");
    assert.match(gate, /needs\.unit_tests\.result/, "聚合检查须读取矩阵结果");
});

test("browser job 在 ubuntu 安装 Playwright Chromium 并执行浏览器测试", () => {
    const browser = jobSection("browser");
    assert.match(browser, /name: browser$/m, "浏览器检查须命名为 browser");
    assert.match(browser, /runs-on: ubuntu-latest/);
    assert.match(browser, /cache: npm/, "setup-node 须缓存 npm");
    assert.match(browser, /PLAYWRIGHT_CHANNEL: chromium/, "CI 须使用 Playwright 安装的 Chromium");
    assert.deepEqual(runCommands(browser), [
        "npm ci",
        "npm run build",
        "npx playwright install --with-deps chromium",
        "npm run test:browser"
    ]);
});

test("浏览器测试支持 PLAYWRIGHT_CHANNEL 覆盖，默认仍用本机 Chrome", () => {
    const browserTest = fs.readFileSync(path.join(root, "tests/browser.test.mjs"), "utf8");
    assert.match(browserTest, /process\.env\.PLAYWRIGHT_CHANNEL \|\| "chrome"/);
});
