#!/usr/bin/env node
// 本地并发跑场景设计评估：不起 Docker，直接在宿主上 spawn pi（issue #107）。
//
// 与 run-ab.sh 的区别只在于执行方式：路径、prompt、评分完全一致，
// 但少了容器启动与 SSH 往返，并且支持并发（pi 大部分时间在等模型响应）。
//
// 用法：
//   node run-ab-local.mjs --group current --runs 4 --concurrency 4
//   node run-ab-local.mjs --group baseline --runs 4 --concurrency 4 \
//     --skill /path/to/v0.11.1/skills/scenario-test
//
// 需要：本地已安装 pi（npm i -g @earendil-works/pi-coding-agent），
// 且 ~/.pi/agent 中存在对应 provider 的凭据。

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFile, execFileSync } from "node:child_process";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";

const execFileAsync = promisify(execFile);
const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, "../../..");
const FIXTURE = path.join(HERE, "order-adjust");
const PROMPT = path.join(HERE, "prompt.md");
const SCORE = path.join(HERE, "score.mjs");
const CLI = path.join(REPO, "dist", "scenario-test-cli.cjs");

function parseArgs(argv) {
    const args = {
        group: "current",
        runs: 1,
        concurrency: 1,
        skill: path.join(REPO, "skills", "scenario-test"),
        model: "commandcode/deepseek/deepseek-v4.1-flash",
        artifactRoot: path.join(HERE, "artifacts"),
        from: 1
    };
    for (let i = 0; i < argv.length; i += 1) {
        const token = argv[i];
        if (token === "--group") args.group = argv[++i];
        else if (token === "--runs") args.runs = Number(argv[++i]);
        else if (token === "--from") args.from = Number(argv[++i]);
        else if (token === "--concurrency") args.concurrency = Number(argv[++i]);
        else if (token === "--skill") args.skill = path.resolve(argv[++i]);
        else if (token === "--model") args.model = argv[++i];
        else if (token === "--artifact-root") args.artifactRoot = path.resolve(argv[++i]);
        else if (token === "--help" || token === "-h") args.help = true;
    }
    return args;
}

function resolvePiCli() {
    if (process.env.PI_CLI) return process.env.PI_CLI;
    const npmRoot = execFileSync("npm", ["root", "-g"], { encoding: "utf8", shell: true }).trim();
    const candidates = [
        path.join(npmRoot, "@earendil-works", "pi-coding-agent", "dist", "bundle", "cli.js"),
        path.join(npmRoot, "@earendil-works", "pi-coding-agent", "dist", "cli.js")
    ];
    const found = candidates.find((candidate) => fs.existsSync(candidate));
    if (!found) throw new Error(`未找到 pi 入口，请设置 PI_CLI 环境变量。已尝试: ${candidates.join(", ")}`);
    return found;
}

async function runOne(index, options, piCli, prompt) {
    const tag = `${options.group}-${index}`;
    const work = fs.mkdtempSync(path.join(os.tmpdir(), `st-${tag}-`));
    const started = Date.now();
    try {
        const project = path.join(work, "project");
        fs.cpSync(FIXTURE, project, { recursive: true });

        // 补运行时、保留预置场景（非交互 init 默认保留已有文件）。
        await execFileAsync(process.execPath, [CLI, "init", "--project", project, "--dir", "scenario-test", "--no-input"], {
            cwd: work,
            maxBuffer: 20 * 1024 * 1024
        });

        await execFileAsync(process.execPath, [
            piCli,
            "--skill", options.skill,
            "-ns", "-nc",
            "--model", options.model,
            "--no-session",
            "-p", prompt
        ], {
            cwd: project,
            maxBuffer: 64 * 1024 * 1024,
            timeout: 30 * 60 * 1000
        });

        const artifactDir = path.join(options.artifactRoot, tag);
        fs.rmSync(artifactDir, { recursive: true, force: true });
        fs.mkdirSync(artifactDir, { recursive: true });
        fs.cpSync(path.join(project, "scenario-test"), path.join(artifactDir, "scenario-test"), { recursive: true });

        const target = path.join(artifactDir, "scenario-test");
        const reportText = (await execFileAsync(process.execPath, [SCORE, "--artifact", target], { maxBuffer: 20 * 1024 * 1024 })).stdout;
        const reportJson = (await execFileAsync(process.execPath, [SCORE, "--artifact", target, "--json"], { maxBuffer: 20 * 1024 * 1024 })).stdout;
        fs.writeFileSync(path.join(artifactDir, "report.txt"), reportText, "utf8");
        fs.writeFileSync(path.join(artifactDir, "report.json"), reportJson, "utf8");

        const report = JSON.parse(reportJson);
        return {
            tag,
            ok: true,
            total: report.score.total,
            scenarios: report.summary.scenarios,
            seconds: Math.round((Date.now() - started) / 1000)
        };
    } catch (error) {
        return { tag, ok: false, error: (error.message || "").split("\n")[0].slice(0, 300), seconds: Math.round((Date.now() - started) / 1000) };
    } finally {
        fs.rmSync(work, { recursive: true, force: true });
    }
}

async function pool(tasks, concurrency) {
    const results = new Array(tasks.length);
    let cursor = 0;
    const worker = async () => {
        while (cursor < tasks.length) {
            const index = cursor;
            cursor += 1;
            results[index] = await tasks[index]();
            const item = results[index];
            process.stdout.write(item.ok
                ? `  ${item.tag}  总分 ${item.total}  场景 ${item.scenarios}  ${item.seconds}s\n`
                : `  ${item.tag}  失败: ${item.error}  ${item.seconds}s\n`);
        }
    };
    await Promise.all(Array.from({ length: Math.min(concurrency, tasks.length) }, worker));
    return results;
}

async function main() {
    const args = parseArgs(process.argv.slice(2));
    if (args.help) {
        process.stdout.write("用法: node run-ab-local.mjs --group <name> --runs <n> [--concurrency <n>] [--skill <dir>] [--model <id>]\n");
        return 0;
    }
    if (!fs.existsSync(path.join(args.skill, "SKILL.md"))) throw new Error(`skill 目录无效: ${args.skill}`);
    if (!fs.existsSync(CLI)) throw new Error(`缺少 ${CLI}，请先 npm run build`);

    const piCli = resolvePiCli();
    const prompt = fs.readFileSync(PROMPT, "utf8");
    fs.mkdirSync(args.artifactRoot, { recursive: true });

    process.stdout.write(`组 ${args.group}: ${args.runs} 轮，并发 ${args.concurrency}，模型 ${args.model}\n`);
    process.stdout.write(`skill: ${args.skill}\n`);

    const indices = Array.from({ length: args.runs }, (_, offset) => args.from + offset);
    const results = await pool(indices.map((index) => () => runOne(index, args, piCli, prompt)), args.concurrency);

    const ok = results.filter((item) => item.ok);
    process.stdout.write(`\n完成 ${ok.length}/${results.length}\n`);
    if (ok.length) {
        const totals = ok.map((item) => item.total).sort((a, b) => a - b);
        process.stdout.write(`总分: ${totals.join(" / ")}\n`);
    }
    return ok.length === results.length ? 0 : 1;
}

main().then((code) => {
    process.exitCode = code;
}).catch((error) => {
    process.stderr.write(`${error && error.stack ? error.stack : error}\n`);
    process.exitCode = 2;
});
