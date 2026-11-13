// E2E 执行链：在真实安装出来的工程里跑 `run`，
// 验证场景对 fixture-api 全 PASS、--json 可解析、--junit/--report 产物存在；
// 反例验证断言失败场景在真实工程里 exit 非零。
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { startStaticSource } from "./helpers/static-source.mjs";
import { startFixtureApi } from "./helpers/fixture-api.mjs";
import { installerForPlatform, installArgs, installEnv, run, makeTempDir, removeDir } from "./helpers/proc.mjs";

const fixtureScenariosDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "project/scenarios");
const installer = installerForPlatform();

// --json 输出形态：单场景为单个对象（含 scenarioId/status），多场景可能是
// 数组或带 scenarios/results 容器。统一按场景 id 提取。
function pickScenario(json, id) {
    if (!json) return null;
    if (Array.isArray(json)) {
        return json.find((s) => (s.scenarioId || s.id) === id) || null;
    }
    if (json.scenarioId === id || json.id === id) return json;
    const container = json.scenarios || json.results;
    if (Array.isArray(container)) {
        return container.find((s) => (s.scenarioId || s.id) === id) || null;
    }
    if (container && typeof container === "object") return container[id] || null;
    return null;
}

let source;
let api;
const sandboxes = [];

function sandbox() {
    const dir = makeTempDir();
    sandboxes.push(dir);
    return dir;
}

before(async () => {
    source = await startStaticSource();
    api = await startFixtureApi();
});

after(async () => {
    for (const dir of sandboxes.splice(0)) removeDir(dir);
    if (source) await source.close();
    if (api) await api.close();
});

// 真实安装出一个工程：返回 { target, env, cli }；target 为项目内 scenario-test 目录。
async function installProject(home, project) {
    fs.mkdirSync(project, { recursive: true });
    const args = installArgs(installer, { projectDir: project, targetDir: "scenario-test", source: source.baseUrl });
    const env = installEnv(installer, { home, manifestUrl: source.manifestUrl });
    const res = await run(installer.command, args, { env, cwd: project });
    assert.equal(res.code, 0, `安装应成功。\n${res.stdout}\n${res.stderr}`);
    const cli = path.join(home, ".scenario-test", "runtime", "scenario-test-cli.cjs");
    return { target: path.join(project, "scenario-test"), env, cli };
}

// 在已 init 的工程里写入 config（引用 fixture 实际端口）并拷入场景文件。
function writeConfigAndScenarios(target, scenarioIds) {
    const config = `ScenarioTest.registerConfig(ScenarioTest.defineConfig({
    envs: [
        { key: "local", name: "本地夹具", baseUrl: ${JSON.stringify(api.baseUrl)} }
    ],
    defaultEnvKey: "local",
    vars: {},
    scenarios: ${JSON.stringify(scenarioIds.map((id) => ({
        id, name: id, url: `scenarios/${id}.js`
    })), null, 2)}
}));\n`;
    fs.writeFileSync(path.join(target, "scenario.config.js"), config, "utf8");
    const dest = path.join(target, "scenarios");
    fs.mkdirSync(dest, { recursive: true });
    for (const id of scenarioIds) {
        fs.copyFileSync(path.join(fixtureScenariosDir, `${id}.js`), path.join(dest, `${id}.js`));
    }
}

test("run 正例：login→users→orders 建查删 全场景 PASS，JSON/JUnit/HTML 产物齐", { skip: !installer && "本平台无安装脚本" }, async (t) => {
    const home = path.join(sandbox(), "home");
    const project = path.join(sandbox(), "project");
    const { target, env, cli } = await installProject(home, project);
    writeConfigAndScenarios(target, ["order-flow"]);

    const reportJunit = path.join(project, "out", "junit.xml");
    const reportHtml = path.join(project, "out", "report.html");
    fs.mkdirSync(path.dirname(reportJunit), { recursive: true });

    const result = await run(process.execPath, [
        cli, "run",
        "--config", path.join(target, "scenario.config.js"),
        "--env", "local",
        "--all",
        "--json",
        "--junit", reportJunit,
        "--report", reportHtml
    ], { env, cwd: target });

    assert.equal(result.code, 0, `run 应全过。\nstdout:\n${result.stdout}\nstderr:\n${result.stderr}`);

    const json = JSON.parse(result.stdout);
    const orderFlow = pickScenario(json, "order-flow");
    assert.ok(orderFlow, `JSON 报告应含 order-flow 结果。实际：${result.stdout.slice(0, 400)}`);
    assert.match(String(orderFlow.status || orderFlow.result).toUpperCase(), /PASS/, "order-flow 应 PASS");

    assert.ok(fs.existsSync(reportJunit), "应生成 JUnit 产物");
    assert.ok(fs.existsSync(reportHtml), "应生成 HTML 报告产物");
});

test("run 反例：注入断言失败场景 → exit 非零且 JSON 标注 failed", { skip: !installer && "本平台无安装脚本" }, async () => {
    const home = path.join(sandbox(), "home");
    const project = path.join(sandbox(), "project");
    const { target, env, cli } = await installProject(home, project);
    writeConfigAndScenarios(target, ["order-flow", "bad-login"]);

    const result = await run(process.execPath, [
        cli, "run",
        "--config", path.join(target, "scenario.config.js"),
        "--env", "local",
        "--all",
        "--json"
    ], { env, cwd: target });

    assert.notEqual(result.code, 0, `含失败场景的 run 应非零。\nstdout:\n${result.stdout}`);

    const json = JSON.parse(result.stdout);
    const text = JSON.stringify(json).toLowerCase();
    assert.match(text, /bad-login/, "JSON 应含 bad-login");
    assert.match(text, /fail/, "JSON 应标注失败");
});
