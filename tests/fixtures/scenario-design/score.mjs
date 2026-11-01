#!/usr/bin/env node
// order-adjust 场景设计评分器（issue #107）。
//
// 输入是 AI 产出的 scenario-test/ 目录，输出是「规则 → 决策 → 证据缺失点」的评分明细。
// 评分只做静态分析：加载场景 DSL 后按 rubric 比对，不调用任何 HTTP 接口。
//
// 用法：
//   node score.mjs --artifact <项目或 scenario-test 目录>
//   node score.mjs --artifact <dir> --json
//   node score.mjs --rubric <file> --artifact <dir>
//
// 退出码：0 表示评分完成（与分数高低无关）；2 表示产出无法加载。

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(HERE, "../../..");
const DEFAULT_RUBRIC = path.join(HERE, "rubric.json");

// ---------------------------------------------------------------- 参数

function parseArgs(argv) {
    const args = { artifact: "", rubric: DEFAULT_RUBRIC, json: false, collect: "", out: "" };
    for (let i = 0; i < argv.length; i += 1) {
        const token = argv[i];
        if (token === "--json") args.json = true;
        else if (token === "--artifact") args.artifact = argv[++i] || "";
        else if (token === "--rubric") args.rubric = argv[++i] || "";
        else if (token === "--collect") args.collect = argv[++i] || "";
        else if (token === "--out") args.out = argv[++i] || "";
        else if (token === "--help" || token === "-h") args.help = true;
    }
    return args;
}

const USAGE = `用法: node score.mjs --artifact <项目或 scenario-test 目录> [--rubric <file>] [--json]`;

// ---------------------------------------------------------------- 产出加载（子进程）

function findConfig(dir) {
    const candidates = [
        path.join(dir, "scenario.config.js"),
        path.join(dir, "scenario-test", "scenario.config.js")
    ];
    return candidates.find((candidate) => fs.existsSync(candidate)) || null;
}

function projectStep(step) {
    const method = String(step.method || (step.request && step.request.method) || "GET").toUpperCase();
    const body = step.request && step.request.body;
    return {
        name: step.name || "",
        method,
        path: String(step.path || ""),
        status: step.status,
        bodyKeys: body && typeof body === "object" && !Array.isArray(body) ? Object.keys(body) : [],
        assertions: Array.isArray(step.assertions) ? step.assertions.map(sanitizeAssertion) : []
    };
}

// 断言只保留可 JSON 化的字段：defineScenario 已校验过结构，这里不再重复校验。
const ASSERTION_KEYS = [
    "name", "path", "from", "target", "header", "implicit", "status",
    "equals", "notEquals", "exists", "includes", "oneOf", "matches",
    "startsWith", "endsWith", "length", "gt", "gte", "lt", "lte", "each", "shape"
];

function sanitizeAssertion(assertion) {
    if (!assertion || typeof assertion !== "object") return {};
    const out = {};
    for (const key of ASSERTION_KEYS) {
        if (assertion[key] === undefined) continue;
        out[key] = typeof assertion[key] === "object"
            ? JSON.parse(JSON.stringify(assertion[key]))
            : assertion[key];
    }
    return out;
}

async function collectArtifact(artifactDir) {
    const apiUrl = pathToFileURL(path.join(REPO_ROOT, "src", "node.js")).href;
    const api = await import(apiUrl);
    const configPath = findConfig(artifactDir);
    if (!configPath) {
        return { ok: false, error: `未找到 scenario.config.js: ${artifactDir}`, scenarios: [] };
    }
    let config;
    try {
        config = api.loadConfigFile(configPath, api);
    } catch (error) {
        return { ok: false, error: `配置加载失败: ${error.message}`, scenarios: [] };
    }
    const baseDir = path.dirname(configPath);
    const scenarios = [];
    for (const entry of config.scenarios || []) {
        const record = { id: entry.id, name: entry.name || entry.id, file: "", steps: [] };
        const file = path.resolve(baseDir, String(entry.url || ""));
        record.file = path.relative(artifactDir, file);
        if (!entry.url || !fs.existsSync(file)) {
            record.error = "场景文件不存在";
            scenarios.push(record);
            continue;
        }
        try {
            const scenario = api.loadScenarioFile(file, entry.id, api);
            record.name = scenario.name || record.name;
            record.steps = (scenario.steps || []).map(projectStep);
        } catch (error) {
            record.error = error.message;
        }
        scenarios.push(record);
    }
    return { ok: true, configPath, scenarios };
}

// 每个候选产出在独立子进程加载：registry 是进程级全局，同进程加载多个产出会串味。
function collectInSubprocess(artifactDir) {
    const outFile = path.join(os.tmpdir(), `scenario-design-collect-${process.pid}-${Date.now()}.json`);
    const runner = path.join(HERE, "score.mjs");
    const result = spawnSync(process.execPath, [runner, "--collect", artifactDir, "--out", outFile], {
        encoding: "utf8",
        timeout: 30000
    });
    try {
        if (!fs.existsSync(outFile)) {
            throw new Error(`产出加载失败（子进程无输出）: ${result.stderr || result.error || "未知错误"}`);
        }
        return JSON.parse(fs.readFileSync(outFile, "utf8"));
    } finally {
        fs.rmSync(outFile, { force: true });
    }
}

// ---------------------------------------------------------------- 匹配工具

function matchesTrigger(step, trigger) {
    if (!trigger) return false;
    if (String(step.method).toUpperCase() !== String(trigger.method).toUpperCase()) return false;
    let pattern;
    try {
        pattern = new RegExp(trigger.path);
    } catch {
        return false;
    }
    return pattern.test(step.path);
}

function isEnvelopeAssertion(assertion, envelopePaths) {
    if (!assertion) return true;
    if (assertion.target === "duration" || assertion.target === "status") return true;
    if (assertion.path === undefined) return true;
    return envelopePaths.includes(assertion.path);
}

function isBusinessAssertion(assertion, envelopePaths) {
    if (isEnvelopeAssertion(assertion, envelopePaths)) return false;
    return typeof assertion.path === "string" && (assertion.path === "data" || assertion.path.startsWith("data."));
}

function assertionSatisfies(assertion, expected) {
    if (!assertion || assertion.path !== expected.path) return false;
    if (expected.isTemplate) {
        // 只要求断言值引用了前面提取的变量（证明「返回的是同一条记录」），不绑定具体变量名。
        return typeof assertion.equals === "string" && /\{\{\s*(vars|suite)\./.test(assertion.equals);
    }
    if (Object.prototype.hasOwnProperty.call(expected, "equals")) {
        return assertion.equals === expected.equals;
    }
    if (Object.prototype.hasOwnProperty.call(expected, "exists")) {
        return assertion.exists === expected.exists;
    }
    if (Object.prototype.hasOwnProperty.call(expected, "length")) {
        return Number(assertion.length) === Number(expected.length);
    }
    return true;
}

function stepAssertsCode(step, code) {
    return (step.assertions || []).some((assertion) => {
        if (assertion.path !== "code") return false;
        if (assertion.equals === code) return true;
        return Array.isArray(assertion.oneOf) && assertion.oneOf.includes(code);
    });
}

function stepAssertsBusiness(step, expect, envelopePaths) {
    const wanted = expect.assertions || [];
    if (wanted.length === 0) {
        return (step.assertions || []).some((assertion) => isBusinessAssertion(assertion, envelopePaths));
    }
    return wanted.every((expected) => (step.assertions || []).some((assertion) => assertionSatisfies(assertion, expected)));
}

// 重复提交是否证明了「返回同一条记录」：要么断言 data.id 引用了首次提取的变量，要么列表只有 1 条。
function hasRepeatIdentity(group, target) {
    const assertsSameId = (target.step.assertions || []).some((assertion) => (
        typeof assertion.path === "string"
        && assertion.path.startsWith("data.id")
        && typeof assertion.equals === "string"
        && /\{\{\s*(vars|suite)\./.test(assertion.equals)
    ));
    if (assertsSameId) return true;
    return group.scenario.steps
        .slice(target.index + 1)
        .some((step) => (step.assertions || []).some((assertion) => (
            assertion.path === "data.total" && Number(assertion.equals) === 1
        )));
}

function stepHasPostcheck(group, targetIndex, postcheck) {
    if (!postcheck) return null;
    const anyOf = postcheck.anyOf || [];
    if (anyOf.length === 0) return null;
    return group.scenario.steps.slice(targetIndex + 1).some((step) => (
        (step.assertions || []).some((assertion) => anyOf.some((expected) => assertionSatisfies(assertion, expected)))
    ));
}

// ---------------------------------------------------------------- 规则评估

function evaluateRule(rule, scenarios) {
    const envelopePaths = ["code", "status", "message"];
    const result = {
        id: rule.id,
        name: rule.name,
        priority: rule.priority || "must",
        decision: "未覆盖",
        scenarioId: null,
        touchedScenarios: [],
        assertedScenarios: [],
        touched: false,
        asserted: false,
        postchecked: false,
        findings: []
    };
    if (!rule.trigger) {
        result.decision = "待确认（可选）";
        result.findings.push(rule.reason || "没有本地可观察的验证手段");
        return result;
    }

    const grouped = new Map();
    for (const scenario of scenarios) {
        for (let index = 0; index < scenario.steps.length; index += 1) {
            const step = scenario.steps[index];
            if (!matchesTrigger(step, rule.trigger)) continue;
            if (!grouped.has(scenario.id)) grouped.set(scenario.id, { scenario, hits: [] });
            grouped.get(scenario.id).hits.push({ index, step });
        }
    }
    result.touchedScenarios = [...grouped.keys()];
    result.touched = result.touchedScenarios.length > 0;

    const candidates = [];
    for (const group of grouped.values()) {
        if (group.hits.length < (rule.minTriggerCount || 1)) continue;
        const target = group.hits[group.hits.length - 1];
        const asserted = rule.expect.code !== 0
            ? stepAssertsCode(target.step, rule.expect.code)
            : stepAssertsBusiness(target.step, rule.expect, envelopePaths);
        const postchecked = stepHasPostcheck(group, target.index, rule.postcheck);
        const repeatOk = rule.expect.repeatSameBusinessId ? hasRepeatIdentity(group, target) : true;
        // 幂等类规则必须证明「返回同一条记录」才算有效断言：只断言 data.id 存在不算。
        const effective = asserted && repeatOk;
        if (effective) result.assertedScenarios.push(group.scenario.id);
        candidates.push({ ...group, target, asserted, postchecked, repeatOk, effective });
    }

    // 选「最接近有效验证」的候选：先看断言，再看重复提交，最后看后置验证。
    const rank = (candidate) => (candidate.effective ? 8 : 0) + (candidate.asserted ? 4 : 0) + (candidate.postchecked ? 1 : 0);
    const best = candidates.sort((a, b) => rank(b) - rank(a))[0];
    if (!best) {
        if (result.touched) {
            const needed = rule.minTriggerCount || 1;
            result.findings.push(`命中触发条件的步骤不足 ${needed} 次，无法验证该规则`);
        } else {
            result.findings.push("没有任何场景命中该规则的触发条件");
        }
        return result;
    }

    result.scenarioId = best.effective ? best.scenario.id : null;
    result.asserted = best.effective;
    result.postchecked = rule.postcheck ? Boolean(best.postchecked) : true;

    if (best.effective) {
        result.decision = "新建";
    } else if (rule.expect.repeatSameBusinessId && best.asserted) {
        result.decision = "未证明幂等";
    } else if (rule.expect.code !== 0) {
        // 拒绝类规则：连错误码断言都没有，说明根本没有验证这条拒绝分支，
        // 而不是「断言写得弱」——避免把缺失当成弱覆盖。
        const hasCodeAssertion = (best.target.step.assertions || []).some((assertion) => assertion.path === "code");
        result.decision = hasCodeAssertion ? "断言不符" : "未覆盖";
    } else {
        result.decision = "弱断言";
    }
    if (rule.expect.code !== 0) {
        const hasCodeAssertion = (best.target.step.assertions || []).some((assertion) => assertion.path === "code");
        if (best.asserted) result.findings.push(`断言 code=${rule.expect.code}`);
        else if (hasCodeAssertion) result.findings.push(`断言了 code，但不是期望的 ${rule.expect.code}`);
        else result.findings.push(`没有场景验证这条拒绝分支（期望 code=${rule.expect.code}）`);
    } else if (!best.asserted) {
        result.findings.push("只有 envelope 断言，缺业务字段验证");
    } else if (!best.repeatOk) {
        result.findings.push("做了重复提交，但没证明返回同一条记录（需断言 data.id 一致或列表 total=1）");
    }
    if (best.effective && rule.postcheck && !best.postchecked) {
        result.findings.push("缺后置状态验证（需在受验请求之后查询并断言副作用）");
    }
    return result;
}

// ---------------------------------------------------------------- 卫生项

function touchesDomain(step, prefix) {
    return String(step.path || "").replace(/^\/+/, "").startsWith(prefix);
}

function evaluateHygiene(rubric, scenarios, rules) {
    const penalties = [];
    const baselineIds = new Set((rubric.baseline && rubric.baseline.scenarioIds) || []);
    const knownCodes = new Set([0, ...Object.values((rubric.evidence && rubric.evidence.errorCodes) || {})]);
    const expectedStatus = (rubric.evidence && rubric.evidence.httpStatus) || 200;
    const domainPrefix = (rubric.hygiene && rubric.hygiene.domainPathPrefix) || "";
    const presentIds = new Set(scenarios.map((scenario) => scenario.id));

    for (const id of baselineIds) {
        if (!presentIds.has(id)) {
            penalties.push({ kind: "baseline-removed", detail: `基线场景 ${id} 被删除或重命名` });
        }
    }

    for (const scenario of scenarios) {
        for (const step of scenario.steps) {
            if (!touchesDomain(step, domainPrefix)) continue;
            if (step.status !== undefined && Number(step.status) !== expectedStatus) {
                penalties.push({
                    kind: "wrong-http-status",
                    scenario: scenario.id,
                    detail: `步骤「${step.name}」断言 HTTP ${step.status}，但本服务所有响应都是 ${expectedStatus}`
                });
            }
            for (const assertion of step.assertions) {
                if (assertion.path !== "code") continue;
                const values = [];
                if (assertion.equals !== undefined) values.push(assertion.equals);
                if (Array.isArray(assertion.oneOf)) values.push(...assertion.oneOf);
                for (const value of values) {
                    if (Number.isInteger(value) && !knownCodes.has(value)) {
                        penalties.push({
                            kind: "guessed-code",
                            scenario: scenario.id,
                            detail: `步骤「${step.name}」断言 code=${value}，不属于 ErrorCode 中的任何取值`
                        });
                    }
                }
            }
        }
    }

    // 冗余：同一规则被多个新建场景断言覆盖。
    // 只对拒绝类规则判定：成功类规则会被其他场景的准备步骤顺带命中，
    // 那是搭建前置数据，不是重复验证。
    for (const rule of rules) {
        const spec = rule.spec;
        if (!spec || !spec.expect || spec.expect.code === 0) continue;
        if (!rule.assertedScenarios) continue;
        const newOnes = rule.assertedScenarios.filter((id) => !baselineIds.has(id));
        if (newOnes.length > 1) {
            penalties.push({
                kind: "redundant-scenario",
                detail: `规则 ${rule.id}（期望 code=${spec.expect.code}）被 ${newOnes.length} 个新建场景重复验证：${newOnes.join(", ")}`
            });
        }
    }

    // 应增强而非新建：基线场景已触达同一预期结果（仅对单次触发的成功类规则成立）。
    for (const rule of rules) {
        const spec = rule.spec;
        if (!spec || !spec.expect) continue;
        if (spec.expect.code !== 0 || (spec.minTriggerCount || 1) !== 1) continue;
        const baselineTouched = rule.touchedScenarios.some((id) => baselineIds.has(id));
        const newAsserted = rule.assertedScenarios.filter((id) => !baselineIds.has(id));
        const baselineAsserted = rule.assertedScenarios.some((id) => baselineIds.has(id));
        if (baselineTouched && !baselineAsserted && newAsserted.length > 0) {
            penalties.push({
                kind: "should-augment-baseline",
                detail: `基线场景已覆盖规则 ${rule.id} 的触发条件，应补断言而不是新建 ${newAsserted.join(", ")}`
            });
        }
    }

    return penalties;
}

// ---------------------------------------------------------------- 汇总

function scoreArtifact(rubric, artifact) {
    const scenarios = artifact.scenarios || [];
    const envelopePaths = (rubric.hygiene && rubric.hygiene.envelopePaths) || ["code", "status", "message"];
    const rules = (rubric.rules || []).map((rule) => {
        const evaluated = evaluateRule(rule, scenarios);
        evaluated.spec = rule;
        return evaluated;
    });
    const mustRules = rules.filter((rule) => rule.priority === "must");
    const covered = mustRules.filter((rule) => rule.asserted && rule.postchecked && rule.asserted);
    const touched = mustRules.filter((rule) => rule.touched);
    const asserted = mustRules.filter((rule) => rule.asserted);
    const postchecked = mustRules.filter((rule) => rule.asserted && rule.postchecked);
    const penalties = evaluateHygiene(rubric, scenarios, rules);

    const weights = rubric.weights || { coverage: 50, assertion: 25, postcheck: 15, hygiene: 10 };
    const ratio = (part, whole) => (whole === 0 ? 0 : part / whole);
    const coverageScore = weights.coverage * ratio(covered.length, mustRules.length);
    const assertionScore = weights.assertion * ratio(asserted.length, mustRules.length);
    const postcheckScore = weights.postcheck * ratio(postchecked.length, mustRules.length);
    const hygieneScore = Math.max(0, weights.hygiene - penalties.length);

    const baselineIds = new Set((rubric.baseline && rubric.baseline.scenarioIds) || []);
    return {
        fixture: rubric.fixture,
        artifact: artifact.configPath || "",
        score: {
            coverage: round(coverageScore),
            assertion: round(assertionScore),
            postcheck: round(postcheckScore),
            hygiene: round(hygieneScore),
            total: round(coverageScore + assertionScore + postcheckScore + hygieneScore)
        },
        summary: {
            mustRules: mustRules.length,
            touched: touched.length,
            asserted: asserted.length,
            covered: covered.length,
            scenarios: scenarios.length,
            baselineScenarios: scenarios.filter((scenario) => baselineIds.has(scenario.id)).length,
            newScenarios: scenarios.filter((scenario) => !baselineIds.has(scenario.id)).length,
            loadErrors: scenarios.filter((scenario) => scenario.error).map((scenario) => ({ id: scenario.id, error: scenario.error }))
        },
        rules: rules.map((rule) => {
            const { spec, ...rest } = rule;
            return {
                ...rest,
                evidence: spec ? spec.evidence : "",
                decision: rule.asserted ? (rule.scenarioId && !baselineIds.has(rule.scenarioId) ? "新建" : "增强") : rule.decision
            };
        }),
        hygiene: { penalties, score: round(hygieneScore) },
        envelopePaths
    };
}

function round(value) {
    return Math.round(value * 10) / 10;
}

// ---------------------------------------------------------------- 输出

function renderText(report) {
    const lines = [];
    lines.push(`${report.fixture} 场景设计评分`);
    lines.push("─".repeat(64));
    lines.push(`场景 ${report.summary.scenarios} 个（基线 ${report.summary.baselineScenarios} / 新建 ${report.summary.newScenarios}）`);
    lines.push("");
    lines.push("规则                                     决策          场景");
    for (const rule of report.rules) {
        const head = `${rule.id} ${rule.name}`.padEnd(38, " ");
        const decision = String(rule.decision).padEnd(12, " ");
        lines.push(`${head} ${decision} ${rule.scenarioId || "-"}`);
        for (const finding of rule.findings) lines.push(`    · ${finding}`);
    }
    lines.push("");
    if (report.hygiene.penalties.length) {
        lines.push("卫生项");
        for (const penalty of report.hygiene.penalties) {
            lines.push(`  · [${penalty.kind}] ${penalty.detail}`);
        }
        lines.push("");
    }
    if (report.summary.loadErrors.length) {
        lines.push("加载失败");
        for (const item of report.summary.loadErrors) lines.push(`  · ${item.id}: ${item.error}`);
        lines.push("");
    }
    lines.push("得分");
    lines.push(`  覆盖 ${report.score.coverage}  断言 ${report.score.assertion}  后置 ${report.score.postcheck}  卫生 ${report.score.hygiene}`);
    lines.push(`  总分 ${report.score.total}`);
    return lines.join("\n");
}

// ---------------------------------------------------------------- 入口

async function main() {
    const args = parseArgs(process.argv.slice(2));
    if (args.help) {
        process.stdout.write(`${USAGE}\n`);
        return 0;
    }

    // 子进程模式：只负责加载产出并写 JSON，避免 registry 串味。
    if (args.collect) {
        const collected = await collectArtifact(args.collect);
        if (!args.out) {
            process.stdout.write(`${JSON.stringify(collected)}\n`);
        } else {
            fs.writeFileSync(args.out, JSON.stringify(collected), "utf8");
        }
        return 0;
    }

    if (!args.artifact) {
        process.stderr.write(`${USAGE}\n`);
        return 2;
    }
    if (!fs.existsSync(args.artifact)) {
        process.stderr.write(`产出目录不存在: ${args.artifact}\n`);
        return 2;
    }

    const rubric = JSON.parse(fs.readFileSync(args.rubric, "utf8"));
    let artifact;
    try {
        artifact = collectInSubprocess(path.resolve(args.artifact));
    } catch (error) {
        process.stderr.write(`${error.message}\n`);
        return 2;
    }
    if (!artifact.ok) {
        process.stderr.write(`${artifact.error}\n`);
        return 2;
    }

    const report = scoreArtifact(rubric, artifact);
    if (args.json) {
        process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
    } else {
        process.stdout.write(`${renderText(report)}\n`);
    }
    return 0;
}

main().then((code) => {
    process.exitCode = code;
}).catch((error) => {
    process.stderr.write(`${error && error.stack ? error.stack : error}\n`);
    process.exitCode = 2;
});
