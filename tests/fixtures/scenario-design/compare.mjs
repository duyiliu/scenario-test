#!/usr/bin/env node
// 语义层盲评：两份场景产出匿名化为 A/B，让模型判断哪份更能发现业务回归（issue #107）。
//
// 这是确定性变异测试的补充，不是替代品。盲评的价值在于发现「变异测试覆盖不到的语义问题」，
// 例如把调整数量理解成调整金额、断言对了错误码但业务含义错了。
//
// 用法：
//   node compare.mjs --a artifacts/baseline-1/scenario-test --b artifacts/current-1/scenario-test
//   node compare.mjs --a ... --b ... --json
//
// 依赖 ~/.pi/agent/models.json 中已配置的 commandcode provider。

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const RUBRIC = path.join(HERE, "rubric.json");
const MUTATIONS = path.join(HERE, "mutations.json");

function parseArgs(argv) {
    const args = {
        a: "",
        b: "",
        json: false,
        model: "deepseek/deepseek-v4.1-flash",
        provider: "commandcode",
        seed: undefined
    };
    for (let i = 0; i < argv.length; i += 1) {
        const token = argv[i];
        if (token === "--a") args.a = path.resolve(argv[++i]);
        else if (token === "--b") args.b = path.resolve(argv[++i]);
        else if (token === "--model") args.model = argv[++i];
        else if (token === "--provider") args.provider = argv[++i];
        else if (token === "--json") args.json = true;
        else if (token === "--seed") args.seed = Number(argv[++i]);
        else if (token === "--help" || token === "-h") args.help = true;
    }
    return args;
}

function loadProvider(providerName) {
    const configPath = path.join(os.homedir(), ".pi", "agent", "models.json");
    const config = JSON.parse(fs.readFileSync(configPath, "utf8"));
    const provider = config.providers && config.providers[providerName];
    if (!provider) throw new Error(`models.json 中没有 provider: ${providerName}`);
    if (!provider.apiKey) throw new Error(`provider ${providerName} 缺少 apiKey`);
    return provider;
}

// 把场景文件压成「名字 + 每步方法/路径/断言」的紧凑文本，避免把注释和格式塞满上下文。
function summarizeScenarios(artifactDir) {
    const scenarioRoot = path.join(artifactDir, "scenarios");
    if (!fs.existsSync(scenarioRoot)) return [];
    const files = [];
    const walk = (dir) => {
        for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
            const full = path.join(dir, entry.name);
            if (entry.isDirectory()) walk(full);
            else if (entry.name.endsWith(".js")) files.push(full);
        }
    };
    walk(scenarioRoot);

    return files.sort().map((file) => {
        const source = fs.readFileSync(file, "utf8").replace(/^\s*\/\/.*$/gm, "");
        const name = (source.match(/name:\s*"([^"]+)"/) || [])[1] || path.basename(file, ".js");
        const steps = [...source.matchAll(/name:\s*"([^"]+)"[\s\S]{0,400}?method:\s*"([A-Z]+)"[\s\S]{0,200}?path:\s*"([^"]+)"/g)]
            .map((match) => `${match[2]} ${match[3]}`);
        const assertions = [...source.matchAll(/path:\s*"([^"]+)"[^}]*?(equals|exists|oneOf|includes|length|matches|gte|lte):\s*([^,}\n]+)/g)]
            .map((match) => `${match[1]} ${match[2]}=${String(match[3]).trim()}`);
        return [
            `### ${name}`,
            `步骤: ${steps.join(" | ") || "(未解析)"}`,
            `断言: ${assertions.slice(0, 12).join("; ") || "(无)"}`
        ].join("\n");
    });
}

function buildPrompt(rubric, mutations, first, second) {
    const rules = rubric.rules
        .filter((rule) => rule.priority === "must")
        .map((rule) => `- ${rule.id} ${rule.name}：${rule.evidence}`)
        .join("\n");
    const mutationList = mutations.mutations
        .map((mutation) => `- ${mutation.id}：${mutation.description}`)
        .join("\n");
    return `你在评审两份「订单调整单」HTTP 场景测试产出。你只知道它们叫 A 和 B，不知道来源。

## 业务规则（源码可查证）
${rules}

## 评估问题
以下是可能注入到服务端的业务缺陷。一份好的场景套件应该在缺陷存在时失败：
${mutationList}

## 产出 A
${first.join("\n\n")}

## 产出 B
${second.join("\n\n")}

## 你的任务
只回答：如果上述缺陷被注入，哪一份场景套件更可能触发失败？判断依据必须是「断言能否证明业务结果」，不是场景数量多少、注释是否详细、格式是否整齐。

输出严格 JSON，不要代码块标记：
{"winner":"A|B|tie","confidence":"high|medium|low","reason":"不超过 120 字，指出决定性的差异","aWeakness":"A 最弱的一处验证","bWeakness":"B 最弱的一处验证"}`;
}

async function main() {
    const args = parseArgs(process.argv.slice(2));
    if (args.help) {
        process.stdout.write("用法: node compare.mjs --a <目录> --b <目录> [--json] [--model <id>]\n");
        return 0;
    }
    if (!args.a || !args.b) {
        process.stderr.write("需要 --a 与 --b\n");
        return 2;
    }
    for (const dir of [args.a, args.b]) {
        if (!fs.existsSync(dir)) {
            process.stderr.write(`目录不存在: ${dir}\n`);
            return 2;
        }
    }

    const rubric = JSON.parse(fs.readFileSync(RUBRIC, "utf8"));
    const mutations = JSON.parse(fs.readFileSync(MUTATIONS, "utf8"));
    const provider = loadProvider(args.provider);

    // 随机交换，避免位置偏好；结果里再映射回原始路径。
    const swap = args.seed === undefined
        ? Math.random() < 0.5
        : args.seed % 2 === 1;
    const firstDir = swap ? args.b : args.a;
    const secondDir = swap ? args.a : args.b;
    const first = summarizeScenarios(firstDir);
    const second = summarizeScenarios(secondDir);
    if (first.length === 0 || second.length === 0) {
        process.stderr.write("至少一份产出里没有场景文件\n");
        return 2;
    }

    const prompt = buildPrompt(rubric, mutations, first, second);
    const response = await fetch(`${provider.baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${provider.apiKey}`
        },
        body: JSON.stringify({
            model: args.model,
            messages: [{ role: "user", content: prompt }],
            temperature: 0,
            // 思考 token 与正文共享 max_tokens；该模型思考较长，预留足够空间避免正文被挤空。
            reasoning_effort: "low",
            max_tokens: 8000
        }),
        signal: AbortSignal.timeout(120000)
    });
    if (!response.ok) {
        process.stderr.write(`模型调用失败 ${response.status}: ${(await response.text()).slice(0, 300)}\n`);
        return 2;
    }
    const payload = await response.json();
    const content = payload.choices?.[0]?.message?.content || "";
    const match = content.match(/\{[\s\S]*\}/);
    if (!match) {
        process.stderr.write(`模型未返回 JSON（finish_reason=${payload.choices?.[0]?.finish_reason}）:\n${content.slice(0, 500)}\n${JSON.stringify(payload).slice(0, 500)}\n`);
        return 2;
    }
    const verdict = JSON.parse(match[0]);

    // 把匿名标签映射回真实路径。
    const labelToDir = { A: firstDir, B: secondDir };
    const result = {
        a: args.a,
        b: args.b,
        swapped: swap,
        model: args.model,
        raw: verdict,
        winnerDir: verdict.winner === "tie" ? null : labelToDir[verdict.winner] || null
    };

    if (args.json) {
        process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    } else {
        process.stdout.write(`盲评（${args.model}，${swap ? "A/B 已交换" : "A/B 未交换"}）\n`);
        process.stdout.write(`  结论: ${verdict.winner} (${verdict.confidence})\n`);
        process.stdout.write(`  理由: ${verdict.reason}\n`);
        process.stdout.write(`  A 最弱: ${verdict.aWeakness}\n`);
        process.stdout.write(`  B 最弱: ${verdict.bWeakness}\n`);
        if (result.winnerDir) process.stdout.write(`  更优产出: ${result.winnerDir}\n`);
    }
    return 0;
}

main().then((code) => {
    process.exitCode = code;
}).catch((error) => {
    process.stderr.write(`${error && error.stack ? error.stack : error}\n`);
    process.exitCode = 2;
});
