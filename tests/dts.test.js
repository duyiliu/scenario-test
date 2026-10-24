import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import test from "node:test";
import * as esmExports from "../src/index.js";
import { contract } from "../src/index.js";

const root = path.resolve(import.meta.dirname, "..");
const dtsPath = path.join(root, "dist", "scenario-test.d.ts");

function parseUnion(dts, typeName) {
    const match = new RegExp(`export type ${typeName} = (.+);`).exec(dts);
    assert.ok(match, `d.ts 缺少 ${typeName} 联合类型`);
    return match[1].split("|").map((item) => item.trim().replace(/^"|"$/g, "")).sort();
}

// 提取接口的顶层成员名（跳过 JSDoc/注释行）；同时服务属性覆盖校验与形状对拍
function interfaceMembers(dts, name) {
    const start = dts.indexOf(`export interface ${name} {`);
    assert.ok(start >= 0, `d.ts 缺少 interface ${name}`);
    const body = dts.slice(start, dts.indexOf("\n}", start));
    const members = new Set();
    for (const line of body.split("\n")) {
        if (/^\s*(\/\/|\*|\/\*)/.test(line)) continue;
        const match = /^\s+(\w+)\?*[(:]/.exec(line);
        if (match) members.add(match[1]);
    }
    return members;
}

test("d.ts 由 contract 投影：操作符/保留变量/类型名单与 contract 完全一致", () => {
    assert.equal(fs.existsSync(dtsPath), true, "请先执行 npm run build 生成 dist/scenario-test.d.ts");
    const dts = fs.readFileSync(dtsPath, "utf8");
    // 版本标记（doctor 版本握手依赖）
    assert.match(dts, new RegExp(`scenario-test v${contract.runtimeVersion}`));
    assert.match(dts, new RegExp(`contract v${contract.contractVersion}`));

    assert.deepEqual(parseUnion(dts, "AssertionOperator"), Object.keys(contract.assertions.operators).sort());
    assert.deepEqual(parseUnion(dts, "NumericAssertionOperator"), [...contract.assertions.numericOperators].sort());
    assert.deepEqual(parseUnion(dts, "AssertionMetaKey"), [...contract.assertions.metaKeys].sort());
    assert.deepEqual(parseUnion(dts, "ReservedVar"), [...contract.reservedVars].sort());
    assert.deepEqual(parseUnion(dts, "GeneratedVarType"), [...contract.generatedVars.types].sort());
    assert.deepEqual(parseUnion(dts, "GlobalParamType"), [...contract.globals.types].sort());
    assert.deepEqual(parseUnion(dts, "WhenSource"), [...contract.when.sources].sort());
    assert.deepEqual(parseUnion(dts, "WhenTarget"), [...contract.when.targets].sort());
    assert.deepEqual(parseUnion(dts, "ExtractSource"), [...contract.extract.from].sort());
    assert.deepEqual(parseUnion(dts, "FailurePolicy"), [...contract.scenario.failurePolicies].sort());
    assert.deepEqual(parseUnion(dts, "RetryOn"), [...contract.retryUntil.retryOn].sort());
});

test("d.ts 覆盖公共 API 与 UMD 全局声明", () => {
    const dts = fs.readFileSync(dtsPath, "utf8");
    for (const symbol of [
        "export interface ScenarioConfig",
        "export interface Environment",
        "export interface ScenarioListItem",
        "export interface ScenarioDefinition",
        "export interface Step",
        "export interface RetryUntil",
        "export interface Assertion",
        "export interface ExtractDefinition",
        "export interface WhenDefinition",
        "export interface ScenarioApp",
        "export function createApp",
        "export function createEngine",
        "export function defineConfig",
        "export function defineScenario",
        "export function registerConfig",
        "export function registerScenario",
        "export as namespace ScenarioTest"
    ]) {
        assert.ok(dts.includes(symbol), `d.ts 缺少 ${symbol}`);
    }
    // WhenDefinition 的来源/响应级目标与 contract 一致
    assert.match(dts, /from\?: WhenSource/);
    assert.match(dts, /target\?: WhenTarget/);
    // retryUntil.retryOn 与 onAttempt 错误信息由 contract/引擎行为投射
    assert.match(dts, /retryOn\?: RetryOn\[\]/);
    assert.match(dts, /errorType: "" \| "error" \| "timeout";/);
    assert.match(dts, /errorMessage: string;/);
});

test("d.ts Assertion/WhenDefinition 接口属性必须覆盖 contract 全部断言操作符（防手写接口漏新增操作符）", () => {
    const dts = fs.readFileSync(dtsPath, "utf8");
    const operators = Object.keys(contract.assertions.operators);
    for (const name of ["Assertion", "WhenDefinition"]) {
        const members = interfaceMembers(dts, name);
        const missing = operators.filter((op) => !members.has(op));
        assert.deepEqual(missing, [], `d.ts ${name} 接口缺少操作符属性: ${missing.join(", ")}`);
    }
    // valueType → TS 类型抽查：startsWith/endsWith 必须是 string（联合类型有而接口漏声明的回归即在此暴露）
    assert.match(dts, /export interface Assertion \{[^}]*startsWith\?: string;/s);
    assert.match(dts, /export interface WhenDefinition \{[^}]*startsWith\?: string;/s);
    // valueType → TS 类型抽查：each 的 assertion 映射（valueTypeToTs 表漏 assertion 键时构建即报错，此处锁生成结果形状）
    assert.match(dts, /export interface Assertion \{[^}]*each\?: Assertion \| Assertion\[\];/s);
    assert.match(dts, /export interface WhenDefinition \{[^}]*each\?: Assertion \| Assertion\[\];/s);
});

test("d.ts 声明的公共导出符号（value）必须存在于 ESM 与 CJS 实际导出中（无幻影符号）", () => {
    const dts = fs.readFileSync(dtsPath, "utf8");
    // 提取 d.ts 声明的运行时 value 符号：export function / export const / export declare const
    const declared = new Set();
    for (const match of dts.matchAll(/^export (?:declare )?(?:function|const|var|let)\s+(\w+)/gm)) {
        declared.add(match[1]);
    }
    assert.ok(declared.size > 0, "d.ts 未声明任何 value 导出");
    assert.ok(declared.has("VERSION"), "d.ts 应声明 VERSION");
    assert.ok(declared.has("CONTRACT_VERSION"), "d.ts 应声明 CONTRACT_VERSION");
    assert.ok(declared.has("createApp"), "d.ts 应声明 createApp");

    const esmNames = new Set(Object.keys(esmExports));
    const missingInEsm = [...declared].filter((name) => !esmNames.has(name));
    assert.deepEqual(missingInEsm, [], `d.ts 声明了 ESM 中不存在的导出: ${missingInEsm.join(", ")}`);

    // CJS 产物（构建后存在时验证；未构建时跳过，由 npm run build 后的复跑覆盖）
    const cjsPath = path.join(root, "dist", "scenario-test.cjs");
    if (fs.existsSync(cjsPath)) {
        const require = createRequire(import.meta.url);
        const cjsExports = require(cjsPath);
        const missingInCjs = [...declared].filter((name) => !(name in cjsExports));
        assert.deepEqual(missingInCjs, [], `d.ts 声明了 CJS 中不存在的导出: ${missingInCjs.join(", ")}`);
    }
});

function runTsc(args) {
    // Windows 上 tsc 是 .cmd 包装，需要 shell 执行
    return process.platform === "win32"
        ? spawnSync("tsc", args, { encoding: "utf8", shell: true })
        : spawnSync("tsc", args, { encoding: "utf8" });
}

test("tsc --noEmit 验证最小 JS 用例（全局 tsc 可用时）", (t) => {
    const check = runTsc(["--version"]);
    if (check.status !== 0) {
        t.skip("未找到全局 tsc，跳过类型验证（d.ts 文本一致性测试仍然有效）");
        return;
    }
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "scenario-test-dts-"));
    try {
        const typesDir = path.join(dir, "types");
        fs.mkdirSync(typesDir);
        fs.copyFileSync(dtsPath, path.join(typesDir, "scenario-test.d.ts"));
        // 合法用例：应无错误（含 Assertion/WhenDefinition 的 startsWith 属性）
        fs.writeFileSync(path.join(dir, "ok.js"), `// @ts-check
/** @type {import('./types/scenario-test').ScenarioDefinition} */
const scenario = { name: "示例", steps: [{ name: "请求", method: "GET", path: "api/x", status: 200, assertions: [{ path: "data.total", gte: 5 }, { path: "data.name", startsWith: "pre" }], extract: [{ name: "id", path: "data.id", required: true }], when: { from: "vars", path: "id", exists: true, startsWith: "1" } }], failurePolicy: "stop" };
/** @type {import('./types/scenario-test').ScenarioListItem} */
const entry = { id: "health", url: "scenarios/health.js", manual: true };
/** @type {import('./types/scenario-test').Assertion} */
const assertion = { path: "code", oneOf: [200, 201] };
`, "utf8");
        // 非法用例：未知断言键应报错；startsWith 期望值必须 string
        fs.writeFileSync(path.join(dir, "bad.js"), `// @ts-check
/** @type {import('./types/scenario-test').Assertion} */
const bad = { path: "code", unknownOperator: 1 };
/** @type {import('./types/scenario-test').WhenDefinition} */
const badWhen = { from: "vars", startsWith: 123 };
`, "utf8");
        fs.writeFileSync(path.join(dir, "tsconfig.json"), JSON.stringify({
            compilerOptions: {
                noEmit: true,
                strict: true,
                checkJs: true,
                allowJs: true,
                target: "es2020",
                module: "esnext",
                moduleResolution: "bundler",
                lib: ["es2020", "dom"],
                types: []
            },
            include: ["ok.js", "bad.js"]
        }));
        const result = runTsc(["-p", dir]);
        const output = `${result.stdout}\n${result.stderr}`;
        // TS 退出码非 0 即代表类型错误（不同 TS 版本可能用 1 或 2）
        assert.notEqual(result.status, 0, `tsc 应因 bad.js 报错: ${output}`);
        assert.match(output, /unknownOperator/);
        // bad.js 第 5 行是 WhenDefinition.startsWith: 123（number 不可赋给 string）；
        // 部分 TS 版本的属性级错误消息不含属性名，故按行号锚定
        assert.match(output, /bad\.js\(5,/);
        assert.doesNotMatch(output, /ok\.js/);
    } finally {
        fs.rmSync(dir, { recursive: true, force: true });
    }
});
test("d.ts 形状与运行时实际 API 一致（防手写形状无声漂移）", async () => {
    const dts = fs.readFileSync(dtsPath, "utf8");

    // 1) Engine ↔ createEngine() 实际方法集（双向：不允许多声明也不允许漏声明）
    const engine = esmExports.createEngine({ fetch: async () => new Response("{}", { status: 200 }) });
    const engineMethods = new Set(Object.keys(engine));
    const declaredEngine = interfaceMembers(dts, "Engine");
    assert.deepEqual([...engineMethods].filter((name) => !declaredEngine.has(name)), [], "engine 实际方法未在 d.ts Engine 声明");
    assert.deepEqual([...declaredEngine].filter((name) => !engineMethods.has(name)), [], "d.ts Engine 声明了 engine 不存在的方法");

    // 2) ScenarioApp ↔ src/browser/app.js createApp 返回形状（app 需 DOM，静态提取源码 return 块）
    // 从 createApp 函数体内定位 return 块（app.js 有多个 return 块，lastIndexOf 会取错），
    // 块内按 8 空格缩进只取顶层属性名，纯格式重构（如 return ({ ... })）不应让防线误报
    const appSource = fs.readFileSync(path.join(root, "src/browser/app.js"), "utf8");
    const fnIndex = appSource.indexOf("export function createApp");
    assert.ok(fnIndex > 0, "app.js 缺少 export function createApp");
    const bodyStart = appSource.indexOf("return", fnIndex);
    assert.ok(bodyStart > 0, "app.js createApp 缺少 return 块");
    const braceStart = appSource.indexOf("{", bodyStart);
    const returnBlock = appSource.slice(bodyStart, appSource.indexOf("};", braceStart));
    const appMethods = new Set([...returnBlock.matchAll(/(?:^|\n)\s{8}(\w+)[,:(]/g)].map((item) => item[1]));
    const declaredApp = interfaceMembers(dts, "ScenarioApp");
    assert.deepEqual([...appMethods].filter((name) => !declaredApp.has(name)), [], "createApp 实际方法未在 d.ts ScenarioApp 声明");
    assert.deepEqual([...declaredApp].filter((name) => !appMethods.has(name)), [], "d.ts ScenarioApp 声明了 createApp 不存在的方法");

    // 3) Step 接口必须覆盖契约声明的全部步骤字段
    const declaredStep = interfaceMembers(dts, "Step");
    for (const key of contract.scenario.stepKeys) {
        assert.ok(declaredStep.has(key), `d.ts Step 缺少契约步骤字段 ${key}`);
    }

    // 4) 运行时报告/步骤结果字段 ⊆ d.ts 声明（含超时路径的 cancelled/timedOut）
    const report = await engine.runScenario(esmExports.defineScenario({
        name: "形状-通过",
        steps: [{ name: "ok", path: "p", status: 200 }]
    }));
    const timeoutEngine = esmExports.createEngine({
        fetch: (url, options) => new Promise((resolve, reject) => {
            options.signal.addEventListener("abort", () => reject(options.signal.reason));
        })
    });
    const timeoutReport = await timeoutEngine.runScenario(esmExports.defineScenario({
        name: "形状-超时",
        steps: [{ name: "hang", path: "p", timeoutMs: 10 }]
    }));
    const declaredReport = interfaceMembers(dts, "ScenarioReport");
    const declaredStepResult = interfaceMembers(dts, "ScenarioStepResult");
    for (const actual of [report, timeoutReport]) {
        assert.deepEqual(
            Object.keys(actual).filter((key) => !declaredReport.has(key)),
            [],
            "runScenario 返回了 d.ts ScenarioReport 未声明的字段"
        );
        for (const step of actual.results) {
            assert.deepEqual(
                Object.keys(step).filter((key) => !declaredStepResult.has(key)),
                [],
                "runStep 返回了 d.ts ScenarioStepResult 未声明的字段"
            );
        }
    }
});
