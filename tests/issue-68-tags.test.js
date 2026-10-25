import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import test from "node:test";

const cli = path.resolve(import.meta.dirname, "../src/cli.js");

function runCli(args) {
    return new Promise((resolve) => {
        const childEnv = { ...process.env };
        for (const key of Object.keys(childEnv)) {
            if (key.toUpperCase().startsWith("SCENARIO_")) delete childEnv[key];
        }
        const child = spawn(process.execPath, [cli, ...args], {
            env: childEnv,
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

async function setupProject() {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), "scenario-test-tags-"));
    const server = http.createServer((request, response) => {
        response.writeHead(200, { "Content-Type": "application/json" });
        response.end(JSON.stringify({ status: "UP" }));
    });
    await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
    const port = server.address().port;
    fs.mkdirSync(path.join(directory, "scenarios"));
    fs.writeFileSync(path.join(directory, "scenario.config.js"), `ScenarioTest.registerConfig(ScenarioTest.defineConfig({envs:[{key:"mock",name:"Mock",baseUrl:"http://127.0.0.1:${port}"}],scenarios:[
        {id:"login",name:"Login",url:"scenarios/login.js",tags:["smoke","auth"]},
        {id:"pay",name:"Pay",url:"scenarios/pay.js",tags:["smoke","payment"]},
        {id:"refund",name:"Refund",url:"scenarios/refund.js",tags:["payment","write"]},
        {id:"manual-smoke",name:"ManualSmoke",url:"scenarios/manual-smoke.js",manual:true,tags:["smoke","manual-only"]},
        {id:"no-tag",name:"NoTag",url:"scenarios/no-tag.js"}
    ]}));`, "utf8");
    for (const id of ["login", "pay", "refund", "manual-smoke", "no-tag"]) {
        fs.writeFileSync(
            path.join(directory, `scenarios/${id}.js`),
            `ScenarioTest.registerScenario("${id}",ScenarioTest.defineScenario({name:"${id}",steps:[{name:"${id}-step",path:"health",status:200}]}));`,
            "utf8"
        );
    }
    return {
        directory,
        configPath: path.join(directory, "scenario.config.js"),
        close() {
            server.close();
            fs.rmSync(directory, { recursive: true, force: true });
        }
    };
}

test("CLI --tag：多次出现 OR、同参数逗号 AND，manual 场景不自动放行", async () => {
    const project = await setupProject();
    try {
        // 单个标签：只执行带 smoke 的自动场景
        const smoke = await runCli(["--config", project.configPath, "--tag", "smoke"]);
        assert.equal(smoke.code, 0, smoke.stderr);
        assert.match(smoke.stdout, /\[PASS\] login-step/);
        assert.match(smoke.stdout, /\[PASS\] pay-step/);
        assert.doesNotMatch(smoke.stdout, /refund-step|manual-smoke-step|no-tag-step/);
        assert.match(smoke.stdout, /Overall: 2\/2 passed/);

        // 重复 --tag 之间 OR：smoke 或 write 命中 login/pay/refund
        const either = await runCli(["--config", project.configPath, "--tag", "smoke", "--tag", "write"]);
        assert.equal(either.code, 0, either.stderr);
        assert.match(either.stdout, /\[PASS\] login-step/);
        assert.match(either.stdout, /\[PASS\] pay-step/);
        assert.match(either.stdout, /\[PASS\] refund-step/);
        assert.doesNotMatch(either.stdout, /manual-smoke-step|no-tag-step/);
        assert.match(either.stdout, /Overall: 3\/3 passed/);

        // 同一 --tag 内逗号分隔为 AND：必须同时带 smoke 和 payment
        const both = await runCli(["--config", project.configPath, "--tag", "smoke,payment"]);
        assert.equal(both.code, 0, both.stderr);
        assert.match(both.stdout, /\[PASS\] pay-step/);
        assert.doesNotMatch(both.stdout, /login-step|refund-step|manual-smoke-step|no-tag-step/);
        assert.match(both.stdout, /Overall: 1\/1 passed/);

        // 分组 OR：(smoke AND payment) OR (write) => pay + refund，manual-smoke 仍排除
        const grouped = await runCli(["--config", project.configPath, "--tag", "write", "--tag", "smoke,payment"]);
        assert.equal(grouped.code, 0, grouped.stderr);
        assert.match(grouped.stdout, /\[PASS\] pay-step/);
        assert.match(grouped.stdout, /\[PASS\] refund-step/);
        assert.doesNotMatch(grouped.stdout, /login-step|manual-smoke-step|no-tag-step/);
        assert.match(grouped.stdout, /Overall: 2\/2 passed/);
    } finally {
        project.close();
    }
});

test("CLI --tag 与 --scenario 组合：显式点名允许 manual，标签作为附加筛选", async () => {
    const project = await setupProject();
    try {
        const explicitManual = await runCli([
            "--config", project.configPath,
            "--scenario", "manual-smoke",
            "--tag", "smoke"
        ]);
        assert.equal(explicitManual.code, 0, explicitManual.stderr);
        assert.match(explicitManual.stdout, /\[PASS\] manual-smoke-step/);
        assert.doesNotMatch(explicitManual.stdout, /login-step|pay-step|refund-step|no-tag-step/);
        assert.match(explicitManual.stdout, /Overall: 1\/1 passed/);

        const mismatch = await runCli([
            "--config", project.configPath,
            "--scenario", "no-tag",
            "--tag", "smoke"
        ]);
        assert.notEqual(mismatch.code, 0);
        assert.match(mismatch.stderr, /显式选择的场景未匹配 --tag smoke/);
        assert.doesNotMatch(mismatch.stdout, /no-tag-step/);
    } finally {
        project.close();
    }
});

test("CLI --tag：仅命中 manual、未知标签与空标签均明确报错", async () => {
    const project = await setupProject();
    try {
        const manualOnly = await runCli(["--config", project.configPath, "--tag", "manual-only"]);
        assert.notEqual(manualOnly.code, 0);
        assert.match(manualOnly.stderr, /仅命中 manual:true 场景（manual-smoke）/);
        assert.match(manualOnly.stderr, /仍需.*--scenario|--scenario <id>/);
        assert.doesNotMatch(manualOnly.stdout, /manual-smoke-step/);

        const unknown = await runCli(["--config", project.configPath, "--tag", "missing"]);
        assert.notEqual(unknown.code, 0);
        assert.match(unknown.stderr, /没有自动场景匹配 --tag missing/);
        assert.match(unknown.stderr, /可用标签:.*smoke/);
        assert.match(unknown.stderr, /多个 --tag 之间为 OR/);

        const blank = await runCli(["--config", project.configPath, "--tag", ",", "--tag", "smoke"]);
        assert.notEqual(blank.code, 0);
        assert.match(blank.stderr, /--tag 需要至少一个非空标签/);

        const help = await runCli(["--help"]);
        assert.equal(help.code, 0);
        assert.match(help.stdout, /--tag/);
        assert.match(help.stdout, /多个 --tag 之间为 OR/);
        assert.match(help.stdout, /manual:true 场景仍须通过 --scenario 显式选择/);
    } finally {
        project.close();
    }
});
