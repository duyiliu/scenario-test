import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import test from "node:test";

// Issue #107 配套：doctor 的弱断言诊断。只提示不失败——不为结构强制或覆盖率门禁，
// 只是给「只断言 200」这类假绿一个确定性信号。

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const cli = path.join(root, "src/cli.js");

function childEnv() {
    const env = { ...process.env };
    for (const key of Object.keys(env)) {
        if (/_proxy$/i.test(key)) delete env[key];
    }
    return env;
}

function projectWith(healthSteps, seedSteps) {
    const project = fs.mkdtempSync(path.join(os.tmpdir(), "scenario-test-weak-"));
    const init = spawnSync(process.execPath, [cli, "init", "--project", project, "--dir", "scenario-test"], { encoding: "utf8", env: childEnv() });
    assert.equal(init.status, 0, init.stderr);
    const dir = path.join(project, "scenario-test");
    fs.writeFileSync(path.join(dir, "scenario.config.js"), `ScenarioTest.registerConfig(ScenarioTest.defineConfig({
        envs: [{ key: "local", name: "本地", baseUrl: "http://127.0.0.1:1" }],
        defaultEnvKey: "local",
        scenarios: [
            { id: "health", name: "Health", url: "scenarios/health.js" },
            { id: "seed", name: "Seed", url: "scenarios/seed.js", manual: true }
        ]
    }));`, "utf8");
    fs.mkdirSync(path.join(dir, "scenarios"), { recursive: true });
    fs.writeFileSync(path.join(dir, "scenarios/health.js"), `ScenarioTest.registerScenario("health", ScenarioTest.defineScenario({
        name: "Health",
        steps: ${JSON.stringify(healthSteps)}
    }));`, "utf8");
    fs.writeFileSync(path.join(dir, "scenarios/seed.js"), `ScenarioTest.registerScenario("seed", ScenarioTest.defineScenario({
        name: "Seed",
        steps: ${JSON.stringify(seedSteps)}
    }));`, "utf8");
    return project;
}

function runDoctor(project) {
    const dir = path.join(project, "scenario-test");
    return spawnSync(process.execPath, [cli, "doctor", "--config", path.join(dir, "scenario.config.js"), "--json"], { encoding: "utf8", env: childEnv() });
}

test("弱断言：无业务断言时给出 WARN（写操作另提示缺后置验证），退出码仍为 0", () => {
    const project = projectWith(
        [{ name: "healthy", path: "health", status: 200 }],
        [{ name: "seed-data", method: "POST", path: "seed", request: { body: { a: 1 } }, status: 201 }]
    );
    try {
        const result = runDoctor(project);
        assert.equal(result.status, 0, "弱断言只是 WARN，不应让 doctor 失败");
        const report = JSON.parse(result.stdout);
        const warnings = report.checks.filter((check) => check.name === "weak-assertions");
        assert.equal(warnings.length, 2, JSON.stringify(warnings));
        assert.match(warnings[0].message, /^场景 health 的所有步骤仅断言 HTTP 状态/);
        assert.match(warnings[1].message, /^场景 seed 的所有步骤仅断言 HTTP 状态.*写操作却缺少后置状态验证/);
        assert.equal(report.summary.failed, 0);
    } finally {
        fs.rmSync(project, { recursive: true, force: true });
    }
});

test("弱断言：写操作只发请求、由后置查询验证时不误报", () => {
    const project = projectWith(
        [{ name: "create", method: "POST", path: "seed", request: { body: { a: 1 } }, status: 200, assertions: [{ path: "data.id", exists: true }] }],
        [{
            name: "seed-data",
            method: "POST",
            path: "seed",
            status: 201,
            extract: [{ name: "id", path: "data.id" }]
        }, {
            name: "verify",
            method: "GET",
            path: "seed/{{vars.id}}",
            status: 200,
            assertions: [{ path: "data.name", equals: "x" }]
        }]
    );
    try {
        const result = runDoctor(project);
        assert.equal(result.status, 0, result.stdout);
        const report = JSON.parse(result.stdout);
        const warnings = report.checks.filter((check) => check.name === "weak-assertions");
        assert.deepEqual(warnings, [], `后置查询已验证业务结果时不应提示: ${JSON.stringify(warnings)}`);
    } finally {
        fs.rmSync(project, { recursive: true, force: true });
    }
});

test("弱断言：只读步骤仍提示，但不要求只读场景做后置验证", () => {
    const project = projectWith(
        [{ name: "healthy", path: "health", status: 200, assertions: [{ path: "data.ok", equals: true }] }],
        [{ name: "seed-data", method: "GET", path: "seed", status: 200 }]
    );
    try {
        const result = runDoctor(project);
        assert.equal(result.status, 0, result.stdout);
        const report = JSON.parse(result.stdout);
        const warnings = report.checks.filter((check) => check.name === "weak-assertions");
        assert.equal(warnings.length, 1, JSON.stringify(warnings));
        assert.match(warnings[0].message, /^场景 seed 的所有步骤仅断言 HTTP 状态/);
        assert.doesNotMatch(warnings[0].message, /写操作|后置状态验证/);
    } finally {
        fs.rmSync(project, { recursive: true, force: true });
    }
});
