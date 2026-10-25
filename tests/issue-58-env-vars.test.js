import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { CONTRACT_VERSION, contract, createEngine, defineConfig, defineScenario } from "../src/index.js";

// 隔离宿主 SCENARIO_* 变量，避免外部授权/全局参数影响子进程
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

test("contract v13 投射 envs[].vars，defineConfig 校验环境级变量", () => {
    assert.equal(CONTRACT_VERSION, 13);
    assert.ok(contract.config.environmentKeys.includes("vars"));
    assert.ok(contract.config.environmentKeys.includes("globals"));

    const config = defineConfig({
        envs: [{ key: "local", name: "本地", vars: { tenant: "local-tenant" } }],
        defaultEnvKey: "local",
        vars: { tenant: "config-tenant" }
    });
    assert.deepEqual(config.envs[0].vars, { tenant: "local-tenant" });

    assert.throws(
        () => defineConfig({ envs: [{ key: "bad", name: "Bad", vars: "not-an-object" }] }),
        /vars 必须是对象/
    );
    assert.throws(
        () => defineConfig({ envs: [{ key: "bad", name: "Bad", vars: { runId: "forged" } }] }),
        /保留变量/
    );
});

test("engine 合并 config.vars < envs[].vars < 显式 vars，未指定环境时回落 defaultEnvKey", async () => {
    const config = defineConfig({
        envs: [
            { key: "dev", name: "开发", vars: { token: "env-dev", devOnly: "dev", tenant: "dev-tenant" } },
            { key: "test", name: "测试", vars: { token: "env-test", tenant: "test-tenant" } }
        ],
        defaultEnvKey: "dev",
        vars: { token: "config-token", configOnly: "config" }
    });
    const scenario = defineScenario({
        name: "环境变量优先级",
        vars: { token: "scenario-token" },
        steps: [{ name: "无请求断言", path: "x", adapter: "noop" }]
    });
    const engine = createEngine({
        config,
        adapters: {
            noop: { execute: async () => ({ status: 200, headers: {}, body: {}, bodyText: null }) }
        }
    });

    const byDefault = await engine.runScenario(scenario);
    assert.equal(byDefault.vars.token, "env-dev");
    assert.equal(byDefault.vars.devOnly, "dev");
    assert.equal(byDefault.vars.configOnly, "config");

    const byKey = await engine.runScenario(scenario, { env: "test" });
    assert.equal(byKey.vars.token, "env-test");
    assert.equal(byKey.vars.tenant, "test-tenant");
    assert.equal(byKey.vars.devOnly, undefined, "选中环境不应混入 defaultEnvKey 的环境变量");

    const overridden = await engine.runScenario(scenario, { env: "test", vars: { token: "cli-token" } });
    assert.equal(overridden.vars.token, "cli-token");
    assert.equal(overridden.vars.tenant, "test-tenant");
});

test("CLI env.vars 随 --env 生效，优先级 config.vars < env.vars < --vars，并可满足 required", async () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), "scenario-test-issue58-env-vars-"));
    try {
        const captured = [];
        await withServer((request, response) => {
            captured.push({ ...request.headers });
            response.writeHead(200, { "Content-Type": "application/json" });
            response.end(JSON.stringify({ ok: true }));
        }, async (port) => {
            fs.mkdirSync(path.join(directory, "scenarios"));
            fs.writeFileSync(path.join(directory, "scenario.config.js"), `ScenarioTest.registerConfig(ScenarioTest.defineConfig({
                envs: [
                    { key: "alpha", name: "Alpha", baseUrl: "http://127.0.0.1:${port}", vars: {
                        tenant: "env-alpha",
                        envOnly: "alpha",
                        derived: "{{vars.configBase}}-alpha",
                        requiredToken: "alpha-required"
                    } },
                    { key: "beta", name: "Beta", baseUrl: "http://127.0.0.1:${port}", vars: {
                        tenant: "env-beta",
                        envOnly: "beta",
                        derived: "{{vars.configBase}}-beta",
                        requiredToken: "beta-required"
                    } }
                ],
                defaultEnvKey: "alpha",
                vars: { tenant: "config-tenant", configOnly: "config-only", configBase: "base" },
                variables: [
                    { name: "envOnly", defaultValue: "default-env-only" },
                    { name: "requiredToken", required: true }
                ],
                scenarios: [{ id: "envvars", name: "EnvVars", url: "scenarios/envvars.js" }]
            }));`, "utf8");
            fs.writeFileSync(path.join(directory, "scenarios/envvars.js"), `ScenarioTest.registerScenario("envvars", ScenarioTest.defineScenario({
                name: "EnvVars",
                steps: [{
                    name: "回显环境变量",
                    path: "echo",
                    status: 200,
                    request: { headers: {
                        "X-Tenant": "{{vars.tenant}}",
                        "X-Env-Only": "{{vars.envOnly}}",
                        "X-Config-Only": "{{vars.configOnly}}",
                        "X-Derived": "{{vars.derived}}",
                        "X-Required": "{{vars.requiredToken}}"
                    } }
                }]
            }));`, "utf8");

            const configPath = path.join(directory, "scenario.config.js");
            const alpha = await runCli(["run", "--config", configPath, "--env", "alpha", "--scenario", "envvars"]);
            assert.equal(alpha.code, 0, alpha.stderr);
            assert.equal(captured[0]["x-tenant"], "env-alpha");
            assert.equal(captured[0]["x-env-only"], "alpha", "env.vars 应覆盖 variables.defaultValue");
            assert.equal(captured[0]["x-config-only"], "config-only");
            assert.equal(captured[0]["x-derived"], "base-alpha", "env.vars 值应支持模板并引用 config.vars");
            assert.equal(captured[0]["x-required"], "alpha-required", "env.vars 应能满足 required 变量");

            const beta = await runCli(["run", "--config", configPath, "--env", "beta", "--scenario", "envvars"]);
            assert.equal(beta.code, 0, beta.stderr);
            assert.equal(captured[1]["x-tenant"], "env-beta");
            assert.equal(captured[1]["x-env-only"], "beta");
            assert.equal(captured[1]["x-derived"], "base-beta");
            assert.equal(captured[1]["x-required"], "beta-required");

            const overridden = await runCli([
                "run", "--config", configPath, "--env", "alpha", "--scenario", "envvars",
                "--vars", "tenant=cli-tenant",
                "--vars", "envOnly=cli-env",
                "--vars", "derived=cli-derived"
            ]);
            assert.equal(overridden.code, 0, overridden.stderr);
            assert.equal(captured[2]["x-tenant"], "cli-tenant", "--vars 应覆盖 env.vars");
            assert.equal(captured[2]["x-env-only"], "cli-env");
            assert.equal(captured[2]["x-derived"], "cli-derived");
            assert.equal(captured[2]["x-config-only"], "config-only");
            assert.equal(captured[2]["x-required"], "alpha-required", "未覆盖的 env.vars 仍生效");

            const defaultEnv = await runCli(["run", "--config", configPath, "--scenario", "envvars"]);
            assert.equal(defaultEnv.code, 0, defaultEnv.stderr);
            assert.equal(captured[3]["x-tenant"], "env-alpha", "未传 --env 时应使用 defaultEnvKey 的环境变量");
        });
    } finally {
        fs.rmSync(directory, { recursive: true, force: true });
    }
});
