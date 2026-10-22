import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { CONTRACT_VERSION } from "../src/index.js";
import { VERSION } from "../src/version.generated.js";

const root = path.resolve(import.meta.dirname, "..");
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

function initProject() {
    const project = fs.mkdtempSync(path.join(os.tmpdir(), "scenario-test-doctor-"));
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

function runDoctor(dir, extra = []) {
    return spawnSync(process.execPath, [cli, "doctor", "--config", path.join(dir, "scenario.config.js"), ...extra], { encoding: "utf8", env: childEnv() });
}

function cleanup(project) {
    fs.rmSync(project, { recursive: true, force: true });
}

test("doctor：健康项目全 PASS + manual INFO，退出码 0", () => {
    const { project, dir } = initProject();
    try {
        const result = runDoctor(dir);
        assert.equal(result.status, 0, result.stdout + result.stderr);
        assert.match(result.stdout, /\[PASS\] node-version/);
        assert.match(result.stdout, /\[PASS\] config-load/);
        assert.match(result.stdout, /\[PASS\] scenario-register/);
        assert.match(result.stdout, /\[PASS\] cli/);
        assert.match(result.stdout, /\[PASS\] authoringPrompt/);
        assert.match(result.stdout, /\[PASS\] patterns/);
        assert.match(result.stdout, /\[PASS\] umd/);
        assert.match(result.stdout, /\[PASS\] dts/);
        assert.match(result.stdout, /\[PASS\] capabilities/);
        assert.match(result.stdout, /\[PASS\] version-lock/);
        // src 环境运行 init 时 CLI 副本从本机 dist 兜底拷贝，完整副本就绪
        assert.match(result.stdout, /\[PASS\] runtime-cli/);
        assert.match(result.stdout, /\[INFO\] manual-scenario/);
        assert.match(result.stdout, /seed/);
        assert.doesNotMatch(result.stdout, /\[FAIL\]/);
        assert.match(result.stdout, /结果: OK（退出码 0）/);
    } finally {
        cleanup(project);
    }
});

test("doctor：平铺旧文件不被识别，运行时检查只走 .scenario-test/ 副本", () => {
    const { project, dir } = initProject();
    try {
        fs.writeFileSync(path.join(dir, "scenario-test.umd.js"), "legacy", "utf8");
        const result = runDoctor(dir);
        assert.equal(result.status, 0, result.stdout + result.stderr);
        // 平铺旧文件不影响 .scenario-test/ 内副本的版本握手
        assert.match(result.stdout, /\[PASS\] umd/);
        assert.match(result.stdout, /运行时副本就绪/);
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

test("doctor：版本锁由 init 生成且版本一致 PASS", () => {
    const { project, dir } = initProject();
    try {
        const lockPath = path.join(dir, ".scenario-test", ".scenario-test-version.json");
        assert.equal(fs.existsSync(lockPath), true);
        const lock = JSON.parse(fs.readFileSync(lockPath, "utf8"));
        assert.equal(lock.runtimeVersion, VERSION);
        assert.equal(lock.contractVersion, CONTRACT_VERSION);
        assert.ok(lock.files.cli && lock.files.umd && lock.files.dts && lock.files.capabilities);
        const result = runDoctor(dir);
        assert.equal(result.status, 0, result.stdout + result.stderr);
        assert.match(result.stdout, /\[PASS\] version-lock/);
        assert.match(result.stdout, /版本一致/);
    } finally {
        cleanup(project);
    }
});

test("doctor：UMD 版本不一致 FAIL；SHA256 被替换 WARN", () => {
    const { project, dir } = initProject();
    try {
        const umdPath = path.join(dir, ".scenario-test", "scenario-test.umd.js");
        fs.writeFileSync(umdPath, "/*! scenario-test v0.0.1 */", "utf8");
        let result = runDoctor(dir);
        assert.equal(result.status, 1);
        assert.match(result.stdout, /\[FAIL\] umd/);
        assert.match(result.stdout, /版本不一致/);

        // 恢复版本头但改内容：版本一致、SHA256 不一致 → FAIL（内容被替换意味着来源不明，健康闸门必须拦下）
        fs.writeFileSync(umdPath, `/*! scenario-test v${VERSION} */ tampered`, "utf8");
        result = runDoctor(dir);
        assert.equal(result.status, 1, result.stdout + result.stderr);
        assert.match(result.stdout, /SHA256 与版本锁记录不一致/);
        assert.match(result.stdout, /\[FAIL\] version-lock/);
    } finally {
        cleanup(project);
    }
});

test("doctor：版本锁缺少 sha256 指纹时 WARN 提示刷新，不再静默跳过", () => {
    const { project, dir } = initProject();
    try {
        const lockPath = path.join(dir, ".scenario-test", ".scenario-test-version.json");
        const lock = JSON.parse(fs.readFileSync(lockPath, "utf8"));
        delete lock.sha256;
        fs.writeFileSync(lockPath, JSON.stringify(lock), "utf8");
        const result = runDoctor(dir);
        assert.equal(result.status, 0, result.stdout + result.stderr);
        assert.match(result.stdout, /\[WARN\] version-lock: 版本锁缺少 sha256 指纹记录/);
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
test("doctor：capabilities.json 解析失败 / schema 不匹配 / 版本不一致分别 FAIL", () => {
    const { project, dir } = initProject();
    try {
        const capPath = path.join(dir, ".scenario-test", "scenario-test-capabilities.json");
        const original = fs.readFileSync(capPath, "utf8");

        fs.writeFileSync(capPath, "{ not-json", "utf8");
        let result = runDoctor(dir);
        assert.equal(result.status, 1);
        assert.match(result.stdout, /\[FAIL\] capabilities/);
        assert.match(result.stdout, /解析失败/);

        fs.writeFileSync(capPath, JSON.stringify({ schema: "other-manifest", version: VERSION, contractVersion: CONTRACT_VERSION }), "utf8");
        result = runDoctor(dir);
        assert.equal(result.status, 1);
        assert.match(result.stdout, /\[FAIL\] capabilities/);
        assert.match(result.stdout, /schema 不匹配/);

        fs.writeFileSync(capPath, JSON.stringify({ schema: "scenario-test-capabilities", version: "0.0.1", contractVersion: CONTRACT_VERSION }), "utf8");
        result = runDoctor(dir);
        assert.equal(result.status, 1);
        assert.match(result.stdout, /\[FAIL\] capabilities/);
        assert.match(result.stdout, /版本不一致/);
        assert.match(result.stdout, /用当前版本 CLI 重新 init/);

        // 恢复原文件后 capabilities 检查回到 PASS（同一项目内验证状态随文件内容复位）
        fs.writeFileSync(capPath, original, "utf8");
        result = runDoctor(dir);
        assert.match(result.stdout, /\[PASS\] capabilities/);
    } finally {
        cleanup(project);
    }
});

test("doctor：capabilities.json 缺失时 WARN 提示 init 补齐（不判 FAIL）", () => {
    const { project, dir } = initProject();
    try {
        fs.rmSync(path.join(dir, ".scenario-test", "scenario-test-capabilities.json"));
        // 缺文件是 WARN（init 补齐即可），内容损坏/版本漂移才是 FAIL
        const result = runDoctor(dir);
        assert.equal(result.status, 0, result.stdout + result.stderr);
        assert.match(result.stdout, /\[WARN\] capabilities/);
        assert.match(result.stdout, /缺少运行时副本 scenario-test-capabilities.json/);
    } finally {
        cleanup(project);
    }
});

test("doctor：版本锁解析失败 / 版本不一致 FAIL，files 缺失或声明文件丢失 WARN", () => {
    const { project, dir } = initProject();
    try {
        const lockPath = path.join(dir, ".scenario-test", ".scenario-test-version.json");
        const original = fs.readFileSync(lockPath, "utf8");

        fs.writeFileSync(lockPath, "{ broken", "utf8");
        let result = runDoctor(dir);
        assert.equal(result.status, 1);
        assert.match(result.stdout, /\[FAIL\] version-lock/);
        assert.match(result.stdout, /\.scenario-test-version\.json 解析失败/);

        const lock = JSON.parse(original);
        lock.runtimeVersion = "0.0.1";
        fs.writeFileSync(lockPath, JSON.stringify(lock), "utf8");
        result = runDoctor(dir);
        assert.equal(result.status, 1);
        assert.match(result.stdout, /\[FAIL\] version-lock/);
        assert.match(result.stdout, /版本锁记录 v0\.0\.1/);

        const noFiles = JSON.parse(original);
        delete noFiles.files;
        fs.writeFileSync(lockPath, JSON.stringify(noFiles), "utf8");
        result = runDoctor(dir);
        assert.match(result.stdout, /\[WARN\] version-lock: 版本锁缺少 files 字段/);

        const missingFile = JSON.parse(original);
        missingFile.files.capabilities = "scenario-test-capabilities-gone.json";
        fs.writeFileSync(lockPath, JSON.stringify(missingFile), "utf8");
        result = runDoctor(dir);
        assert.match(result.stdout, /\[WARN\] version-lock: 版本锁声明 capabilities 文件 scenario-test-capabilities-gone\.json 不存在/);
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

test("doctor --json：运行时副本被同名目录占位时汇总不丢失，逐项 FAIL 不崩溃", () => {
    const { project, dir } = initProject();
    try {
        const frameworkDir = path.join(dir, ".scenario-test");
        for (const fileName of ["scenario-test.umd.js", "scenario-test.d.ts", "scenario-test-cli.cjs"]) {
            fs.rmSync(path.join(frameworkDir, fileName));
            fs.mkdirSync(path.join(frameworkDir, fileName));
        }
        const result = runDoctor(dir, ["--json"]);
        assert.equal(result.status, 1);
        assert.equal(result.stderr, "");
        const parsed = JSON.parse(result.stdout);
        const umd = parsed.checks.find((check) => check.name === "umd");
        assert.equal(umd.status, "FAIL");
        assert.match(umd.message, /运行时副本不可读取/);
        assert.match(umd.message, /路径不是普通文件/);
        const dts = parsed.checks.find((check) => check.name === "dts");
        assert.equal(dts.status, "FAIL");
        assert.match(dts.message, /运行时副本不可读取/);
        const runtimeCli = parsed.checks.find((check) => check.name === "runtime-cli");
        assert.equal(runtimeCli.status, "FAIL");
        assert.match(runtimeCli.message, /运行时副本不可读取/);
        const lockFailures = parsed.checks.filter((check) => check.name === "version-lock" && check.status === "FAIL");
        assert.ok(lockFailures.some((check) => check.message.includes("无法校验 SHA256")), "被目录占位的文件应报无法校验 SHA256");
        assert.ok(parsed.checks.some((check) => check.name === "capabilities" && check.status === "PASS"));
        assert.ok(parsed.checks.some((check) => check.name === "node-version" && check.status === "PASS"));
        assert.ok(parsed.checks.some((check) => check.name === "config-load" && check.status === "PASS"));
        assert.ok(parsed.checks.some((check) => check.name === "scenario-register" && check.status === "PASS"));
        const text = runDoctor(dir);
        assert.equal(text.status, 1);
        assert.equal(text.stderr, "");
        assert.match(text.stdout, /\[FAIL\] umd/);
        assert.match(text.stdout, /如何修: 移走无效路径或修复文件读取权限后，用当前版本 CLI 重新 init/);
        assert.match(text.stdout, /结果: FAILED（退出码 1）/);
    } finally {
        cleanup(project);
    }
});

test("doctor --json：版本锁内容非 JSON 对象时 version-lock FAIL，其余检查继续", () => {
    const { project, dir } = initProject();
    try {
        const lockPath = path.join(dir, ".scenario-test", ".scenario-test-version.json");
        for (const content of ["null", "[]", "\"bad\"", "17"]) {
            fs.writeFileSync(lockPath, content, "utf8");
            const result = runDoctor(dir, ["--json"]);
            assert.equal(result.status, 1, `锁内容 ${content} 应退出 1`);
            assert.equal(result.stderr, "");
            const parsed = JSON.parse(result.stdout);
            const lock = parsed.checks.find((check) => check.name === "version-lock");
            assert.equal(lock.status, "FAIL", `锁内容 ${content}`);
            assert.match(lock.message, /JSON 对象/);
            assert.match(lock.fix, /重新 init/);
            assert.ok(parsed.checks.some((check) => check.name === "node-version" && check.status === "PASS"));
            assert.ok(parsed.checks.some((check) => check.name === "config-load" && check.status === "PASS"));
        }
    } finally {
        cleanup(project);
    }
});

test("doctor --json：.scenario-test 被同名文件占位时 framework-directory FAIL，其余检查继续", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "scenario-test-doctor-fwfile-"));
    try {
        fs.writeFileSync(path.join(dir, "scenario.config.js"), `ScenarioTest.registerConfig(ScenarioTest.defineConfig({
            envs: [{ key: "local", name: "本地", baseUrl: "http://127.0.0.1:1" }],
            defaultEnvKey: "local",
            scenarios: []
        }));`, "utf8");
        const blocker = path.join(dir, ".scenario-test");
        fs.writeFileSync(blocker, "not-a-directory", "utf8");
        const result = runDoctor(dir, ["--json"]);
        assert.equal(result.status, 1);
        assert.equal(result.stderr, "");
        const parsed = JSON.parse(result.stdout);
        const framework = parsed.checks.find((check) => check.name === "framework-directory");
        assert.ok(framework, "应输出 framework-directory 检查项");
        assert.equal(framework.status, "FAIL");
        assert.match(framework.message, /必须是目录/);
        assert.match(framework.fix, /移走无效路径/);
        assert.ok(parsed.checks.some((check) => check.name === "node-version" && check.status === "PASS"));
        assert.ok(parsed.checks.some((check) => check.name === "config-load" && check.status === "PASS"));
        assert.equal(fs.readFileSync(blocker, "utf8"), "not-a-directory");
    } finally {
        fs.rmSync(dir, { recursive: true, force: true });
    }
});
