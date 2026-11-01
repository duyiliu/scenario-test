#!/usr/bin/env node
// 多轮 A/B 汇总：把 run-ab.sh 产出的 artifacts/<tag>/report.json 按 tag 前缀分组，
// 输出分数分布与每条规则的命中次数。
//
// 用法: node summarize.mjs [artifacts 目录]
//
// 结论只看分布，不看单轮：基线自身方差就是判断「改动是否有效」的分母。

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(process.argv[2] || path.join(HERE, "artifacts"));

if (!fs.existsSync(root)) {
    process.stderr.write(`目录不存在: ${root}\n`);
    process.exit(2);
}

const groups = new Map();
for (const name of fs.readdirSync(root)) {
    const reportPath = path.join(root, name, "report.json");
    if (!fs.existsSync(reportPath)) continue;
    let report;
    try {
        report = JSON.parse(fs.readFileSync(reportPath, "utf8"));
    } catch {
        continue;
    }
    const key = name.includes("-") ? name.slice(0, name.indexOf("-")) : name;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push({ tag: name, report });
}

if (groups.size === 0) {
    process.stderr.write(`没有找到 report.json: ${root}\n`);
    process.exit(2);
}

const median = (values) => {
    const sorted = [...values].sort((a, b) => a - b);
    const middle = Math.floor(sorted.length / 2);
    return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
};

for (const [key, runs] of groups) {
    const totals = runs.map((run) => run.report.score.total);
    const ruleIds = runs[0].report.rules.map((rule) => rule.id);
    process.stdout.write(`${key}  n=${runs.length}  总分 min ${Math.min(...totals)} / 中位 ${median(totals)} / max ${Math.max(...totals)}\n`);
    for (const ruleId of ruleIds) {
        const findRule = (run) => run.report.rules.find((rule) => rule.id === ruleId);
        const covered = runs.filter((run) => {
            const rule = findRule(run);
            return rule && rule.asserted && rule.postchecked;
        }).length;
        const asserted = runs.filter((run) => findRule(run)?.asserted).length;
        const scenarioCounts = runs.map((run) => run.report.summary.newScenarios);
        process.stdout.write(`  ${ruleId} 完整覆盖 ${covered}/${runs.length}  断言有效 ${asserted}/${runs.length}  新建场景数 ${scenarioCounts.join("/")}\n`);
    }
    process.stdout.write("\n");
}

process.stdout.write("提示：n 小于 5 时不要下结论；先跑够轮次测出基线自身的方差。\n");
