#!/usr/bin/env node
// 变异测试：给夹具注入业务缺陷，看场景套件能不能发现（issue #107）。
//
// 这是确定性评估层——不依赖模型判断，只回答一个问题：
// 「业务逻辑被改坏之后，这组场景会不会失败？」
//
// 用法：
//   node mutation-check.mjs --artifact artifacts/current-1/scenario-test
//   node mutation-check.mjs --artifact <dir> --only M1,M3 --json
//
// 需要：本地 Java 17 + Maven（首次会构建 Spring Boot 包）。

import fs from "node:fs";
import path from "node:path";
import { spawn, spawnSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, "../../..");
const FIXTURE_DIR = path.join(HERE, "order-adjust");
const CLI = path.join(REPO, "dist", "scenario-test-cli.cjs");
const JAR = path.join(FIXTURE_DIR, "target", "order-adjust-1.0.0.jar");
const SERVICE_URL = "http://127.0.0.1:8080/api/order-adjusts?orderId=1001";
const PORT = 8080;

function parseArgs(argv) {
    const args = { artifact: "", only: [], json: false, timeout: 90000 };
    for (let i = 0; i < argv.length; i += 1) {
        const token = argv[i];
        if (token === "--artifact") args.artifact = path.resolve(argv[++i]);
        else if (token === "--only") args.only = String(argv[++i]).split(",").map((s) => s.trim()).filter(Boolean);
        else if (token === "--json") args.json = true;
        else if (token === "--timeout") args.timeout = Number(argv[++i]);
        else if (token === "--help" || token === "-h") args.help = true;
    }
    return args;
}

function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

async function isServiceReady() {
    try {
        const response = await fetch(SERVICE_URL, { signal: AbortSignal.timeout(2000) });
        return response.status === 200;
    } catch {
        return false;
    }
}

function killPortOccupants() {
    if (process.platform === "win32") {
        const netstat = spawnSync("netstat", ["-ano", "-p", "tcp"], { encoding: "utf8" });
        const pids = new Set();
        for (const line of (netstat.stdout || "").split("\n")) {
            if (!line.includes(`:${PORT}`) || !line.includes("LISTENING")) continue;
            const parts = line.trim().split(/\s+/);
            const pid = parts[parts.length - 1];
            if (/^\d+$/.test(pid)) pids.add(pid);
        }
        for (const pid of pids) spawnSync("taskkill", ["/PID", pid, "/T", "/F"], { encoding: "utf8" });
    } else {
        const lsof = spawnSync("sh", ["-c", `lsof -ti tcp:${PORT} | xargs -r kill -9`], { encoding: "utf8" });
        void lsof;
    }
}

async function startService(timeoutMs) {
    if (await isServiceReady()) {
        // 已有同端口服务：先停掉，避免用错代码版本。
        killPortOccupants();
        await sleep(2000);
    }
    const logPath = path.join(HERE, "artifacts", `service-${Date.now()}.log`);
    fs.mkdirSync(path.dirname(logPath), { recursive: true });
    const out = fs.openSync(logPath, "w");
    const child = spawn("java", ["-jar", JAR], { stdio: ["ignore", out, out] });
    const started = Date.now();
    while (Date.now() - started < timeoutMs) {
        if (await isServiceReady()) return { child, logPath };
        await sleep(1000);
    }
    child.kill("SIGKILL");
    throw new Error(`服务启动超时（${timeoutMs}ms），日志: ${logPath}`);
}

function stopService(child) {
    if (!child) return;
    if (process.platform === "win32") {
        spawnSync("taskkill", ["/PID", String(child.pid), "/T", "/F"], { encoding: "utf8" });
    } else {
        child.kill("SIGKILL");
    }
}

function build() {
    const result = spawnSync("mvn", ["-q", "-DskipTests", "package"], {
        cwd: FIXTURE_DIR,
        encoding: "utf8",
        shell: process.platform === "win32"
    });
    if (result.status !== 0) {
        throw new Error(`Maven 构建失败:\n${(result.stderr || result.stdout || "").slice(-2000)}`);
    }
}

async function readScenarios(configPath) {
    const api = await import(pathToFileURL(path.join(REPO, "src", "node.js")).href);
    const config = api.loadConfigFile(configPath, api);
    return (config.scenarios || []).map((scenario) => ({
        id: scenario.id,
        manual: Boolean(scenario.manual)
    }));
}

function runScenario(configPath, scenarioId) {
    const args = [CLI, "run", "--config", configPath, "--env", "local"];
    if (scenarioId) args.push("--scenario", scenarioId);
    else args.push("--all");
    const result = spawnSync(process.execPath, args, { encoding: "utf8", timeout: 180000 });
    return { ok: result.status === 0, output: `${result.stdout || ""}${result.stderr || ""}` };
}

// 先跑默认套件（快）；没杀死时再逐个跑 manual 场景（隔离重启）。
async function suiteKills(configPath, scenarios, timeoutMs) {
    killPortOccupants();
    await sleep(1500);
    const service = await startService(timeoutMs);
    let killedBy = [];
    try {
        const bulk = runScenario(configPath, null);
        if (!bulk.ok) killedBy = ["default-suite"];
    } finally {
        stopService(service.child);
    }
    if (killedBy.length) return { killed: true, killedBy };

    for (const scenario of scenarios) {
        if (!scenario.manual) continue;
        killPortOccupants();
        await sleep(1200);
        const isolated = await startService(timeoutMs);
        try {
            const result = runScenario(configPath, scenario.id);
            if (!result.ok) return { killed: true, killedBy: [scenario.id] };
        } finally {
            stopService(isolated.child);
        }
    }
    return { killed: false, killedBy: [] };
}

function applyMutation(mutation) {
    const target = path.join(FIXTURE_DIR, mutation.file || "src/main/java/com/example/order/OrderAdjustService.java");
    const original = fs.readFileSync(target, "utf8");
    const find = mutation.find.join("\n");
    const replace = mutation.replace.join("\n");
    const occurrences = original.split(find).length - 1;
    if (occurrences !== 1) {
        throw new Error(`变异 ${mutation.id} 的 find 片段命中 ${occurrences} 次（应为 1），夹具代码可能已变更`);
    }
    fs.writeFileSync(target, original.replace(find, replace), "utf8");
    return () => fs.writeFileSync(target, original, "utf8");
}

async function main() {
    const args = parseArgs(process.argv.slice(2));
    if (args.help) {
        process.stdout.write("用法: node mutation-check.mjs --artifact <scenario-test 目录> [--only M1,M3] [--json]\n");
        return 0;
    }
    if (!args.artifact) {
        process.stderr.write("缺少 --artifact\n");
        return 2;
    }
    const configPath = path.join(args.artifact, "scenario.config.js");
    if (!fs.existsSync(configPath)) {
        process.stderr.write(`未找到 ${configPath}\n`);
        return 2;
    }
    if (!fs.existsSync(CLI)) {
        process.stderr.write(`缺少 ${CLI}，请先 npm run build\n`);
        return 2;
    }

    const spec = JSON.parse(fs.readFileSync(path.join(HERE, "mutations.json"), "utf8"));
    const casePath = path.join(HERE, "case.json");
    const expectations = fs.existsSync(casePath)
        ? (JSON.parse(fs.readFileSync(casePath, "utf8")).expectations || {})
        : {};
    const knownGaps = new Set(expectations.knownGaps || []);
    const mustKill = new Set(expectations.mustKillMutations || []);
    // case.json 里用短 ID（M1/M3），mutations.json 里用带后缀的完整 ID。
    const matchesShortId = (shortIds, fullId) => [...shortIds].some((short) => fullId === short || fullId.startsWith(`${short}-`));
    const matchesOnly = (mutation) => args.only.length === 0
        || args.only.some((prefix) => mutation.id === prefix || mutation.id.startsWith(`${prefix}-`));
    const mutations = spec.mutations.filter(matchesOnly);
    const scenarios = await readScenarios(configPath);

    const results = [];
    for (const mutation of mutations) {
        process.stdout.write(`\n[${mutation.id}] ${mutation.description}\n`);
        let restore = null;
        try {
            restore = applyMutation({ ...mutation, file: spec.file });
            build();
            const outcome = await suiteKills(configPath, scenarios, args.timeout);
            results.push({
                id: mutation.id,
                description: mutation.description,
                knownGap: matchesShortId(knownGaps, mutation.id),
                required: matchesShortId(mustKill, mutation.id),
                ...outcome
            });
            process.stdout.write(outcome.killed
                ? `  杀死（${outcome.killedBy.join(", ")}）\n`
                : `  存活${matchesShortId(knownGaps, mutation.id) ? "（已知缺口，不计入通过线）" : "：套件没有发现该缺陷"}\n`);
        } catch (error) {
            results.push({ id: mutation.id, description: mutation.description, killed: false, error: error.message.split("\n")[0] });
            process.stdout.write(`  执行失败: ${error.message.split("\n")[0]}\n`);
        } finally {
            if (restore) restore();
        }
    }

    // 恢复原始代码后重建一次，确保留给下次运行的产物是干净的。
    try {
        build();
    } catch {
        // 构建失败不改变结论，留给人工处理
    }

    const killed = results.filter((item) => item.killed).length;
    const requiredResults = results.filter((item) => item.required);
    const requiredKilled = requiredResults.filter((item) => item.killed).length;
    const summary = {
        artifact: args.artifact,
        scenarios: scenarios.length,
        manualScenarios: scenarios.filter((scenario) => scenario.manual).length,
        killed,
        total: results.length,
        required: {
            total: requiredResults.length,
            killed: requiredKilled,
            passed: requiredResults.length > 0 && requiredKilled === requiredResults.length
        },
        results
    };

    if (args.json) {
        process.stdout.write(`\n${JSON.stringify(summary, null, 2)}\n`);
    } else {
        process.stdout.write(`\n杀死 ${killed}/${results.length}`);
        if (requiredResults.length) process.stdout.write(`（必杀 ${requiredKilled}/${requiredResults.length}${summary.required.passed ? "，通过" : "，未通过"}）`);
        process.stdout.write("\n");
        for (const item of results) {
            const tag = item.killed ? "killed" : (item.knownGap ? "SURVIVED (known gap)" : "SURVIVED");
            process.stdout.write(`  ${item.id}: ${tag}${item.error ? ` (${item.error})` : ""}\n`);
        }
    }
    return summary.required.passed || requiredResults.length === 0 ? 0 : 1;
}

main().then((code) => {
    process.exitCode = code;
}).catch((error) => {
    process.stderr.write(`${error && error.stack ? error.stack : error}\n`);
    process.exitCode = 2;
});
