import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { buildCapabilities, CONTRACT_VERSION, contract, renderCapabilitiesText } from "../src/index.js";

// 隔离宿主 SCENARIO_* 变量，避免外部授权/全局参数影响子进程断言
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

function makeProject(configBody, scenarioBody, scenarioFile = "scenarios/data.js") {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), "scenario-test-issue70-"));
    fs.mkdirSync(path.join(directory, "scenarios"), { recursive: true });
    fs.writeFileSync(path.join(directory, "scenario.config.js"), configBody, "utf8");
    fs.writeFileSync(path.join(directory, scenarioFile), scenarioBody, "utf8");
    return directory;
}

function configSource(port, extra = "") {
    return `ScenarioTest.registerConfig(ScenarioTest.defineConfig({
        envs: [{ key: "mock", name: "Mock", baseUrl: "http://127.0.0.1:${port}" }],
        requestTimeoutMs: 10000,
        ${extra}
        scenarios: [{ id: "data", name: "Data", url: "scenarios/data.js" }]
    }));`;
}

test("contract v14 与 capabilities/--help 投射 --data 数据集选项", () => {
    assert.equal(CONTRACT_VERSION, 14);
    assert.equal(contract.cli.options.data.kind, "value");
    assert.equal(contract.cli.options.data.prop, "data");
    assert.match(contract.cli.options.data.description, /JSONL|jsonl/);
    assert.match(contract.cli.options.data.description, /CSV|csv/);

    const capabilities = buildCapabilities(contract);
    assert.equal(capabilities.cli.options.data.kind, "value");
    assert.match(renderCapabilitiesText(capabilities), /--data/);

    const result = spawnSync(process.execPath, [cli, "--help"], { encoding: "utf8" });
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /--data <value>/);
    assert.match(result.stdout, /每行变量集执行一次所选场景/);
});

test("--data JSONL：每行变量集执行一次场景，报告按行聚合", async () => {
    const received = [];
    await withServer((request, response) => {
        received.push({ id: request.headers["x-id"], name: request.headers["x-name"] });
        response.writeHead(200, { "Content-Type": "application/json" });
        response.end(JSON.stringify({ id: request.headers["x-id"], name: request.headers["x-name"] }));
    }, async (port) => {
        const directory = makeProject(
            configSource(port),
            `ScenarioTest.registerScenario("data", ScenarioTest.defineScenario({
                name: "Data",
                steps: [{
                    name: "回显数据行",
                    path: "echo",
                    status: 200,
                    request: { headers: { "X-Id": "{{vars.id}}", "X-Name": "{{vars.name}}" } },
                    assertions: [
                        { path: "id", equals: "{{vars.id}}" },
                        { path: "name", equals: "{{vars.name}}" }
                    ]
                }]
            }));`
        );
        try {
            const dataFile = path.join(directory, "cases.jsonl");
            fs.writeFileSync(dataFile, [
                JSON.stringify({ id: "1", name: "Alice" }),
                JSON.stringify({ id: "2", name: "Bob" })
            ].join("\n"), "utf8");

            const result = await runCli([
                "run",
                "--config", path.join(directory, "scenario.config.js"),
                "--scenario", "data",
                "--data", dataFile,
                "--json"
            ]);
            assert.equal(result.code, 0, result.stderr);
            const payload = JSON.parse(result.stdout);
            assert.equal(payload.data.total, 2);
            assert.equal(payload.data.passed, 2);
            assert.equal(payload.data.failed, 0);
            assert.deepEqual(payload.data.rows.map((item) => item.row), [1, 2]);
            assert.deepEqual(payload.data.rows.map((item) => item.status), ["PASSED", "PASSED"]);
            assert.deepEqual(payload.data.rows.map((item) => item.vars), [
                { id: "1", name: "Alice" },
                { id: "2", name: "Bob" }
            ]);
            // 场景报告透出该行合并后的变量，证明每行分别注入
            assert.equal(payload.data.rows[0].scenarios[0].vars.id, "1");
            assert.equal(payload.data.rows[1].scenarios[0].vars.name, "Bob");
            // 服务端实际收到两组请求，而不是只执行第一行
            assert.deepEqual(received, [
                { id: "1", name: "Alice" },
                { id: "2", name: "Bob" }
            ]);
            // JSON 模式下进度/行汇总只能走 stderr
            assert.match(result.stderr, /数据集第 1\/2 行/);
            assert.match(result.stderr, /行汇总: 第 2\/2 行/);
            assert.doesNotMatch(result.stdout, /数据集第|行汇总|Overall:/);
        } finally {
            fs.rmSync(directory, { recursive: true, force: true });
        }
    });
});

test("--data 与 --concurrency 组合：行内并发执行多个场景，行间保持串行且报告顺序稳定", async () => {
    const received = [];
    await withServer((request, response) => {
        received.push({ path: request.url, id: request.headers["x-id"] });
        response.writeHead(200, { "Content-Type": "application/json" });
        response.end(JSON.stringify({ id: request.headers["x-id"] }));
    }, async (port) => {
        const directory = makeProject(
            `ScenarioTest.registerConfig(ScenarioTest.defineConfig({
                envs: [{ key: "mock", name: "Mock", baseUrl: "http://127.0.0.1:${port}" }],
                requestTimeoutMs: 10000,
                scenarios: [
                    { id: "a", name: "A", url: "scenarios/a.js" },
                    { id: "b", name: "B", url: "scenarios/b.js" }
                ]
            }));`,
            `ScenarioTest.registerScenario("a", ScenarioTest.defineScenario({
                name: "A",
                steps: [{
                    name: "场景 A",
                    path: "a",
                    status: 200,
                    request: { headers: { "X-Id": "{{vars.id}}" } },
                    assertions: [{ path: "id", equals: "{{vars.id}}" }]
                }]
            }));`,
            "scenarios/a.js"
        );
        fs.writeFileSync(path.join(directory, "scenarios/b.js"), `ScenarioTest.registerScenario("b", ScenarioTest.defineScenario({
            name: "B",
            steps: [{
                name: "场景 B",
                path: "b",
                status: 200,
                request: { headers: { "X-Id": "{{vars.id}}" } },
                assertions: [{ path: "id", equals: "{{vars.id}}" }]
            }]
        }));`, "utf8");
        try {
            const dataFile = path.join(directory, "cases.jsonl");
            fs.writeFileSync(dataFile, '{"id":"1"}\n{"id":"2"}\n', "utf8");

            const result = await runCli([
                "run",
                "--config", path.join(directory, "scenario.config.js"),
                "--all",
                "--concurrency", "2",
                "--data", dataFile,
                "--json"
            ]);
            assert.equal(result.code, 0, result.stderr);
            const payload = JSON.parse(result.stdout);
            assert.equal(payload.data.total, 2);
            assert.deepEqual(payload.data.rows.map((item) => item.scenarios.map((scenario) => scenario.scenarioName)), [["A", "B"], ["A", "B"]]);
            assert.deepEqual(payload.data.rows.map((item) => item.scenarios.map((scenario) => scenario.vars.id)), [["1", "1"], ["2", "2"]]);
            // 行内两个场景可并发，但下一行必须等上一行全部完成后再开始。
            assert.equal(received.length, 4);
            assert.deepEqual(received.slice(0, 2).map((item) => item.id), ["1", "1"]);
            assert.deepEqual(received.slice(2).map((item) => item.id), ["2", "2"]);
        } finally {
            fs.rmSync(directory, { recursive: true, force: true });
        }
    });
});

test("--data CSV：引号字段、数据行满足 required 变量，--vars 仍保持最高优先级", async () => {
    await withServer((request, response) => {
        response.writeHead(200, { "Content-Type": "application/json" });
        response.end(JSON.stringify({
            token: request.headers["x-token"],
            tenant: request.headers["x-tenant"],
            label: request.headers["x-label"]
        }));
    }, async (port) => {
        const directory = makeProject(
            configSource(port, `vars: { tenant: "config-tenant", token: "" },
                variables: [{ name: "token", required: true }],`),
            `ScenarioTest.registerScenario("data", ScenarioTest.defineScenario({
                name: "Data",
                steps: [{
                    name: "回显 CSV 数据行",
                    path: "echo",
                    status: 200,
                    request: { headers: {
                        "X-Token": "{{vars.token}}",
                        "X-Tenant": "{{vars.tenant}}",
                        "X-Label": "{{vars.label}}"
                    } },
                    assertions: [
                        { path: "token", equals: "csv-token" },
                        { path: "tenant", equals: "cli-tenant" },
                        { path: "label", equals: "a,b" }
                    ]
                }]
            }));`
        );
        try {
            const dataFile = path.join(directory, "cases.csv");
            fs.writeFileSync(dataFile, 'token,tenant,label\ncsv-token,csv-tenant,"a,b"\n', "utf8");

            const result = await runCli([
                "run",
                "--config", path.join(directory, "scenario.config.js"),
                "--scenario", "data",
                "--data", dataFile,
                "--vars", "tenant=cli-tenant"
            ]);
            assert.equal(result.code, 0, result.stdout + result.stderr);
            assert.match(result.stdout, /\[PASS\] 回显 CSV 数据行/);
            assert.match(result.stdout, /行汇总: 第 1\/1 行/);
            assert.match(result.stdout, /Overall: 1\/1 passed/);
        } finally {
            fs.rmSync(directory, { recursive: true, force: true });
        }
    });
});

test("--data 失败行：继续执行后续行，JSON 按行标记失败并以非零退出码结束", async () => {
    const received = [];
    await withServer((request, response) => {
        received.push(request.headers["x-case"]);
        response.writeHead(200, { "Content-Type": "application/json" });
        response.end(JSON.stringify({ ok: request.headers["x-case"] }));
    }, async (port) => {
        const directory = makeProject(
            configSource(port),
            `ScenarioTest.registerScenario("data", ScenarioTest.defineScenario({
                name: "Data",
                steps: [{
                    name: "校验数据行",
                    path: "echo",
                    status: 200,
                    request: { headers: { "X-Case": "{{vars.case}}" } },
                    assertions: [{ path: "ok", equals: "yes" }]
                }]
            }));`
        );
        try {
            const dataFile = path.join(directory, "cases.jsonl");
            fs.writeFileSync(dataFile, '{"case":"yes"}\n{"case":"no"}\n', "utf8");

            const result = await runCli([
                "run",
                "--config", path.join(directory, "scenario.config.js"),
                "--scenario", "data",
                "--data", dataFile,
                "--json"
            ]);
            assert.notEqual(result.code, 0);
            const payload = JSON.parse(result.stdout);
            assert.equal(payload.data.total, 2);
            assert.equal(payload.data.passed, 1);
            assert.equal(payload.data.failed, 1);
            assert.equal(payload.data.rows[0].status, "PASSED");
            assert.equal(payload.data.rows[1].status, "FAILED");
            assert.equal(payload.data.rows[1].failed, 1);
            assert.equal(payload.data.rows[1].scenarios[0].status, "FAILED");
            assert.deepEqual(received, ["yes", "no"], "失败行之后的请求仍应执行");
            assert.match(result.stderr, /\[FAIL\] 校验数据行/);
        } finally {
            fs.rmSync(directory, { recursive: true, force: true });
        }
    });
});

test("--data 非法输入给出明确错误：文件缺失、JSON 行非法、CSV 列数不一致、空文件、保留变量", async () => {
    const directory = makeProject(
        configSource(1),
        `ScenarioTest.registerScenario("data", ScenarioTest.defineScenario({
            name: "Data",
            steps: [{ name: "不会执行", path: "echo", status: 200 }]
        }));`
    );
    try {
        const config = path.join(directory, "scenario.config.js");
        const run = (dataPath) => runCli([
            "run", "--config", config, "--scenario", "data", "--data", dataPath
        ]);

        const missing = await run(path.join(directory, "missing.jsonl"));
        assert.notEqual(missing.code, 0);
        assert.match(missing.stderr, /无法读取数据集文件/);

        const badJson = path.join(directory, "bad.jsonl");
        fs.writeFileSync(badJson, '{"a":1}\nnot-json\n', "utf8");
        const badJsonResult = await run(badJson);
        assert.notEqual(badJsonResult.code, 0);
        assert.match(badJsonResult.stderr, /数据集第 2 行不是合法 JSON/);

        const ragged = path.join(directory, "ragged.csv");
        fs.writeFileSync(ragged, "a,b\n1\n", "utf8");
        const raggedResult = await run(ragged);
        assert.notEqual(raggedResult.code, 0);
        assert.match(raggedResult.stderr, /列数不一致/);
        assert.match(raggedResult.stderr, /期望 2 列/);

        const empty = path.join(directory, "empty.jsonl");
        fs.writeFileSync(empty, "\n\n", "utf8");
        const emptyResult = await run(empty);
        assert.notEqual(emptyResult.code, 0);
        assert.match(emptyResult.stderr, /数据集为空/);

        const reserved = path.join(directory, "reserved.jsonl");
        fs.writeFileSync(reserved, '{"runId":"forged"}\n', "utf8");
        const reservedResult = await run(reserved);
        assert.notEqual(reservedResult.code, 0);
        assert.match(reservedResult.stderr, /保留变量/);
        assert.match(reservedResult.stderr, /数据集第 1 行/);
    } finally {
        fs.rmSync(directory, { recursive: true, force: true });
    }
});
