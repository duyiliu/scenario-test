import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import {
    discoverProject,
    ensureProject,
    listProjects,
    readRegistry,
    registryPath,
    removeProject,
    resolveRegistryHome,
    setDefaultPort,
    setProjectPort
} from "../src/project-registry.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const cli = path.join(root, "src/cli.js");

function makeWorkspace(t, options = {}) {
    const home = fs.mkdtempSync(path.join(os.tmpdir(), "scenario-registry-home-"));
    const project = fs.mkdtempSync(path.join(os.tmpdir(), "scenario-registry-project-"));
    const scenarioDir = path.join(project, options.directory || "scenario-test");
    fs.mkdirSync(path.join(scenarioDir, ".scenario-test"), { recursive: true });
    const config = path.join(scenarioDir, "scenario.config.js");
    fs.writeFileSync(config, "ScenarioTest.registerConfig(ScenarioTest.defineConfig({ baseUrl: 'http://127.0.0.1:1', scenarios: [] }));\n", "utf8");
    t.after(() => {
        fs.rmSync(home, { recursive: true, force: true });
        fs.rmSync(project, { recursive: true, force: true });
    });
    return { home, project, scenarioDir, config };
}

function listenOn(port) {
    return new Promise((resolve, reject) => {
        const server = net.createServer();
        server.once("error", reject);
        server.listen(port, "127.0.0.1", () => resolve(server));
    });
}

test("项目发现：从子目录向上识别默认 scenario-test 目录", (t) => {
    const { project, scenarioDir } = makeWorkspace(t);
    const deep = path.join(project, "src", "deep");
    fs.mkdirSync(deep, { recursive: true });
    const discovered = discoverProject(deep);
    assert.ok(discovered);
    assert.equal(discovered.root, project);
    assert.equal(discovered.dir, scenarioDir);
    assert.equal(discovered.name, path.basename(project));
});

test("项目发现：在自定义接入目录内运行也能识别（仍要求 .scenario-test 标记）", (t) => {
    const { project, scenarioDir } = makeWorkspace(t, { directory: "qa-scenarios" });
    const discovered = discoverProject(scenarioDir);
    assert.ok(discovered);
    assert.equal(discovered.dir, scenarioDir);
    assert.equal(discovered.root, project);
});

test("项目发现：无接入目录时返回 null", (t) => {
    const empty = fs.mkdtempSync(path.join(os.tmpdir(), "scenario-registry-empty-"));
    t.after(() => fs.rmSync(empty, { recursive: true, force: true }));
    assert.equal(discoverProject(empty), null);
});

test("ensureProject：首次分配固定端口，再次登记复用同一端口", async (t) => {
    const { home, project, config } = makeWorkspace(t);
    const discovered = discoverProject(project);
    const first = await ensureProject(discovered, { home });
    assert.ok(first.created);
    assert.ok(first.entry.port >= 4300, `端口应从默认端口起分配：${first.entry.port}`);
    assert.equal(first.portAvailable, true);
    assert.ok(fs.existsSync(registryPath(home)));

    const second = await ensureProject(discovered, { home });
    assert.equal(second.created, false);
    assert.equal(second.entry.port, first.entry.port, "未显式指定端口时应复用登记端口");
    assert.equal(readRegistry(home).projects[Object.keys(readRegistry(home).projects)[0]].config, config);
});

test("ensureProject：显式端口写入登记；reassign 在登记端口被占用时顺延", async (t) => {
    const { home, project } = makeWorkspace(t);
    const discovered = discoverProject(project);
    const explicit = await ensureProject(discovered, { home, port: 4321 });
    assert.equal(explicit.entry.port, 4321);
    assert.equal(explicit.changed, true);

    const occupied = await listenOn(4321);
    try {
        const reassigned = await ensureProject(discovered, { home, reassign: true });
        assert.notEqual(reassigned.entry.port, 4321, "端口被占用时应顺延");
        assert.ok(reassigned.entry.port >= 4300);
        assert.equal(reassigned.portAvailable, true);
        assert.equal(readRegistry(home).projects[Object.keys(readRegistry(home).projects)[0]].port, reassigned.entry.port);
    } finally {
        await new Promise((resolve) => occupied.close(resolve));
    }
});

test("setProjectPort / setDefaultPort / removeProject 持久化到用户目录", async (t) => {
    const { home, project } = makeWorkspace(t);
    const discovered = discoverProject(project);
    await ensureProject(discovered, { home });
    setProjectPort(discovered, 4333, home);
    assert.equal(listProjects(home)[0].port, 4333);

    setDefaultPort(4399, home);
    assert.equal(readRegistry(home).defaultPort, 4399);

    const removed = removeProject(discovered, home);
    assert.equal(removed.removed, true);
    assert.equal(listProjects(home).length, 0);
    assert.equal(fs.existsSync(registryPath(home)), true, "移除项目后登记文件仍保留（含默认端口）");
});

test("SCENARIO_TEST_HOME 覆盖登记目录", () => {
    const home = fs.mkdtempSync(path.join(os.tmpdir(), "scenario-registry-env-"));
    const previous = process.env.SCENARIO_TEST_HOME;
    process.env.SCENARIO_TEST_HOME = home;
    try {
        assert.equal(resolveRegistryHome(), path.resolve(home));
        assert.equal(registryPath(), path.join(home, "projects.json"));
    } finally {
        if (previous === undefined) delete process.env.SCENARIO_TEST_HOME;
        else process.env.SCENARIO_TEST_HOME = previous;
        fs.rmSync(home, { recursive: true, force: true });
    }
});

test("CLI projects：ensure/list/set-port/remove 的 JSON 输出可直接解析", (t) => {
    const { home, config } = makeWorkspace(t);
    const env = { ...process.env, SCENARIO_TEST_HOME: home };
    const run = (...args) => spawnSync(process.execPath, [cli, "projects", ...args], { encoding: "utf8", env });

    const ensured = run("ensure", "--config", config, "--json");
    assert.equal(ensured.status, 0, ensured.stderr);
    const ensuredPayload = JSON.parse(ensured.stdout);
    assert.equal(ensuredPayload.config, config);
    assert.ok(ensuredPayload.port >= 4300);

    const listed = run("list", "--json");
    assert.equal(listed.status, 0, listed.stderr);
    const listedPayload = JSON.parse(listed.stdout);
    assert.equal(listedPayload.schemaVersion, 1);
    assert.equal(listedPayload.projects.length, 1);
    assert.equal(listedPayload.projects[0].port, ensuredPayload.port);

    const setPort = run("set-port", "4344", "--config", config);
    assert.equal(setPort.status, 0, setPort.stderr);
    assert.match(setPort.stdout, /已固定 .* 的端口: 4344/);

    const removed = run("remove", "--config", config);
    assert.equal(removed.status, 0, removed.stderr);
    assert.match(removed.stdout, /已移除项目登记/);
    assert.equal(JSON.parse(run("list", "--json").stdout).projects.length, 0);
});
