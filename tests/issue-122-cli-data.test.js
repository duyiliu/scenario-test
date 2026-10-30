import assert from "node:assert/strict";
import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";
import test from "node:test";
import { parseCsv, parseDatasetText } from "../src/utils/data-file.js";
import { buildJUnitXml } from "../src/utils/junit.js";

// Issue #122：并发输出/JUnit 数据行/CSV 解析 3 项

test("#122：并发时 shape 明细走场景私有缓冲，不插到其他场景块", async () => {
    const backend = http.createServer((_request, response) => {
        response.writeHead(200, { "Content-Type": "application/json" });
        response.end(JSON.stringify({ data: { count: "many" } }));
    });
    await new Promise((resolve) => backend.listen(0, "127.0.0.1", resolve));
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "scenario-test-122-"));
    const cli = path.join(path.resolve(path.dirname(fileURLToPath(import.meta.url)), ".."), "src", "cli.js");
    try {
        fs.mkdirSync(path.join(dir, "scenarios"));
        fs.writeFileSync(path.join(dir, "scenarios", "shape.js"), `ScenarioTest.registerScenario("shape-fail", ScenarioTest.defineScenario({
            name: "形状失败场景",
            steps: [{ name: "检查", path: "data", assertions: [{ name: "结构", shape: { type: "object", properties: { data: { type: "object", properties: { count: { type: "number" } } } } } }] }]
        }));`, "utf8");
        fs.writeFileSync(path.join(dir, "scenarios", "other.js"), `ScenarioTest.registerScenario("other", ScenarioTest.defineScenario({
            name: "其他场景",
            steps: [{ name: "调用", path: "data" }]
        }));`, "utf8");
        fs.writeFileSync(path.join(dir, "scenario.config.js"), `ScenarioTest.registerConfig(ScenarioTest.defineConfig({
            envs: [{ key: "local", name: "本地", baseUrl: "http://127.0.0.1:${backend.address().port}" }],
            defaultEnvKey: "local",
            scenarios: [
                { id: "shape-fail", url: "scenarios/shape.js" },
                { id: "other", url: "scenarios/other.js" }
            ]
        }));`, "utf8");
        const result = await new Promise((resolve) => {
            const child = spawn(process.execPath, [cli, "run", "--config", path.join(dir, "scenario.config.js"), "--all", "--concurrency", "2"], { stdio: ["ignore", "pipe", "pipe"] });
            let stdout = "";
            child.stdout.on("data", (chunk) => { stdout += chunk; });
            child.on("close", (code) => resolve({ code, stdout }));
        });
        const lines = result.stdout.split("\n");
        const shapeStart = lines.findIndex((line) => line.includes("形状失败场景"));
        const otherStart = lines.findIndex((line) => line.includes("# 其他场景"));
        assert.ok(shapeStart >= 0 && otherStart >= 0, `应输出两个场景块:\n${result.stdout}`);
        const endOfShape = otherStart > shapeStart ? otherStart : lines.length;
        const shapeBlock = lines.slice(shapeStart, Math.min(endOfShape, shapeStart + 40)).join("\n");
        assert.match(shapeBlock, /↳/, `shape 明细应落在自己场景块内:\n${result.stdout}`);
        // 明细行不应出现在其他场景块
        const otherBlock = lines.slice(otherStart).join("\n");
        assert.doesNotMatch(otherBlock, /↳/, "shape 明细不得插到其他场景块");
    } finally {
        await new Promise((resolve) => backend.close(resolve));
        fs.rmSync(dir, { recursive: true, force: true });
    }
});

test("#122：CSV 未闭合引号/中段引号/闭合后非法字符明确报错", () => {
    assert.deepEqual(parseCsv("a,b\n1,2\n"), [["a", "b"], ["1", "2"]]);
    assert.deepEqual(parseCsv("a,b\n\"x\",\"y\"\n"), [["a", "b"], ["x", "y"]]);
    assert.deepEqual(parseCsv("a,b\n\"a\"\"b\",2\n"), [["a", "b"], ['a"b', "2"]]);
    assert.deepEqual(parseCsv("a,b\n\"x\ny\",2\n"), [["a", "b"], ["x\ny", "2"]]);
    assert.throws(() => parseCsv("a,b\n1,\"oops"), /引号未闭合/);
    assert.throws(() => parseCsv("a,b\n1,va\"lue"), /引号只能出现在字段开头/);
    assert.throws(() => parseCsv("a,b\n\"x\"y,2"), /存在非法字符/);
    assert.throws(() => parseDatasetText("a,b\n1,\"oops", "csv"), /引号未闭合/);
});

test("#122：JUnit 用数据行区分同名场景，并记录 --bail 未执行场景", () => {
    const report = (row) => ({
        scenarioId: `order#row-${row}`,
        scenarioName: "下单",
        results: [{ name: "提交", passed: true, duration: 5 }],
        unexecuted: []
    });
    const xml = buildJUnitXml([report(1), report(2)], {
        notRun: [{ id: "refund", name: "退款", row: 2, reason: "bail" }]
    });
    assert.match(xml, /<testsuite name="order#row-1"/);
    assert.match(xml, /<testsuite name="order#row-2"/);
    // 未执行场景必须有可被 CI 识别的 skipped 用例，而不是只靠退出码
    assert.match(xml, /<testsuite name="refund#row-2"[^>]*skipped="1"/);
    assert.match(xml, /<skipped message="--bail 后未执行"\/>/);
    assert.match(xml, /<testsuites[^>]*tests="3"/, "总数应包含两条数据行用例与一条未执行用例");
    assert.match(xml, /skipped="1"/);
});
