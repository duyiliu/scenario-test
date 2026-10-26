import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { buildCapabilities, CONTRACT_VERSION, contract, renderCapabilitiesText } from "../src/index.js";

// 隔离宿主 SCENARIO_* 变量，避免外部授权/全局参数改变被测子进程行为
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

async function withServer(handler, run) {
    const server = http.createServer(handler);
    await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
    try {
        return await run(server.address().port);
    } finally {
        await new Promise((resolve) => server.close(resolve));
    }
}

function writeFixture(directory, port) {
    fs.mkdirSync(path.join(directory, "scenarios"), { recursive: true });
    fs.writeFileSync(path.join(directory, "scenario.config.js"), `ScenarioTest.registerConfig(ScenarioTest.defineConfig({
        envs: [{ key: "mock", name: "Mock", baseUrl: "http://127.0.0.1:${port}" }],
        scenarios: [
            { id: "lead", name: "Lead", url: "scenarios/lead.js" },
            { id: "leadskip", name: "LeadSkip", url: "scenarios/leadskip.js" },
            { id: "failing", name: "Failing", url: "scenarios/failing.js" },
            { id: "passing", name: "Passing", url: "scenarios/passing.js" },
            { id: "later", name: "Later", url: "scenarios/later.js" },
            { id: "stop", name: "Stop", url: "scenarios/stop.js" },
            { id: "skippable", name: "Skippable", url: "scenarios/skippable.js" },
            { id: "manual", name: "ManualOnly", url: "scenarios/manual.js", manual: true }
        ]
    }));`, "utf8");
    fs.writeFileSync(path.join(directory, "scenarios/lead.js"),
        `ScenarioTest.registerScenario("lead",ScenarioTest.defineScenario({name:"Lead",steps:[{name:"lead-step",path:"pass",status:200}]}));`, "utf8");
    fs.writeFileSync(path.join(directory, "scenarios/leadskip.js"),
        `ScenarioTest.registerScenario("leadskip",ScenarioTest.defineScenario({name:"LeadSkip",steps:[{name:"leadskip-step",path:"pass",status:200,when:{from:"vars",path:"missing",exists:true}}]}));`, "utf8");
    fs.writeFileSync(path.join(directory, "scenarios/failing.js"),
        `ScenarioTest.registerScenario("failing",ScenarioTest.defineScenario({name:"Failing",steps:[{name:"fail-step",path:"pass",status:200,assertions:[{path:"status",equals:"DOWN"}]}]}));`, "utf8");
    fs.writeFileSync(path.join(directory, "scenarios/passing.js"),
        `ScenarioTest.registerScenario("passing",ScenarioTest.defineScenario({name:"Passing",steps:[{name:"pass-step",path:"pass",status:200}]}));`, "utf8");
    fs.writeFileSync(path.join(directory, "scenarios/later.js"),
        `ScenarioTest.registerScenario("later",ScenarioTest.defineScenario({name:"Later",steps:[{name:"later-step",path:"pass",status:200}]}));`, "utf8");
    fs.writeFileSync(path.join(directory, "scenarios/stop.js"),
        `ScenarioTest.registerScenario("stop",ScenarioTest.defineScenario({name:"Stop",failurePolicy:"stop",steps:[{name:"stop-fail",path:"pass",status:200,assertions:[{path:"status",equals:"DOWN"}]},{name:"stop-never",path:"pass",status:200}]}));`, "utf8");
    fs.writeFileSync(path.join(directory, "scenarios/skippable.js"),
        `ScenarioTest.registerScenario("skippable",ScenarioTest.defineScenario({name:"Skippable",steps:[{name:"skip-step",path:"pass",status:200,when:{from:"vars",path:"missing",exists:true}}]}));`, "utf8");
    fs.writeFileSync(path.join(directory, "scenarios/manual.js"),
        `ScenarioTest.registerScenario("manual",ScenarioTest.defineScenario({name:"ManualOnly",steps:[{name:"manual-step",path:"pass",status:200}]}));`, "utf8");
}

test("contract v14 投射 --bail 到 capabilities、文本与 --help", () => {
    assert.equal(CONTRACT_VERSION, 14);
    assert.equal(contract.cli.options.bail.kind, "flag");
    assert.equal(contract.cli.options.bail.prop, "bail");

    const capabilities = buildCapabilities(contract);
    assert.equal(capabilities.contractVersion, 14);
    assert.equal(capabilities.cli.options.bail.kind, "flag");
    assert.match(renderCapabilitiesText(capabilities), /--bail/);

    const result = spawnSync(process.execPath, [cli, "--help"], { encoding: "utf8" });
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /--bail/);
});

test("--bail 遇首个失败场景即停，文本与 JSON 显式标注未执行场景", async () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), "scenario-test-issue71-bail-"));
    try {
        await withServer((request, response) => {
            response.writeHead(200, { "Content-Type": "application/json" });
            response.end(JSON.stringify({ status: "UP" }));
        }, async (port) => {
            writeFixture(directory, port);
            const configPath = path.join(directory, "scenario.config.js");

            // 不传 --bail：行为保持不变，三个场景全部执行
            const allRun = await runCli(["--config", configPath, "--scenario", "failing,passing,later"]);
            assert.equal(allRun.code, 1, allRun.stderr);
            assert.match(allRun.stdout, /\[FAIL\] fail-step/);
            assert.match(allRun.stdout, /\[PASS\] pass-step/);
            assert.match(allRun.stdout, /\[PASS\] later-step/);
            assert.doesNotMatch(allRun.stdout, /NOT RUN|--bail/);
            assert.match(allRun.stdout, /Overall: 2\/3 passed/);

            // 传 --bail：后续场景不执行，文本单列未执行场景
            const bailed = await runCli(["--config", configPath, "--scenario", "failing,passing,later", "--bail"]);
            assert.equal(bailed.code, 1, bailed.stderr);
            assert.match(bailed.stdout, /\[FAIL\] fail-step/);
            assert.doesNotMatch(bailed.stdout, /pass-step|later-step/);
            assert.match(bailed.stdout, /\[NOT RUN\] Passing \(passing\) — --bail：前序场景失败，未执行/);
            assert.match(bailed.stdout, /\[NOT RUN\] Later \(later\) — --bail：前序场景失败，未执行/);
            assert.match(bailed.stdout, /--bail 已开启：首个失败场景后跳过 2 个未执行场景/);
            assert.match(bailed.stdout, /结论：执行失败。.*因 --bail 跳过 2 个场景/);
            assert.match(bailed.stdout, /Overall: 0\/1 passed/);

            // --json：未执行场景以 status NOT_RUN + notRun:true 出现在 scenarios 中，且不带步骤结果
            const json = await runCli(["--config", configPath, "--scenario", "failing,passing,later", "--bail", "--json"]);
            assert.equal(json.code, 1, json.stderr);
            assert.match(json.stderr, /\[NOT RUN\] Passing \(passing\)/);
            const parsed = JSON.parse(json.stdout);
            assert.equal(parsed.scenarios.length, 3);
            assert.equal(parsed.scenarios[0].scenarioName, "Failing");
            assert.equal(parsed.scenarios[0].status, "FAILED");
            assert.deepEqual(parsed.scenarios.slice(1).map((report) => ({
                scenarioId: report.scenarioId,
                scenarioName: report.scenarioName,
                status: report.status,
                notRun: report.notRun,
                results: report.results
            })), [
                { scenarioId: "passing", scenarioName: "Passing", status: "NOT_RUN", notRun: true, results: [] },
                { scenarioId: "later", scenarioName: "Later", status: "NOT_RUN", notRun: true, results: [] }
            ]);
            assert.doesNotMatch(json.stdout, /pass-step|later-step/);

            // 前序场景通过时继续执行，只在真正失败后截断（验证不是固定跑第一个）
            const afterPass = await runCli(["--config", configPath, "--scenario", "lead,failing,later", "--bail", "--json"]);
            assert.equal(afterPass.code, 1, afterPass.stderr);
            const afterPassJson = JSON.parse(afterPass.stdout);
            assert.deepEqual(afterPassJson.scenarios.map((report) => report.status), ["PASSED", "FAILED", "NOT_RUN"]);
            assert.equal(afterPassJson.scenarios[2].scenarioId, "later");

            // failurePolicy:stop 未执行到位的步骤同样使场景 FAILED，并触发 --bail
            // --scenario 按配置清单顺序执行，故用 stop 后的 skippable 验证截断
            const stopped = await runCli(["--config", configPath, "--scenario", "stop,skippable", "--bail", "--json"]);
            assert.equal(stopped.code, 1, stopped.stderr);
            const stoppedJson = JSON.parse(stopped.stdout);
            assert.deepEqual(stoppedJson.scenarios.map((report) => report.status), ["FAILED", "NOT_RUN"]);
            assert.equal(stoppedJson.scenarios[0].planned, 2);
            assert.equal(stoppedJson.scenarios[0].executed, 1);
            assert.equal(stoppedJson.scenarios[0].failed, 1);
            assert.equal(stoppedJson.scenarios[1].scenarioId, "skippable");
            assert.match(stopped.stderr, /因 stop 策略未执行 1 步，因 --bail 跳过 1 个场景/);

            // --all --bail：manual 场景不参与，也不会被标成未执行
            const allBailed = await runCli(["--config", configPath, "--all", "--bail"]);
            assert.equal(allBailed.code, 1, allBailed.stderr);
            assert.doesNotMatch(allBailed.stdout, /manual-step|ManualOnly/);
            assert.match(allBailed.stdout, /--bail 已开启：首个失败场景后跳过 4 个未执行场景/);
        });
    } finally {
        fs.rmSync(directory, { recursive: true, force: true });
    }
});

test("--bail 不把 SKIP 当失败，且与 --fail-on-skip 互不干扰", async () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), "scenario-test-issue71-bail-skip-"));
    try {
        await withServer((request, response) => {
            response.writeHead(200, { "Content-Type": "application/json" });
            response.end(JSON.stringify({ status: "UP" }));
        }, async (port) => {
            writeFixture(directory, port);
            const result = await runCli([
                "--config", path.join(directory, "scenario.config.js"),
                "--scenario", "leadskip,failing,passing",
                "--bail", "--fail-on-skip"
            ]);
            assert.equal(result.code, 1, result.stderr);
            // 首个场景全 SKIP 不触发 bail，后续失败场景仍执行；失败后才截断
            assert.match(result.stdout, /\[SKIP\] leadskip-step/);
            assert.match(result.stdout, /\[FAIL\] fail-step/);
            assert.doesNotMatch(result.stdout, /pass-step/);
            assert.match(result.stdout, /--fail-on-skip 已开启，存在 1 个 SKIP 步骤/);
            assert.match(result.stdout, /\[NOT RUN\] Passing \(passing\)/);
            assert.match(result.stdout, /--bail 已开启：首个失败场景后跳过 1 个未执行场景/);
        });
    } finally {
        fs.rmSync(directory, { recursive: true, force: true });
    }
});

test("--bail 与 --concurrency 组合：已在执行场景跑完，未启动场景标记 NOT_RUN", async () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), "scenario-test-issue71-bail-concurrency-"));
    try {
        // 版本断言以外的场景按配置顺序：先失败 + 慢场景并发启动，后续两个不应被调度
        fs.mkdirSync(path.join(directory, "scenarios"), { recursive: true });
        fs.writeFileSync(path.join(directory, "scenario.config.js"), `ScenarioTest.registerConfig(ScenarioTest.defineConfig({
            envs: [{ key: "mock", name: "Mock", baseUrl: "http://127.0.0.1:__PORT__" }],
            scenarios: [
                { id: "failing", name: "Failing", url: "scenarios/failing.js" },
                { id: "slow", name: "Slow", url: "scenarios/slow.js" },
                { id: "later", name: "Later", url: "scenarios/later.js" },
                { id: "passing", name: "Passing", url: "scenarios/passing.js" }
            ]
        }));`, "utf8");
        fs.writeFileSync(path.join(directory, "scenarios/failing.js"),
            `ScenarioTest.registerScenario("failing",ScenarioTest.defineScenario({name:"Failing",steps:[{name:"fail-step",path:"pass",status:200,assertions:[{path:"status",equals:"DOWN"}]}]}));`, "utf8");
        fs.writeFileSync(path.join(directory, "scenarios/slow.js"),
            `ScenarioTest.registerScenario("slow",ScenarioTest.defineScenario({name:"Slow",steps:[{name:"slow-step",path:"slow",status:200}]}));`, "utf8");
        fs.writeFileSync(path.join(directory, "scenarios/later.js"),
            `ScenarioTest.registerScenario("later",ScenarioTest.defineScenario({name:"Later",steps:[{name:"later-step",path:"pass",status:200}]}));`, "utf8");
        fs.writeFileSync(path.join(directory, "scenarios/passing.js"),
            `ScenarioTest.registerScenario("passing",ScenarioTest.defineScenario({name:"Passing",steps:[{name:"pass-step",path:"pass",status:200}]}));`, "utf8");

        const hits = [];
        await withServer((request, response) => {
            hits.push(request.url);
            // 慢场景保证失败场景先返回，验证「已在执行场景跑完、未启动场景不再启动」
            const delay = request.url === "/slow" ? 200 : 0;
            setTimeout(() => {
                response.writeHead(200, { "Content-Type": "application/json" });
                response.end(JSON.stringify({ status: "UP" }));
            }, delay);
        }, async (port) => {
            const configPath = path.join(directory, "scenario.config.js");
            fs.writeFileSync(configPath, fs.readFileSync(configPath, "utf8").replace("__PORT__", String(port)), "utf8");

            // 并发 + 不传 --bail：四个场景全部执行，行为不变
            const allRun = await runCli(["--config", configPath, "--scenario", "failing,slow,later,passing", "--concurrency", "2"]);
            assert.equal(allRun.code, 1, allRun.stderr);
            assert.match(allRun.stdout, /\[PASS\] slow-step/);
            assert.match(allRun.stdout, /\[PASS\] later-step/);
            assert.match(allRun.stdout, /\[PASS\] pass-step/);
            assert.equal(hits.length, 4, `未传 --bail 时应全部执行，实际请求: ${hits.join(",")}`);

            // 并发 + --bail：failing 与 slow 已启动并跑完，later/passing 不再启动
            hits.length = 0;
            const bailed = await runCli(["--config", configPath, "--scenario", "failing,slow,later,passing", "--concurrency", "2", "--bail", "--json"]);
            assert.equal(bailed.code, 1, bailed.stderr);
            assert.deepEqual(hits, ["/pass", "/slow"], `已启动场景应跑完且不调度后续场景，实际请求: ${hits.join(",")}`);
            assert.match(bailed.stderr, /\[NOT RUN\] Later \(later\)/);
            assert.match(bailed.stderr, /\[NOT RUN\] Passing \(passing\)/);
            assert.doesNotMatch(bailed.stderr, /\[NOT RUN\] Slow/);
            assert.match(bailed.stderr, /--bail 已开启：首个失败场景后跳过 2 个未执行场景/);

            const parsed = JSON.parse(bailed.stdout);
            assert.deepEqual(parsed.scenarios.map((report) => report.status), ["FAILED", "PASSED", "NOT_RUN", "NOT_RUN"]);
            assert.deepEqual(parsed.scenarios.map((report) => report.scenarioName), ["Failing", "Slow", "Later", "Passing"]);
            assert.equal(parsed.scenarios[2].scenarioId, "later");
            assert.equal(parsed.scenarios[3].scenarioId, "passing");
            assert.equal(parsed.scenarios[2].notRun, true);
            assert.equal(parsed.scenarios[3].notRun, true);
            assert.deepEqual(parsed.scenarios[2].results, []);
            assert.match(bailed.stdout, /"scenarioName": "Later"/);
        });
    } finally {
        fs.rmSync(directory, { recursive: true, force: true });
    }
});
