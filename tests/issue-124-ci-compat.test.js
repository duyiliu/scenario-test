import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

// Issue #124：test/ci 补强——Node 18 兼容、d.ts 自编译（见 dts.test.js）、dist 新鲜度
// （CI 步骤）、浏览器测试端口/channel 可配置

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function listFiles(dir, extension) {
    const result = [];
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) result.push(...listFiles(full, extension));
        else if (entry.name.endsWith(extension)) result.push(full);
    }
    return result;
}

test("#124：Node 18 运行时兼容——src 不使用 import.meta.dirname（20.11+ 才有）", () => {
    const offenders = listFiles(path.join(root, "src"), ".js")
        .filter((file) => file !== fileURLToPath(import.meta.url) && fs.readFileSync(file, "utf8").includes("import.meta.dirname"))
        .map((file) => path.relative(root, file));
    assert.deepEqual(offenders, [], `Node 18 不支持 import.meta.dirname: ${offenders.join(", ")}`);
    // 测试同样要在 Node 18 下能跑（CI unit 矩阵含 18）
    const testOffenders = listFiles(path.join(root, "tests"), ".js")
        .filter((file) => file !== import.meta.filename && fs.readFileSync(file, "utf8").includes("import.meta.dirname"))
        .map((file) => path.relative(root, file));
    assert.deepEqual(testOffenders, [], `Node 18 测试不支持 import.meta.dirname: ${testOffenders.join(", ")}`);
});

test("#124：浏览器测试端口不写死、默认用 Playwright 内置 chromium", () => {
    for (const file of ["tests/browser.test.mjs", "tests/ui-style.test.mjs"]) {
        const source = fs.readFileSync(path.join(root, file), "utf8");
        assert.doesNotMatch(source, /const port = 4\d{3};/, `${file} 不应写死端口`);
        assert.match(source, /SCENARIO_TEST_(BROWSER|UI_STYLE)_PORT/, `${file} 应支持环境变量覆盖端口`);
        assert.doesNotMatch(source, /channel: "chrome"/, `${file} 不应硬编码系统 Chrome`);
        assert.match(source, /SCENARIO_TEST_BROWSER_CHANNEL/, `${file} 应支持显式指定浏览器 channel`);
    }
});

test("#124：CI 覆盖 dist 新鲜度、d.ts 自编译与 Node 18", () => {
    const workflow = fs.readFileSync(path.join(root, ".github/workflows/ci.yml"), "utf8");
    assert.match(workflow, /node: \[18, 20, 22\]/);
    assert.match(workflow, /dist 新鲜度/);
    assert.match(workflow, /git diff --exit-code -- dist\//);
    assert.match(workflow, /tsc --noEmit/);
    assert.match(workflow, /node --test tests\/dts\.test\.js/);
});
