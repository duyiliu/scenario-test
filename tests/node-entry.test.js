import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import * as ScenarioTest from "../src/node.js";

function writeScenario(dir, fileName, id, name) {
    const file = path.join(dir, fileName);
    fs.writeFileSync(
        file,
        `ScenarioTest.registerScenario(${JSON.stringify(id)}, ScenarioTest.defineScenario({ name: ${JSON.stringify(name)}, steps: [] }));\n`,
        "utf8"
    );
    return file;
}

test("node 入口的 createApp 是浏览器占位：保留导出形状，调用报明确错误", () => {
    assert.equal(typeof ScenarioTest.createApp, "function");
    assert.throws(
        () => ScenarioTest.createApp({ mount: "#app" }),
        /createApp 仅在浏览器环境可用/
    );
});

test("loadScenarioFile：同 id 不同文件路径加载各自内容，不再返回首个文件的陈旧场景", () => {
    const dirA = fs.mkdtempSync(path.join(os.tmpdir(), "scenario-test-loader-a-"));
    const dirB = fs.mkdtempSync(path.join(os.tmpdir(), "scenario-test-loader-b-"));
    const id = "shared-id-path-aware";
    try {
        const fileA = writeScenario(dirA, "a.js", id, "场景A");
        const fileB = writeScenario(dirB, "b.js", id, "场景B");

        const first = ScenarioTest.loadScenarioFile(fileA, id, ScenarioTest);
        assert.equal(first.name, "场景A");

        // 此前按 id 命中注册表直接返回「场景A」——不同路径应重新执行文件并覆盖注册
        const second = ScenarioTest.loadScenarioFile(fileB, id, ScenarioTest);
        assert.equal(second.name, "场景B");
        assert.equal(ScenarioTest.getScenario(id).name, "场景B");
    } finally {
        fs.rmSync(dirA, { recursive: true, force: true });
        fs.rmSync(dirB, { recursive: true, force: true });
    }
});

test("loadScenarioFile：同 id 同路径重复加载仍走缓存，不重复执行文件", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "scenario-test-loader-c-"));
    const id = "same-path-cache";
    try {
        const file = writeScenario(dir, "s.js", id, "首轮内容");
        const first = ScenarioTest.loadScenarioFile(file, id, ScenarioTest);
        // 改写文件后再次加载同一路径：命中缓存返回首个已注册内容，不重新执行
        writeScenario(dir, "s.js", id, "改写后内容");
        const again = ScenarioTest.loadScenarioFile(file, id, ScenarioTest);
        assert.equal(again, first);
        assert.equal(again.name, "首轮内容");
    } finally {
        fs.rmSync(dir, { recursive: true, force: true });
    }
});
