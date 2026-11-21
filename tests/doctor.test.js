import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { CONTRACT_VERSION } from "../src/index.js";
import { buildE2eCommandHints, satisfiesNodeEngine } from "../src/doctor.js";
import { VERSION } from "../src/version.generated.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const cli = path.join(root, "src/cli.js");

// 子进程环境剥离 *_proxy 变量：宿主设了 HTTP_PROXY/HTTPS_PROXY 等时，Node 的 undici
// EnvHttpProxyAgent 会向 stderr 打实验警告（UNDICI-EHPA），污染「stderr 应为空」类断言
function childEnv() {
    const env = { ...process.env };
    for (const key of Object.keys(env)) {
        if (/_proxy$/i.test(key)) delete env[key];
    }
    return env;
}

function initProject(prefix = "scenario-test-doctor-") {
    const project = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
    const result = spawnSync(process.execPath, [cli, "init", "--project", project, "--dir", "scenario-test"], { encoding: "utf8", env: childEnv() });
    assert.equal(result.status, 0, result.stderr);
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
        steps: [{ name: "healthy", path: "health", status: 200 }]
    }));`, "utf8");
    fs.writeFileSync(path.join(dir, "scenarios/seed.js"), `ScenarioTest.registerScenario("seed", ScenarioTest.defineScenario({
        name: "Seed",
        steps: [{ name: "seed-data", path: "seed", status: 201 }]
    }));`, "utf8");
    return { project, dir };
}

// 托管 E2E（marker: e2e/package.json 的 scenarioTestE2e === true），
// 与 src/e2e/extension.js 的 isE2eProject 判定保持同一事实源。
function initE2eProject(prefix) {
    const { project, dir } = initProject(prefix);
    const e2eDir = path.join(dir, "e2e");
    fs.mkdirSync(e2eDir, { recursive: true });
    fs.writeFileSync(path.join(e2eDir, "package.json"), JSON.stringify({
        private: true,
        type: "module",
        scenarioTestE2e: true,
        scripts: { test: "playwright test" },
        devDependencies: { "@playwright/test": "1.55.1" }
    }, null, 2) + "\n", "utf8");
    fs.writeFileSync(path.join(e2eDir, "playwright.config.js"), "export default {};\n", "utf8");
    fs.writeFileSync(path.join(e2eDir, "auth-adapter.js"), "export async function login() {}\n", "utf8");
    return { project, dir, e2eDir };
}

function hasCommand(name) {
    return spawnSync(name, ["--version"], { stdio: "ignore" }).status === 0;
}

// 跨平台路径比较：去掉尾部分隔符；Windows 盘符/大小写不敏感，POSIX 保持原样。
function normalizeFsPath(value) {
    const trimmed = String(value).replace(/[\\/]+$/, "");
    return process.platform === "win32" ? trimmed.toLowerCase() : trimmed;
}

// 规范化到 OS 真实路径：Windows 用 native 变体把 8.3 短路径展开成长路径；
// POSIX 展开符号链接；路径不存在时退回原字符串。
function canonicalFsPath(value) {
    try {
        return normalizeFsPath(fs.realpathSync.native(value));
    } catch {
        return normalizeFsPath(value);
    }
}

function runDoctor(dir, extra = []) {
    return spawnSync(process.execPath, [cli, "doctor", "--config", path.join(dir, "scenario.config.js"), ...extra], { encoding: "utf8", env: childEnv() });
}

function cleanup(project) {
    fs.rmSync(project, { recursive: true, force: true });
}

test("satisfiesNodeEngine：缺省段按 0 参与比较（v18.x 对 >=18 不误判 FAIL）", () => {
    // 缺省 minor/patch 曾被 map(Number) 解析成 NaN——NaN 参与比较恒 false，
    // ">=18" 在全部 v18.x（engines 声明的支持下限）上误判 FAIL，
    // 仅主版本高于下限时因短路偶然正确
    assert.equal(satisfiesNodeEngine("v18.0.0", ">=18"), true);
    assert.equal(satisfiesNodeEngine("v18.19.0", ">=18"), true);
    assert.equal(satisfiesNodeEngine("v20.0.0", ">=18"), true);
    assert.equal(satisfiesNodeEngine("v17.9.9", ">=18"), false);
    // 边界等值：v18.17.0 恰好满足 >=18.17
    assert.equal(satisfiesNodeEngine("v18.17.0", ">=18.17"), true);
    assert.equal(satisfiesNodeEngine("v18.16.9", ">=18.17"), false);
    assert.equal(satisfiesNodeEngine("v18.17.1", ">=18.17.1"), true);
    assert.equal(satisfiesNodeEngine("v18.17.0", ">=18.17.1"), false);
    // current 侧同口径：运行版本缺省段同样按 0 参与比较（旧实现下同样得到 NaN）
    assert.equal(satisfiesNodeEngine("v18", ">=18"), true);
    assert.equal(satisfiesNodeEngine("v18.19", ">=18"), true);
    assert.equal(satisfiesNodeEngine("v20", ">=18"), true);
    assert.equal(satisfiesNodeEngine("v18.17", ">=18.17"), true);
    assert.equal(satisfiesNodeEngine("v18.17", ">=18.17.1"), false);
    // 下限 minor 高于当前 minor 时必须判不满足（NaN 曾让该分支恒 false，行为正确但需锁死）
    assert.equal(satisfiesNodeEngine("v18", ">=18.17"), false);
    assert.equal(satisfiesNodeEngine("v18.0.0", ">=18.17"), false);
    assert.equal(satisfiesNodeEngine("v18.19.0", ">=18.17"), true);
    // 预发布后缀不影响数字段提取
    assert.equal(satisfiesNodeEngine("v18.0.0-rc.1", ">=18"), true);
    // 非法输入不误放
    assert.equal(satisfiesNodeEngine("not-a-version", ">=18"), false);
    assert.equal(satisfiesNodeEngine("v18.0.0", "not-a-range"), false);
});

test("doctor：健康项目全 PASS + manual INFO，退出码 0", () => {
    const { project, dir } = initProject();
    try {
        const result = runDoctor(dir);
        assert.equal(result.status, 0, result.stdout + result.stderr);
        assert.match(result.stdout, /\[PASS\] node-version/);
        assert.match(result.stdout, /\[PASS\] config-load/);
        assert.match(result.stdout, /\[PASS\] scenario-register/);
        assert.match(result.stdout, /\[PASS\] cli/);
        assert.match(result.stdout, /\[PASS\] legacy-runtime/);
        assert.match(result.stdout, /项目使用安装方运行时/);
        assert.match(result.stdout, /\[INFO\] manual-scenario/);
        assert.match(result.stdout, /seed/);
        assert.doesNotMatch(result.stdout, /\[FAIL\]/);
        assert.match(result.stdout, /结果: OK（退出码 0）/);
    } finally {
        cleanup(project);
    }
});

test("doctor：检测到旧版项目内运行时副本 WARN 并提示 init --clean", () => {
    const { project, dir } = initProject();
    try {
        // 模拟旧版 init 落盘的运行时副本
        const frameworkDir = path.join(dir, ".scenario-test");
        fs.mkdirSync(frameworkDir, { recursive: true });
        fs.writeFileSync(path.join(frameworkDir, "scenario-test-cli.cjs"), "legacy", "utf8");
        fs.writeFileSync(path.join(dir, "index.html"), "<html>legacy</html>", "utf8");
        const result = runDoctor(dir);
        assert.equal(result.status, 0, result.stdout + result.stderr);
        assert.match(result.stdout, /\[WARN\] legacy-runtime/);
        assert.match(result.stdout, /旧版项目内运行时副本/);
        assert.match(result.stdout, /init --clean/);
    } finally {
        cleanup(project);
    }
});

test("doctor：平铺旧文件不影响判定，legacy 只看 .scenario-test/ 与 index.html", () => {
    const { project, dir } = initProject();
    try {
        // 更早期平铺遗留（不在 LEGACY_FRAMEWORK_FILES 清单）不应误报
        fs.writeFileSync(path.join(dir, "scenario-test.umd.js"), "legacy", "utf8");
        const result = runDoctor(dir);
        assert.equal(result.status, 0, result.stdout + result.stderr);
        assert.match(result.stdout, /\[PASS\] legacy-runtime/);
    } finally {
        cleanup(project);
    }
});

test("doctor：未知操作符场景 FAIL，且不中断其余检查（汇总）", () => {
    const { project, dir } = initProject();
    try {
        fs.writeFileSync(path.join(dir, "scenarios/health.js"), `ScenarioTest.registerScenario("health", ScenarioTest.defineScenario({
            name: "Health",
            steps: [{ name: "healthy", path: "health", status: 200, assertions: [{ path: "code", bogusOp: 1 }] }]
        }));`, "utf8");
        const result = runDoctor(dir);
        assert.equal(result.status, 1);
        assert.match(result.stdout, /\[PASS\] config-load/);
        assert.match(result.stdout, /\[FAIL\] scenario-register/);
        assert.match(result.stdout, /未知键 "bogusOp"/);
        assert.match(result.stdout, /如何修/);
        // manual 场景仍给出 INFO
        assert.match(result.stdout, /\[INFO\] manual-scenario/);
        assert.match(result.stdout, /结果: FAILED（退出码 1）/);
    } finally {
        cleanup(project);
    }
});

test("doctor：非法 retryUntil 退避参数由 scenario-register FAIL 暴露", () => {
    const { project, dir } = initProject();
    try {
        fs.writeFileSync(path.join(dir, "scenarios/health.js"), `ScenarioTest.registerScenario("health", ScenarioTest.defineScenario({
            name: "Health",
            steps: [{ name: "poll", path: "health", retryUntil: { maxAttempts: 2, intervalMs: 100, intervalFactor: 0.5 }, assertions: [{ path: "ok", equals: true }] }]
        }));`, "utf8");
        const result = runDoctor(dir);
        assert.equal(result.status, 1);
        assert.match(result.stdout, /\[FAIL\] scenario-register/);
        assert.match(result.stdout, /intervalFactor 必须是 ≥1 的有限数字/);
    } finally {
        cleanup(project);
    }
});

test("doctor：多文件错误汇总（文件缺失 + 未知操作符同时报告）", () => {
    const { project, dir } = initProject();
    try {
        fs.rmSync(path.join(dir, "scenarios/seed.js"));
        fs.writeFileSync(path.join(dir, "scenarios/health.js"), `ScenarioTest.registerScenario("health", ScenarioTest.defineScenario({
            name: "Health",
            steps: [{ name: "healthy", path: "health", status: 200, assertions: [{ path: "code", nope: 1 }] }]
        }));`, "utf8");
        const result = runDoctor(dir);
        assert.equal(result.status, 1);
        assert.match(result.stdout, /\[FAIL\] scenario-list/);
        assert.match(result.stdout, /场景文件不存在/);
        assert.match(result.stdout, /\[FAIL\] scenario-register/);
        assert.match(result.stdout, /未知键 "nope"/);
        // 汇总摘要显示 2 个 FAIL
        assert.match(result.stdout, /摘要: .*2 FAIL/);
    } finally {
        cleanup(project);
    }
});

test("doctor --json：配置文件缺失时输出结构化 JSON 且退出码 1，其余检查继续执行", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "scenario-test-doctor-missing-"));
    try {
        const missingConfig = path.join(dir, "missing.config.js");
        const result = spawnSync(process.execPath, [cli, "doctor", "--config", missingConfig, "--json"], { encoding: "utf8", env: childEnv() });
        assert.equal(result.status, 1);
        assert.equal(result.stderr, "", "配置缺失时 stderr 不应输出异常堆栈");
        const parsed = JSON.parse(result.stdout);
        assert.equal(parsed.status, "FAILED");
        assert.equal(parsed.tool, "scenario-test doctor");
        const configCheck = parsed.checks.find((check) => check.name === "config");
        assert.ok(configCheck, "配置缺失时应输出 name: config 的检查项");
        assert.equal(configCheck.status, "FAIL");
        assert.match(configCheck.message, /配置文件不存在/);
        assert.equal(parsed.exitCode, 1);
        // 其他检查（版本/文件握手）仍继续执行
        assert.ok(parsed.checks.some((check) => check.name === "cli" && check.status === "PASS"));
        assert.ok(parsed.checks.some((check) => check.name === "node-version"));
    } finally {
        fs.rmSync(dir, { recursive: true, force: true });
    }
});

test("doctor：配置文件缺失时文本模式输出可读提示，退出码 1，其余检查继续", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "scenario-test-doctor-missing-text-"));
    try {
        const result = spawnSync(process.execPath, [cli, "doctor", "--config", path.join(dir, "missing.config.js")], { encoding: "utf8", env: childEnv() });
        assert.equal(result.status, 1);
        assert.equal(result.stderr, "", "配置缺失时 stderr 不应输出异常堆栈");
        assert.match(result.stdout, /\[FAIL\] config:/);
        assert.match(result.stdout, /配置文件不存在/);
        assert.match(result.stdout, /\[PASS\] cli/);
        assert.match(result.stdout, /结果: FAILED（退出码 1）/);
    } finally {
        fs.rmSync(dir, { recursive: true, force: true });
    }
});

test("doctor：绝对场景路径不 FAIL 仅 WARN，与 run 语义一致", () => {
    const { project, dir } = initProject();
    try {
        const scenarioPath = path.join(dir, "scenarios", "health.js");
        fs.writeFileSync(path.join(dir, "scenario.config.js"), `ScenarioTest.registerConfig(ScenarioTest.defineConfig({
            envs: [{ key: "local", name: "本地", baseUrl: "http://127.0.0.1:1" }],
            defaultEnvKey: "local",
            scenarios: [{ id: "health", name: "Health", url: ${JSON.stringify(scenarioPath)} }]
        }));`, "utf8");
        const result = runDoctor(dir);
        assert.equal(result.status, 0, result.stdout + result.stderr);
        assert.match(result.stdout, /\[WARN\] absolute-scenario-path/);
        assert.match(result.stdout, /建议使用配置目录内相对路径/);
        assert.match(result.stdout, /\[PASS\] scenario-register/);
        assert.doesNotMatch(result.stdout, /\[FAIL\]/);
    } finally {
        cleanup(project);
    }
});

test("doctor --json：stdout 纯净可解析，含 checks/exitCode 与 manual info", () => {
    const { project, dir } = initProject();
    try {
        const result = runDoctor(dir, ["--json"]);
        assert.equal(result.status, 0, result.stdout + result.stderr);
        const parsed = JSON.parse(result.stdout);
        assert.equal(parsed.tool, "scenario-test doctor");
        assert.equal(parsed.runtimeVersion, VERSION);
        assert.equal(parsed.contractVersion, CONTRACT_VERSION);
        assert.ok(Array.isArray(parsed.checks));
        assert.ok(parsed.checks.some((check) => check.name === "node-version" && check.status === "PASS"));
        assert.equal(parsed.exitCode, 0);
        assert.equal(parsed.summary.failed, 0);
        assert.ok(parsed.info.some((item) => item.name === "manual-scenario"));
    } finally {
        cleanup(project);
    }
});
test("doctor：配置文件语法错误时 config-load FAIL 且其余检查继续", () => {
    const { project, dir } = initProject();
    try {
        fs.writeFileSync(path.join(dir, "scenario.config.js"), "this is not valid js {{{", "utf8");
        const result = runDoctor(dir);
        assert.equal(result.status, 1);
        assert.match(result.stdout, /\[FAIL\] config-load/);
        assert.match(result.stdout, /配置文件加载失败/);
        // node-version 等无关检查仍执行
        assert.match(result.stdout, /\[PASS\] node-version/);
    } finally {
        cleanup(project);
    }
});

test("doctor：场景 url 越界时 scenario-list FAIL（缺 id/url 在 defineConfig 加载期即被拒）", () => {
    const { project, dir } = initProject();
    try {
        fs.writeFileSync(path.join(dir, "scenario.config.js"), `ScenarioTest.registerConfig(ScenarioTest.defineConfig({
            envs: [{ key: "local", name: "本地", baseUrl: "http://127.0.0.1:1" }],
            defaultEnvKey: "local",
            scenarios: [
                { id: "health", name: "Health", url: "scenarios/health.js" },
                { id: "escape", name: "越界", url: "../outside/escape.js" }
            ]
        }));`, "utf8");
        const result = runDoctor(dir);
        assert.equal(result.status, 1);
        assert.match(result.stdout, /\[FAIL\] scenario-list/);
        assert.match(result.stdout, /url 不安全/);
    } finally {
        cleanup(project);
    }
});

test("doctor：配置顶层拼写错误在 config-load/config-keys FAIL，并指出正确字段名", () => {
    const { project, dir } = initProject();
    try {
        fs.writeFileSync(path.join(dir, "scenario.config.js"), `ScenarioTest.registerConfig(ScenarioTest.defineConfig({
            requestTimeoutsMs: 1000,
            envs: [{ key: "local", name: "本地", baseUrl: "http://127.0.0.1:1" }],
            scenarios: [{ id: "health", name: "Health", url: "scenarios/health.js" }]
        }));`, "utf8");
        const result = runDoctor(dir);
        assert.equal(result.status, 1);
        assert.match(result.stdout, /\[FAIL\] config-load/);
        assert.match(result.stdout, /未知键 "requestTimeoutsMs".*requestTimeoutMs/);
        assert.match(result.stdout, /\[FAIL\] config-keys/);
    } finally {
        cleanup(project);
    }
});

test("doctor：非法 baseUrl 在 config-load/base-url FAIL", () => {
    const { project, dir } = initProject();
    try {
        fs.writeFileSync(path.join(dir, "scenario.config.js"), `ScenarioTest.registerConfig(ScenarioTest.defineConfig({
            envs: [{ key: "local", name: "本地", baseUrl: "localhost:8080" }],
            scenarios: [{ id: "health", name: "Health", url: "scenarios/health.js" }]
        }));`, "utf8");
        const result = runDoctor(dir);
        assert.equal(result.status, 1);
        assert.match(result.stdout, /\[FAIL\] config-load/);
        assert.match(result.stdout, /baseUrl 必须以 http:\/\/ 或 https:\/\//);
        assert.match(result.stdout, /\[FAIL\] base-url/);
    } finally {
        cleanup(project);
    }
});

test("doctor：http(s) 前缀但 URL 主机/端口非法时仍 config-load/base-url FAIL", () => {
    const { project, dir } = initProject();
    try {
        const cases = [
            { label: "顶层 http://", config: `baseUrl: "http://", envs: [{ key: "local", name: "本地" }]` },
            { label: "环境非法端口", config: `envs: [{ key: "local", name: "本地", baseUrl: "http://127.0.0.1:99999" }]` }
        ];
        for (const item of cases) {
            fs.writeFileSync(path.join(dir, "scenario.config.js"), `ScenarioTest.registerConfig(ScenarioTest.defineConfig({
                ${item.config},
                scenarios: [{ id: "health", name: "Health", url: "scenarios/health.js" }]
            }));`, "utf8");
            const result = runDoctor(dir, ["--json"]);
            assert.equal(result.status, 1, `${item.label}: ${result.stdout}${result.stderr}`);
            const report = JSON.parse(result.stdout);
            const load = report.checks.find((check) => check.name === "config-load");
            assert.ok(load, `${item.label} 应输出 config-load`);
            assert.equal(load.status, "FAIL", `${item.label} 配置不得被判定为可加载`);
            assert.match(load.message, /baseUrl/, `${item.label} config-load 应指出 baseUrl`);
            const baseUrlCheck = report.checks.find((check) => check.name === "base-url");
            assert.ok(baseUrlCheck, `${item.label} 应输出 base-url 专项检查`);
            assert.equal(baseUrlCheck.status, "FAIL", `${item.label} 应输出 base-url FAIL`);
        }
    } finally {
        cleanup(project);
    }
});

test("doctor：环境缺少 baseUrl 且无顶层回退时 base-url WARN；顶层回退时 PASS", () => {
    const { project, dir } = initProject();
    try {
        fs.writeFileSync(path.join(dir, "scenario.config.js"), `ScenarioTest.registerConfig(ScenarioTest.defineConfig({
            envs: [{ key: "local", name: "本地" }],
            scenarios: [{ id: "health", name: "Health", url: "scenarios/health.js" }]
        }));`, "utf8");
        const missing = runDoctor(dir);
        assert.equal(missing.status, 0, missing.stdout + missing.stderr);
        assert.match(missing.stdout, /\[WARN\] base-url/);
        assert.match(missing.stdout, /CLI run 需要 --base-url/);

        fs.writeFileSync(path.join(dir, "scenario.config.js"), `ScenarioTest.registerConfig(ScenarioTest.defineConfig({
            baseUrl: "http://127.0.0.1:1",
            envs: [{ key: "local", name: "本地" }],
            scenarios: [{ id: "health", name: "Health", url: "scenarios/health.js" }]
        }));`, "utf8");
        const fallback = runDoctor(dir);
        assert.equal(fallback.status, 0, fallback.stdout + fallback.stderr);
        assert.match(fallback.stdout, /\[PASS\] base-url/);
        assert.match(fallback.stdout, /回退顶层 baseUrl/);

        fs.writeFileSync(path.join(dir, "scenario.config.js"), `ScenarioTest.registerConfig(ScenarioTest.defineConfig({
            baseUrl: "   ",
            envs: [{ key: "local", name: "本地" }],
            scenarios: [{ id: "health", name: "Health", url: "scenarios/health.js" }]
        }));`, "utf8");
        const blankTopLevel = runDoctor(dir);
        assert.equal(blankTopLevel.status, 0, blankTopLevel.stdout + blankTopLevel.stderr);
        assert.match(blankTopLevel.stdout, /\[WARN\] base-url/);
        assert.match(blankTopLevel.stdout, /CLI run 需要 --base-url/);
    } finally {
        cleanup(project);
    }
});

test("doctor：配置脚本自身错误含未知键/baseUrl 字样时不误报专项校验失败", () => {
    const { project, dir } = initProject();
    try {
        fs.writeFileSync(path.join(dir, "scenario.config.js"), `throw new Error("配置脚本自身错误: baseUrl 拼装失败");`, "utf8");
        const baseUrlLike = runDoctor(dir, ["--json"]);
        const baseUrlReport = JSON.parse(baseUrlLike.stdout);
        assert.ok(baseUrlReport.checks.some((check) => check.name === "config-load" && check.status === "FAIL"));
        assert.equal(baseUrlReport.checks.some((check) => check.name === "base-url"), false, "非 defineConfig 的 baseUrl 字样错误不得追加 base-url FAIL");

        fs.writeFileSync(path.join(dir, "scenario.config.js"), `throw new Error("配置脚本自身错误: 未知键示例");`, "utf8");
        const unknownLike = runDoctor(dir, ["--json"]);
        const unknownReport = JSON.parse(unknownLike.stdout);
        assert.ok(unknownReport.checks.some((check) => check.name === "config-load" && check.status === "FAIL"));
        assert.equal(unknownReport.checks.some((check) => check.name === "config-keys"), false, "非 defineConfig 的未知键字样错误不得追加 config-keys FAIL");
    } finally {
        cleanup(project);
    }
});

// ===== YIL-203：托管 E2E 的 doctor 可复制接入命令 =====

test("buildE2eCommandHints：空格/中文/单引号按各 shell 规则引用，示例地址与可选 channel 明确", () => {
    const hints = buildE2eCommandHints({
        e2eDir: "/tmp/项目 目录/it's [demo]/e2e",
        configPath: "/tmp/项目 目录/it's/scenario.config.js",
        cliPath: "/opt/runtime/it's/scenario-test-cli.cjs"
    });
    // POSIX：单引号包裹，内部单引号以 '\'' 断开重引
    assert.equal(hints.posix[0], `cd '/tmp/项目 目录/it'\\''s [demo]/e2e'`);
    assert.equal(hints.posix[4], `node '/opt/runtime/it'\\''s/scenario-test-cli.cjs' serve --config '/tmp/项目 目录/it'\\''s/scenario.config.js' --open`);
    // PowerShell：字面路径语义（[] 不被当通配符），内部单引号加倍
    assert.equal(hints.powershell[0], `Set-Location -LiteralPath '/tmp/项目 目录/it''s [demo]/e2e'`);
    // 未知业务地址只作明确示例，不冒充探测结果
    assert.match(hints.posix[3], /your-business\.example\.com/);
    assert.match(hints.posix[3], /必须替换为真实业务地址/);
    assert.match(hints.powershell[3], /必须替换为真实业务地址/);
    // channel 只作为可选项出现，不在必填命令里
    assert.match(hints.posix[5], /可选/);
    assert.match(hints.powershell[5], /可选/);
    assert.doesNotMatch(hints.posix[3], /BROWSER_CHANNEL/);
    assert.doesNotMatch(hints.powershell[3], /BROWSER_CHANNEL/);
});

test("doctor：托管 E2E 文本给出 PowerShell / POSIX 可复制接入命令", () => {
    const { project, dir, e2eDir } = initE2eProject();
    try {
        const result = runDoctor(dir);
        assert.equal(result.status, 0, result.stdout + result.stderr);
        assert.match(result.stdout, /E2E 托管接入命令/);
        assert.match(result.stdout, /PowerShell：/);
        assert.match(result.stdout, /POSIX：/);
        // 安装依赖、安装 Chromium、设置业务地址、启动现有工作台
        assert.match(result.stdout, /npm install/);
        assert.match(result.stdout, /npx playwright install chromium/);
        assert.match(result.stdout, /E2E_BASE_URL/);
        assert.match(result.stdout, /serve --config .* --open/);
        // 未知地址明确为需替换的示例，不使用模板默认 3000 端口冒充用户服务
        assert.match(result.stdout, /your-business\.example\.com/);
        assert.match(result.stdout, /示例地址，必须替换为真实业务地址/);
        assert.doesNotMatch(result.stdout, /127\.0\.0\.1:3000/);
        // 可选 channel 只提示，不成为必填
        assert.match(result.stdout, /可选：\$env:E2E_BROWSER_CHANNEL/);
        assert.match(result.stdout, /可选：export E2E_BROWSER_CHANNEL/);
        // doctor 自身不安装：不产生 e2e/node_modules
        assert.equal(fs.existsSync(path.join(e2eDir, "node_modules")), false);
        // 既有 E2E 诊断与退出码不变
        assert.match(result.stdout, /\[PASS\] e2e-package\.json/);
        assert.match(result.stdout, /\[WARN\] e2e-dependencies/);
        assert.match(result.stdout, /结果: OK（退出码 0）/);
    } finally {
        cleanup(project);
    }
});

test("doctor --json：托管 E2E 仍为纯 JSON，字段结构与退出码不变", () => {
    const { project, dir } = initE2eProject();
    try {
        const result = runDoctor(dir, ["--json"]);
        assert.equal(result.status, 0, result.stdout + result.stderr);
        const parsed = JSON.parse(result.stdout);
        assert.deepEqual(Object.keys(parsed).sort(), ["checks", "contractVersion", "exitCode", "info", "runtimeVersion", "status", "summary", "tool"]);
        assert.doesNotMatch(result.stdout, /E2E 托管接入命令/);
        assert.doesNotMatch(result.stdout, /PowerShell/);
        assert.ok(parsed.checks.some((check) => check.name === "e2e-package.json"));
        assert.ok(parsed.info.some((item) => item.name === "e2e-browser"));
        assert.equal(parsed.exitCode, 0);
    } finally {
        cleanup(project);
    }
});

test("doctor：非托管 E2E（有 e2e/ 无 marker）不出现接管命令", () => {
    const { project, dir } = initProject();
    try {
        const e2eDir = path.join(dir, "e2e");
        fs.mkdirSync(e2eDir, { recursive: true });
        fs.writeFileSync(path.join(e2eDir, "package.json"), JSON.stringify({ private: true }) + "\n", "utf8");
        const result = runDoctor(dir);
        assert.equal(result.status, 0, result.stdout + result.stderr);
        assert.match(result.stdout, /\[INFO\] e2e-external/);
        assert.doesNotMatch(result.stdout, /E2E 托管接入命令/);
        assert.doesNotMatch(result.stdout, /npx playwright install chromium/);
    } finally {
        cleanup(project);
    }
});

test("doctor：无 E2E 项目不出现接管命令", () => {
    const { project, dir } = initProject();
    try {
        const result = runDoctor(dir);
        assert.equal(result.status, 0, result.stdout + result.stderr);
        assert.doesNotMatch(result.stdout, /E2E 托管接入命令/);
        assert.doesNotMatch(result.stdout, /E2E_BASE_URL/);
    } finally {
        cleanup(project);
    }
});

test("doctor：项目路径含空格与中文时命令按 shell 引用，含单引号也可重引", () => {
    const { project, dir, e2eDir } = initE2eProject("doctor 项目 中文-");
    try {
        assert.match(path.basename(project), / /);
        const result = runDoctor(dir);
        assert.equal(result.status, 0, result.stdout + result.stderr);
        const psQuoted = `Set-Location -LiteralPath '${e2eDir.replace(/'/g, "''")}'`;
        const posixQuoted = `cd '${e2eDir.replace(/'/g, `'\\''`)}'`;
        assert.ok(result.stdout.includes(psQuoted), "PowerShell 段应以 -LiteralPath 引用含空格/中文的路径");
        assert.ok(result.stdout.includes(posixQuoted), "POSIX 段应单引号包裹含空格/中文的路径");
        const configQuoted = `'${path.join(dir, "scenario.config.js")}'`;
        assert.ok(result.stdout.includes(`serve --config ${configQuoted}`), "启动工作台应引用真实配置文件路径");
    } finally {
        cleanup(project);
    }
});

test("doctor：PowerShell 接入命令经受控替身执行，路径参数不拆词", { skip: !hasCommand("pwsh") && "缺少 pwsh" }, () => {
    // 路径同时包含空格、中文、单引号和方括号：PowerShell 的 cd/-Path 会把 [] 当通配符
    const { project, dir, e2eDir } = initE2eProject("doctor [demo] 中文's ps-");
    try {
        const result = runDoctor(dir);
        assert.equal(result.status, 0, result.stdout + result.stderr);
        const lines = result.stdout.split(/\r?\n/);
        const start = lines.indexOf("PowerShell：");
        assert.ok(start >= 0, "应输出 PowerShell 段");
        const psLines = [];
        for (let index = start + 1; index < lines.length; index += 1) {
            const line = lines[index];
            if (!line.startsWith("  ")) break;
            psLines.push(line.slice(2));
        }
        assert.equal(psLines[0], `Set-Location -LiteralPath '${e2eDir.replace(/'/g, "''")}'`, "目录切换必须使用 -LiteralPath 字面语义");
        // 受控替身：只记录参数，不安装依赖、不启动服务、不打开浏览器
        const script = [
            "$script:stubLog = New-Object System.Collections.ArrayList",
            'function npm { for ($i = 0; $i -lt $args.Count; $i++) { [void]$script:stubLog.Add("npm[$i]=$($args[$i])") } }',
            'function npx { for ($i = 0; $i -lt $args.Count; $i++) { [void]$script:stubLog.Add("npx[$i]=$($args[$i])") } }',
            'function node { for ($i = 0; $i -lt $args.Count; $i++) { [void]$script:stubLog.Add("node[$i]=$($args[$i])") } }',
            ...psLines,
            '$script:stubLog -join "`n"',
            '"PWD=$PWD"',
            '"BASE=$env:E2E_BASE_URL"'
        ].join("\n");
        const run = spawnSync("pwsh", ["-NoProfile", "-Command", "-"], { input: script, encoding: "utf8", env: childEnv() });
        assert.equal(run.status, 0, run.stdout + run.stderr);
        // 逐条精确比对，证明没有额外执行；只断言进程状态不足以证明目录切换
        const logLines = run.stdout.split(/\r?\n/).filter((line) => /^(npm|npx|node)\[\d+\]=/.test(line));
        assert.deepEqual(logLines, [
            "npm[0]=install",
            "npx[0]=playwright",
            "npx[1]=install",
            "npx[2]=chromium",
            `node[0]=${cli}`,
            "node[1]=serve",
            "node[2]=--config",
            `node[3]=${path.join(dir, "scenario.config.js")}`,
            "node[4]=--open"
        ]);
        // 跨平台路径事实：pwsh 可能把 8.3 短路径规范成长路径，POSIX 也可能经符号链接
        const pwdLine = run.stdout.split(/\r?\n/).find((line) => line.startsWith("PWD="));
        assert.ok(pwdLine, "应输出实际 PWD");
        assert.equal(canonicalFsPath(pwdLine.slice(4)), canonicalFsPath(e2eDir), "PWD 应指向真实目标目录");
        assert.match(run.stdout, /BASE=https:\/\/your-business\.example\.com/);
    } finally {
        cleanup(project);
    }
});

// POSIX 替身用 POSIX 风格路径：Windows 宿主上的 bash 是 WSL，无法直接 cd Windows 盘符路径；
// 因此用 buildE2eCommandHints 生成同样规则的单引号命令，在 /tmp 下真实执行。
test("doctor：POSIX 接入命令经受控替身执行，路径参数不拆词", { skip: !hasCommand("bash") && "缺少 bash" }, () => {
    // 每次测试独占唯一临时根，避免并行互相干扰；只清理该根。
    const rootResult = spawnSync("bash", ["-c", "mktemp -d /tmp/scenario-test-e2e-XXXXXX"], { encoding: "utf8", env: childEnv() });
    assert.equal(rootResult.status, 0, rootResult.stderr);
    const root = rootResult.stdout.trim();
    try {
        assert.match(root, /^\/tmp\/scenario-test-e2e-[A-Za-z0-9]+$/);
        // 根下继续覆盖中文、空格、单引号、方括号
        const workDir = `${root}/中文 目录/it's [demo]`;
        const e2eDir = `${workDir}/e2e`;
        const configPath = `${workDir}/scenario.config.js`;
        const cliPath = `${root}/runtime/it's scenario-test-cli.cjs`;
        const posixQuote = (value) => `'${String(value).replace(/'/g, `'\\''`)}'`;
        const mkdir = spawnSync("bash", ["-c", `mkdir -p -- ${posixQuote(e2eDir)}`], { encoding: "utf8", env: childEnv() });
        assert.equal(mkdir.status, 0, mkdir.stderr);
        const hints = buildE2eCommandHints({ e2eDir, configPath, cliPath });
        const script = [
            "set -e",
            `root='${root}'`,
            `trap 'rm -rf -- "$root"' EXIT INT TERM`,
            'stubBin=$(mktemp -d "$root/stubs-XXXXXX")',
            'logFile="$stubBin/stub.log"',
            'cat > "$stubBin/stub" <<\'STUB\'',
            "#!/bin/sh",
            'name=$(basename "$0")',
            "i=0",
            'for a in "$@"; do echo "$name[$i]=$a" >> "$STUB_LOG"; i=$((i+1)); done',
            "STUB",
            'chmod +x "$stubBin/stub"',
            'ln -s stub "$stubBin/npm"',
            'ln -s stub "$stubBin/npx"',
            'ln -s stub "$stubBin/node"',
            'export STUB_LOG="$logFile"',
            'export PATH="$stubBin:$PATH"',
            ...hints.posix,
            'echo "PWD=$PWD"',
            'echo "BASE=$E2E_BASE_URL"',
            'cat "$logFile"'
        ].join("\n");
        const encoded = Buffer.from(script, "utf8").toString("base64");
        const run = spawnSync("bash", ["-c", `echo ${encoded} | base64 -d | bash -s`], { encoding: "utf8", env: childEnv() });
        assert.equal(run.status, 0, run.stdout + run.stderr);
        const logLines = run.stdout.split(/\r?\n/).filter((line) => /^(npm|npx|node)\[\d+\]=/.test(line));
        assert.deepEqual(logLines, [
            "npm[0]=install",
            "npx[0]=playwright",
            "npx[1]=install",
            "npx[2]=chromium",
            `node[0]=${cliPath}`,
            "node[1]=serve",
            "node[2]=--config",
            `node[3]=${configPath}`,
            "node[4]=--open"
        ]);
        assert.ok(run.stdout.includes(`PWD=${e2eDir}`), "应实际进入含中文/空格/单引号/方括号的 e2e 目录");
        assert.match(run.stdout, /BASE=https:\/\/your-business\.example\.com/);
    } finally {
        // 只删除本次 mktemp 独占根；异常路径同样清理
        const quotedRoot = `'${root.replace(/'/g, `'\\''`)}'`;
        spawnSync("bash", ["-c", `if [ -d ${quotedRoot} ]; then rm -rf -- ${quotedRoot}; fi`], { env: childEnv() });
    }
});

test("doctor：托管 E2E 缺失 playwright 配置仍 FAIL 退出码 1，接入提示不影响既有判定", () => {
    const { project, dir } = initE2eProject();
    try {
        fs.rmSync(path.join(dir, "e2e", "playwright.config.js"));
        const result = runDoctor(dir);
        assert.equal(result.status, 1);
        assert.match(result.stdout, /\[FAIL\] e2e-playwright\.config/);
        assert.match(result.stdout, /E2E 托管接入命令/);
        assert.match(result.stdout, /结果: FAILED（退出码 1）/);
    } finally {
        cleanup(project);
    }
});
