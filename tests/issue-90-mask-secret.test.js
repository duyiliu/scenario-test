import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { isSecretName, maskSecret, SECRET_VAR_PATTERN } from "../src/core.js";
import { sanitizeReportForOutput } from "../src/utils/redact.js";
import { buildMarkdownReport, buildOverallReport } from "../src/browser/ui/ui-view.js";

const CLIENT_SECRET = "client-secret-123456";
const API_TOKEN = "api-token-abcdef";
const GLOBAL_SECRET = "global-secret-123456";
const GLOBAL_AUTH = "Bearer global-auth-token-123";

test("#90 敏感名判定与报告脱敏：vars/断言/头/响应/query/each 明细统一走 maskSecret", () => {
    assert.equal(SECRET_VAR_PATTERN.test("clientSecret"), true);
    assert.equal(isSecretName("apiToken"), true);
    assert.equal(isSecretName("X-Api-Key"), true);
    assert.equal(isSecretName("authorization"), true);
    assert.equal(isSecretName("expectedStatus"), false);

    const report = {
        vars: { clientSecret: CLIENT_SECRET, apiToken: API_TOKEN, visibleValue: "visible-value" },
        results: [{
            method: "GET",
            path: `/api?token=${API_TOKEN}&page=1`,
            error: `请求失败: ${CLIENT_SECRET}`,
            request: {
                headers: { Authorization: GLOBAL_AUTH, "X-Api-Token": `Bearer ${API_TOKEN}`, "X-Note": "visible-header" },
                body: { password: "short-pw", note: "visible-body" }
            },
            response: {
                headers: { "Set-Cookie": "session=visible-cookie" },
                body: { token: API_TOKEN, echo: `prefix ${CLIENT_SECRET} suffix`, note: "visible-response" }
            },
            assertions: [{
                name: "逐项",
                passed: false,
                expected: { clientSecret: CLIENT_SECRET, note: "visible-expected" },
                actual: { apiToken: API_TOKEN, note: "visible-actual" },
                detail: [{
                    index: 0,
                    actual: { clientSecret: CLIENT_SECRET },
                    assertions: [{ name: "secret", passed: false, expected: CLIENT_SECRET, actual: API_TOKEN }]
                }]
            }]
        }]
    };
    const safe = sanitizeReportForOutput(report);

    // 原始 report 不得被改写：程序化调试仍可拿到原始结果
    assert.equal(report.vars.clientSecret, CLIENT_SECRET);
    assert.equal(report.results[0].assertions[0].expected.clientSecret, CLIENT_SECRET);

    assert.equal(safe.vars.clientSecret, maskSecret(CLIENT_SECRET));
    assert.equal(safe.vars.apiToken, maskSecret(API_TOKEN));
    assert.equal(safe.vars.visibleValue, "visible-value");
    assert.equal(safe.results[0].request.headers.Authorization, maskSecret(GLOBAL_AUTH));
    assert.equal(safe.results[0].request.headers["X-Api-Token"], maskSecret(`Bearer ${API_TOKEN}`));
    assert.equal(safe.results[0].request.headers["X-Note"], "visible-header");
    assert.equal(safe.results[0].request.body.password, "***");
    assert.equal(safe.results[0].request.body.note, "visible-body");
    assert.equal(safe.results[0].response.body.token, maskSecret(API_TOKEN));
    assert.equal(safe.results[0].response.body.echo, `prefix ${maskSecret(CLIENT_SECRET)} suffix`);
    assert.equal(safe.results[0].response.body.note, "visible-response");
    assert.match(safe.results[0].path, new RegExp(`token=${maskSecret(API_TOKEN).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`));
    assert.match(safe.results[0].path, /page=1/);
    assert.equal(safe.results[0].error, `请求失败: ${maskSecret(CLIENT_SECRET)}`);
    const assertion = safe.results[0].assertions[0];
    assert.equal(assertion.expected.clientSecret, maskSecret(CLIENT_SECRET));
    assert.equal(assertion.expected.note, "visible-expected");
    assert.equal(assertion.actual.apiToken, maskSecret(API_TOKEN));
    assert.equal(assertion.actual.note, "visible-actual");
    assert.equal(assertion.detail[0].assertions[0].expected, maskSecret(CLIENT_SECRET));
    assert.equal(assertion.detail[0].assertions[0].actual, maskSecret(API_TOKEN));
});

test("#90 浏览器报告：失败步骤与 Markdown 报告只展示脱敏值，非敏感值保持原样", () => {
    const step = {
        stepNo: 1,
        name: "敏感断言",
        method: "GET",
        path: "/api",
        status: 200,
        passed: false,
        duration: 12,
        error: "",
        warnings: [],
        request: { headers: { Authorization: GLOBAL_AUTH } },
        response: {
            headers: { "x-api-key": API_TOKEN },
            body: { token: API_TOKEN, note: "visible-response" },
            bodyText: JSON.stringify({ token: API_TOKEN, note: "visible-response" })
        },
        assertions: [{
            name: "clientSecret 期望",
            passed: false,
            expected: CLIENT_SECRET,
            actual: "visible-actual"
        }]
    };
    const report = buildOverallReport(
        [step],
        { name: "敏感场景", steps: [{ name: "敏感断言" }] },
        "scenarios/secret.js",
        "full",
        { name: "Mock" },
        { clientSecret: CLIENT_SECRET, apiToken: API_TOKEN }
    );
    assert.equal(report.steps[0].assertions[0].expected, maskSecret(CLIENT_SECRET));
    assert.equal(report.steps[0].assertions[0].actual, "visible-actual");
    assert.equal(report.steps[0].request.headers.Authorization, maskSecret(GLOBAL_AUTH));
    assert.equal(report.steps[0].response.body.token, maskSecret(API_TOKEN));
    assert.equal(report.steps[0].response.body.note, "visible-response");

    const markdown = buildMarkdownReport(report);
    assert.ok(!markdown.includes(CLIENT_SECRET), "Markdown 报告不得回显 clientSecret");
    assert.ok(!markdown.includes(API_TOKEN), "Markdown 报告不得回显 apiToken");
    assert.ok(!markdown.includes(GLOBAL_AUTH), "Markdown 报告不得回显 Authorization");
    assert.ok(markdown.includes(maskSecret(API_TOKEN)), "响应体中的密钥应保留可读的脱敏形态");
    assert.ok(markdown.includes("visible-response"), "非敏感响应字段照常显示");
});

test("#90 CLI 失败 diff、报告与 --json 均脱敏，非敏感变量正常显示", async () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), "scenario-test-issue90-"));
    const server = http.createServer((request, response) => {
        response.writeHead(200, { "Content-Type": "application/json", "Set-Cookie": "session=visible-cookie" });
        response.end(JSON.stringify({
            status: "UP",
            authorization: request.headers.authorization,
            xApiToken: request.headers["x-api-token"],
            globalSecret: request.headers["x-global-secret"],
            note: "visible-ok"
        }));
    });
    await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
    try {
        const port = server.address().port;
        fs.mkdirSync(path.join(directory, "scenarios"));
        const config = {
            envs: [{ key: "mock", name: "Mock", baseUrl: `http://127.0.0.1:${port}` }],
            vars: { clientSecret: CLIENT_SECRET, apiToken: API_TOKEN, visibleValue: "visible-value" },
            authorization: GLOBAL_AUTH,
            globals: [{ type: "header", name: "X-Global-Secret", value: GLOBAL_SECRET }],
            scenarios: [{ id: "mask", name: "Mask", url: "scenarios/mask.js" }]
        };
        const scenario = {
            name: "Mask",
            steps: [{
                name: "敏感字段失败",
                path: "api",
                request: { headers: { "X-Api-Token": "Bearer {{vars.apiToken}}" } },
                assertions: [
                    { name: "期望来自 clientSecret", path: "status", equals: "{{vars.clientSecret}}" },
                    { name: "实际来自 apiToken", from: "vars", path: "apiToken", equals: "not-the-token" },
                    { name: "普通字段", path: "note", equals: "expected-visible" },
                    { name: "Authorization 回显", path: "authorization", equals: "Bearer wrong" },
                    { name: "全局敏感头回显", path: "globalSecret", equals: "wrong-global" }
                ]
            }]
        };
        fs.writeFileSync(
            path.join(directory, "scenario.config.js"),
            `ScenarioTest.registerConfig(ScenarioTest.defineConfig(${JSON.stringify(config, null, 2)}));`,
            "utf8"
        );
        fs.writeFileSync(
            path.join(directory, "scenarios/mask.js"),
            `ScenarioTest.registerScenario("mask", ScenarioTest.defineScenario(${JSON.stringify(scenario, null, 2)}));`,
            "utf8"
        );
        const cli = path.resolve(import.meta.dirname, "../src/cli.js");
        const run = (extraArgs) => new Promise((resolve, reject) => {
            const env = { ...process.env };
            for (const key of Object.keys(env)) {
                if (key.toUpperCase().startsWith("SCENARIO_")) delete env[key];
            }
            const child = spawn(process.execPath, [cli, "--config", path.join(directory, "scenario.config.js"), "--all", ...extraArgs], {
                env,
                stdio: ["ignore", "pipe", "pipe"]
            });
            let stdout = "";
            let stderr = "";
            child.stdout.setEncoding("utf8");
            child.stderr.setEncoding("utf8");
            child.stdout.on("data", (chunk) => { stdout += chunk; });
            child.stderr.on("data", (chunk) => { stderr += chunk; });
            child.on("error", reject);
            child.on("close", (code) => resolve({ code, stdout, stderr }));
        });

        const human = await run([]);
        assert.notEqual(human.code, 0, "断言失败应返回非零退出码");
        for (const raw of [CLIENT_SECRET, API_TOKEN, GLOBAL_SECRET, GLOBAL_AUTH]) {
            assert.ok(!human.stdout.includes(raw), `人类可读输出不得回显原始密钥: ${raw}`);
        }
        assert.match(human.stdout, /期望来自 clientSecret: expected=/);
        assert.ok(human.stdout.includes(`expected=${JSON.stringify(maskSecret(CLIENT_SECRET))}`), "期望值应脱敏");
        assert.ok(human.stdout.includes(`actual=${JSON.stringify(maskSecret(API_TOKEN))}`), "敏感变量实际值应脱敏");
        assert.match(human.stdout, /expected="expected-visible" actual="visible-ok"/, "非敏感字段 diff 保持明文");
        assert.match(human.stdout, /响应体:/);
        assert.ok(human.stdout.includes("visible-ok"), "非敏感响应字段应保留");

        const jsonResult = await run(["--json"]);
        assert.notEqual(jsonResult.code, 0, "失败场景 --json 仍返回非零退出码");
        const report = JSON.parse(jsonResult.stdout);
        const serialized = JSON.stringify(report);
        for (const raw of [CLIENT_SECRET, API_TOKEN, GLOBAL_SECRET, GLOBAL_AUTH]) {
            assert.ok(!serialized.includes(raw), `--json 不得回显原始密钥: ${raw}`);
        }
        assert.equal(report.vars.clientSecret, maskSecret(CLIENT_SECRET));
        assert.equal(report.vars.apiToken, maskSecret(API_TOKEN));
        assert.equal(report.vars.visibleValue, "visible-value");
        const result = report.results[0];
        assert.equal(result.request.headers.Authorization, maskSecret(GLOBAL_AUTH));
        assert.equal(result.request.headers["X-Api-Token"], maskSecret(`Bearer ${API_TOKEN}`));
        assert.equal(result.request.headers["X-Global-Secret"], maskSecret(GLOBAL_SECRET));
        assert.equal(result.response.body.authorization, maskSecret(GLOBAL_AUTH));
        assert.equal(result.response.body.xApiToken, maskSecret(`Bearer ${API_TOKEN}`));
        assert.equal(result.response.body.globalSecret, maskSecret(GLOBAL_SECRET));
        assert.equal(result.response.body.note, "visible-ok");
        const byName = Object.fromEntries(result.assertions.map((item) => [item.name, item]));
        assert.equal(byName["期望来自 clientSecret"].expected, maskSecret(CLIENT_SECRET));
        assert.equal(byName["期望来自 clientSecret"].actual, "UP");
        assert.equal(byName["实际来自 apiToken"].expected, "not-the-token");
        assert.equal(byName["实际来自 apiToken"].actual, maskSecret(API_TOKEN));
        assert.equal(byName["普通字段"].expected, "expected-visible");
        assert.equal(byName["普通字段"].actual, "visible-ok");
        assert.equal(byName["Authorization 回显"].actual, maskSecret(GLOBAL_AUTH));
        assert.equal(byName["全局敏感头回显"].actual, maskSecret(GLOBAL_SECRET));
    } finally {
        server.close();
        fs.rmSync(directory, { recursive: true, force: true });
    }
});
