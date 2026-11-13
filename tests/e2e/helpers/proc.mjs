// 子进程封装：spawn 带硬超时与输出采集；平台脚本选择器；
// 安装脚本的用户级运行时目录经 HOME / USERPROFILE 隔离到临时目录，
// 绝不污染真实用户目录（v23 运行时就落在 ~/.scenario-test/runtime）。
import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");

export function makeTempDir(prefix = "scenario-test-e2e-") {
    return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

export function removeDir(dir) {
    fs.rmSync(dir, { recursive: true, force: true });
}

// 剥离宿主 SCENARIO_* 变量，避免污染被测脚本；再叠加测试注入变量。
function sanitizedEnv(extra = {}) {
    const env = {};
    for (const [key, value] of Object.entries(process.env)) {
        if (key.toUpperCase().startsWith("SCENARIO_")) continue;
        env[key] = value;
    }
    return { ...env, ...extra };
}

export function run(command, args, options = {}) {
    const timeoutMs = options.timeoutMs ?? 180000;
    return new Promise((resolve, reject) => {
        const child = spawn(command, args, {
            cwd: options.cwd || repoRoot,
            stdio: ["ignore", "pipe", "pipe"],
            env: sanitizedEnv(options.env || {}),
            shell: !!options.shell
        });
        let stdout = "";
        let stderr = "";
        let timedOut = false;
        const timer = setTimeout(() => { timedOut = true; child.kill("SIGKILL"); }, timeoutMs);
        child.stdout.setEncoding("utf8");
        child.stderr.setEncoding("utf8");
        child.stdout.on("data", (c) => { stdout += c; });
        child.stderr.on("data", (c) => { stderr += c; });
        child.on("error", (err) => { clearTimeout(timer); reject(err); });
        child.on("close", (code) => {
            clearTimeout(timer);
            resolve({ code, stdout, stderr, timedOut });
        });
    });
}

// 当前平台的安装脚本执行器：unix → bash install.sh；windows → pwsh/powershell install.ps1。
// 非本平台返回 null，由用例显式 test.skip（不冒充通过）。
export function installerForPlatform() {
    if (process.platform === "win32") {
        const script = path.join(repoRoot, "scripts/install.ps1");
        const shellCmd = process.env.E2E_PS_SHELL || "pwsh";
        return {
            kind: "ps1",
            script,
            command: shellCmd,
            args: ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", script],
            // ps1 以 USERPROFILE 定用户级运行时目录
            homeEnvKey: "USERPROFILE"
        };
    }
    const script = path.join(repoRoot, "scripts/install.sh");
    return {
        kind: "sh",
        script,
        command: "bash",
        args: [script],
        homeEnvKey: "HOME"
    };
}

// 组装一次安装调用的 env：隔离 HOME/USERPROFILE 到临时 home，
// 注入自定义源与清单 URL；SCENARIO_TEST_VERSION 仅在 sh 上可覆盖。
export function installEnv({ home, sourceBaseUrl, manifestUrl, version }) {
    const env = { [installerForPlatform().homeEnvKey]: home };
    if (manifestUrl) env.SCENARIO_TEST_RELEASE_JSON = manifestUrl;
    if (version) env.SCENARIO_TEST_VERSION = version;
    return env;
}

// install.sh 用法：install.sh <projectDir> <targetDir> <source>
// install.ps1 用法：install.ps1 -Project <dir> -TargetDir <dir> -Source <url>
export function installArgs(installer, { projectDir, targetDir, source }) {
    if (installer.kind === "ps1") {
        const args = ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", installer.script,
            "-Project", projectDir, "-TargetDir", targetDir];
        if (source) args.push("-Source", source);
        return args;
    }
    const args = [installer.script, projectDir, targetDir];
    if (source) args.push(source);
    return args;
}
