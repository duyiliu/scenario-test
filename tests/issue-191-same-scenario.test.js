import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

for (const key of Object.keys(process.env)) {
    if (key.toUpperCase().startsWith("SCENARIO_")) delete process.env[key];
}

const cli = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../src/cli.js");

function runCli(args, extraEnv = {}) {
    return new Promise((resolve) => {
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
        child.on("close", (code) => resolve({ code, stdout, stderr }));
    });
}

// 并发创建夹具：首请求成功才落库；相同幂等键只允许一次成功，其余返回 409。
// 每个请求故意延迟 120ms，把「屏障失效」暴露为串行完成顺序。
function createFixture(directory, port) {
    fs.mkdirSync(path.join(directory, "scenarios"), { recursive: true });
    fs.writeFileSync(
        path.join(directory, "scenario.config.js"),
        `ScenarioTest.registerConfig(ScenarioTest.defineConfig({
            envs: [{ key: "mock", name: "Mock", baseUrl: "http://127.0.0.1:${port}" }],
            scenarios: [{ id: "create", name: "Concurrent Create", url: "scenarios/create.js" }]
        }));`,
        "utf8"
    );
    fs.writeFileSync(
        path.join(directory, "scenarios/create.js"),
        `ScenarioTest.registerScenario("create", ScenarioTest.defineScenario({
            name: "Concurrent Create",
            steps: [{
                name: "create-once",
                method: "POST",
                path: "orders",
                status: 201,
                request: {
                    body: {
                        requestKey: "{{vars.requestKey}}",
                        worker: "{{vars.worker}}",
                        runId: "{{vars.runId}}"
                    }
                },
                assertions: [{ path: "worker", equals: "{{vars.worker}}" }],
                extract: [
                    { name: "orderId", path: "businessId" },
                    { name: "sharedResponseKey", path: "requestKey" }
                ]
            }]
        }));`,
        "utf8"
    );
}

test("#191 --help/契约暴露 --workers/--same-scenario/--shared-request-key", async () => {
    const { contract, CONTRACT_VERSION } = await import("../src/contract.js");
    assert.ok(CONTRACT_VERSION >= 25);
    assert.equal(contract.cli.options.workers.kind, "value");
    assert.equal(contract.cli.options.workers.parse, "number");
    assert.equal(contract.cli.options["same-scenario"].kind, "flag");
    assert.equal(contract.cli.options["shared-request-key"].kind, "flag");
    const help = await runCli(["--help"]);
    assert.equal(help.code, 0, help.stderr);
    assert.match(help.stdout, /--workers <number>/);
    assert.match(help.stdout, /--same-scenario/);
    assert.match(help.stdout, /--shared-request-key/);
});

test("#191 同场景并发：屏障对齐首请求、独立 worker 变量、恰好一个成功其余冲突", async () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), "scenario-test-issue191-"));
    let active = 0;
    let maxActive = 0;
    let stored = 0;
    let windowStart = 0;
    let windowSpan = 0;
    let firstWindow = null;
    const requests = [];
    const server = http.createServer((request, response) => {
        let raw = "";
        request.setEncoding("utf8");
        request.on("data", (chunk) => { raw += chunk; });
        request.on("end", () => {
            const body = raw ? JSON.parse(raw) : {};
            const now = performance.now();
            if (!windowStart) windowStart = now;
            active += 1;
            maxActive = Math.max(maxActive, active);
            requests.push(body);
            setTimeout(() => {
                active -= 1;
                const conflict = stored >= 1;
                if (!conflict) stored += 1;
                const conflictCount = requests.filter((item) => item.requestKey === body.requestKey).length;
                response.writeHead(conflict ? 409 : 201, { "Content-Type": "application/json" });
                response.end(JSON.stringify({
                    worker: body.worker,
                    runId: body.runId,
                    requestKey: body.requestKey,
                    businessId: "order-1",
                    conflict
                }));
                windowSpan = Math.max(windowSpan, performance.now() - windowStart);
                if (requests.length === 1) firstWindow = now;
            }, 120);
        });
    });
    await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
    try {
        const port = server.address().port;
        createFixture(directory, port);
        const result = await runCli([
            "--config", path.join(directory, "scenario.config.js"),
            "--scenario", "create",
            "--workers", "4",
            "--same-scenario",
            "--json",
            "--vars", "requestKey=order-{{vars.worker}}"
        ]);
        const payload = JSON.parse(result.stdout);
        assert.equal(result.code, 0, result.stderr);
        assert.equal(payload.concurrency.length, 1);
        const summary = payload.concurrency[0];
        assert.equal(summary.workers, 4);
        assert.equal(summary.success, 1);
        assert.equal(summary.conflict, 3);
        assert.equal(summary.failed, 0);
        assert.equal(summary.singleBusinessId, true);
        assert.deepEqual(summary.businessIds, ["order-1"]);
        assert.ok(summary.barrier.maxSkewMs < 100, `首请求启动偏差应小于 100ms，实际 ${summary.barrier.maxSkewMs}`);
        assert.equal(maxActive, 4, "屏障后 4 个 worker 必须同时在途");
        assert.equal(stored, 1, "并发创建只允许一条有效数据");
        assert.deepEqual(requests.map((item) => item.worker).sort(), [1, 2, 3, 4]);
        assert.equal(new Set(requests.map((item) => item.runId)).size, 4, "每个 worker 的 runId 必须独立");
        assert.deepEqual(payload.scenarios.map((item) => item.worker.index), [1, 2, 3, 4]);
        assert.ok(windowSpan >= 100, "同场景并发不应退化为串行");
        assert.match(result.stderr, /结论：同场景并发通过/);
        assert.doesNotMatch(result.stderr, /结论：执行失败/, "预期冲突不应让结论自相矛盾");
    } finally {
        server.close();
        fs.rmSync(directory, { recursive: true, force: true });
    }
});

test("#191 共享请求键模式：所有 worker 使用同一 requestKey，最终仅一条数据，幂等重放返回同一业务 ID", async () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), "scenario-test-issue191-shared-"));
    const keys = [];
    const ids = [];
    let stored = 0;
    const server = http.createServer((request, response) => {
        let raw = "";
        request.setEncoding("utf8");
        request.on("data", (chunk) => { raw += chunk; });
        request.on("end", () => {
            const body = raw ? JSON.parse(raw) : {};
            keys.push(body.requestKey);
            const conflict = stored >= 1;
            if (!conflict) stored += 1;
            response.writeHead(conflict ? 409 : 201, { "Content-Type": "application/json" });
            response.end(JSON.stringify({ worker: body.worker, requestKey: body.requestKey, businessId: "same-id" }));
            ids.push("same-id");
        });
    });
    await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
    try {
        const port = server.address().port;
        createFixture(directory, port);
        const result = await runCli([
            "--config", path.join(directory, "scenario.config.js"),
            "--scenario", "create",
            "--workers", "3",
            "--same-scenario",
            "--shared-request-key",
            "--json",
            "--vars", "requestKey={{vars.sharedRequestKey}}"
        ]);
        assert.equal(result.code, 0, result.stderr);
        const payload = JSON.parse(result.stdout);
        assert.deepEqual(keys, ["shared", "shared", "shared"]);
        assert.deepEqual(ids, ["same-id", "same-id", "same-id"], "同键重放应返回同一业务 ID");
        assert.equal(payload.concurrency[0].sharedRequestKey, true);
        assert.equal(payload.concurrency[0].success, 1);
        assert.equal(payload.concurrency[0].conflict, 2);
        assert.equal(stored, 1);
    } finally {
        server.close();
        fs.rmSync(directory, { recursive: true, force: true });
    }
});

test("#191 并发状态流转：多步场景末步竞争，记录数符合预期且冲突归因到竞争步骤", async () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), "scenario-test-issue191-flow-"));
    fs.mkdirSync(path.join(directory, "scenarios"), { recursive: true });
    let stored = 0;
    let transitions = 0;
    let transitionAttempts = 0;
    const transitionsByWorker = [];
    const server = http.createServer((request, response) => {
        let raw = "";
        request.setEncoding("utf8");
        request.on("data", (chunk) => { raw += chunk; });
        request.on("end", () => {
            const body = raw ? JSON.parse(raw) : {};
            const url = new URL(request.url, "http://127.0.0.1");
            if (request.method === "POST" && url.pathname === "/orders") {
                // 首步是幂等创建：同键重放一律 201，所有 worker 拿到同一业务 ID，
                // 把竞争窗口整体推到第二步（这才是本用例要覆盖的 failedStep ≠ 首步）。
                if (!stored) stored = 1;
                response.writeHead(201, { "Content-Type": "application/json" });
                response.end(JSON.stringify({ worker: body.worker, businessId: "order-1", status: "created" }));
                return;
            }
            if (request.method === "POST" && url.pathname === "/orders/order-1/status") {
                // 状态流转只有一次合法：其余 worker 撞上 409——竞争窗口在第二步，
                // 冲突必须归因到这一步，而不是场景首步。
                transitionAttempts += 1;
                const conflict = transitions >= 1;
                if (!conflict) transitions += 1;
                transitionsByWorker.push(body.worker);
                response.writeHead(conflict ? 409 : 200, { "Content-Type": "application/json" });
                response.end(JSON.stringify({
                    worker: body.worker,
                    businessId: "order-1",
                    status: conflict ? "created" : "paid",
                    conflict
                }));
                return;
            }
            response.writeHead(404, { "Content-Type": "application/json" });
            response.end("{}");
        });
    });
    await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
    try {
        const port = server.address().port;
        fs.writeFileSync(
            path.join(directory, "scenario.config.js"),
            `ScenarioTest.registerConfig(ScenarioTest.defineConfig({
                envs: [{ key: "mock", name: "Mock", baseUrl: "http://127.0.0.1:${port}" }],
                scenarios: [{ id: "flow", name: "Concurrent Flow", url: "scenarios/flow.js" }]
            }));`,
            "utf8"
        );
        fs.writeFileSync(
            path.join(directory, "scenarios/flow.js"),
            `ScenarioTest.registerScenario("flow", ScenarioTest.defineScenario({
                name: "Concurrent Flow",
                steps: [
                    {
                        name: "create",
                        method: "POST",
                        path: "orders",
                        status: 201,
                        request: { body: { requestKey: "{{vars.sharedRequestKey}}", worker: "{{vars.worker}}" } },
                        extract: [{ name: "orderId", path: "businessId" }]
                    },
                    {
                        name: "transition",
                        method: "POST",
                        path: "orders/{{vars.orderId}}/status",
                        status: 200,
                        request: { body: { worker: "{{vars.worker}}", status: "paid" } },
                        assertions: [{ path: "status", equals: "paid" }]
                    }
                ]
            }));`,
            "utf8"
        );
        const result = await runCli([
            "--config", path.join(directory, "scenario.config.js"),
            "--scenario", "flow",
            "--workers", "3",
            "--same-scenario",
            "--shared-request-key",
            "--json"
        ]);
        assert.equal(result.code, 0, result.stderr);
        const payload = JSON.parse(result.stdout);
        assert.equal(payload.concurrency.length, 1);
        const summary = payload.concurrency[0];
        assert.equal(summary.workers, 3);
        // 首步按幂等键只落一条数据；竞争转移到第二步，仍是「恰好 1 成功 + 其余冲突」
        assert.equal(stored, 1, "并发创建只落一条有效数据");
        assert.equal(transitions, 1, "状态流转记录数符合预期：只有一次合法流转");
        assert.equal(transitionAttempts, 3, "每个 worker 都应执行到竞争步骤");
        assert.equal(summary.success, 1);
        assert.equal(summary.conflict, 2);
        assert.equal(summary.failed, 0);
        assert.equal(summary.singleBusinessId, true);
        assert.deepEqual(summary.businessIds, ["order-1"]);
        // 冲突 worker 的失败步骤必须是第二步：failedStep 与首步不同的分支
        assert.equal(summary.failures.length, 2);
        for (const worker of summary.failures) {
            assert.equal(worker.outcome, "conflict");
            assert.equal(worker.step, "transition", "冲突应归因到竞争发生的步骤");
            assert.equal(worker.httpStatus, 409);
            assert.ok(worker.response, "失败明细应包含竞争步骤的响应");
            assert.ok(worker.assertions.some((item) => !item.passed), "失败明细应包含断言差异");
        }
        assert.deepEqual(transitionsByWorker.sort(), [1, 2, 3]);
        assert.match(result.stderr, /结论：同场景并发通过/);
        assert.doesNotMatch(result.stderr, /结论：执行失败/, "预期冲突不应让结论自相矛盾");
    } finally {
        server.close();
        fs.rmSync(directory, { recursive: true, force: true });
    }
});

test("#191 失败时输出每个 worker 的请求/响应/断言差异，并以非零退出", async () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), "scenario-test-issue191-fail-"));
    const server = http.createServer((request, response) => {
        response.writeHead(200, { "Content-Type": "application/json" });
        response.end(JSON.stringify({ worker: "unexpected", businessId: "order-x" }));
    });
    await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
    try {
        const port = server.address().port;
        createFixture(directory, port);
        const result = await runCli([
            "--config", path.join(directory, "scenario.config.js"),
            "--scenario", "create",
            "--workers", "2",
            "--same-scenario",
            "--json"
        ]);
        assert.notEqual(result.code, 0);
        const payload = JSON.parse(result.stdout);
        const summary = payload.concurrency[0];
        assert.equal(summary.success, 0);
        assert.equal(summary.failed, 2);
        assert.equal(summary.failures.length, 2);
        for (const worker of summary.failures) {
            assert.ok(worker.request, "失败明细应包含请求");
            assert.equal(worker.response.status, 200, "失败明细应包含响应");
            assert.ok(worker.assertions.some((item) => !item.passed), "失败明细应包含断言差异");
        }
        assert.match(result.stderr, /同场景并发：scenario=create workers=2/);
        assert.match(result.stderr, /\[W1\] failed/);
        assert.match(result.stderr, /\[W2\] failed/);
    } finally {
        server.close();
        fs.rmSync(directory, { recursive: true, force: true });
    }
});

test("#191 参数互斥：--workers 必须配 --same-scenario，且 --same-scenario 只接受单场景", async () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), "scenario-test-issue191-args-"));
    const server = http.createServer((request, response) => {
        response.writeHead(200, { "Content-Type": "application/json" });
        response.end("{}");
    });
    await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
    try {
        const port = server.address().port;
        createFixture(directory, port);
        const configPath = path.join(directory, "scenario.config.js");
        fs.appendFileSync(configPath, `
ScenarioTest.registerConfig(ScenarioTest.defineConfig({
    envs: [{ key: "mock", name: "Mock", baseUrl: "http://127.0.0.1:${port}" }],
    scenarios: [
        { id: "create", name: "Concurrent Create", url: "scenarios/create.js" },
        { id: "other", name: "Other", url: "scenarios/other.js" }
    ]
}));`, "utf8");
        fs.writeFileSync(path.join(directory, "scenarios/other.js"), `ScenarioTest.registerScenario("other", ScenarioTest.defineScenario({ name: "Other", steps: [{ name: "s", path: "other" }] }));`, "utf8");
        const missingMode = await runCli(["--config", configPath, "--scenario", "create", "--workers", "3"]);
        assert.notEqual(missingMode.code, 0);
        assert.match(missingMode.stderr, /--workers\/--shared-request-key 必须与 --same-scenario 同时使用/);
        const manyScenarios = await runCli(["--config", configPath, "--all", "--workers", "2", "--same-scenario"]);
        assert.notEqual(manyScenarios.code, 0);
        assert.match(manyScenarios.stderr, /--same-scenario 只接受一个场景/);
        const clash = await runCli(["--config", configPath, "--scenario", "create", "--workers", "2", "--same-scenario", "--concurrency", "2"]);
        assert.notEqual(clash.code, 0);
        assert.match(clash.stderr, /--same-scenario 与 --concurrency 不能同时使用/);
    } finally {
        server.close();
        fs.rmSync(directory, { recursive: true, force: true });
    }
});

test("#191 --junit/--report 包含每个 worker 的汇总结果", async () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), "scenario-test-issue191-report-"));
    let stored = 0;
    const server = http.createServer((request, response) => {
        let raw = "";
        request.setEncoding("utf8");
        request.on("data", (chunk) => { raw += chunk; });
        request.on("end", () => {
            const body = raw ? JSON.parse(raw) : {};
            const conflict = stored >= 1;
            if (!conflict) stored += 1;
            response.writeHead(conflict ? 409 : 201, { "Content-Type": "application/json" });
            response.end(JSON.stringify({ worker: body.worker, requestKey: body.requestKey, businessId: "id-1" }));
        });
    });
    await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
    try {
        const port = server.address().port;
        createFixture(directory, port);
        const junit = path.join(directory, "out", "junit.xml");
        const html = path.join(directory, "out", "report.html");
        const result = await runCli([
            "--config", path.join(directory, "scenario.config.js"),
            "--scenario", "create",
            "--workers", "2",
            "--same-scenario",
            "--json",
            "--junit", junit,
            "--report", html
        ]);
        assert.equal(result.code, 0, result.stderr);
        const xml = fs.readFileSync(junit, "utf8");
        assert.match(xml, /name="create#workers"/);
        assert.match(xml, /name="W1 success"/);
        assert.match(xml, /name="W2 conflict"/);
        const page = fs.readFileSync(html, "utf8");
        assert.match(page, /同场景并发 · create/);
        assert.match(page, /1 成功 \/ 1 冲突 \/ 0 失败/);
        assert.doesNotMatch(page, /create#worker-2 · FAILED/, "预期冲突 worker 不应在 HTML 中显示为场景失败");
        assert.doesNotMatch(xml, /name="create#worker-2"/, "预期冲突 worker 不应在 JUnit 中重复落为失败场景");
    } finally {
        server.close();
        fs.rmSync(directory, { recursive: true, force: true });
    }
});

test("#191 --data 每行独立竞争：行内屏障统计与报告 ID 不串行", async () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), "scenario-test-issue191-data-"));
    const keys = [];
    // 按键幂等：每个数据行用不同的请求键，因此每行都应各自「1 成功 + 其余冲突」，
    // 若汇总或屏障统计跨行串了，第二行会表现为 0 成功或首请求时间被复用。
    const storedKeys = new Set();
    const server = http.createServer((request, response) => {
        let raw = "";
        request.setEncoding("utf8");
        request.on("data", (chunk) => { raw += chunk; });
        request.on("end", () => {
            const body = raw ? JSON.parse(raw) : {};
            keys.push(body.requestKey);
            const conflict = storedKeys.has(body.requestKey);
            if (!conflict) storedKeys.add(body.requestKey);
            response.writeHead(conflict ? 409 : 201, { "Content-Type": "application/json" });
            response.end(JSON.stringify({ worker: body.worker, requestKey: body.requestKey, businessId: "id-1" }));
        });
    });
    await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
    try {
        const port = server.address().port;
        createFixture(directory, port);
        const dataFile = path.join(directory, "rows.json");
        fs.writeFileSync(dataFile, JSON.stringify([{ tag: "a" }, { tag: "b" }]), "utf8");
        const result = await runCli([
            "--config", path.join(directory, "scenario.config.js"),
            "--scenario", "create",
            "--workers", "2",
            "--same-scenario",
            "--data", dataFile,
            "--json",
            // 同一数据行内的 worker 共享请求键（1 成功 + 1 冲突），行与行之间键不同，
            // 因此每行都必须各自重现一次竞争——验证汇总与屏障统计不会跨行串。
            "--vars", "requestKey={{vars.tag}}"
        ]);
        assert.equal(result.code, 0, result.stderr);
        const payload = JSON.parse(result.stdout);
        assert.equal(payload.concurrency.length, 2, "每个数据行各有一份并发汇总");
        assert.deepEqual(payload.concurrency.map((item) => item.dataRow), [1, 2]);
        for (const summary of payload.concurrency) {
            assert.equal(summary.success, 1);
            assert.equal(summary.conflict, 1);
            assert.ok(summary.barrier.maxSkewMs >= 0, "每行都必须有独立的屏障统计");
        }
        for (const row of payload.results) {
            assert.deepEqual(
                row.scenarios.map((item) => item.scenarioId).sort(),
                [`create#row-${row.index}#worker-1`, `create#row-${row.index}#worker-2`],
                "数据行与 worker 必须同时体现在报告 ID 上"
            );
        }
        assert.equal(keys.length, 4);
    } finally {
        server.close();
        fs.rmSync(directory, { recursive: true, force: true });
    }
});
