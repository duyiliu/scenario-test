// CLI 子进程夹具：隔离用户级状态，统一超时与输出收集，测试结束自动清理。
//
// 关键点：
//   - SCENARIO_TEST_HOME 指向每次运行自建的临时目录，绝不触碰真实 ~/.scenario-test；
//   - 剥离宿主 SCENARIO_* 变量（Windows 环境变量名不区分大小写），按需显式注入；
//   - 子进程带硬超时，避免被测实现挂死时把整个测试进程拖住。
import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
export const cliEntry = path.join(repoRoot, "src/cli.js");

function sanitizedEnv(extra = {}) {
    const env = {};
    for (const [key, value] of Object.entries(process.env)) {
        if (key.toUpperCase().startsWith("SCENARIO_")) continue;
        env[key] = value;
    }
    return { ...env, ...extra };
}

// serve 等长驻子进程需要同一套「剔除宿主 SCENARIO_*」口径；导出以免测试各写一份
export function childEnv(extra = {}) {
    return sanitizedEnv(extra);
}

export function makeTempDir(prefix = "scenario-test-comprehensive-") {
    return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

export function removeDir(dir) {
    fs.rmSync(dir, { recursive: true, force: true });
}

// 写一个自包含项目：config + 若干场景文件。
// 额外配置项（如 nodePlugins）经 rest 透传：之前直接丢弃会让「插件闸门」用例
// 在没加载任何插件的情况下跑出假绿（测试自己也需要防止静默忽略）。
export function writeProject(dir, { envs = [], vars = {}, scenarios = [], defaultEnvKey = "", ...extra } = {}) {
    fs.mkdirSync(path.join(dir, "scenarios"), { recursive: true });
    for (const entry of scenarios) {
        const file = path.join(dir, "scenarios", `${entry.id}.js`);
        fs.mkdirSync(path.dirname(file), { recursive: true });
        fs.writeFileSync(file, entry.source, "utf8");
    }
    const config = `ScenarioTest.registerConfig(ScenarioTest.defineConfig(${JSON.stringify({
        envs,
        ...(defaultEnvKey ? { defaultEnvKey } : {}),
        vars,
        ...extra,
        scenarios: scenarios.map((entry) => ({
            id: entry.id,
            name: entry.name || entry.id,
            url: entry.url || `scenarios/${entry.id}.js`,
            ...(entry.tags ? { tags: entry.tags } : {}),
            ...(entry.manual ? { manual: true } : {})
        }))
    }, null, 2)}));\n`;
    fs.writeFileSync(path.join(dir, "scenario.config.js"), config, "utf8");
    return { dir, configPath: path.join(dir, "scenario.config.js") };
}

export function scenarioSource(id, definition) {
    return `ScenarioTest.registerScenario(${JSON.stringify(id)}, ScenarioTest.defineScenario(${JSON.stringify(definition, null, 2)}));\n`;
}

export function runCli(args, options = {}) {
    const timeoutMs = options.timeoutMs ?? 60000;
    return new Promise((resolve, reject) => {
        const startedAt = process.hrtime.bigint();
        const child = spawn(process.execPath, [cliEntry, ...args], {
            cwd: options.cwd || repoRoot,
            stdio: ["ignore", "pipe", "pipe"],
            env: sanitizedEnv({
                SCENARIO_TEST_HOME: options.home || path.join(os.tmpdir(), "scenario-test-unset-home"),
                ...(options.env || {})
            })
        });
        let stdout = "";
        let stderr = "";
        let timedOut = false;
        const timer = setTimeout(() => {
            timedOut = true;
            child.kill("SIGKILL");
        }, timeoutMs);
        child.stdout.setEncoding("utf8");
        child.stderr.setEncoding("utf8");
        child.stdout.on("data", (chunk) => { stdout += chunk; });
        child.stderr.on("data", (chunk) => { stderr += chunk; });
        child.on("error", (error) => { clearTimeout(timer); reject(error); });
        child.on("close", (code) => {
            clearTimeout(timer);
            // 墙钟耗时是「真的快了多少」的独立证据（进度行里的 duration 是单步骤耗时）
            const durationMs = Number(process.hrtime.bigint() - startedAt) / 1e6;
            resolve({ code, stdout, stderr, timedOut, durationMs });
        });
    });
}

// 断言辅助：子进程成功 + 可读失败信息
export function assertCliOk(result, label) {
    if (result.code !== 0) {
        throw new Error(`${label} 期望退出码 0，实际 ${result.code}\nSTDOUT:\n${result.stdout}\nSTDERR:\n${result.stderr}`);
    }
}
