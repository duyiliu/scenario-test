#!/usr/bin/env node
// 有界变异验证：证明新增测试真的能『杀死』行为变化，而不是只在原实现上变绿。
//
// 设计原则（对应交付要求）：
//   1. 绝不修改工作树：每次运行把 src/ + tests/comprehensive*.test.js + tests/fixtures/comprehensive/
//      复制到 os.tmpdir() 下的隔离副本，只在副本里注入缺陷，结束即删。
//   2. 先证明原始实现全通过（baseline）。baseline 不过说明是环境/依赖/构建问题，
//      不是「变异被杀死」，脚本以 infrastructure-error 收尾，不产出任何 killed。
//   3. 每个变异体只替换一处最小代码片段（字面量断言必须命中恰好 1 次），
//      注入后先做语法/加载自检（node --check），加载失败同样记为 infrastructure-error。
//   4. 判定只看目标测试文件里「指定用例名」的结果，且必须是
//      **断言失败（TAP code=ERR_ASSERTION）** 才算 killed。超时、目标用例不存在、
//      整套测试无结果、用例以非断言方式崩溃（TypeError/钩子异常/模块错误）一律单列为
//      infrastructure-error——不能把「所有崩溃」泛化成检出。每个有效变异都保留
//      失败类型与最小诊断，供独立 QA 复核。
//   5. 记录 killed / survived / equivalent / skipped / excluded / infrastructure-error 六类，
//      并逐条保存变异体、替换点、退出码与失败用例名。
//      - excluded：变异体声明 platforms 且当前平台不在其中（platform-not-applicable）。
//        显式记录原因，不计入 killed/survived/equivalent，也不进得分分母；声明平台上仍须实际执行。
//      - skipped：目标用例被 TAP `# SKIP`/`# TODO` 跳过，等于没有执行。既不记 killed，
//        也不记 equivalent/survived，更不静默丢掉——单列并让退出码非零，提示需要回查。
//        平台不适用请在变异体声明 platforms，而不是依赖用例自行 skip。
//
// 用法：
//   node tests/mutation/run-mutations.mjs                  # 跑全部变异体
//   node tests/mutation/run-mutations.mjs --only M02       # 只跑指定 id（可逗号分隔）
//   node tests/mutation/run-mutations.mjs --keep           # 保留隔离副本目录便于排查
//   node tests/mutation/run-mutations.mjs --json           # 机器可读结果到 stdout
//   node tests/mutation/run-mutations.mjs --timeout 60     # 单个测试文件的超时秒数（默认 180）
//   node tests/mutation/run-mutations.mjs --repo-root DIR  # 使用指定仓库根（自测用的合成仓库）
//   node tests/mutation/run-mutations.mjs --mutations FILE # 使用指定变异体清单模块（自测用）

import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const defaultRepoRoot = path.resolve(here, "../..");

// ===== 基础设施 =====
function parseArgs(argv) {
    const options = {
        only: null,
        keep: false,
        json: false,
        timeoutMs: 180000,
        repoRoot: defaultRepoRoot,
        mutationsFile: path.join(here, "mutations.mjs")
    };
    for (let index = 0; index < argv.length; index += 1) {
        const arg = argv[index];
        if (arg === "--only") options.only = String(argv[++index] || "").split(",").map((item) => item.trim()).filter(Boolean);
        else if (arg === "--keep") options.keep = true;
        else if (arg === "--json") options.json = true;
        else if (arg === "--timeout") options.timeoutMs = Number(argv[++index]) * 1000;
        else if (arg === "--repo-root") options.repoRoot = path.resolve(String(argv[++index] || ""));
        else if (arg === "--mutations") options.mutationsFile = path.resolve(String(argv[++index] || ""));
    }
    return options;
}

// 只在副本里安装依赖：优先软链接回仓库 node_modules（避免复制几十 MB，
// Windows 下用 junction，无需开发者模式）；失败时回退到只复制运行时必需包
// （src 唯一外部依赖 blueimp-md5）；再失败则明确记为 unavailable——由 baseline
// 失败原因报出，绝不在注释里假装「测试不依赖 node_modules」。
function linkDependencies(dir, repoRoot) {
    const target = path.join(repoRoot, "node_modules");
    if (!fs.existsSync(target)) return "absent";
    const dest = path.join(dir, "node_modules");
    try {
        fs.symlinkSync(target, dest, process.platform === "win32" ? "junction" : "dir");
        return "symlink";
    } catch {
        // 继续走复制回退
    }
    try {
        fs.mkdirSync(dest, { recursive: true });
        for (const name of ["blueimp-md5"]) {
            const source = path.join(target, name);
            if (!fs.existsSync(source)) throw new Error(`缺少运行时依赖 ${name}`);
            fs.cpSync(source, path.join(dest, name), { recursive: true });
        }
        return "copied";
    } catch (error) {
        return `unavailable: ${error.message}`;
    }
}

function copyWorkspace(repoRoot) {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "scenario-test-mutation-copy-"));
    fs.cpSync(path.join(repoRoot, "src"), path.join(dir, "src"), { recursive: true });
    const fixtures = path.join(repoRoot, "tests", "fixtures", "comprehensive");
    if (fs.existsSync(fixtures)) {
        fs.cpSync(fixtures, path.join(dir, "tests", "fixtures", "comprehensive"), { recursive: true });
    } else {
        fs.mkdirSync(path.join(dir, "tests", "fixtures", "comprehensive"), { recursive: true });
    }
    fs.mkdirSync(path.join(dir, "tests"), { recursive: true });
    for (const name of fs.readdirSync(path.join(repoRoot, "tests"))) {
        if (name.startsWith("comprehensive") && name.endsWith(".test.js")) {
            fs.copyFileSync(path.join(repoRoot, "tests", name), path.join(dir, "tests", name));
        }
    }
    // package.json 只需 type: module
    fs.writeFileSync(path.join(dir, "package.json"), JSON.stringify({ name: "mutation-copy", type: "module", private: true }, null, 2));
    const dependencies = linkDependencies(dir, repoRoot);
    return { dir, dependencies };
}

// ===== TAP 解析 =====
// node --test 的 TAP 输出：失败用例后跟一个 YAML 诊断块（--- ... ...），
// 其中 code=ERR_ASSERTION 表示断言失败；TypeError/钩子异常是 ERR_TEST_FAILURE；
// 模块加载失败则是文件级 not ok（name 是文件名）+ ERR_TEST_FAILURE。
// 判定必须基于 code，而不是「目标用例 not ok」就记检出。
function extractDiagnostic(blockLines) {
    const lines = blockLines.map((line) => line.replace(/\s+$/, ""));
    const start = lines.findIndex((line) => /^\s*error:\s*/.test(line));
    if (start < 0) return null;
    const first = lines[start].replace(/^\s*error:\s*/, "");
    const collected = [];
    if (first === "|-" || first === "|" || first === ">-") {
        for (let index = start + 1; index < lines.length; index += 1) {
            const line = lines[index];
            // 诊断内容是比 error 键缩进更深的续行；遇到同级键即结束
            if (/^\s*(stack|code|failureType|name|expected|actual|operator|generatedMessage|location|duration_ms|type|exitCode|signal):/.test(line)) break;
            if (line.trim() === "...") break;
            collected.push(line.replace(/^\s{2,4}/, ""));
        }
    } else {
        collected.push(first.replace(/^'(.*)'$/, "$1"));
    }
    const text = collected.join("\n").trim();
    return text ? text.slice(0, 800) : null;
}

function parseTap(output) {
    const lines = output.split("\n");
    const cases = new Map();
    for (let index = 0; index < lines.length; index += 1) {
        const line = lines[index].trim();
        const match = /^(ok|not ok)\s+\d+\s+-\s+(.*)$/.exec(line);
        if (!match) continue;
        const passed = match[1] === "ok";
        const rawName = match[2];
        // TAP 指令位：`ok N - name # SKIP reason` / `# TODO reason`。
        // 只看通过行的指令：skip 的用例没有真正执行，不能当 survived/killed/equivalent。
        const directive = /\s+#\s*(SKIP|TODO)\b(.*)$/i.exec(rawName);
        const name = rawName.replace(/\s+#.*$/, "").trim();
        const entry = {
            passed,
            skipped: passed && Boolean(directive),
            skipReason: directive ? (directive[2] || "").trim() || null : null,
            failureType: null,
            code: null,
            diagnostic: null
        };
        if (!passed) {
            const block = [];
            for (let cursor = index + 1; cursor < lines.length; cursor += 1) {
                const current = lines[cursor].trim();
                if (current === "..." || current.startsWith("# Subtest:")) break;
                if (/^(ok|not ok)\s+\d+\s+-/.test(current)) break;
                block.push(lines[cursor]);
            }
            const blockText = block.join("\n");
            entry.failureType = /(^|\n)\s*failureType:\s*'([^']*)'/.exec(blockText)?.[2] || null;
            entry.code = /(^|\n)\s*code:\s*'([^']*)'/.exec(blockText)?.[2] || null;
            entry.diagnostic = extractDiagnostic(block);
        }
        // 同名只保留第一次；出现失败则以失败为准（重复名可能出现在诊断文本里）
        if (!cases.has(name) || !passed) cases.set(name, entry);
    }
    return cases;
}

function runTest(file, options = {}) {
    // 关键：调用方若本身运行在 node --test 里（自测/CI 嵌套），NODE_TEST_CONTEXT
    // 会让被 spawn 的 node --test 进入 worker 模式、不输出 TAP 且退出码 0——
    // 那会把 baseline 变成「零用例也通过」的假绿，必须剥掉。
    const env = { ...process.env, SCENARIO_TEST_HOME: path.join(os.tmpdir(), "scenario-test-mutation-home") };
    delete env.NODE_TEST_CONTEXT;
    const result = spawnSync(process.execPath, ["--test", "--test-reporter=tap", file], {
        cwd: options.cwd,
        encoding: "utf8",
        timeout: options.timeoutMs,
        env
    });
    const output = `${result.stdout || ""}${result.stderr || ""}`;
    return {
        code: result.status,
        timedOut: Boolean(result.error && String(result.error.code).includes("ETIMEDOUT")),
        cases: parseTap(output),
        output
    };
}

function findCase(cases, needle) {
    for (const [name, entry] of cases) {
        if (name.includes(needle)) return { name, ...entry };
    }
    return null;
}

// 已知的 process.platform 取值（用于尽早暴露 platforms 声明里的拼写错误）。
const KNOWN_PLATFORMS = new Set([
    "aix", "android", "darwin", "freebsd", "haiku", "linux",
    "netbsd", "openbsd", "sunos", "win32", "cygwin"
]);

// 平台声明解析：
//   - 未声明（undefined/null）→ null，表示全平台适用；
//   - 声明则必须是「非空的平台名数组（或单个平台名）」，否则返回 invalid；
//     无效声明一律记 infrastructure-error，绝不静默排除（否则会把配置写错伪装成「平台不适用」）。
function parsePlatforms(mutation) {
    if (mutation.platforms === undefined || mutation.platforms === null) return null;
    const declared = Array.isArray(mutation.platforms) ? mutation.platforms : [mutation.platforms];
    const list = declared.map((item) => String(item).trim().toLowerCase()).filter(Boolean);
    if (!list.length) return { invalid: true, list };
    const unknown = list.filter((item) => !KNOWN_PLATFORMS.has(item));
    if (unknown.length) return { invalid: true, list, unknown };
    return { invalid: false, list };
}

// 返回 null 表示当前平台适用、应正常注入；否则返回需要直接记录的判定。
function platformGate(mutation) {
    const declared = parsePlatforms(mutation);
    if (!declared) return null;
    if (declared.invalid) {
        return {
            outcome: "infrastructure-error",
            platforms: declared.list,
            reason: `变异体 platforms 声明无效：${JSON.stringify(mutation.platforms)}（须为非空的平台名数组，如 ["linux"]）`
        };
    }
    if (declared.list.includes(process.platform)) return null;
    return {
        outcome: "excluded",
        platforms: declared.list,
        reason: `平台不适用（platform-not-applicable）：声明 platforms=[${declared.list.join(", ")}]，当前平台 ${process.platform}；`
            + `不计入 killed/survived/equivalent，也不进本机得分分母，须在 ${declared.list.join("/")} 上实际执行`
    };
}

function applyMutation(dir, mutation) {
    const target = path.join(dir, mutation.file);
    if (!fs.existsSync(target)) return { ok: false, reason: `文件不存在: ${mutation.file}` };
    const before = fs.readFileSync(target, "utf8");
    const occurrences = before.split(mutation.find).length - 1;
    if (occurrences !== 1) {
        return { ok: false, reason: `替换片段命中 ${occurrences} 次（要求恰好 1 次），拒绝注入以避免误伤` };
    }
    const after = before.replace(mutation.find, mutation.replace);
    if (after === before) return { ok: false, reason: "替换后内容未变化" };
    fs.writeFileSync(target, after, "utf8");
    // 语法自检：注入的必须是「行为变化」，不能是「语法错误」
    const check = spawnSync(process.execPath, ["--check", target], { encoding: "utf8" });
    if (check.status !== 0) {
        fs.writeFileSync(target, before, "utf8");
        return { ok: false, reason: `注入后语法检查失败: ${(check.stderr || "").split("\n")[0]}` };
    }
    return { ok: true, restore: () => fs.writeFileSync(target, before, "utf8") };
}

async function loadMutations(file) {
    const imported = await import(pathToFileURL(file).href);
    const list = imported.mutations || imported.default;
    if (!Array.isArray(list) || !list.length) throw new Error(`变异体清单为空或格式不正确: ${file}`);
    return list;
}

async function main() {
    const options = parseArgs(process.argv.slice(2));
    if (!fs.existsSync(path.join(options.repoRoot, "src"))) {
        console.error(`repo-root 不包含 src/：${options.repoRoot}`);
        process.exit(2);
    }
    let allMutations;
    try {
        allMutations = await loadMutations(options.mutationsFile);
    } catch (error) {
        console.error(`无法加载变异体清单: ${error.message}`);
        process.exit(2);
    }
    const selected = options.only?.length
        ? allMutations.filter((item) => options.only.some((token) => item.id === token || item.id.startsWith(token)))
        : allMutations;
    if (!selected.length) {
        console.error(`未匹配任何变异体：${options.only?.join(",")}`);
        process.exit(2);
    }

    const report = {
        schemaVersion: 3,
        generatedAt: new Date().toISOString(),
        repoRoot: options.repoRoot,
        node: process.version,
        platform: `${process.platform}/${process.arch}`,
        baseline: null,
        checkouts: {},
        dependencies: null,
        results: [],
        summary: { killed: 0, survived: 0, equivalent: 0, skipped: 0, excluded: 0, "infrastructure-error": 0, total: selected.length }
    };

    const { dir, dependencies } = copyWorkspace(options.repoRoot);
    report.dependencies = dependencies;
    // 平台门控在 baseline 之前解析：排除项不进 baseline，也不会被误记 survived/分母。
    const gates = new Map(selected.map((item) => [item.id, platformGate(item)]));
    const applicable = selected.filter((item) => gates.get(item.id)?.outcome !== "excluded");
    const testFiles = [...new Set(applicable.map((item) => item.testFile))];
    try {
        // ===== 1) baseline：原始实现必须全通过（平台排除项不参与） =====
        for (const file of testFiles) {
            const baseline = runTest(file, { cwd: dir, timeoutMs: options.timeoutMs });
            const failed = [...baseline.cases.entries()].filter(([, entry]) => !entry.passed).map(([name]) => name);
            const skipped = [...baseline.cases.entries()].filter(([, entry]) => entry.skipped).map(([name]) => name);
            report.checkouts[file] = {
                exitCode: baseline.code,
                total: baseline.cases.size,
                failed,
                skipped,
                // 零用例不算通过：否则依赖/加载问题会让 baseline 空跑变「假绿」，
                // 随后所有变异都被误归因为 infra 或更糟——被当成 survived/killed
                ok: baseline.code === 0 && failed.length === 0 && baseline.cases.size > 0
            };
        }
        report.baseline = testFiles.length
            ? { ok: Object.values(report.checkouts).every((item) => item.ok) }
            : { ok: true, reason: "无适用变异体（全部为平台排除），未执行 baseline" };
        if (!report.baseline.ok) {
            const detail = testFiles
                .map((file) => `${file}: exit=${report.checkouts[file].exitCode} failed=${JSON.stringify(report.checkouts[file].failed)}`)
                .join("\n");
            // baseline 不通过 → 环境/依赖/实现问题，不产出任何 killed
            report.results = selected.map((item) => {
                const gate = gates.get(item.id);
                if (gate?.outcome === "excluded") {
                    report.summary.excluded += 1;
                    return {
                        id: item.id,
                        description: item.description,
                        expect: item.expect,
                        outcome: "excluded",
                        platforms: gate.platforms,
                        testFile: item.testFile,
                        testName: item.testName,
                        matchedCase: null,
                        failureType: null,
                        diagnostic: null,
                        reason: gate.reason
                    };
                }
                report.summary["infrastructure-error"] += 1;
                return {
                    id: item.id,
                    description: item.description,
                    expect: item.expect,
                    outcome: "infrastructure-error",
                    platforms: gate?.platforms ?? null,
                    testFile: item.testFile,
                    testName: item.testName,
                    matchedCase: null,
                    failureType: null,
                    diagnostic: null,
                    reason: `baseline 未通过，无法归因到变异（依赖 node_modules: ${dependencies}）：\n${detail}`
                };
            });
            return; // finish 交给 finally，只执行一次
        }

        // ===== 2) 逐个变异体 =====
        for (const mutation of selected) {
            const gate = gates.get(mutation.id);
            if (gate) {
                // 平台不适用 / 声明无效：显式记录，不注入、不记 survived，也不进得分分母
                report.summary[gate.outcome] += 1;
                report.results.push({
                    id: mutation.id,
                    description: mutation.description,
                    expect: mutation.expect,
                    outcome: gate.outcome,
                    platforms: gate.platforms,
                    testFile: mutation.testFile,
                    testName: mutation.testName,
                    matchedCase: null,
                    failureType: null,
                    diagnostic: null,
                    reason: gate.reason
                });
                process.stderr.write(`${gate.outcome === "excluded" ? "EXCLUDED" : "INFRA   "} ${mutation.id} ${mutation.description}\n`);
                continue;
            }
            const applied = applyMutation(dir, mutation);
            if (!applied.ok) {
                report.results.push({
                    id: mutation.id,
                    description: mutation.description,
                    expect: mutation.expect,
                    outcome: "infrastructure-error",
                    failureType: null,
                    diagnostic: applied.reason,
                    reason: applied.reason
                });
                report.summary["infrastructure-error"] += 1;
                continue;
            }
            try {
                const run = runTest(mutation.testFile, { cwd: dir, timeoutMs: options.timeoutMs });
                const target = findCase(run.cases, mutation.testName);
                const otherFailures = [...run.cases.entries()]
                    .filter(([name, entry]) => !entry.passed && (!target || name !== target.name))
                    .map(([name]) => name);
                let outcome;
                let reason;
                // 文件级 not ok（name 就是测试文件本身）表示整套加载/启动失败；
                // 与「目标用例不存在」分开提示，便于 QA 区分注入位置错与依赖/语法环境问题
                const onlyFileLevel = run.cases.size === 1 && [...run.cases.keys()].some((name) =>
                    name === mutation.testFile || name.endsWith(path.basename(mutation.testFile)));
                if (run.timedOut) {
                    outcome = "infrastructure-error";
                    reason = `测试进程超时（${options.timeoutMs}ms，不可判定为检出缺陷）`;
                } else if (run.cases.size === 0 || onlyFileLevel) {
                    outcome = "infrastructure-error";
                    reason = `整套测试未产生用例级结果（退出码 ${run.code}），疑似加载/启动失败`;
                } else if (!target) {
                    outcome = "infrastructure-error";
                    reason = `目标用例不存在：${mutation.testName}（退出码 ${run.code}，可能整套测试崩溃）`;
                } else if (target.skipped) {
                    // 被 SKIP 等于没执行：不能当 survived（当前就是假 survived 的根源），
                    // 也不能当 equivalent/killed，更不能静默不计——单列并让退出码非零。
                    outcome = "skipped";
                    reason = `目标用例被 SKIP（${target.skipReason || "未提供原因"}）：未实际执行，不记为 killed/equivalent/survived，也不进得分分母；若属平台不适用，应在变异体声明 platforms 并走 excluded`;
                } else if (!target.passed) {
                    // 只有断言失败才算「测试检出了行为变化」；非断言崩溃属于基础设施/环境问题
                    if (target.code === "ERR_ASSERTION") {
                        outcome = "killed";
                        reason = `用例「${target.name}」由通过转为断言失败`;
                    } else {
                        outcome = "infrastructure-error";
                        reason = `目标用例失败但不是断言失败（code=${target.code || "无"}），不记为检出`;
                    }
                } else {
                    outcome = "survived";
                    reason = `用例「${target.name}」仍然通过（变异未被测试捕获）`;
                }
                // 等价变异体：声明为 equivalent 且行为未变化 → 记为 equivalent 而不是 survived
                if (outcome === "survived" && mutation.expect === "equivalent") {
                    outcome = "equivalent";
                    reason = `经确认为等价变异（不改变可观测行为）：${target.name} 仍通过`;
                }
                report.summary[outcome] += 1;
                report.results.push({
                    id: mutation.id,
                    description: mutation.description,
                    expect: mutation.expect,
                    outcome,
                    platforms: mutation.platforms ?? null,
                    testFile: mutation.testFile,
                    testName: mutation.testName,
                    matchedCase: target ? target.name : null,
                    skipped: Boolean(target?.skipped),
                    failureType: target ? target.failureType : null,
                    diagnostic: target ? target.diagnostic : (run.timedOut ? run.output.slice(-800).trim() || null : null),
                    exitCode: run.code,
                    otherFailures,
                    reason
                });
                process.stderr.write(`${outcome === "killed" ? "KILLED  " : outcome === "equivalent" ? "EQUIV   " : outcome === "survived" ? "SURVIVED" : "INFRA   "} ${mutation.id} ${mutation.description}\n`);
            } finally {
                applied.restore();
            }
        }
    } finally {
        // 唯一收尾点：baseline 失败分支直接 return，不会重复清理/写报告
        finish(report, dir, options);
    }
}

function finish(report, dir, options) {
    // 得分分母只含真正注入并取到结果的 killed+survived；excluded/skipped 不进分母。
    report.summary.applicable = report.summary.total - report.summary.excluded;
    report.summary.mutationScore = report.summary.killed + report.summary.survived
        ? Number((report.summary.killed / (report.summary.killed + report.summary.survived)).toFixed(3))
        : null;
    if (!options.keep) {
        fs.rmSync(dir, { recursive: true, force: true });
    } else {
        report.copyDir = dir;
    }
    const outputDir = path.join(options.repoRoot, "tests", "mutation", "artifacts");
    fs.mkdirSync(outputDir, { recursive: true });
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    const file = path.join(outputDir, `mutation-report-${stamp}-${process.pid}.json`);
    const payload = `${JSON.stringify(report, null, 2)}\n`;
    fs.writeFileSync(file, payload, "utf8");
    fs.writeFileSync(path.join(outputDir, "latest.json"), payload, "utf8");

    console.log("");
    console.log(`变异验证完成：killed=${report.summary.killed} survived=${report.summary.survived} equivalent=${report.summary.equivalent} skipped=${report.summary.skipped} excluded=${report.summary.excluded} infrastructure-error=${report.summary["infrastructure-error"]} / total=${report.summary.total}（适用 ${report.summary.applicable}）`);
    if (!report.baseline?.ok) console.log("注意：baseline 未通过，本次结果不产出 killed。");
    console.log(`依赖: node_modules=${report.dependencies}`);
    console.log(`报告: ${file}`);
    if (report.copyDir) console.log(`保留的隔离副本: ${report.copyDir}`);
    if (options.json) process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
    // 退出码：survived（真实覆盖缺口）、skipped（用例没执行，结论不完整）与
    // infrastructure-error 都非零；excluded 是显式平台排除，不算失败。
    const problems = report.summary.survived + report.summary["infrastructure-error"] + report.summary.skipped;
    process.exitCode = problems ? 1 : 0;
}

main().catch((error) => {
    // 脚本自身异常（清单加载、磁盘错误等）也要以非零退出，避免 CI 误判绿灯；
    // 单变异体的异常已在循环内被分类处理，不会走到这里。
    console.error(error?.stack || String(error));
    process.exitCode = 2;
});
