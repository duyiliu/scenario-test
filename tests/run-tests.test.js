import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { listTestFiles } from "../scripts/run-tests.mjs";

const root = path.resolve(import.meta.dirname, "..");

test("run-tests 显式收集 tests/*.test.js，绕过 Windows Node 20 的 glob 限制", () => {
    const files = listTestFiles(root);
    const expected = fs.readdirSync(path.join(root, "tests"))
        .filter((name) => name.endsWith(".test.js"))
        .sort()
        .map((name) => path.join(root, "tests", name));

    assert.deepEqual(files, expected);
    assert.ok(files.length > 0, "至少应收集到一个测试文件");
    assert.ok(files.every((file) => file.endsWith(".test.js")), "不得把 browser/ui-style 的 .mjs 脚本混入单元测试");
    assert.ok(files.some((file) => file.endsWith(`${path.sep}ci-config.test.js`)), "应收集 CI 配置测试");
});

test("package.json 的 test / test:coverage 复用跨平台运行器", () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
    assert.equal(pkg.scripts.test, "node scripts/run-tests.mjs");
    assert.equal(pkg.scripts["test:coverage"], "node scripts/run-tests.mjs --experimental-test-coverage");
});
