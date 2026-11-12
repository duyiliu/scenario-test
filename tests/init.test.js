import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { CONTRACT_VERSION } from "../src/index.js";
import { VERSION } from "../src/version.generated.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const cli = path.join(root, "src/cli.js");

function runInit(project, ...args) {
    return spawnSync(process.execPath, [cli, "init", "--project", project, ...args], { encoding: "utf8" });
}

// v23 起运行时去项目化：init 只写场景数据与本机启动脚本，不落任何运行时副本
function assertGeneratedLayout(project, directory = "scenario-test") {
    const publicDir = path.join(project, ...directory.split("/"));
    assert.deepEqual(fs.readdirSync(publicDir).sort(), ["README.md", "scenario.config.js", "start-scenario-test.cmd"]);
    assert.equal(fs.existsSync(path.join(publicDir, ".scenario-test")), false, "项目内不得落 .scenario-test 运行时副本");
    assert.equal(fs.existsSync(path.join(publicDir, "index.html")), false, "工作台页由运行时提供，项目内不再有 index.html");
    const startScript = fs.readFileSync(path.join(publicDir, "start-scenario-test.cmd"), "utf8");
    assert.ok(startScript.includes(path.resolve(cli)), "cmd 应写入本机运行时 CLI 绝对路径");
    assert.match(startScript, /scenario\.config\.js/);
    assert.match(startScript, /--open/, "cmd 应由 serve 监听成功后打开浏览器");
    assert.doesNotMatch(startScript, /4300/, "cmd 不应写死工作台端口");
    assert.doesNotMatch(startScript, /--port/, "cmd 不应显式传端口，交由项目登记复用");
    const config = fs.readFileSync(path.join(publicDir, "scenario.config.js"), "utf8");
    assert.doesNotMatch(config, /reference path=.*\.scenario-test/, "配置模板不再引用项目内 d.ts 副本");
    return { publicDir };
}

function seedLegacyRuntime(publicDir) {
    const frameworkDir = path.join(publicDir, ".scenario-test");
    fs.mkdirSync(frameworkDir, { recursive: true });
    for (const name of ["scenario-test-cli.cjs", "scenario-test.umd.js", "scenario-test.d.ts", "scenario-test-capabilities.json", "AI_SCENARIO_PROMPT.md", "SCENARIO_PATTERNS.md", ".scenario-test-version.json", "e2e-reporter.cjs"]) {
        fs.writeFileSync(path.join(frameworkDir, name), `legacy ${name}`, "utf8");
    }
    fs.writeFileSync(path.join(publicDir, "index.html"), "<html>legacy</html>", "utf8");
    return frameworkDir;
}

test("init 只写场景数据：无 .scenario-test 副本、无 index.html、默认不覆盖项目文件", () => {
    const project = fs.mkdtempSync(path.join(os.tmpdir(), "scenario-test-init-"));
    try {
        const first = runInit(project);
        assert.equal(first.status, 0, first.stderr);
        assert.match(first.stdout, /运行时: 使用安装方 CLI/);
        const { publicDir } = assertGeneratedLayout(project);
        const configPath = path.join(publicDir, "scenario.config.js");
        assert.match(fs.readFileSync(configPath, "utf8"), /ScenarioTest\.registerConfig/);
        assert.match(fs.readFileSync(configPath, "utf8"), /storagePrefix: "scenario-test\.scenario-test-init-/);
        assert.match(fs.readFileSync(configPath, "utf8"), /scenarios: \[]/);
        assert.equal(fs.existsSync(path.join(publicDir, "scenarios")), false);

        const readme = fs.readFileSync(path.join(publicDir, "README.md"), "utf8");
        assert.match(readme, /不需要再次复制任何 Prompt/);
        assert.match(readme, /不安装 npm 包/);
        assert.doesNotMatch(readme, /npx @yc_yzkj\/scenario-test|npm install -D/);
        assert.match(readme, /AI 负责维护 `scenario\.config\.js` 和 `scenarios\/`/);
        assert.match(readme, /安装方/);
        assert.match(readme, /--port 4301/, "README 应说明端口冲突时的显式指定");

        fs.writeFileSync(configPath, "// 用户配置\n", "utf8");
        const scenarioDir = path.join(publicDir, "scenarios");
        fs.mkdirSync(scenarioDir);
        fs.writeFileSync(path.join(scenarioDir, "user.js"), "// 用户场景\n", "utf8");
        const second = runInit(project);
        assert.equal(second.status, 0, second.stderr);
        assert.equal(fs.readFileSync(configPath, "utf8"), "// 用户配置\n");
        assert.equal(fs.readFileSync(path.join(scenarioDir, "user.js"), "utf8"), "// 用户场景\n");
    } finally {
        fs.rmSync(project, { recursive: true, force: true });
    }
});

test("init --no-input：目录已存在时不询问、退出 0、保留项目配置", () => {
    const project = fs.mkdtempSync(path.join(os.tmpdir(), "scenario-test-init-noinput-"));
    try {
        const first = runInit(project);
        assert.equal(first.status, 0, first.stderr);
        const publicDir = path.join(project, "scenario-test");
        const customConfig = "ScenarioTest.registerConfig(ScenarioTest.defineConfig({baseUrl:'http://localhost:9999',scenarios:[]}));\n";
        fs.writeFileSync(path.join(publicDir, "scenario.config.js"), customConfig, "utf8");
        const second = runInit(project, "--no-input");
        assert.equal(second.status, 0, second.stderr);
        assert.doesNotMatch(second.stdout + second.stderr, /目标目录 .* 已存在/, "--no-input 不应出现交互提示");
        assert.equal(fs.readFileSync(path.join(publicDir, "scenario.config.js"), "utf8"), customConfig, "--no-input 应保留用户配置");
    } finally {
        fs.rmSync(project, { recursive: true, force: true });
    }
});

test("init 为不同项目生成独立浏览器存储前缀", () => {
    const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "scenario-test-prefix-"));
    try {
        const firstProject = path.join(rootDir, "project-a");
        const secondProject = path.join(rootDir, "project-b");
        fs.mkdirSync(firstProject);
        fs.mkdirSync(secondProject);
        for (const project of [firstProject, secondProject]) {
            const result = runInit(project);
            assert.equal(result.status, 0, result.stderr);
        }
        const firstConfig = fs.readFileSync(path.join(firstProject, "scenario-test", "scenario.config.js"), "utf8");
        const secondConfig = fs.readFileSync(path.join(secondProject, "scenario-test", "scenario.config.js"), "utf8");
        assert.match(firstConfig, /storagePrefix: "scenario-test\.project-a"/);
        assert.match(secondConfig, /storagePrefix: "scenario-test\.project-b"/);
        assert.notEqual(firstConfig, secondConfig);
    } finally {
        fs.rmSync(rootDir, { recursive: true, force: true });
    }
});

test("init 支持自定义场景目录 --dir", () => {
    const project = fs.mkdtempSync(path.join(os.tmpdir(), "scenario-test-init-dir-"));
    try {
        const result = runInit(project, "--dir", "dev/场景测试");
        assert.equal(result.status, 0, result.stderr);
        assertGeneratedLayout(project, "dev/场景测试");
    } finally {
        fs.rmSync(project, { recursive: true, force: true });
    }
});

test("init 检测旧版运行时副本时提示，--clean 可移除且不动项目文件", () => {
    const project = fs.mkdtempSync(path.join(os.tmpdir(), "scenario-test-init-clean-"));
    try {
        const publicDir = path.join(project, "scenario-test");
        fs.mkdirSync(publicDir, { recursive: true });
        const configText = "ScenarioTest.registerConfig(ScenarioTest.defineConfig({baseUrl:'http://localhost:9',scenarios:[]}));\n";
        fs.writeFileSync(path.join(publicDir, "scenario.config.js"), configText, "utf8");
        const frameworkDir = seedLegacyRuntime(publicDir);

        // 未 --clean：WARN 提示但不删除
        const first = runInit(project, "--no-input");
        assert.equal(first.status, 0, first.stderr);
        assert.match(first.stderr + first.stdout, /旧版项目内运行时副本/);
        assert.equal(fs.existsSync(path.join(frameworkDir, "scenario-test-cli.cjs")), true, "未 --clean 时旧副本仍在");

        // --clean：清掉 .scenario-test 与 index.html，保留 config/scenarios
        const second = runInit(project, "--no-input", "--clean");
        assert.equal(second.status, 0, second.stderr);
        assert.equal(fs.existsSync(frameworkDir), false, ".scenario-test 应被清空并删除目录本体");
        assert.equal(fs.existsSync(path.join(publicDir, "index.html")), false, "旧 index.html 应被删除");
        assert.equal(fs.readFileSync(path.join(publicDir, "scenario.config.js"), "utf8"), configText, "配置不得被 --clean 触碰");
    } finally {
        fs.rmSync(project, { recursive: true, force: true });
    }
});

test("init --e2e 初始化浏览器 E2E 目录，reporter 由 env 注入不落 .scenario-test", () => {
    const project = fs.mkdtempSync(path.join(os.tmpdir(), "scenario-test-init-e2e-"));
    try {
        const result = runInit(project, "--e2e", "--no-input");
        assert.equal(result.status, 0, result.stderr);
        const publicDir = path.join(project, "scenario-test");
        const e2eDir = path.join(publicDir, "e2e");
        for (const name of ["package.json", "playwright.config.js", "auth-adapter.js", ".gitignore", "README.md"]) {
            assert.equal(fs.existsSync(path.join(e2eDir, name)), true, `${name} 应生成`);
        }
        const pwConfig = fs.readFileSync(path.join(e2eDir, "playwright.config.js"), "utf8");
        assert.match(pwConfig, /SCENARIO_TEST_E2E_REPORTER/, "reporter 应由环境变量注入而非相对路径副本");
        assert.doesNotMatch(pwConfig, /\.scenario-test/, "playwright.config 不得引用项目内副本");
        const pkg = JSON.parse(fs.readFileSync(path.join(e2eDir, "package.json"), "utf8"));
        assert.equal(pkg.scenarioTestE2e, true);
        assert.equal(fs.existsSync(path.join(publicDir, ".scenario-test")), false, "e2e 初始化同样不落运行时副本");
    } finally {
        fs.rmSync(project, { recursive: true, force: true });
    }
});

test("init 拒绝 --dir 越界与未知参数", () => {
    const project = fs.mkdtempSync(path.join(os.tmpdir(), "scenario-test-init-guard-"));
    try {
        assert.notEqual(runInit(project, "--dir", "../outside").status, 0);
        assert.notEqual(runInit(project, "--library-url", "http://example.com/").status, 0, "--library-url 已随运行时去项目化移除");
    } finally {
        fs.rmSync(project, { recursive: true, force: true });
    }
});
