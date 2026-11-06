// 变异运行器自测：用「真正会失败的注入」验证分类器与收尾逻辑，而不是只跑一遍正常路径。
//
// 每个用例在 os.tmpdir() 下搭一个合成仓库（src/ + tests/comprehensive-synth.test.js），
// 再用 --repo-root/--mutations 让 run-mutations.mjs 对它执行真实变异，覆盖：
//   正常 killed + 等价控制组、目标用例不存在、语法错误后可继续注入、baseline 失败、
//   测试进程超时、测试文件加载失败、非断言崩溃不得算检出、真实 survived。
// 每次运行都断言：报告落盘唯一且完整、隔离副本被清理、退出码符合分类结果。
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const runner = path.join(here, "run-mutations.mjs");
const SYNTH_TEST = "tests/comprehensive-synth.test.js";

const BASE_LIB = `export function answer() {
    return 41;
}

export function unused(value) {
    return value + 1;
}
`;

const BASE_TEST = `import assert from "node:assert/strict";
import test from "node:test";
import { answer } from "../src/lib.js";

test("S1 answer 返回 41", () => {
    assert.equal(answer(), 41);
});
`;

function mutationCopies() {
    try {
        return fs.readdirSync(os.tmpdir()).filter((name) => name.startsWith("scenario-test-mutation-copy-")).sort();
    } catch {
        return [];
    }
}

function makeRepo({ lib, testSource }) {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "mutation-selftest-repo-"));
    fs.mkdirSync(path.join(dir, "src"), { recursive: true });
    fs.mkdirSync(path.join(dir, "tests", "fixtures", "comprehensive"), { recursive: true });
    fs.writeFileSync(path.join(dir, "src", "lib.js"), lib, "utf8");
    fs.writeFileSync(path.join(dir, SYNTH_TEST), testSource, "utf8");
    fs.writeFileSync(path.join(dir, "package.json"), JSON.stringify({ name: "selftest-repo", type: "module", private: true }, null, 2), "utf8");
    return dir;
}

function writeMutations(repoDir, mutations) {
    const file = path.join(repoDir, "mutations.mjs");
    fs.writeFileSync(file, `export const mutations = ${JSON.stringify(mutations, null, 2)};\n`, "utf8");
    return file;
}

function runRunner(repoDir, { mutations, args = [] }) {
    const result = spawnSync(process.execPath, [runner, "--repo-root", repoDir, "--mutations", mutations, ...args], {
        cwd: repoDir,
        encoding: "utf8",
        timeout: 120000
    });
    const artifacts = path.join(repoDir, "tests", "mutation", "artifacts");
    const files = fs.existsSync(artifacts) ? fs.readdirSync(artifacts) : [];
    const reportFiles = files.filter((name) => name.startsWith("mutation-report-"));
    const latestPath = path.join(artifacts, "latest.json");
    const report = fs.existsSync(latestPath) ? JSON.parse(fs.readFileSync(latestPath, "utf8")) : null;
    return { result, report, reportFiles, artifacts };
}

// 断言「唯一完整报告 + 副本清理」：这是收尾逻辑（二次 finish）缺陷的直接观测点
function assertSingleCleanReport(run, copiesBefore) {
    assert.equal(run.reportFiles.length, 1, `每次运行只应落一份变异报告，实际 ${JSON.stringify(run.reportFiles)}`);
    for (const name of run.reportFiles) {
        const parsed = JSON.parse(fs.readFileSync(path.join(run.artifacts, name), "utf8"));
        assert.equal(parsed.schemaVersion, 3);
        assert.equal(parsed.summary.total, parsed.results.length, "每个变异体都必须有一条结果");
        assert.equal(parsed.summary.applicable, parsed.summary.total - parsed.summary.excluded, "适用数 = 总数 - 平台排除数");
        assert.ok(typeof parsed.dependencies === "string" && parsed.dependencies.length > 0, "报告必须显式记录依赖装配状态");
    }
    assert.deepEqual(mutationCopies(), copiesBefore, "隔离副本必须被清理，不得残留");
}

function withRepo(inputs, body) {
    const dir = makeRepo(inputs);
    const copiesBefore = mutationCopies();
    try {
        return body(dir, copiesBefore);
    } finally {
        fs.rmSync(dir, { recursive: true, force: true });
    }
}

test("正常路径：killed 与等价控制组并存，报告唯一、副本清理、退出码 0", () => {
    withRepo({ lib: BASE_LIB, testSource: BASE_TEST }, (dir, copiesBefore) => {
        const mutations = writeMutations(dir, [
            {
                id: "T01",
                description: "answer 41→42",
                file: "src/lib.js",
                find: "return 41;",
                replace: "return 42;",
                testFile: SYNTH_TEST,
                testName: "S1 answer 返回 41",
                expect: "killed"
            },
            {
                id: "T02",
                description: "等价控制组：插入无副作用语句",
                file: "src/lib.js",
                find: "return 41;",
                replace: "return 41; void 0;",
                testFile: SYNTH_TEST,
                testName: "S1 answer 返回 41",
                expect: "equivalent"
            }
        ]);
        const run = runRunner(dir, { mutations });
        assert.equal(run.result.status, 0, run.result.stderr);
        assert.equal(run.report.baseline.ok, true);
        assert.equal(run.report.summary.killed, 1);
        assert.equal(run.report.summary.equivalent, 1);
        assert.equal(run.report.summary.survived, 0);
        assert.equal(run.report.summary["infrastructure-error"], 0);
        const killed = run.report.results.find((item) => item.id === "T01");
        assert.equal(killed.outcome, "killed");
        assert.equal(killed.matchedCase, "S1 answer 返回 41");
        assert.equal(killed.failureType, "testCodeFailure");
        assert.match(String(killed.diagnostic), /41/, "必须保存最小诊断（实际/期望值）");
        assert.equal(run.report.results.find((item) => item.id === "T02").outcome, "equivalent");
        assertSingleCleanReport(run, copiesBefore);
    });
});

test("故障注入：目标用例不存在 → infra、matchedCase 为 null、不抛异常、退出码 1", () => {
    withRepo({ lib: BASE_LIB, testSource: BASE_TEST }, (dir, copiesBefore) => {
        const mutations = writeMutations(dir, [{
            id: "T10",
            description: "指向不存在的用例",
            file: "src/lib.js",
            find: "return 41;",
            replace: "return 42;",
            testFile: SYNTH_TEST,
            testName: "S99 不存在的用例",
            expect: "killed"
        }]);
        const run = runRunner(dir, { mutations });
        assert.equal(run.result.status, 1);
        assert.doesNotMatch(run.result.stderr, /TypeError|Cannot read properties of null/, "不得因 matchedCase 空值崩溃");
        assert.equal(run.report.summary["infrastructure-error"], 1);
        assert.equal(run.report.summary.killed, 0);
        const entry = run.report.results[0];
        assert.equal(entry.outcome, "infrastructure-error");
        assert.equal(entry.matchedCase, null);
        assert.match(entry.reason, /目标用例不存在/);
        assertSingleCleanReport(run, copiesBefore);
    });
});

test("故障注入：语法错误记为 infra，且副本被还原、后续变异仍能注入并 killed", () => {
    withRepo({ lib: BASE_LIB, testSource: BASE_TEST }, (dir, copiesBefore) => {
        const mutations = writeMutations(dir, [
            {
                id: "T20",
                description: "注入语法错误",
                file: "src/lib.js",
                find: "return 41;",
                replace: "return (41;",
                testFile: SYNTH_TEST,
                testName: "S1 answer 返回 41",
                expect: "killed"
            },
            {
                id: "T21",
                description: "语法错误后仍可注入的行为变异",
                file: "src/lib.js",
                find: "return 41;",
                replace: "return 43;",
                testFile: SYNTH_TEST,
                testName: "S1 answer 返回 41",
                expect: "killed"
            }
        ]);
        const run = runRunner(dir, { mutations });
        assert.equal(run.result.status, 1);
        const syntax = run.report.results.find((item) => item.id === "T20");
        assert.equal(syntax.outcome, "infrastructure-error");
        assert.match(syntax.reason, /语法检查失败/);
        assert.equal(run.report.results.find((item) => item.id === "T21").outcome, "killed", "语法错误后副本必须已还原");
        assertSingleCleanReport(run, copiesBefore);
    });
});

test("故障注入：baseline 失败 → 全部 infra、killed=0、唯一报告（不重复 finish）、退出码 1", () => {
    const badTest = `import assert from "node:assert/strict";
import test from "node:test";
import { answer } from "../src/lib.js";

test("S1 answer 返回 41", () => {
    assert.equal(answer(), 999);
});
`;
    withRepo({ lib: BASE_LIB, testSource: badTest }, (dir, copiesBefore) => {
        const mutations = writeMutations(dir, [
            {
                id: "T30",
                description: "answer 41→42",
                file: "src/lib.js",
                find: "return 41;",
                replace: "return 42;",
                testFile: SYNTH_TEST,
                testName: "S1 answer 返回 41",
                expect: "killed"
            },
            {
                id: "T31",
                description: "等价控制组",
                file: "src/lib.js",
                find: "return 41;",
                replace: "return 41; void 0;",
                testFile: SYNTH_TEST,
                testName: "S1 answer 返回 41",
                expect: "equivalent"
            }
        ]);
        const run = runRunner(dir, { mutations });
        assert.equal(run.result.status, 1);
        assert.equal(run.report.baseline.ok, false);
        assert.equal(run.report.summary.killed, 0, "baseline 失败不得产出 killed");
        assert.equal(run.report.summary["infrastructure-error"], 2);
        assert.equal(run.report.results.length, 2);
        for (const entry of run.report.results) {
            assert.equal(entry.outcome, "infrastructure-error");
            assert.match(entry.reason, /baseline 未通过/);
        }
        assertSingleCleanReport(run, copiesBefore);
    });
});

test("故障注入：测试进程超时 → infra（不记为检出）", () => {
    const lib = `export function answer() {
    return 41;
}

export function maybeHang() {
    return 1;
}
`;
    const testSource = `import assert from "node:assert/strict";
import test from "node:test";
import { answer, maybeHang } from "../src/lib.js";

test("S1 answer 返回 41", () => {
    assert.equal(answer(), 41);
});

test("S5 maybeHang 快速返回", () => {
    assert.equal(maybeHang(), 1);
});
`;
    withRepo({ lib, testSource }, (dir, copiesBefore) => {
        const mutations = writeMutations(dir, [{
            id: "T40",
            description: "把快速返回改成死循环",
            file: "src/lib.js",
            find: "return 1;",
            replace: "while (true) { /* spin */ }",
            testFile: SYNTH_TEST,
            testName: "S5 maybeHang 快速返回",
            expect: "killed"
        }]);
        const run = runRunner(dir, { mutations, args: ["--timeout", "2"] });
        assert.equal(run.result.status, 1);
        const entry = run.report.results[0];
        assert.equal(entry.outcome, "infrastructure-error");
        assert.match(entry.reason, /超时/);
        assertSingleCleanReport(run, copiesBefore);
    });
});

test("故障注入：测试文件加载失败 → infra，且原因可定位", () => {
    withRepo({ lib: BASE_LIB, testSource: BASE_TEST }, (dir, copiesBefore) => {
        const mutations = writeMutations(dir, [{
            id: "T50",
            description: "模块级静态导入不存在的依赖",
            file: "src/lib.js",
            find: "export function answer() {",
            replace: 'import "./missing-dep.js";\n\nexport function answer() {',
            testFile: SYNTH_TEST,
            testName: "S1 answer 返回 41",
            expect: "killed"
        }]);
        const run = runRunner(dir, { mutations });
        assert.equal(run.result.status, 1);
        const entry = run.report.results[0];
        assert.equal(entry.outcome, "infrastructure-error");
        assert.match(entry.reason, /整套测试未产生|目标用例不存在/);
        assertSingleCleanReport(run, copiesBefore);
    });
});

test("非断言崩溃（TypeError）不得记为检出：failureType/诊断保留、outcome=infra", () => {
    const lib = `export function rows() {
    return [1];
}
`;
    const testSource = `import assert from "node:assert/strict";
import test from "node:test";
import { rows } from "../src/lib.js";

test("S7 rows 可追加", () => {
    const list = rows();
    list.push(2);
    assert.equal(list.length, 2);
});
`;
    withRepo({ lib, testSource }, (dir, copiesBefore) => {
        const mutations = writeMutations(dir, [{
            id: "T60",
            description: "rows 返回 number，导致测试 TypeError",
            file: "src/lib.js",
            find: "return [1];",
            replace: "return 41;",
            testFile: SYNTH_TEST,
            testName: "S7 rows 可追加",
            expect: "killed"
        }]);
        const run = runRunner(dir, { mutations });
        assert.equal(run.result.status, 1);
        const entry = run.report.results[0];
        assert.equal(entry.outcome, "infrastructure-error", "对目标用例的崩溃不能泛化成「检出」");
        assert.equal(entry.matchedCase, "S7 rows 可追加");
        assert.equal(entry.failureType, "testCodeFailure");
        assert.match(String(entry.diagnostic), /push/, "必须保留最小诊断供 QA 核对");
        assert.match(entry.reason, /不是断言失败/);
        assertSingleCleanReport(run, copiesBefore);
    });
});

test("真实 survived：变异未被测试捕获时退出码 1、mutationScore 0", () => {
    withRepo({ lib: BASE_LIB, testSource: BASE_TEST }, (dir, copiesBefore) => {
        const mutations = writeMutations(dir, [{
            id: "T70",
            description: "未被测试覆盖的 unused 改成 +2",
            file: "src/lib.js",
            find: "return value + 1;",
            replace: "return value + 2;",
            testFile: SYNTH_TEST,
            testName: "S1 answer 返回 41",
            expect: "killed"
        }]);
        const run = runRunner(dir, { mutations });
        assert.equal(run.result.status, 1);
        assert.equal(run.report.summary.survived, 1);
        assert.equal(run.report.summary.killed, 0);
        assert.equal(run.report.summary.mutationScore, 0);
        assert.equal(run.report.results[0].outcome, "survived");
        assertSingleCleanReport(run, copiesBefore);
    });
});

// ===== 本轮收尾适配：平台排除（platform-not-applicable）与 SKIP 不得冒充检出/存活 =====

test("平台排除：声明不含当前平台 → excluded、不进分母、不跑 baseline、退出码 0", () => {
    withRepo({ lib: BASE_LIB, testSource: BASE_TEST }, (dir, copiesBefore) => {
        const otherPlatform = process.platform === "linux" ? "darwin" : "linux";
        const mutations = writeMutations(dir, [{
            id: "T80",
            description: "本平台不适用的变异体（若注入会被 killed）",
            file: "src/lib.js",
            find: "return 41;",
            replace: "return 42;",
            testFile: SYNTH_TEST,
            testName: "S1 answer 返回 41",
            expect: "killed",
            platforms: [otherPlatform]
        }]);
        const run = runRunner(dir, { mutations });
        assert.equal(run.result.status, 0, run.result.stderr);
        assert.equal(run.report.summary.excluded, 1);
        assert.equal(run.report.summary.applicable, 0, "平台排除项不得计入适用分母");
        assert.equal(run.report.summary.killed, 0);
        assert.equal(run.report.summary.survived, 0, "平台排除不得冒充 survived 覆盖缺口");
        assert.equal(run.report.summary.equivalent, 0);
        assert.equal(run.report.summary.skipped, 0);
        assert.equal(run.report.summary["infrastructure-error"], 0);
        assert.equal(run.report.summary.mutationScore, null, "全部被排除时没有得分分母");
        assert.equal(run.report.baseline.ok, true);
        assert.match(String(run.report.baseline.reason), /未执行 baseline/);
        const entry = run.report.results[0];
        assert.equal(entry.outcome, "excluded");
        assert.match(entry.reason, /平台不适用/);
        assert.match(entry.reason, new RegExp(otherPlatform));
        assert.deepEqual(entry.platforms, [otherPlatform]);
        assertSingleCleanReport(run, copiesBefore);
    });
});

test("平台命中：声明含当前平台时照常注入并 killed（平台声明不得变成跳过）", () => {
    withRepo({ lib: BASE_LIB, testSource: BASE_TEST }, (dir, copiesBefore) => {
        const mutations = writeMutations(dir, [{
            id: "T81",
            description: "声明当前平台，真实注入",
            file: "src/lib.js",
            find: "return 41;",
            replace: "return 42;",
            testFile: SYNTH_TEST,
            testName: "S1 answer 返回 41",
            expect: "killed",
            platforms: [process.platform]
        }]);
        const run = runRunner(dir, { mutations });
        assert.equal(run.result.status, 0, run.result.stderr);
        assert.equal(run.report.summary.killed, 1);
        assert.equal(run.report.summary.excluded, 0);
        assert.equal(run.report.summary.applicable, 1);
        assert.equal(run.report.results[0].outcome, "killed");
        assert.equal(run.report.baseline.ok, true);
        assert.deepEqual(run.report.results[0].platforms, [process.platform]);
        assertSingleCleanReport(run, copiesBefore);
    });
});

test("SKIP 不误判：目标用例被 skip → skipped（非 killed/equivalent/survived），退出码 1", () => {
    const testSource = `import assert from "node:assert/strict";
import test from "node:test";
import { answer } from "../src/lib.js";

test("S1 answer 返回 41", () => {
    assert.equal(answer(), 41);
});

test("S2 平台跳过用例", { skip: "当前平台不适用" }, () => {
    assert.equal(answer(), 41);
});
`;
    withRepo({ lib: BASE_LIB, testSource }, (dir, copiesBefore) => {
        const mutations = writeMutations(dir, [
            {
                id: "T82",
                description: "目标用例被 skip 的 killed 预期",
                file: "src/lib.js",
                find: "return 41;",
                replace: "return 42;",
                testFile: SYNTH_TEST,
                testName: "S2 平台跳过用例",
                expect: "killed"
            },
            {
                id: "T83",
                description: "目标用例被 skip 的等价预期（不得记 equivalent）",
                file: "src/lib.js",
                find: "return 41;",
                replace: "return 41; void 0;",
                testFile: SYNTH_TEST,
                testName: "S2 平台跳过用例",
                expect: "equivalent"
            }
        ]);
        const run = runRunner(dir, { mutations });
        assert.equal(run.result.status, 1, "意外 SKIP 必须非零退出，不能默默不计");
        assert.equal(run.report.summary.skipped, 2);
        assert.equal(run.report.summary.killed, 0, "skip 不等于 killed");
        assert.equal(run.report.summary.equivalent, 0, "skip 不等于 equivalent");
        assert.equal(run.report.summary.survived, 0, "skip 不等于 survived");
        assert.equal(run.report.summary.mutationScore, null);
        for (const entry of run.report.results) {
            assert.equal(entry.outcome, "skipped");
            assert.equal(entry.matchedCase, "S2 平台跳过用例");
            assert.equal(entry.skipped, true);
            assert.match(entry.reason, /SKIP/);
            assert.match(entry.reason, /当前平台不适用/);
        }
        assertSingleCleanReport(run, copiesBefore);
    });
});

test("平台声明无效（空数组）→ infra，不静默排除也不冒充不适用", () => {
    withRepo({ lib: BASE_LIB, testSource: BASE_TEST }, (dir, copiesBefore) => {
        const mutations = writeMutations(dir, [{
            id: "T84",
            description: "platforms 为空数组（配置错误）",
            file: "src/lib.js",
            find: "return 41;",
            replace: "return 42;",
            testFile: SYNTH_TEST,
            testName: "S1 answer 返回 41",
            expect: "killed",
            platforms: []
        }]);
        const run = runRunner(dir, { mutations });
        assert.equal(run.result.status, 1);
        assert.equal(run.report.summary["infrastructure-error"], 1);
        assert.equal(run.report.summary.excluded, 0);
        assert.equal(run.report.results[0].outcome, "infrastructure-error");
        assert.match(run.report.results[0].reason, /platforms 声明无效/);
        assertSingleCleanReport(run, copiesBefore);
    });
});
