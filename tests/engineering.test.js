import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

test("#48 测试脚本分层：unit/browser/all 与 check 分层显式声明", () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
    // Windows PowerShell/cmd 与 Node 18/20 不展开 tests/*.test.js，统一由跨平台 runner 枚举
    assert.match(pkg.scripts.test, /scripts\/run-tests\.mjs/);
    assert.equal(pkg.scripts["test:unit"], pkg.scripts.test);
    const runner = fs.readFileSync(path.join(root, "scripts/run-tests.mjs"), "utf8");
    assert.match(runner, /\.test\.js/);
    assert.match(runner, /"--test"/);
    assert.match(pkg.scripts["test:browser"], /browser\.test\.mjs/);
    assert.match(pkg.scripts["test:ui-style"], /ui-style\.test\.mjs/);
    assert.match(pkg.scripts["test:all"], /test:unit/);
    assert.match(pkg.scripts["test:all"], /test:browser/);
    assert.match(pkg.scripts["test:all"], /test:ui-style/);
    assert.match(pkg.scripts.check, /test:browser/, "check 不应静默漏掉浏览器测试");
    assert.match(pkg.scripts["check:all"], /check:eol/);
    // 覆盖率门禁已从仓库清理：不再提供 test:coverage 脚本，防止回潮
    assert.equal(pkg.scripts["test:coverage"], undefined, "test:coverage 已下线，不应重新出现");
});

test("#47 CI：push master / PR 触发，覆盖 unit 矩阵、类型自检与浏览器测试", () => {
    const workflow = fs.readFileSync(path.join(root, ".github/workflows/ci.yml"), "utf8");
    assert.match(workflow, /on:\s*\n\s*push:/);
    assert.match(workflow, /pull_request/);
    assert.match(workflow, /os: \[ubuntu-latest, windows-latest\]/);
    // Node 18 是 engines 下限（只跑 unit，不跑依赖 Tailwind 4 的构建）；20/22 全量
    assert.match(workflow, /node: \[18, 20, 22\]/);
    assert.match(workflow, /matrix\.node != 18/, "构建步骤应跳过 Node 18");
    assert.match(workflow, /npm run test:unit/);
    assert.doesNotMatch(workflow, /test:coverage/, "覆盖率 job 已下线，不应重新出现");
    assert.match(workflow, /npm run test:browser/);
    assert.match(workflow, /npm run check:eol/);
    assert.match(workflow, /playwright install/);
    // #124：dist 新鲜度与 d.ts 自编译必须进 CI，否则 stale dist / P0 类型错误能漏网
    assert.match(workflow, /git diff --exit-code -- dist\//);
    assert.match(workflow, /tsc --noEmit[\s\S]*dist\/scenario-test\.d\.ts/);
});
