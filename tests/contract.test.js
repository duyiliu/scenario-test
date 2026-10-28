import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import {
    ASSERTION_META_KEYS,
    ASSERTION_OPERATORS,
    CONTRACT_VERSION,
    GLOBAL_TYPES,
    RESERVED_VARS,
    contract
} from "../src/index.js";
import { VERSION } from "../src/version.generated.js";

test("contract 元信息：contractVersion 为正整数（新增能力时递增），runtimeVersion 复用 VERSION", () => {
    assert.ok(Number.isInteger(CONTRACT_VERSION) && CONTRACT_VERSION >= 1);
    assert.equal(contract.contractVersion, CONTRACT_VERSION);
    assert.equal(contract.runtimeVersion, VERSION);
});

test("contract 与 core 导出名单一致（同一份名单）", () => {
    assert.deepEqual(ASSERTION_OPERATORS, Object.keys(contract.assertions.operators));
    assert.deepEqual(ASSERTION_META_KEYS, [...contract.assertions.metaKeys]);
    assert.deepEqual(RESERVED_VARS, [...contract.reservedVars]);
    assert.deepEqual(GLOBAL_TYPES, [...contract.globals.types]);
});

test("每个操作符含说明；数值比较操作符标注有限 number 约束", () => {
    for (const [name, meta] of Object.entries(contract.assertions.operators)) {
        assert.equal(typeof meta.description, "string");
        assert.ok(meta.description.length > 0, `操作符 ${name} 缺少说明`);
        assert.equal(typeof meta.valueType, "string");
    }
    assert.equal(contract.assertions.numericOperators.length, 4);
    for (const op of contract.assertions.numericOperators) {
        assert.equal(contract.assertions.operators[op].valueType, "finiteNumber");
    }
});

test("when 来源含 vars/suite/lastResponse/status；extract 来源、作用域与 required 语义；保留变量；generatedVars 类型", () => {
    assert.deepEqual(contract.when.sources, ["vars", "suite", "lastResponse", "status"]);
    assert.deepEqual(contract.when.targets, ["status"]);
    assert.deepEqual(contract.assertions.from, ["body", "vars", "suite", "headers", "bodyText"]);
    assert.deepEqual(contract.assertions.targets, ["status", "duration"]);
    assert.deepEqual(contract.extract.from, ["body", "headers", "bodyText", "response"]);
    assert.deepEqual(contract.extract.scopes, ["step", "suite"]);
    assert.deepEqual(contract.extract.targets, ["status"]);
    assert.deepEqual(contract.extract.metaKeys, ["name", "path", "from", "target", "header", "required", "default", "scope"]);
    assert.equal(contract.extract.scope, "step");
    assert.equal(contract.extract.required, "boolean");
    assert.deepEqual(contract.reservedVars, ["runId", "runNo", "__proto__", "constructor", "prototype"]);
    assert.deepEqual(contract.generatedVars.types, ["timestamp", "uuidHex", "md5", "signature", "idcard", "luhn", "phone", "uscc", "uuid", "enum"]);
});

test("config/scenario 关键字段含 manual；CLI 命令与参数含 capabilities/doctor/fail-on-skip", () => {
    assert.ok(contract.config.configKeys.includes("requestTimeoutMs"));
    assert.ok(contract.config.configKeys.includes("baseUrl"));
    assert.ok(contract.config.configKeys.includes("envs"));
    assert.ok(contract.config.scenarioItemKeys.includes("id"));
    assert.ok(contract.config.scenarioItemKeys.includes("url"));
    assert.ok(contract.config.scenarioItemKeys.includes("manual"));
    assert.equal(contract.config.manual.type, "boolean");
    assert.ok(contract.scenario.keys.includes("steps"));
    assert.ok(contract.scenario.stepKeys.includes("assertions"));
    assert.ok(contract.scenario.stepKeys.includes("when"));
    assert.ok(contract.scenario.stepKeys.includes("retryUntil"));
    assert.deepEqual(contract.scenario.failurePolicies, ["stop", "continue"]);
    for (const command of ["run", "serve", "init", "capabilities", "doctor", "import"]) {
        assert.ok(contract.cli.commands.includes(command), `CLI 命令缺少 ${command}`);
    }
    for (const option of ["har", "curl", "output", "host", "max-entries"]) {
        assert.equal(contract.cli.options[option].kind, "value", `import 选项缺少 --${option}`);
    }
    assert.equal(contract.cli.options.output.aliases[0], "out");
    assert.equal(contract.cli.options["max-entries"].parse, "number");
    assert.equal(contract.cli.options["fail-on-skip"].kind, "flag");
    assert.equal(contract.cli.options.json.kind, "flag");
    assert.deepEqual(contract.cli.options.token.aliases, ["authorization"]);
    assert.equal(contract.cli.options.config.kind, "value");
    assert.equal(contract.cli.options["library-url"].kind, "value");
    assert.equal(contract.cli.options["library-url"].prop, "libraryUrl");
});

test("contract.engines 与 package.json engines 一致", () => {
    const packageInfo = JSON.parse(fs.readFileSync(path.resolve(import.meta.dirname, "../package.json"), "utf8"));
    assert.equal(contract.engines.node, packageInfo.engines.node);
});

test("init 模板（AI Prompt/Patterns/README）能力名单从 contract 投影，无手抄名单", async () => {
    const { createProjectFiles } = await import("../src/init-templates.js");
    const files = createProjectFiles("scenario-test");
    const prompt = files["scenario-test/.scenario-test/AI_SCENARIO_PROMPT.md"];
    const patterns = files["scenario-test/.scenario-test/SCENARIO_PATTERNS.md"];
    const readme = files["scenario-test/README.md"];
    const operators = Object.keys(contract.assertions.operators);
    for (const op of operators) {
        assert.ok(prompt.includes(op), `AI Prompt 缺少操作符 ${op}`);
        assert.ok(patterns.includes(op), `SCENARIO_PATTERNS 缺少操作符 ${op}`);
        assert.ok(readme.includes(op), `README 模板缺少操作符 ${op}`);
    }
    // globals 类型投影
    for (const type of contract.globals.types) {
        assert.ok(readme.includes(`\`${type}\``), `README 模板缺少 globals 类型 ${type}`);
    }
    // when 来源投影（契约新增来源必须同步到 AI Prompt 与模式库）
    for (const source of contract.when.sources) {
        assert.ok(prompt.includes(`from: "${source}"`), `AI Prompt 缺少 when 来源 ${source}`);
        assert.ok(patterns.includes(`from: '${source}'`), `SCENARIO_PATTERNS 缺少 when 来源 ${source}`);
    }
});

test("对外接入文档使用 Skill 和当前版本的安装脚本", () => {
    const scenarioPrompt = fs.readFileSync(path.resolve(import.meta.dirname, "../docs/AI_SCENARIO_PROMPT.md"), "utf8");
    const examplesIndex = fs.readFileSync(path.resolve(import.meta.dirname, "../examples/EXAMPLES_INDEX.md"), "utf8");
    assert.match(scenarioPrompt, /仓库预览/);
    assert.match(scenarioPrompt, /业务用户不要直接复制本文件/);
    assert.match(scenarioPrompt, /实际执行时，以.*项目.*文件为准/);
    assert.match(scenarioPrompt, /不复制完整模板和操作符名单/);
    // README 是 Skill 查找固定版本安装脚本的入口，版本须与当前运行时一致。
    const readme = fs.readFileSync(path.resolve(import.meta.dirname, "../README.md"), "utf8");
    const skill = fs.readFileSync(path.resolve(import.meta.dirname, "../skills/scenario-test/SKILL.md"), "utf8");
    const quickInstall = readme.match(/^## 快速接入\s*\n[\s\S]*?(?=^##\s|$(?![\s\S]))/m)?.[0] ?? "";
    assert.ok(quickInstall, "README 缺少 Skill 快速接入章节");
    assert.match(readme, /npx skills add duyiliu\/scenario-test --skill scenario-test -g/);
    assert.match(quickInstall, /Skill/);
    assert.match(quickInstall, /doctor/);
    assert.match(quickInstall, new RegExp(`scenario-test@v${VERSION}/scripts/install\\.ps1`));
    assert.match(quickInstall, new RegExp(`scenario-test@v${VERSION}/scripts/install\\.sh`));
    assert.match(skill, /README「快速接入」/);
    assert.match(readme, /默认.*免 npm|免 npm.*默认/);
    assert.match(readme, /scenario-test-cli\.cjs/);
    assert.match(readme, /--library-url/);
    assert.match(readme, /SCENARIO_TEST_SOURCE/);
    assert.match(readme, /reference path="\.\/\.scenario-test\/scenario-test\.d\.ts"/);

    const quickStart = examplesIndex.match(/^##\s+[^\n]*快速开始[^\n]*\n[\s\S]*?(?=^##\s|$(?![\s\S]))/mi)?.[0] ?? "";
    assert.ok(quickStart, "示例索引缺少业务接入快速开始章节");
    // 示例快速开始必须坚持默认免 npm；不得把 npm install 或源码构建写成业务接入默认步骤
    assert.match(quickStart, /默认.*免 npm|免 npm.*默认/);
    assert.doesNotMatch(quickStart, /\bnpm\s+install\b|\bgit\s+clone\b|\bnpm\s+run\s+build\b/);
    assert.match(quickStart, /Skill/);
    assert.match(quickStart, /AI_SCENARIO_PROMPT\.md/);
    assert.match(quickStart, /无需复制/);
    assert.doesNotMatch(examplesIndex, /两次 Prompt/);

    // 一键安装脚本同时锁定两条路径：默认免 npm（npm Registry 固定版本 tarball → 本地 dist 初始化）
    // 与显式 npm 可选路径（-UseNpm / SCENARIO_TEST_USE_NPM → npm install + npx init/doctor）。
    const installSh = fs.readFileSync(path.resolve(import.meta.dirname, "../scripts/install.sh"), "utf8");
    const installPs1 = fs.readFileSync(path.resolve(import.meta.dirname, "../scripts/install.ps1"), "utf8");
    for (const script of [installSh, installPs1]) {
        assert.match(script, /scenario-test-cli\.cjs/);
        assert.match(script, /registry\.npmjs\.org/);
        assert.match(script, new RegExp(VERSION.replaceAll(".", "\\.")), "默认 tarball 应固定到当前版本");
        assert.doesNotMatch(script, /api\.github\.com/);
        assert.match(script, /SCENARIO_TEST_SOURCE|Source/);
        assert.match(script, /SCENARIO_TEST_USE_NPM|-UseNpm/);
        // npm 分支仍完整保留（仅显式开关开启时使用）
        assert.match(script, /npm install/);
        assert.match(script, /@yc_yzkj\/scenario-test/);
        assert.match(script, /npx @yc_yzkj\/scenario-test init/);
        assert.match(script, /npx @yc_yzkj\/scenario-test doctor/);
    }
});