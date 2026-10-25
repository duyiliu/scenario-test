import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { contract, createEngine, defineScenario } from "../src/index.js";
import { buildMarkdownReport, buildOverallReport } from "../src/browser/ui/ui-view.js";

function jsonResponse(body, status = 200) {
    const payload = status === 204 || status === 205 ? null : JSON.stringify(body);
    return new Response(payload, { status, headers: { "Content-Type": "application/json" } });
}

test("contract v13 声明步骤级 always，且定义期只接受布尔值", () => {
    assert.ok(contract.scenario.stepKeys.includes("always"));
    assert.equal(contract.scenario.always.type, "boolean");
    assert.equal(contract.scenario.always.field, "always");
    assert.equal(contract.scenario.always.cancellation, "skip");

    assert.doesNotThrow(() => defineScenario({
        name: "always 合法",
        steps: [{ name: "清理", always: true, path: "cleanup" }]
    }));
    assert.throws(
        () => defineScenario({
            name: "always 非法",
            steps: [{ name: "清理", always: "true", path: "cleanup" }]
        }),
        /always 必须是布尔值/
    );
});

test("always 步骤在普通步骤失败（stop）后仍执行，且报告单独统计清理", async () => {
    const calls = [];
    const engine = createEngine({
        baseUrl: "https://mock.local",
        fetch: async (url) => {
            calls.push(url);
            return url.endsWith("/cleanup") ? jsonResponse({}, 204) : jsonResponse({ code: 500 }, 500);
        }
    });
    const report = await engine.runScenario(defineScenario({
        name: "失败后清理",
        steps: [
            { name: "执行失败", path: "main", status: 200 },
            { name: "后续普通步骤", path: "after" },
            { name: "清理创建的数据", always: true, path: "cleanup", status: 204 }
        ]
    }));

    assert.deepEqual(report.results.map((item) => item.name), ["执行失败", "清理创建的数据"]);
    assert.equal(calls.length, 2, "失败后的普通步骤不应执行，只允许清理步骤补跑");
    assert.equal(report.status, "FAILED");
    assert.equal(report.failed, 1);
    assert.equal(report.cleanup.planned, 1);
    assert.equal(report.cleanup.executed, 1);
    assert.equal(report.cleanup.passed, 1);
    assert.equal(report.cleanup.failed, 0);
    assert.equal(report.cleanup.status, "PASSED");
    assert.deepEqual(report.diagnostics, []);
    assert.equal(report.results[0].cleanup, undefined);
    assert.equal(report.results[1].cleanup, true);
    assert.equal(report.results[1].passed, true);
});

test("全部普通步骤通过时 always 仍在最后执行", async () => {
    const calls = [];
    const engine = createEngine({
        baseUrl: "https://mock.local",
        fetch: async (url) => {
            calls.push(url);
            return jsonResponse({}, 200);
        }
    });
    const report = await engine.runScenario(defineScenario({
        name: "成功后清理",
        steps: [
            { name: "创建", path: "create", status: 200 },
            { name: "清理", always: true, path: "cleanup", status: 200 }
        ]
    }));

    assert.deepEqual(calls, ["https://mock.local/create", "https://mock.local/cleanup"]);
    assert.equal(report.status, "PASSED");
    assert.equal(report.failed, 0);
    assert.equal(report.passedSteps, 2);
    assert.equal(report.cleanup.status, "PASSED");
});

test("清理失败附加诊断，原始失败仍使场景 FAILED", async () => {
    const engine = createEngine({
        baseUrl: "https://mock.local",
        fetch: async (url) => url.endsWith("/cleanup")
            ? jsonResponse({ code: 500 }, 500)
            : jsonResponse({ code: 200 }, 200)
    });
    const report = await engine.runScenario(defineScenario({
        name: "清理失败",
        steps: [
            { name: "主步骤", path: "main", status: 200 },
            { name: "清理订单", always: true, path: "cleanup", status: 200 }
        ]
    }));

    assert.equal(report.results.find((item) => !item.cleanup).passed, true);
    assert.equal(report.status, "FAILED");
    assert.equal(report.failed, 1);
    assert.equal(report.cleanup.failed, 1);
    assert.equal(report.cleanup.status, "FAILED");
    assert.equal(report.diagnostics.length, 1);
    assert.match(report.diagnostics[0], /清理步骤「清理订单」失败/);
    assert.deepEqual(report.cleanup.diagnostics, report.diagnostics);
});

test("取消执行默认不执行清理，并在 cleanup 诊断中说明", async () => {
    const controller = new AbortController();
    const calls = [];
    const engine = createEngine({
        baseUrl: "https://mock.local",
        fetch: async (url) => {
            calls.push(url);
            return jsonResponse({}, 200);
        }
    });
    const report = await engine.runScenario(defineScenario({
        name: "取消不清理",
        steps: [
            { name: "主步骤", path: "main", status: 200 },
            { name: "清理", always: true, path: "cleanup", status: 200 }
        ]
    }), {
        signal: controller.signal,
        onStep: () => controller.abort()
    });

    assert.deepEqual(calls, ["https://mock.local/main"]);
    assert.equal(report.status, "CANCELLED");
    assert.equal(report.cleanup.planned, 1);
    assert.equal(report.cleanup.executed, 0);
    assert.equal(report.cleanup.status, "SKIPPED");
    assert.match(report.diagnostics[0], /执行已取消，1 个 always 清理步骤未执行/);
});

test("超时属于失败而非取消，仍执行 always 清理", async () => {
    const calls = [];
    const engine = createEngine({
        baseUrl: "https://mock.local",
        fetch: (url, options) => {
            calls.push(url);
            if (url.endsWith("/hang")) {
                return new Promise((resolve, reject) => {
                    options.signal.addEventListener("abort", () => reject(options.signal.reason));
                });
            }
            return Promise.resolve(jsonResponse({}, 204));
        }
    });
    const report = await engine.runScenario(defineScenario({
        name: "超时后清理",
        steps: [
            { name: "慢请求", path: "hang", timeoutMs: 10 },
            { name: "清理", always: true, path: "cleanup", status: 204 }
        ]
    }));

    assert.equal(report.results[0].timedOut, true);
    assert.deepEqual(calls, ["https://mock.local/hang", "https://mock.local/cleanup"]);
    assert.equal(report.status, "FAILED");
    assert.equal(report.cleanup.executed, 1);
    assert.equal(report.cleanup.status, "PASSED");
});

test("CLI 输出清理标记、Summary 清理统计与清理诊断", async () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), "scenario-test-always-"));
    const server = http.createServer((request, response) => {
        response.writeHead(request.url.includes("cleanup") ? 500 : 200, { "Content-Type": "application/json" });
        response.end(JSON.stringify({}));
    });
    await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
    try {
        const port = server.address().port;
        fs.mkdirSync(path.join(directory, "scenarios"));
        fs.writeFileSync(path.join(directory, "scenario.config.js"), `ScenarioTest.registerConfig(ScenarioTest.defineConfig({envs:[{key:"mock",name:"Mock",baseUrl:"http://127.0.0.1:${port}"}],scenarios:[{id:"always",name:"Always",url:"scenarios/always.js"}]}));`, "utf8");
        fs.writeFileSync(path.join(directory, "scenarios/always.js"), `ScenarioTest.registerScenario("always",ScenarioTest.defineScenario({name:"Always",steps:[{name:"普通步骤",path:"main",status:200},{name:"清理步骤",always:true,path:"cleanup",status:200}]}));`, "utf8");
        const cli = path.resolve(import.meta.dirname, "../src/cli.js");
        const result = await new Promise((resolve) => {
            const child = spawn(process.execPath, [cli, "--config", path.join(directory, "scenario.config.js"), "--all"], { env: process.env, stdio: ["ignore", "pipe", "pipe"] });
            let stdout = "";
            let stderr = "";
            child.stdout.setEncoding("utf8");
            child.stderr.setEncoding("utf8");
            child.stdout.on("data", (chunk) => { stdout += chunk; });
            child.stderr.on("data", (chunk) => { stderr += chunk; });
            child.on("close", (code) => resolve({ code, stdout, stderr }));
        });
        assert.notEqual(result.code, 0, result.stderr);
        assert.match(result.stdout, /\[PASS\] 普通步骤/);
        assert.match(result.stdout, /\[CLEANUP-FAIL\] 清理步骤/);
        assert.match(result.stdout, /Summary: .*清理 passed=0 failed=1 executed=1\/1 planned（状态 FAILED）/);
        assert.match(result.stdout, /\[CLEANUP\] 清理步骤「清理步骤」失败/);
    } finally {
        server.close();
        fs.rmSync(directory, { recursive: true, force: true });
    }
});
test("浏览器工作台报告单独统计清理结果并在 Markdown 中标记", () => {
    const scenario = {
        name: "工作台清理",
        steps: [
            { name: "普通步骤", path: "main" },
            { name: "清理步骤", always: true, path: "cleanup" }
        ]
    };
    const report = buildOverallReport([
        { name: "普通步骤", method: "GET", path: "main", status: 500, duration: 1, passed: false, assertions: [{ name: "状态码", passed: false }], stepNo: 1 },
        { name: "清理步骤", method: "DELETE", path: "cleanup", status: 204, duration: 1, passed: true, cleanup: true, assertions: [], stepNo: 2 }
    ], scenario, "scenarios/always.js", "full", null);

    assert.equal(report.status, "FAILED");
    assert.equal(report.cleanup.planned, 1);
    assert.equal(report.cleanup.passed, 1);
    assert.equal(report.cleanup.failed, 0);
    assert.equal(report.cleanup.status, "PASSED");
    assert.equal(report.steps[1].cleanup, true);
    assert.deepEqual(report.diagnostics, []);
    assert.match(buildMarkdownReport(report), /\*\*清理\*\*: 通过 1 \/ 失败 0/);
    assert.match(buildMarkdownReport(report), /步骤 2: 清理步骤（清理）/);

    const cleanupFailed = buildOverallReport([
        { name: "普通步骤", method: "GET", path: "main", status: 200, duration: 1, passed: true, assertions: [], stepNo: 1 },
        { name: "清理步骤", method: "DELETE", path: "cleanup", status: 500, duration: 1, passed: false, cleanup: true, error: "清理接口失败", assertions: [], stepNo: 2 }
    ], scenario, "scenarios/always.js", "full", null);
    assert.equal(cleanupFailed.status, "FAILED");
    assert.equal(cleanupFailed.cleanup.failed, 1);
    assert.equal(cleanupFailed.cleanup.status, "FAILED");
    assert.match(cleanupFailed.diagnostics[0], /清理步骤「清理步骤」失败/);
    assert.match(buildMarkdownReport(cleanupFailed), /\*\*清理诊断\*\*: 清理步骤/);
});
