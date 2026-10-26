import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import test from "node:test";

// 与其它 CLI 测试一致：隔离宿主 SCENARIO_* 变量，避免改变被测子进程行为
for (const key of Object.keys(process.env)) {
    if (key.toUpperCase().startsWith("SCENARIO_")) delete process.env[key];
}

const cli = path.resolve(import.meta.dirname, "../src/cli.js");

function runCli(args, extraEnv = {}) {
    return new Promise((resolve) => {
        const startedAt = Date.now();
        const child = spawn(process.execPath, [cli, ...args], {
            env: { ...process.env, ...extraEnv },
            stdio: ["ignore", "pipe", "pipe"]
        });
        let stdout = "";
        let stderr = "";
        child.stdout.setEncoding("utf8");
        child.stderr.setEncoding("utf8");
        child.stdout.on("data", (chunk) => { stdout += chunk; });
        child.stderr.on("data", (chunk) => { stderr += chunk; });
        child.on("close", (code) => resolve({ code, stdout, stderr, elapsed: Date.now() - startedAt }));
    });
}

// 报告中的耗时与 runId/runNo 每次执行天然不同；其余内容必须与串行完全一致
function normalizeReport(report) {
    if (Array.isArray(report)) return report.map(normalizeReport);
    if (!report || typeof report !== "object") return report;
    const normalized = {};
    for (const [key, value] of Object.entries(report)) {
        if (key === "duration" || key === "durationMs" || key === "runId" || key === "runNo") continue;
        normalized[key] = normalizeReport(value);
    }
    return normalized;
}

function createFixture(directory) {
    fs.mkdirSync(path.join(directory, "scenarios"), { recursive: true });
    // alpha/beta/gamma 完成顺序与配置顺序相反，用于验证 JSON 报告仍按配置清单排序
    const config = `ScenarioTest.registerConfig(ScenarioTest.defineConfig({
        envs: [{ key: "mock", name: "Mock", baseUrl: "http://127.0.0.1:__PORT__" }],
        scenarios: [
            { id: "alpha", name: "Alpha", url: "scenarios/alpha.js" },
            { id: "beta", name: "Beta", url: "scenarios/beta.js" },
            { id: "gamma", name: "Gamma", url: "scenarios/gamma.js" },
            { id: "bad", name: "Bad", url: "scenarios/bad.js" }
        ]
    }));`;
    fs.writeFileSync(path.join(directory, "scenario.config.js"), config, "utf8");
    for (const [id, delay, expected] of [["alpha", 280, "UP"], ["beta", 220, "UP"], ["gamma", 160, "UP"]]) {
        fs.writeFileSync(
            path.join(directory, `scenarios/${id}.js`),
            `ScenarioTest.registerScenario("${id}", ScenarioTest.defineScenario({
                name: "${id}",
                steps: [{
                    name: "${id}-step",
                    path: "work?id=${id}&delay=${delay}",
                    status: 200,
                    assertions: [{ path: "status", equals: "${expected}" }]
                }]
            }));`,
            "utf8"
        );
    }
    fs.writeFileSync(
        path.join(directory, "scenarios/bad.js"),
        `ScenarioTest.registerScenario("bad", ScenarioTest.defineScenario({
            name: "Bad",
            steps: [{
                name: "bad-step",
                path: "work?id=bad&delay=0",
                status: 200,
                assertions: [{ path: "status", equals: "DOWN" }]
            }]
        }));`,
        "utf8"
    );
}

test("契约 v13：--concurrency 为 number 型 run 选项并投射到 --help", async () => {
    const { contract, CONTRACT_VERSION } = await import("../src/contract.js");
    assert.equal(CONTRACT_VERSION, 13);
    assert.equal(contract.cli.options.concurrency.kind, "value");
    assert.equal(contract.cli.options.concurrency.parse, "number");
    assert.match(contract.cli.options.concurrency.description, /默认 1/);

    const help = await runCli(["--help"]);
    assert.equal(help.code, 0, help.stderr);
    assert.match(help.stdout, /--concurrency <number>/);
});

test("默认串行、--concurrency 并发执行：报告内容/顺序/退出码与串行一致且耗时缩短", async () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), "scenario-test-concurrency-"));
    const phases = {
        serial: { active: 0, maxActive: 0, completed: [] },
        concurrent: { active: 0, maxActive: 0, completed: [] }
    };
    let phase = phases.serial;
    const server = http.createServer((request, response) => {
        const current = phase;
        current.active += 1;
        current.maxActive = Math.max(current.maxActive, current.active);
        const url = new URL(request.url, "http://127.0.0.1");
        const id = url.searchParams.get("id") || "unknown";
        const delay = Number(url.searchParams.get("delay") || 0);
        setTimeout(() => {
            current.active -= 1;
            current.completed.push(id);
            response.sendDate = false;
            response.writeHead(200, { "Content-Type": "application/json" });
            response.end(JSON.stringify({ status: "UP" }));
        }, delay);
    });
    await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
    try {
        const port = server.address().port;
        createFixture(directory);
        const configPath = path.join(directory, "scenario.config.js");
        fs.writeFileSync(
            configPath,
            fs.readFileSync(configPath, "utf8").replace("__PORT__", String(port)),
            "utf8"
        );

        // 默认（不传 --concurrency）严格串行
        phase = phases.serial;
        const serial = await runCli(["--config", configPath, "--all", "--json"]);
        // 显式 --concurrency 1 与默认同为串行，退出码/报告一致
        const explicitSerial = await runCli(["--config", configPath, "--all", "--json", "--concurrency", "1"]);
        // 并发 3
        phase = phases.concurrent;
        const concurrent = await runCli(["--config", configPath, "--all", "--json", "--concurrency", "3"]);

        assert.equal(serial.code, 1, serial.stderr);
        assert.equal(explicitSerial.code, 1, explicitSerial.stderr);
        assert.equal(concurrent.code, 1, concurrent.stderr);
        assert.equal(phases.serial.maxActive, 1, "默认必须保持串行");
        assert.equal(phases.concurrent.maxActive, 3, "并发 3 应同时在飞 3 个场景");
        // 并发完成顺序与配置顺序不同，证明报告顺序不是按完成顺序收集
        assert.equal(phases.concurrent.completed[0], "gamma");
        assert.equal(phases.concurrent.completed.at(-1), "alpha");
        assert.notDeepEqual(phases.concurrent.completed, ["alpha", "beta", "gamma", "bad"]);

        const serialPayload = JSON.parse(serial.stdout);
        const explicitPayload = JSON.parse(explicitSerial.stdout);
        const concurrentPayload = JSON.parse(concurrent.stdout);
        assert.deepEqual(normalizeReport(explicitPayload), normalizeReport(serialPayload));
        assert.deepEqual(
            concurrentPayload.scenarios.map((report) => report.scenarioName),
            ["alpha", "beta", "gamma", "Bad"],
            "并发 JSON 必须保持配置清单顺序"
        );
        assert.deepEqual(normalizeReport(concurrentPayload), normalizeReport(serialPayload));
        // 串行 ≈ 160+220+280 + 快速失败；并发总耗时由最慢场景主导
        assert.ok(
            concurrent.elapsed < serial.elapsed - 250,
            `并发应显著缩短多场景总耗时（串行 ${serial.elapsed}ms，并发 ${concurrent.elapsed}ms）`
        );

        // 文本模式输出防交错：每个场景的进度块必须连续（缓冲后整块输出）
        phase = phases.serial;
        const text = await runCli(["--config", configPath, "--all", "--concurrency", "3"]);
        const lines = text.stdout.split("\n");
        for (const id of ["alpha", "beta", "gamma"]) {
            const header = lines.findIndex((line) => line.includes(`(${id})`));
            const summary = lines.findIndex((line, index) => index > header && line.startsWith("Summary:"));
            assert.ok(header >= 0, `输出缺少场景 ${id} 的头部`);
            assert.ok(summary > header, `场景 ${id} 缺少 Summary 行`);
            const block = lines.slice(header, summary + 1).join("\n");
            for (const other of ["alpha", "beta", "gamma"].filter((item) => item !== id)) {
                assert.ok(!block.includes(`${other}-step`), `场景 ${id} 的输出块混入了 ${other} 的进度行`);
            }
        }
    } finally {
        server.close();
        fs.rmSync(directory, { recursive: true, force: true });
    }
});

test("--concurrency 必须为正整数", async () => {
    for (const value of ["0", "-1", "1.5", "abc"]) {
        const result = await runCli(["--config", "scenario.config.js", "--all", "--concurrency", value]);
        assert.equal(result.code, 1, `--concurrency ${value} 应失败`);
        assert.match(result.stderr, /--concurrency 必须是大于等于 1 的整数/);
    }
});

// 并发 worker 的 catch 不能靠 `firstError` 的真值判断：插件钩子可能以假值拒绝
// （throw null/undefined/""），那也必须与串行一致地中断调度、以非零退出码终止，
// 且不得输出带 null 空洞的 --json 报告。
async function createFailingPluginFixture(directory, ids) {
    fs.mkdirSync(path.join(directory, "scenarios"), { recursive: true });
    fs.mkdirSync(path.join(directory, "plugins"), { recursive: true });
    fs.writeFileSync(
        path.join(directory, "plugins/throw-plugin.js"),
        `export default {
            async transformScenario(scenario) {
                const mode = process.env.SCENARIO_ISSUE34_THROW;
                if (mode === "error") throw new Error("plugin boom");
                if (mode === "null") throw null;
                if (mode === "undefined") throw undefined;
                if (mode === "empty") throw "";
                return scenario;
            }
        };`,
        "utf8"
    );
    fs.writeFileSync(
        path.join(directory, "scenario.config.js"),
        `ScenarioTest.registerConfig(ScenarioTest.defineConfig({
            nodePlugins: ["plugins/throw-plugin.js"],
            envs: [{ key: "mock", name: "Mock", baseUrl: "http://127.0.0.1:1" }],
            scenarios: [${ids.map((id) => `{ id: "${id}", name: "${id}", url: "scenarios/${id}.js" }`).join(", ")}]
        }));`,
        "utf8"
    );
    for (const id of ids) {
        fs.writeFileSync(
            path.join(directory, `scenarios/${id}.js`),
            `ScenarioTest.registerScenario("${id}", ScenarioTest.defineScenario({
                name: "${id}",
                steps: [{ name: "${id}-step", path: "work", status: 200 }]
            }));`,
            "utf8"
        );
    }
}

test("插件钩子拒绝（含假值）时并发与串行退出码/输出一致，不产出空洞报告", async () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), "scenario-test-concurrency-throw-"));
    try {
        await createFailingPluginFixture(directory, ["a", "b", "c"]);
        const configPath = path.join(directory, "scenario.config.js");

        const cases = [
            { mode: "error", expectStderr: /plugin boom/ },
            { mode: "null", expectStderr: /^null$/m },
            { mode: "undefined", expectStderr: /^undefined$/m },
            { mode: "empty", expectStderr: /^\s*$/m }
        ];
        for (const { mode, expectStderr } of cases) {
            const env = { SCENARIO_ISSUE34_THROW: mode };
            const serial = await runCli(["--config", configPath, "--all", "--json"], env);
            const concurrent = await runCli(["--config", configPath, "--all", "--json", "--concurrency", "3"], env);
            // 场景本身全部可通过：退出码必须只由插件钩子的拒绝决定
            assert.notEqual(serial.code, 0, `串行 ${mode} 应非零退出`);
            assert.equal(concurrent.code, serial.code, `并发 ${mode} 退出码必须与串行一致（stderr: ${concurrent.stderr}）`);
            assert.match(concurrent.stderr, expectStderr, `并发 ${mode} 应输出被拒绝的值`);
            // 串行在遇到拒绝时不输出 --json 文档；并发同样不得输出半成品报告
            assert.equal(serial.stdout.trim(), "", `串行 ${mode} 不应输出 --json 文档`);
            assert.equal(concurrent.stdout.trim(), "", `并发 ${mode} 不得输出带空洞的 --json 文档`);
            assert.doesNotMatch(concurrent.stdout, /null/, `并发 ${mode} 报告不得含 null 空洞`);
            assert.doesNotMatch(concurrent.stderr, /Overall:/, `并发 ${mode} 不应继续打印汇总`);
        }
    } finally {
        fs.rmSync(directory, { recursive: true, force: true });
    }
});

test("并发中某场景钩子拒绝后：在途场景完成收尾、不再调度新场景、非零退出且无最终 JSON", async () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), "scenario-test-concurrency-inflight-"));
    const started = [];
    const completed = [];
    let blockedStarted = false;
    let blockedCompleted = false;
    let rejectCompletedWhileBlocked = false;
    const server = http.createServer((request, response) => {
        const url = new URL(request.url, "http://127.0.0.1");
        if (url.pathname === "/hold") {
            blockedStarted = true;
            started.push("blocked");
            // 在途慢场景：给拒绝留出足够的“仍在执行”时间窗口
            setTimeout(() => {
                blockedCompleted = true;
                completed.push("blocked");
                response.writeHead(200, { "Content-Type": "application/json" });
                response.end(JSON.stringify({ status: "UP" }));
            }, 400);
            return;
        }
        if (url.pathname === "/reject") {
            started.push("reject");
            const respond = () => {
                rejectCompletedWhileBlocked = !blockedCompleted;
                completed.push("reject");
                response.writeHead(200, { "Content-Type": "application/json" });
                response.end(JSON.stringify({ status: "UP" }));
            };
            // 确保 blocked 场景已发起请求后再完成 reject：拒绝发生时 blocked 必须仍在途
            const waitBlocked = setInterval(() => {
                if (!blockedStarted) return;
                clearInterval(waitBlocked);
                respond();
            }, 5);
            waitBlocked.unref?.();
            return;
        }
        // 不允许被调度的场景
        started.push("never");
        response.writeHead(200, { "Content-Type": "application/json" });
        response.end(JSON.stringify({ status: "UP" }));
    });
    await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
    try {
        const port = server.address().port;
        fs.mkdirSync(path.join(directory, "scenarios"), { recursive: true });
        fs.writeFileSync(
            path.join(directory, "scenario.config.js"),
            `ScenarioTest.registerConfig(ScenarioTest.defineConfig({
                nodePlugins: ["plugins/reject-plugin.js"],
                envs: [{ key: "mock", name: "Mock", baseUrl: "http://127.0.0.1:${port}" }],
                scenarios: [
                    { id: "blocked", name: "Blocked", url: "scenarios/blocked.js" },
                    { id: "reject", name: "Reject", url: "scenarios/reject.js" },
                    { id: "never", name: "Never", url: "scenarios/never.js" }
                ]
            }));`,
            "utf8"
        );
        fs.mkdirSync(path.join(directory, "plugins"), { recursive: true });
        fs.writeFileSync(
            path.join(directory, "plugins/reject-plugin.js"),
            `export default {
                async afterScenario(report) {
                    if (report.scenarioName === "Reject") throw new Error("afterScenario reject");
                }
            };`,
            "utf8"
        );
        for (const [id, stepPath] of [["blocked", "hold"], ["reject", "reject"], ["never", "never"]]) {
            fs.writeFileSync(
                path.join(directory, `scenarios/${id}.js`),
                `ScenarioTest.registerScenario("${id}", ScenarioTest.defineScenario({
                    name: "${id === "blocked" ? "Blocked" : id === "reject" ? "Reject" : "Never"}",
                    steps: [{ name: "${id}-step", path: "${stepPath}", status: 200 }]
                }));`,
                "utf8"
            );
        }

        const result = await runCli(["--config", path.join(directory, "scenario.config.js"), "--all", "--json", "--concurrency", "2"]);
        assert.notEqual(result.code, 0, "钩子拒绝后命令必须以非零退出");
        assert.equal(result.stdout.trim(), "", "拒绝后不得输出最终 JSON 文档（避免带空洞报告）");
        assert.match(result.stderr, /afterScenario reject/);
        // 在途场景在进程退出前完成收尾并输出自己的完整进度块
        assert.match(result.stderr, /\[PASS\] blocked-step/, `在途场景应完成收尾，实际 stderr: ${result.stderr}`);
        assert.doesNotMatch(result.stderr, /Overall:/, "拒绝后不应继续打印最终汇总");
        // 拒绝发生在 blocked 仍在途时，且尚未开始的第四个场景没有被调度
        assert.equal(rejectCompletedWhileBlocked, true);
        assert.ok(completed.includes("blocked"));
        assert.deepEqual(started.sort(), ["blocked", "reject"], `只应启动两个已领取的场景，实际: ${started.join(",")}`);
        assert.deepEqual(completed.sort(), ["blocked", "reject"]);
    } finally {
        server.close();
        fs.rmSync(directory, { recursive: true, force: true });
    }
});
