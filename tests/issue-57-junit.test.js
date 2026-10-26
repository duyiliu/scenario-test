import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { buildJUnitXml } from "../src/junit.js";
import { CONTRACT_VERSION, contract } from "../src/index.js";

// 隔离宿主 SCENARIO_* 变量，避免外部授权/全局参数/响应体开关影响子进程断言
for (const key of Object.keys(process.env)) {
    if (key.toUpperCase().startsWith("SCENARIO_")) delete process.env[key];
}

const cli = path.resolve(import.meta.dirname, "../src/cli.js");

function runCli(args) {
    return new Promise((resolve, reject) => {
        const child = spawn(process.execPath, [cli, ...args], { stdio: ["ignore", "pipe", "pipe"] });
        let stdout = "";
        let stderr = "";
        child.stdout.setEncoding("utf8");
        child.stderr.setEncoding("utf8");
        child.stdout.on("data", (chunk) => { stdout += chunk; });
        child.stderr.on("data", (chunk) => { stderr += chunk; });
        child.on("error", reject);
        child.on("close", (code) => resolve({ code, stdout, stderr }));
    });
}

test("contract v13 投射 --junit 选项（help 可见，无第二份名单）", () => {
    assert.equal(CONTRACT_VERSION, 13);
    assert.equal(contract.cli.options.junit.kind, "value");
    assert.equal(contract.cli.options.junit.prop, "junit");
});

test("JUnit XML：场景→testsuite、步骤→testcase，失败/跳过/未执行与耗时完整映射", () => {
    const scenario = {
        name: "JUnit & <场景>",
        failurePolicy: "stop",
        steps: [
            { name: "通过 & <步骤>" },
            { name: "失败 \"步骤\"" },
            { name: "条件跳过" },
            { name: "未执行步骤" }
        ]
    };
    const report = {
        scenarioName: scenario.name,
        status: "FAILED",
        planned: 4,
        results: [
            { stepNo: 1, name: "通过 & <步骤>", passed: true, skipped: false, duration: 125, assertions: [] },
            {
                stepNo: 2,
                name: "失败 \"步骤\"",
                passed: false,
                skipped: false,
                duration: 250,
                error: "字段 & <断言>",
                warnings: ["警告 > 需要转义"],
                assertions: [
                    {
                        name: "字段 & <断言>",
                        passed: false,
                        expected: "a&b",
                        actual: "<c>",
                        reason: "原因 & \"引号\"",
                        detail: [{
                            index: 1,
                            actual: { qty: 9 },
                            assertions: [{ name: "qty", passed: false, expected: 5, actual: 9 }]
                        }]
                    },
                    { name: "通过断言", passed: true, expected: 1, actual: 1 }
                ]
            },
            { stepNo: 3, name: "条件跳过", passed: true, skipped: true, status: "SKIPPED", duration: 1, assertions: [] }
        ]
    };

    const xml = buildJUnitXml([{ report, scenario }]);

    assert.match(xml, /^<\?xml version="1\.0" encoding="UTF-8"\?>\n<testsuites name="scenario-test" tests="4" failures="1" errors="0" skipped="2" time="0\.376">/);
    // 场景名与步骤名的 XML 特殊字符全部转义（属性中引号也转义）
    assert.ok(xml.includes('<testsuite name="JUnit &amp; &lt;场景&gt;" tests="4" failures="1" errors="0" skipped="2" time="0.376">'));
    assert.ok(xml.includes('<testcase name="通过 &amp; &lt;步骤&gt;" classname="JUnit &amp; &lt;场景&gt;" time="0.125">'));
    assert.ok(xml.includes('<testcase name="失败 &quot;步骤&quot;" classname="JUnit &amp; &lt;场景&gt;" time="0.250">'));
    // 失败详情：message 属性 + 断言/原因/each 明细/警告文本均存在且已转义
    assert.ok(xml.includes('<failure message="字段 &amp; &lt;断言&gt;" type="AssertionError">'));
    assert.ok(xml.includes('字段 &amp; &lt;断言&gt;: expected="a&amp;b" actual="&lt;c&gt;"'));
    assert.ok(xml.includes('原因: 原因 &amp; "引号"'));
    assert.ok(xml.includes("第 2 项 qty: expected=5 actual=9"));
    assert.ok(xml.includes("警告: 警告 &gt; 需要转义"));
    assert.ok(xml.includes('<testcase name="未执行步骤" classname="JUnit &amp; &lt;场景&gt;" time="0.000">'));
    assert.ok(xml.includes('<skipped message="因 failurePolicy: stop，上一步失败后步骤未执行"/>'));
    assert.ok(xml.includes('<skipped message="when 条件不成立，步骤未执行"/>'));
    // 判别用例：原始 & < > 仅允许作为实体的一部分出现，不能留下未转义文本
    assert.ok(!xml.includes("JUnit & <场景>"));
    assert.ok(!xml.includes("a&b"));
    assert.ok(!xml.includes("<c>"));
});

test("CLI --junit 写出报告：stdout/退出码保持原口径，路径父目录自动创建", async () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), "scenario-test-junit-"));
    const server = http.createServer((request, response) => {
        if (request.url === "/bad") {
            response.writeHead(500, { "Content-Type": "application/json" });
            response.end(JSON.stringify({ message: "失败 & <详情>" }));
            return;
        }
        response.writeHead(200, { "Content-Type": "application/json" });
        response.end(JSON.stringify({ status: "UP" }));
    });
    await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
    try {
        const port = server.address().port;
        fs.mkdirSync(path.join(directory, "scenarios"));
        fs.writeFileSync(path.join(directory, "scenario.config.js"), `ScenarioTest.registerConfig(ScenarioTest.defineConfig({envs:[{key:"mock",name:"Mock",baseUrl:"http://127.0.0.1:${port}"}],scenarios:[{id:"junit",name:"JUnit",url:"scenarios/junit.js"}]}));`, "utf8");
        fs.writeFileSync(path.join(directory, "scenarios/junit.js"), `ScenarioTest.registerScenario("junit",ScenarioTest.defineScenario({name:"报告 & <场景>",steps:[{name:"健康 & <检查>",path:"ok",status:200},{name:"失败步骤",path:"bad",assertions:[{path:"message",equals:"期望 & <值>"}]},{name:"未执行步骤",path:"ok",status:200}]}));`, "utf8");

        const junitPath = path.join(directory, "reports", "nested", "junit.xml");
        const result = await runCli(["--config", path.join(directory, "scenario.config.js"), "--all", "--junit", junitPath]);

        // 原有 stdout 人类可读输出与退出码不变
        assert.equal(result.code, 1, result.stderr);
        assert.match(result.stdout, /\[PASS\] 健康 & <检查>/);
        assert.match(result.stdout, /\[FAIL\] 失败步骤/);
        assert.match(result.stdout, /Overall: 1\/3 passed/);
        assert.ok(fs.existsSync(junitPath), "应自动创建父目录并写出 JUnit 文件");

        const xml = fs.readFileSync(junitPath, "utf8");
        assert.match(xml, /^<\?xml version="1\.0" encoding="UTF-8"\?>/);
        assert.ok(xml.includes('<testsuite name="报告 &amp; &lt;场景&gt;" tests="3" failures="1" errors="0" skipped="1"'));
        assert.ok(xml.includes('<testcase name="健康 &amp; &lt;检查&gt;"'));
        assert.ok(xml.includes('<testcase name="失败步骤"'));
        assert.ok(xml.includes('<failure message="message" type="AssertionError">'));
        assert.ok(xml.includes('message: expected="期望 &amp; &lt;值&gt;" actual="失败 &amp; &lt;详情&gt;"'));
        assert.ok(xml.includes('<testcase name="未执行步骤"'));
        assert.ok(xml.includes('<skipped message="因 failurePolicy: stop，上一步失败后步骤未执行"/>'));
    } finally {
        await new Promise((resolve) => server.close(resolve));
        fs.rmSync(directory, { recursive: true, force: true });
    }
});

test("CLI --junit + --concurrency：套件仍按配置清单顺序输出（与 --json 同序）", async () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), "scenario-test-junit-conc-"));
    const server = http.createServer((request, response) => {
        if (request.url.endsWith("bad")) {
            response.writeHead(500, { "Content-Type": "application/json" });
            response.end(JSON.stringify({ message: "失败" }));
            return;
        }
        response.writeHead(200, { "Content-Type": "application/json" });
        response.end(JSON.stringify({ status: "UP" }));
    });
    await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
    try {
        const port = server.address().port;
        fs.mkdirSync(path.join(directory, "scenarios"));
        fs.writeFileSync(path.join(directory, "scenario.config.js"), `ScenarioTest.registerConfig(ScenarioTest.defineConfig({envs:[{key:"mock",name:"Mock",baseUrl:"http://127.0.0.1:${port}"}],scenarios:[{id:"alpha",name:"场景甲",url:"scenarios/a.js"},{id:"beta",name:"场景乙 & <特>",url:"scenarios/b.js"}]}));`, "utf8");
        fs.writeFileSync(path.join(directory, "scenarios/a.js"), `ScenarioTest.registerScenario("alpha",ScenarioTest.defineScenario({name:"场景甲",steps:[{name:"甲一步",path:"ok",status:200}]}));`, "utf8");
        fs.writeFileSync(path.join(directory, "scenarios/b.js"), `ScenarioTest.registerScenario("beta",ScenarioTest.defineScenario({name:"场景乙 & <特>",failurePolicy:"stop",steps:[{name:"乙失败",path:"bad",assertions:[{path:"message",equals:"期望值"}]},{name:"乙未执行",path:"ok",status:200}]}));`, "utf8");

        const junitPath = path.join(directory, "junit-conc.xml");
        const result = await runCli(["--config", path.join(directory, "scenario.config.js"), "--all", "--concurrency", "2", "--junit", junitPath]);

        assert.equal(result.code, 1, result.stderr);
        const xml = fs.readFileSync(junitPath, "utf8");
        // 并发下完成顺序不定，但 XML 套件顺序必须与配置清单一致：甲在乙前
        const alphaIndex = xml.indexOf('<testsuite name="场景甲"');
        const betaIndex = xml.indexOf('<testsuite name="场景乙 &amp; &lt;特&gt;"');
        assert.ok(alphaIndex >= 0 && betaIndex > alphaIndex, `套件顺序应为甲在前：\n${xml}`);
        assert.ok(xml.includes('<skipped message="因 failurePolicy: stop，上一步失败后步骤未执行"/>'));
    } finally {
        await new Promise((resolve) => server.close(resolve));
        fs.rmSync(directory, { recursive: true, force: true });
    }
});
