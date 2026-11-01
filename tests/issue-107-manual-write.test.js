import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import test from "node:test";

// Issue #107 配套：manual 场景不进入默认执行。
// 写操作若只存在于 manual 场景，CI/批量 run 不会覆盖，需要有确定性提示。

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const cli = path.join(root, "src/cli.js");

function childEnv() {
    const env = { ...process.env };
    for (const key of Object.keys(env)) {
        if (/_proxy$/i.test(key)) delete env[key];
    }
    return env;
}

function projectWith(scenarios) {
    const project = fs.mkdtempSync(path.join(os.tmpdir(), "scenario-test-manual-"));
    const init = spawnSync(process.execPath, [cli, "init", "--project", project, "--dir", "scenario-test"], { encoding: "utf8", env: childEnv() });
    assert.equal(init.status, 0, init.stderr);
    const dir = path.join(project, "scenario-test");
    const entries = scenarios
        .map((item) => `{ id: "${item.id}", name: "${item.id}", url: "scenarios/${item.id}.js"${item.manual ? ", manual: true" : ""} }`)
        .join(",\n            ");
    fs.writeFileSync(path.join(dir, "scenario.config.js"), `ScenarioTest.registerConfig(ScenarioTest.defineConfig({
        envs: [{ key: "local", name: "本地", baseUrl: "http://127.0.0.1:1" }],
        defaultEnvKey: "local",
        scenarios: [
            ${entries}
        ]
    }));`, "utf8");
    fs.mkdirSync(path.join(dir, "scenarios"), { recursive: true });
    for (const item of scenarios) {
        fs.writeFileSync(path.join(dir, "scenarios", `${item.id}.js`), `ScenarioTest.registerScenario("${item.id}", ScenarioTest.defineScenario({
        name: "${item.id}",
        steps: ${JSON.stringify(item.steps)}
    }));`, "utf8");
    }
    return project;
}

function runDoctor(project) {
    const dir = path.join(project, "scenario-test");
    const result = spawnSync(process.execPath, [cli, "doctor", "--config", path.join(dir, "scenario.config.js"), "--json"], { encoding: "utf8", env: childEnv() });
    assert.equal(result.status, 0, result.stderr);
    return JSON.parse(result.stdout);
}

test("manual 写操作场景提示不会被默认执行", () => {
    const project = projectWith([{
        id: "write-manual",
        manual: true,
        steps: [{ name: "创建", method: "POST", path: "api/items", status: 201 }]
    }]);
    try {
        const report = runDoctor(project);
        const warnings = report.checks.filter((check) => check.name === "manual-write-scenario");
        assert.equal(warnings.length, 1, JSON.stringify(warnings));
        assert.match(warnings[0].message, /标记为 manual 且包含写操作/);
        assert.equal(report.summary.failed, 0, "只是 WARN，不应让 doctor 失败");
    } finally {
        fs.rmSync(project, { recursive: true, force: true });
    }
});

test("manual 只读场景不提示", () => {
    const project = projectWith([{
        id: "read-manual",
        manual: true,
        steps: [{ name: "查询", method: "GET", path: "api/items/1", status: 200 }]
    }]);
    try {
        const report = runDoctor(project);
        assert.deepEqual(report.checks.filter((check) => check.name === "manual-write-scenario"), []);
    } finally {
        fs.rmSync(project, { recursive: true, force: true });
    }
});

test("非 manual 写操作场景不提示", () => {
    const project = projectWith([{
        id: "write-auto",
        steps: [{ name: "创建", method: "POST", path: "api/items", status: 201 }]
    }]);
    try {
        const report = runDoctor(project);
        assert.deepEqual(report.checks.filter((check) => check.name === "manual-write-scenario"), []);
    } finally {
        fs.rmSync(project, { recursive: true, force: true });
    }
});
