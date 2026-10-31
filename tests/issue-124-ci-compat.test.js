import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { randomUuid } from "../src/core.js";

// Issue #124：test/ci 补强——Node 版本基线、d.ts 自编译（见 dts.test.js）、dist 新鲜度
// （CI 步骤）、浏览器测试端口/channel 可配置。0.13.0 起下限为 Node 22，原 Node 18
// 专项（import.meta.dirname / 无 crypto 的 UUID）随兼容代码删除，改为基线断言。

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

test("#124：Node 基线——engines 下限为 22，src/测试不使用低于 22 的写法", () => {
    const selfPath = fileURLToPath(import.meta.url);
    const offenders = listFiles(path.join(root, "src"), ".js")
        .filter((file) => file !== selfPath && fs.readFileSync(file, "utf8").includes("import.meta.dirname"))
        .map((file) => path.relative(root, file));
    // import.meta.dirname 自 Node 20.11 可用，22 基线不禁止；此处仅锁定 engines 下限
    assert.deepEqual(offenders, [], `src 不应依赖低于 engines 下限的 API: ${offenders.join(", ")}`);
    const pkg = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
    assert.equal(pkg.engines.node, ">=22", "0.13.0 起运行时下限为 Node 22");
    const workflow = fs.readFileSync(path.join(root, ".github/workflows/ci.yml"), "utf8");
    assert.match(workflow, /node: \[22, 24\]/, "CI 矩阵应为 22/24");
});

test("#124：UUID v4 格式与唯一性（randomUuid 降级链只保留 getRandomValues）", () => {
    const uuid = randomUuid();
    assert.match(uuid, /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    assert.notEqual(randomUuid(), uuid);
    // 无 crypto 时应明确报错，而不是静默退化到 Math.random
    const original = Object.getOwnPropertyDescriptor(globalThis, "crypto");
    Object.defineProperty(globalThis, "crypto", { value: undefined, configurable: true });
    try {
        assert.throws(() => randomUuid(), /不支持 crypto\.randomUUID\/getRandomValues/);
    } finally {
        if (original) Object.defineProperty(globalThis, "crypto", original);
        else delete globalThis.crypto;
    }
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

test("#124：CI 覆盖 dist 新鲜度、d.ts 自编译与 Node 22/24 矩阵", () => {
    const workflow = fs.readFileSync(path.join(root, ".github/workflows/ci.yml"), "utf8");
    assert.match(workflow, /node: \[22, 24\]/);
    assert.match(workflow, /dist 新鲜度/);
    assert.match(workflow, /git diff --exit-code -- dist\//);
    assert.match(workflow, /tsc --noEmit/);
    assert.match(workflow, /node --test tests\/dts\.test\.js/);
});
