import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { createInterface } from "node:readline/promises";
import { pathToFileURL } from "node:url";
import * as ScenarioTest from "./node.js";
import { createProjectFiles, DEFAULT_LIBRARY_URL } from "./init-templates.js";
import { contract, CONTRACT_VERSION } from "./contract.js";
import { buildCapabilities, renderCapabilitiesText } from "./capabilities.js";
import { buildDoctorReport, renderDoctorText } from "./doctor.js";
import { VERSION } from "./version.generated.js";
import { validatePath } from "./utils/path-validator.js";
import { collectSecretValues, isSecretVarName, mergeGlobals, normalizeGlobalParam, redactSecrets, resolveString, SAVED_RESPONSE } from "./core.js";
import { loadDataset } from "./utils/data-file.js";
import { writeJUnitReport } from "./utils/junit.js";
import { FRAMEWORK_FILES, resolveProjectLayout } from "./project-layout.js";
import { defuseCiCommandMarkers, escapeC1, escapeInlineText, failureDiffLines, formatFailureValue } from "./utils/failure-diff.js";
import {
    DEFAULT_PROXY_TIMEOUT_MS,
    MAX_PROXY_TIMEOUT_MS,
    createServeServer,
    resolveStartupProxyTarget
} from "./cli/serve-server.js";
import { createCurlDraft, createHarDraft, DEFAULT_MAX_IMPORT_ENTRIES, ImportError, parseHostFilter, readHarFile, renderDraftFile } from "./import.js";

class CliUsageError extends Error {
    constructor(message, hint) {
        super(message);
        this.name = "CliUsageError";
        this.hint = hint || "运行 node scenario-test-cli.cjs --help 查看用法。";
    }
}

function argumentValue(argv, index, option) {
    const value = argv[index + 1];
    if (!value || value === "-h" || value.startsWith("--")) {
        throw new CliUsageError(`${option} 缺少参数值`, `请为 ${option} 提供一个值，再重新运行。`);
    }
    return value;
}

// 选项名单来自 contract.cli.options（唯一真相），避免 cli.js 手写第二份名单
const FLAG_OPTIONS = new Map();
const VALUE_OPTIONS = new Map();
for (const [name, spec] of Object.entries(contract.cli.options)) {
    const target = `--${name}`;
    if (spec.kind === "flag") {
        FLAG_OPTIONS.set(target, spec.prop);
    } else {
        VALUE_OPTIONS.set(target, { prop: spec.prop, spec });
        for (const alias of spec.aliases || []) VALUE_OPTIONS.set(`--${alias}`, { prop: spec.prop, spec });
    }
}

function optionEditDistance(left, right) {
    const rows = Array.from({ length: left.length + 1 }, () => []);
    for (let row = 0; row <= left.length; row += 1) rows[row][0] = row;
    for (let column = 0; column <= right.length; column += 1) rows[0][column] = column;
    for (let row = 1; row <= left.length; row += 1) {
        for (let column = 1; column <= right.length; column += 1) {
            const replacement = left[row - 1] === right[column - 1] ? 0 : 1;
            rows[row][column] = Math.min(
                rows[row - 1][column] + 1,
                rows[row][column - 1] + 1,
                rows[row - 1][column - 1] + replacement
            );
        }
    }
    return rows[left.length][right.length];
}

function suggestOption(input) {
    // --help/-h 是真实可用选项（parseArgs 内联处理，不进 contract.cli.options），
    // 拼写建议名单需补上它，否则 --hel 这类输入得不到修复建议
    const knownOptions = new Set([...FLAG_OPTIONS.keys(), ...VALUE_OPTIONS.keys(), "--help"]);
    const ranked = Array.from(knownOptions).map((option) => ({
        option,
        distance: optionEditDistance(input, option)
    })).sort((left, right) => left.distance - right.distance || left.option.localeCompare(right.option));
    if (!ranked.length) return null;
    const best = ranked[0];
    const threshold = Math.max(1, Math.floor(Math.max(input.length, best.option.length) * 0.18));
    if (best.distance > threshold || (ranked[1] && ranked[1].distance === best.distance)) return null;
    return best.option;
}

function parseKeyValueOption(raw, option) {
    // 只按首个 = 分隔：值本身可含 =（如签名/URL query），不截断
    const separator = raw.indexOf("=");
    const key = separator > 0 ? raw.slice(0, separator).trim() : "";
    if (!key) {
        throw new CliUsageError(
            `${option} 需要 key=value 格式`,
            `示例：${option} tenant=test ${option} expectedStatus=UP；值可包含 = 且支持 {{ }} 模板。`
        );
    }
    return [key, raw.slice(separator + 1)];
}

function parseOptionValue(raw, spec, option) {
    if (spec.parse === "number") return Number(raw);
    if (spec.parse === "keyValue") return parseKeyValueOption(raw, option);
    return raw;
}

function parseArgs(argv) {
    const args = { command: "run", all: false, config: "", scenario: "", env: "", baseUrl: "", authorization: "", vars: {}, port: 4300, concurrency: 1, project: "", dir: "", force: false, noInput: false, allowExternalPlugins: false, failOnSkip: false, json: false, help: false, tags: [], bail: false, cookieJar: false, dataFile: "", junit: "", proxyTimeout: undefined, har: "", curl: "", output: "", host: "", maxEntries: DEFAULT_MAX_IMPORT_ENTRIES };
    let start = 0;
    // 命令名单来自 contract.cli.commands
    if (contract.cli.commands.includes(argv[0])) { args.command = argv[0]; start = 1; }
    let deprecatedAuthUsed = false;
    for (let index = start; index < argv.length; index += 1) {
        const item = argv[index];
        if (item === "--help" || item === "-h") { args.help = true; continue; }
        const valueOption = VALUE_OPTIONS.get(item);
        if (valueOption) {
            const raw = argumentValue(argv, index++, item);
            const parsed = parseOptionValue(raw, valueOption.spec, item);
            if (valueOption.spec.repeatable) {
                if (valueOption.spec.parse === "keyValue") {
                    // 可重复选项按出现顺序叠加；同 key 后者覆盖前者。
                    // 用 Object.fromEntries 而非直接赋值：--vars __proto__=x 必须成为
                    // 自有键并由引擎 assertNoReservedVars 拒绝，不能改写对象原型。
                    args[valueOption.prop] = Object.fromEntries([
                        ...Object.entries(args[valueOption.prop] || {}),
                        parsed
                    ]);
                } else {
                    // --tag 等字符串可重复选项：按出现顺序追加为数组
                    args[valueOption.prop] = [...(Array.isArray(args[valueOption.prop]) ? args[valueOption.prop] : []), raw];
                }
            } else {
                args[valueOption.prop] = parsed;
            }
            if (item === "--token" || item === "--authorization") deprecatedAuthUsed = true;
            continue;
        }
        const flagProp = FLAG_OPTIONS.get(item);
        if (flagProp) { args[flagProp] = true; continue; }
        if (item.startsWith("-")) {
            const suggestion = suggestOption(item);
            throw new CliUsageError(
                `未知参数: ${item}`,
                suggestion
                    ? `是否想使用 ${suggestion}？运行 node scenario-test-cli.cjs --help 查看全部选项。`
                    : "运行 node scenario-test-cli.cjs --help 查看支持的参数。"
            );
        }
        else if (start === 0 && contract.cli.commands.includes(item)) {
            // 命令必须紧跟脚本名；命令出现在参数位置（argv[0] 非命令）时是写反了，
            // 与其静默当成 run 的场景名报"未找到场景"，不如直接给出正确写法
            throw new CliUsageError(
                `命令 ${item} 必须放在第一个参数位置`,
                `正确示例：node scenario-test-cli.cjs ${item} --config scenario.config.js；若确需执行同名场景，请使用 --scenario "${item}"。`
            );
        }
        else if (!args.scenario && args.command === "run") args.scenario = item;
        else throw new CliUsageError(`无法识别的参数: ${item}`, "请运行 node scenario-test-cli.cjs --help 查看命令与参数用法。");
    }
    if (args.all && args.scenario) throw new CliUsageError("--all 与 --scenario 不能同时使用", "请移除其中一个选项后重试。");
    if (!Number.isInteger(args.port) || args.port < 1 || args.port > 65535) {
        throw new CliUsageError("--port 必须是 1-65535 的整数", "请为 --port 选择 1 到 65535 之间的整数。");
    }
    if (!Number.isInteger(args.concurrency) || args.concurrency < 1) {
        throw new CliUsageError("--concurrency 必须是大于等于 1 的整数", "请为 --concurrency 选择 1 或更大的整数；默认 1 保持串行。");
    }
    if (args.timeout !== undefined && (!Number.isFinite(args.timeout) || args.timeout <= 0)) {
        throw new CliUsageError(
            "--timeout 必须是大于 0 的毫秒数",
            "示例：--timeout 5000；该值会覆盖配置中的 requestTimeoutMs。"
        );
    }
    if (args.proxyTimeout !== undefined
        && (!Number.isInteger(args.proxyTimeout) || args.proxyTimeout < 1 || args.proxyTimeout > MAX_PROXY_TIMEOUT_MS)) {
        throw new CliUsageError(
            `--proxy-timeout 必须是 1-${MAX_PROXY_TIMEOUT_MS} 的整数毫秒数（当前 ${args.proxyTimeout}）`,
            "示例：--proxy-timeout 120000；缺省为 30000。"
        );
    }

    // ✅ 环境变量优先于命令行参数
    if (process.env.SCENARIO_AUTH) {
        args.authorization = process.env.SCENARIO_AUTH;
        if (deprecatedAuthUsed) {
            console.warn(
                "\n⚠️  警告: 同时检测到 SCENARIO_AUTH 环境变量和 --authorization 参数\n" +
                "   环境变量优先级更高，--authorization 参数将被忽略\n"
            );
        }
    } else if (deprecatedAuthUsed) {
        console.warn(
            "\n⚠️  弃用警告: --authorization 参数将在未来版本中移除\n" +
            "   推荐使用环境变量: export SCENARIO_AUTH=\"Bearer your-token\"\n" +
            "   原因: 命令行参数在进程列表中可见，存在安全风险\n"
        );
    }

    return args;
}

function parseGlobalsEnv() {
    const raw = process.env.SCENARIO_GLOBALS;
    if (!raw) return [];
    let parsed;
    try {
        parsed = JSON.parse(raw);
    } catch {
        throw new CliUsageError("SCENARIO_GLOBALS 必须是合法的 JSON 数组", "请检查变量值格式，例如 [{\"type\":\"header\",\"name\":\"X-Token\",\"value\":\"abc\"}]。");
    }
    if (!Array.isArray(parsed)) throw new CliUsageError("SCENARIO_GLOBALS 必须是 JSON 数组");
    const types = contract.globals.types;
    return parsed.map((item, index) => {
        if (!item || typeof item !== "object" || !types.includes(item.type)
            || typeof item.name !== "string" || !item.name.trim()) {
            throw new CliUsageError(`SCENARIO_GLOBALS 第 ${index + 1} 项无效，格式应为 { type: "${types.join("|")}", name, value }`);
        }
        return normalizeGlobalParam(item);
    });
}

function printHelp() {
    const optionEntries = Object.entries(contract.cli.options).map(([name, spec]) => {
        const optionNames = [`--${name}`, ...(spec.aliases || []).map((alias) => `--${alias}`)].join(", ");
        const valueName = spec.kind === "value" ? ` <${spec.parse === "number" ? "number" : "value"}>` : "";
        return { label: `${optionNames}${valueName}`, description: spec.description };
    });
    const labelWidth = Math.max(...optionEntries.map((item) => item.label.length));
    const optionHelp = optionEntries
        .map((item) => `  ${item.label.padEnd(labelWidth)}  ${item.description}`)
        .join("\n");
    const commandList = contract.cli.commands.map((command) => `  ${command}`).join("\n");

    console.log(`scenario-test ${VERSION}

Usage:
  node scenario-test-cli.cjs [run] [options]
  node scenario-test-cli.cjs <command> [options]

Commands:
${commandList}

帮助:
  在任一命令后追加 --help 或 -h 查看用法，例如 node scenario-test-cli.cjs run --help。

Options:
${optionHelp}

运行说明:
  默认 run 未指定 --all/--scenario 时仅执行清单第一个场景。
  --all 执行配置中的全部自动场景；manual:true 场景须通过 --scenario 显式选择。
  --scenario 支持逗号分隔多选（如 --scenario login,order），按 id/name/url 匹配。
  --json 时 stdout 只输出结构化结果：单场景输出该场景 report，多场景输出
  {"scenarios":[...]}；进度行与结论改走 stderr，失败场景仍输出完整 JSON 且退出码非零。

能力发现命令:
  capabilities          输出 DSL 能力清单（人类文本；--json 输出机器可读 JSON，
                        内容与 dist/scenario-test-capabilities.json 一致）
  doctor                项目静态体检：Node 版本、配置/场景加载、DSL 校验
                        与 AI 规则就绪检查；有 FAIL 时退出码 1

导入命令:
  import --har <file>   解析浏览器/抓包 HAR，过滤静态资源与 OPTIONS 预检，
                        为每个 API 请求生成可重放的场景步骤草稿
  import --curl "<cmd>" 解析单条 curl，生成单步骤草稿；Authorization/Cookie
                        等敏感头替换为 {{vars.*}} 占位
  --output <file>       自定义输出文件；默认 scenarios/imported-<ts>.js
  --host <host,...>     只导入指定主机的请求；--max-entries 限制导入条数（默认 50）

认证选项:
  环境变量 SCENARIO_AUTH       推荐方式，设置授权令牌；避免令牌进入进程参数。

全局参数选项（追加到每个请求）:
  环境变量 SCENARIO_GLOBALS    JSON 数组，如 [{"type":"header","name":"X-Token","value":"abc"}]
                               支持 header / cookie / query 三种类型，覆盖配置中的同名参数

初始化说明:
  目标目录已存在时，交互模式可选择覆盖、保留或取消；非交互模式默认保留现有配置与场景。

示例:
  # Bash
  export SCENARIO_AUTH="Bearer your-token"
  node scenario-test-cli.cjs --config scenario.config.js --all

  # PowerShell
  $env:SCENARIO_AUTH = "Bearer your-token"
  node scenario-test-cli.cjs --config "./scenario.config.js" --all`);
}

function writeProjectFile(projectRoot, relativePath, content, force) {
    const target = path.resolve(projectRoot, relativePath);
    if (fs.existsSync(target) && !force) return false;
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, content, "utf8");
    return true;
}

function resolveInitDirectory(projectRoot, value) {
    const directory = String(value || "scenario-test").trim().replace(/\\/g, "/").replace(/^\.\/+/, "").replace(/\/+$/, "");
    const target = path.resolve(projectRoot, directory);
    const relative = path.relative(projectRoot, target);
    if (!directory || path.isAbsolute(directory) || relative.startsWith("..") || path.isAbsolute(relative)) {
        throw new Error("--dir 必须是项目内的相对目录");
    }
    return directory;
}

// 目标目录已存在时询问覆盖方式；非交互环境（CI、脚本、管道）自动采用默认保留行为，避免卡住
async function askInitMode(directory) {
    if (!process.stdin.isTTY) return "keep";
    const rl = createInterface({ input: process.stdin, output: process.stdout });
    try {
        const answer = await rl.question(
            `目标目录 ${directory} 已存在。\n` +
                `  [o] 覆盖已有文件（等价 --force）\n` +
                `  [k] 保留现有文件，仅刷新 AI 规则（默认）\n` +
                `  [c] 取消\n` +
                `请选择 (k): `
        );
        const choice = answer.trim().toLowerCase();
        if (choice === "o") return "overwrite";
        if (choice === "c") return "cancel";
        return "keep";
    } finally {
        rl.close();
    }
}

function sha256File(filePath) {
    return crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
}

function runtimeSourceCandidates(fileName) {
    return [
        path.resolve(path.dirname(process.argv[1]), fileName),
        path.resolve(path.dirname(process.argv[1]), "../dist", fileName)
    ];
}

// 把当前 CLI 自身复制为项目运行时副本（npx 与本地 CLI 均可用，source 以 .cjs 结尾为准）
function copyRuntimeCli(layout, force) {
    const target = layout.frameworkPath(FRAMEWORK_FILES.cli);
    if (fs.existsSync(target) && !force) return false;
    const source = path.resolve(process.argv[1]);
    if (!source.endsWith(".cjs")) return null;
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.copyFileSync(source, target);
    return true;
}

// 运行时副本统一入口：本机 dist 拷贝优先，--library-url 远程下载兜底（CLI/UMD/d.ts/capabilities 通用）
async function ensureRuntimeFile(layout, fileName, libraryUrl, force) {
    const target = layout.frameworkPath(fileName);
    if (fs.existsSync(target) && !force) return false;
    const source = runtimeSourceCandidates(fileName).find((candidate) => fs.existsSync(candidate));
    fs.mkdirSync(path.dirname(target), { recursive: true });
    if (source) {
        fs.copyFileSync(source, target);
        return true;
    }
    if (!libraryUrl) return null;
    const base = libraryUrl.replace(/\/+$/, "") + "/";
    const downloadSignal = AbortSignal.timeout(30000);
    try {
        const response = await fetch(`${base}${fileName}`, { signal: downloadSignal });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        fs.writeFileSync(target, Buffer.from(await response.arrayBuffer()));
        return true;
    } catch (error) {
        console.warn(`警告: ${fileName} 下载失败（${downloadSignal.aborted ? "下载超时（30 秒）" : escapeInlineText(error.message)}）`);
        return null;
    }
}

// 版本锁：记录 runtimeVersion/contractVersion 与各运行时文件 SHA256，doctor 据此握手
function writeVersionLock(layout) {
    const target = layout.frameworkPath(FRAMEWORK_FILES.versionLock);
    const fileNames = [FRAMEWORK_FILES.cli, FRAMEWORK_FILES.umd, FRAMEWORK_FILES.dts, FRAMEWORK_FILES.capabilities];
    const sha256 = {};
    for (const fileName of fileNames) {
        const filePath = layout.frameworkPath(fileName);
        if (fs.existsSync(filePath)) sha256[fileName] = sha256File(filePath);
    }
    const lock = {
        runtimeVersion: VERSION,
        contractVersion: CONTRACT_VERSION,
        files: {
            cli: FRAMEWORK_FILES.cli,
            umd: FRAMEWORK_FILES.umd,
            dts: FRAMEWORK_FILES.dts,
            capabilities: FRAMEWORK_FILES.capabilities
        },
        sha256
    };
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, `${JSON.stringify(lock, null, 2)}\n`, "utf8");
    return true;
}

// 锁缺失/损坏/版本不一致或任一运行时文件缺失时刷新副本
function shouldRefreshFramework(layout, force) {
    if (force) return true;
    const runtimeFileNames = [FRAMEWORK_FILES.cli, FRAMEWORK_FILES.umd, FRAMEWORK_FILES.dts, FRAMEWORK_FILES.capabilities];
    // 任一运行时文件缺失即刷新（覆盖"锁缺失"与"副本不完整"两种情况）
    if (runtimeFileNames.some((fileName) => !fs.existsSync(layout.frameworkPath(fileName)))) return true;
    const lockPath = layout.frameworkPath(FRAMEWORK_FILES.versionLock);
    if (!fs.existsSync(lockPath)) return true;
    let lock;
    try {
        lock = JSON.parse(fs.readFileSync(lockPath, "utf8"));
    } catch {
        return true;
    }
    if (lock.runtimeVersion !== VERSION || lock.contractVersion !== CONTRACT_VERSION) return true;
    // 版本锁声明的 sha256 与磁盘实际不符（文件被篡改/损坏/手工替换）时也刷新，保证副本可信。
    // 仅校验"锁里登记过的文件"：跳过锁未登记的文件，避免升级期间 lock 尚未更新的新版副本被误刷。
    return runtimeFileNames.some((fileName) => {
        const expected = lock.sha256?.[fileName];
        return !!expected && sha256File(layout.frameworkPath(fileName)) !== expected;
    });
}

function recordRuntimeResult(created, skipped, relativePath, status, failed) {
    if (status === true) created.push(relativePath);
    else if (status === false) skipped.push(relativePath);
    else if (failed) failed.push(relativePath);
}

async function initCommand(args) {
    const projectRoot = path.resolve(args.project || process.cwd());
    const directory = resolveInitDirectory(projectRoot, args.dir);
    const projectName = path.basename(projectRoot).trim() || "project";
    const storagePrefix = `scenario-test.${projectName.replace(/[^\p{L}\p{N}._-]+/gu, "-")}`;
    const layout = resolveProjectLayout(projectRoot, directory);
    const frameworkDirectory = ".scenario-test";
    // 目标目录已存在且未显式 --force 时，由用户选择覆盖方式；
    // --no-input 或非交互环境（CI、脚本、管道）自动采用默认保留行为，避免卡住
    let force = args.force;
    if (!force && fs.existsSync(path.join(projectRoot, directory)) && !args.noInput) {
        const mode = await askInitMode(directory);
        if (mode === "cancel") {
            console.log("已取消初始化。");
            return;
        }
        force = mode === "overwrite";
    }
    // 运行时副本在锁缺失/版本不一致/sha256 失配/文件缺失时刷新（升级旧副本的关键路径）。
    // 仅影响运行时副本与版本锁的刷新，不改变模板文件的 keep 语义。
    const refreshFramework = shouldRefreshFramework(layout, force);
    // AI 规则/模式库随每次 init 刷新（keep 语义：不覆盖项目配置与场景）；
    // 运行时副本的刷新决策已并入上方 refreshFramework
    const frameworkTemplatePaths = new Set([
        layout.frameworkRelativePath(FRAMEWORK_FILES.authoringPrompt),
        layout.frameworkRelativePath(FRAMEWORK_FILES.patterns)
    ]);
    const created = [];
    const skipped = [];
    const failedRuntimeFiles = [];
    for (const [relativePath, content] of Object.entries(createProjectFiles(directory, { storagePrefix, frameworkDirectory }))) {
        const overwrite = force || frameworkTemplatePaths.has(relativePath);
        (writeProjectFile(projectRoot, relativePath, content, overwrite) ? created : skipped).push(relativePath);
    }
    const libraryUrl = args.libraryUrl || DEFAULT_LIBRARY_URL;
    recordRuntimeResult(created, skipped, layout.frameworkRelativePath(FRAMEWORK_FILES.cli), copyRuntimeCli(layout, refreshFramework) ?? await ensureRuntimeFile(layout, FRAMEWORK_FILES.cli, libraryUrl, refreshFramework), failedRuntimeFiles);
    recordRuntimeResult(created, skipped, layout.frameworkRelativePath(FRAMEWORK_FILES.umd), await ensureRuntimeFile(layout, FRAMEWORK_FILES.umd, libraryUrl, refreshFramework), failedRuntimeFiles);
    recordRuntimeResult(created, skipped, layout.frameworkRelativePath(FRAMEWORK_FILES.dts), await ensureRuntimeFile(layout, FRAMEWORK_FILES.dts, libraryUrl, refreshFramework), failedRuntimeFiles);
    recordRuntimeResult(created, skipped, layout.frameworkRelativePath(FRAMEWORK_FILES.capabilities), await ensureRuntimeFile(layout, FRAMEWORK_FILES.capabilities, libraryUrl, refreshFramework), failedRuntimeFiles);
    // 运行时副本必须齐全才能写版本锁：任一文件缺失即明确失败（退出码 1），
    // 避免下载失败后仍落锁、init 假成功导致不完整安装
    if (failedRuntimeFiles.length) {
        throw new Error(
            `运行时副本更新失败: ${failedRuntimeFiles.join(", ")}\n` +
            "请检查下载源或网络后重跑 init；现有版本锁未更新。"
        );
    }
    const runtimeFileNames = [FRAMEWORK_FILES.cli, FRAMEWORK_FILES.umd, FRAMEWORK_FILES.dts, FRAMEWORK_FILES.capabilities];
    const missingRuntimeFiles = runtimeFileNames.filter((fileName) => !fs.existsSync(layout.frameworkPath(fileName)));
    if (missingRuntimeFiles.length) {
        throw new Error(
            `运行时副本不完整，缺少: ${missingRuntimeFiles.join(", ")}\n` +
            `请检查 --library-url（${libraryUrl}）指向的目录是否包含全部 4 个文件，` +
            "或确认本机 dist 可用后重跑 init"
        );
    }
    recordRuntimeResult(created, skipped, layout.frameworkRelativePath(FRAMEWORK_FILES.versionLock), writeVersionLock(layout));
    console.log(`已初始化项目: ${projectRoot}`);
    console.log(`项目布局: 内部文件位于 ${layout.frameworkRelativeDir}`);
    if (created.length) console.log(`已创建: ${created.join(", ")}`);
    if (skipped.length) console.log(`已保留现有文件: ${skipped.join(", ")}`);
    console.log(`浏览器工作台: ${path.join(projectRoot, directory, "index.html")}`);
    console.log("提示: 双击 start-scenario-test.cmd 启动工作台；serve 会自动启用同源接口代理，绕开浏览器 CORS。");
}

function resolveConfigPath(value) {
    const candidate = path.resolve(value || "scenario.config.js");
    if (!fs.existsSync(candidate)) {
        throw new CliUsageError(
            `${value ? "配置文件不存在" : "未找到默认配置文件"}：${candidate}`,
            [
                `使用 --config "<实际配置文件路径>" 指向已有配置，例如：node scenario-test-cli.cjs run --config "<实际配置文件路径>"`,
                `初始化项目模板：node scenario-test-cli.cjs init --project "."`
            ].join("\n  ")
        );
    }
    return candidate;
}

async function loadPlugins(config, configDir, options = {}) {
    const plugins = [];
    for (const pluginPath of config.nodePlugins || []) {
        // ✅ 验证插件路径
        let absolutePath;
        try {
            absolutePath = validatePath(configDir, pluginPath);
        } catch (error) {
            if (options.allowExternalPlugins) {
                // 明确允许外部插件：相对路径仍以配置目录为基准（与未加 flag 时的解析基准一致）
                console.warn(`⚠️  加载外部插件: ${escapeInlineText(pluginPath)}`);
                absolutePath = path.isAbsolute(pluginPath) ? pluginPath : path.resolve(configDir, pluginPath);
            } else {
                throw new Error(
                    `插件路径不安全: ${pluginPath}\n` +
                    `原因: ${error.message}\n` +
                    `提示: 插件必须在配置目录内 (${configDir})，或使用 --allow-external-plugins 标志`
                );
            }
        }

        const imported = await import(pathToFileURL(absolutePath).href);
        const factory = imported.default || imported;
        const pluginApi = { ...ScenarioTest };
        const plugin = typeof factory === "function" ? await factory(pluginApi) : factory;
        plugins.push(plugin);
    }
    return plugins;
}

async function transformScenario(scenario, context, plugins) {
    let transformed = scenario;
    for (const plugin of plugins) {
        if (typeof plugin?.transformScenario === "function") transformed = await plugin.transformScenario(transformed, context);
    }
    return transformed;
}

function selectEnvironment(config, key) {
    if (!config.envs.length) return { key: "default", name: "默认", baseUrl: config.baseUrl || "" };
    const selectedKey = key || config.defaultEnvKey;
    const environment = config.envs.find((item) => item.key === selectedKey);
    if (!environment) {
        const keys = config.envs.map((item) => item.key);
        throw new CliUsageError(
            `未找到环境 ${selectedKey}，可用值: ${keys.join(", ")}`,
            "请将 --env 设置为上面列出的环境 key 后重试。"
        );
    }
    return environment;
}

function configVariables(config, overrides = {}, environment = null) {
    // 优先级：config.vars < 选中环境 env.vars < variables[].env 系统变量 < --vars
    const values = { ...(config.vars || {}), ...(environment?.vars || {}) };
    const provided = overrides && typeof overrides === "object" ? overrides : {};
    for (const definition of config.variables || []) {
        const environmentName = definition.env;
        const value = environmentName ? process.env[environmentName] : undefined;
        if (value !== undefined) values[definition.name] = value;
        else if (values[definition.name] === undefined && definition.defaultValue !== undefined) values[definition.name] = definition.defaultValue;
        // 命令行 --vars 优先级最高：必填校验也必须看到命令行的临时注入，
        // 否则 CI 里为一次运行覆盖必填变量仍会被配置校验提前拒绝。
        const effective = Object.prototype.hasOwnProperty.call(provided, definition.name)
            ? provided[definition.name]
            : values[definition.name];
        if (definition.required && (effective === undefined || effective === "")) {
            throw new CliUsageError(
                `缺少变量 ${definition.name}${environmentName ? `，请设置环境变量 ${environmentName}` : ""}`,
                environmentName ? `设置 ${environmentName} 或通过 --vars ${definition.name}=<value> 后重新运行。` : `请在配置的 vars 或 variables.defaultValue 中提供该变量，或通过 --vars ${definition.name}=<value> 临时注入。`
            );
        }
    }
    return { ...values, ...provided };
}

async function runCommand(args) {
    const configPath = resolveConfigPath(args.config);
    const configDir = path.dirname(configPath);
    const config = ScenarioTest.loadConfigFile(configPath, ScenarioTest);
    const envGlobals = parseGlobalsEnv();
    const environment = selectEnvironment(config, args.env);
    // --scenario 支持逗号分隔多选（按 id/name/url 逐项匹配，执行顺序保持配置清单顺序）；
    // 未指定 --all/--scenario 时保持既有口径：仅执行清单第一个场景
    const requested = args.scenario
        ? String(args.scenario).split(",").map((item) => item.trim()).filter(Boolean)
        : [];
    if (args.scenario && !requested.length) {
        throw new CliUsageError("--scenario 的值为空", "请提供场景 id/name/url；多个场景用逗号分隔。");
    }
    const missing = requested.filter((token) =>
        !config.scenarios.some((item) => [item.id, item.name, item.url].includes(token)));
    if (missing.length) {
        const limit = 12;
        const choices = config.scenarios.slice(0, limit).map((item) => {
            const name = item.name && item.name !== item.id ? ` — ${item.name}` : "";
            return `  - ${item.id || "(无 id)"}${name}${item.manual ? "（manual:true）" : ""}`;
        });
        const remaining = config.scenarios.length - choices.length;
        const hasManualScenarios = config.scenarios.some((item) => item.manual);
        const list = config.scenarios.length
            ? `可用场景（显示 ${choices.length}/${config.scenarios.length} 项）：\n${choices.join("\n")}${remaining > 0 ? `\n  … 其余 ${remaining} 项未显示。` : ""}${hasManualScenarios ? "\nmanual:true 场景需通过 --scenario <id> 显式选择。" : ""}`
            : "配置中没有可选场景，请检查 scenarios 列表。";
        throw new CliUsageError(`未找到场景: ${missing.join(", ")}`, list);
    }
    const entries = requested.length
        ? config.scenarios.filter((item) => [item.id, item.name, item.url].some((key) => requested.includes(key)))
        : (args.all || (args.tags || []).length)
            ? config.scenarios.filter((item) => !item.manual)
            : config.scenarios.filter((item) => [item.id, item.name, item.url].includes(config.scenarios[0]?.id));
    // --tag：#68 重复参数为 OR，单个参数内逗号分隔为 AND；manual:true 仍需 --scenario 显式选择
    const tagGroups = (args.tags || [])
        .map((raw) => String(raw).split(",").map((tag) => tag.trim()).filter(Boolean))
        .filter((group) => group.length);
    const filteredEntries = !tagGroups.length ? entries : entries.filter((entry) =>
        tagGroups.some((group) => group.every((tag) => (entry.tags || []).includes(tag))));
    if (tagGroups.length && !filteredEntries.length) {
        const available = [...new Set(config.scenarios.flatMap((entry) => entry.tags || []))].sort();
        throw new CliUsageError(
            `没有场景匹配标签: ${tagGroups.map((group) => group.join(",")).join(" 或 ")}`,
            available.length ? `可用标签: ${available.join(", ")}` : "配置中的场景均未声明 tags。"
        );
    }
    entries.splice(0, entries.length, ...filteredEntries);
    if (!entries.length) {
        if (args.all && config.scenarios.length > 0 && config.scenarios.every((item) => item.manual)) {
            throw new CliUsageError(
                "配置中的场景全部标记为 manual:true，--all 默认排除手动场景",
                "请先确认数据已准备好，再通过 --scenario <id> 显式选择要执行的手动场景。"
            );
        }
        throw new CliUsageError(
            "配置中没有可自动执行的场景",
            "请检查配置中的 scenarios 列表；如场景均为 manual:true，请确认数据准备完成后用 --scenario <id> 显式选择。"
        );
    }
    const plugins = await loadPlugins(config, configDir, { allowExternalPlugins: args.allowExternalPlugins });
    const adapters = {};
    for (const plugin of plugins) Object.assign(adapters, plugin?.adapters || {});
    const baseVars = configVariables(config, args.vars, environment);
    const baseOptions = {
        config,
        baseUrl: String(args.baseUrl || environment.baseUrl || config.baseUrl || "").replace(/\/+$/, ""),
        authorization: args.authorization || environment.authorization || config.authorization || "",
        globals: mergeGlobals(config.globals, environment.globals, envGlobals),
        requestTimeoutMs: args.timeout ?? config.requestTimeoutMs,
        vars: baseVars,
        environmentVariables: process.env,
        io: ScenarioTest.createNodeIo(configDir),
        adapters,
        // #65：仅 run --cookie-jar 开启；Jar 在场景 runtime 内维护，不跨场景/不落盘
        cookieJar: Boolean(args.cookieJar),
        // #69：本次 run 的共享变量容器，跨场景/跨数据行复用
        suiteVars: {}
    };
    if (!baseOptions.baseUrl) {
        throw new CliUsageError(
            "缺少 Base URL",
            "请在配置环境中设置 baseUrl，或使用 --base-url \"https://api.example.com\" 临时指定。"
        );
    }
    let total = 0;
    let passedTotal = 0;
    let failedTotal = 0;
    let actualFailedTotal = 0;
    let skippedTotal = 0;
    let stoppedUnexecutedTotal = 0;
    // --json：stdout 只承载最终 JSON 文档，所有人类可读进度/结论改走 stderr；
    // 与 capabilities/doctor 的 stdout 纯净口径一致，CI 可直接 JSON.parse
    const print = args.json ? (...values) => console.error(...values) : (...values) => console.log(...values);
    // ===== 数据驱动初始化（#70）=====
    const dataset = (() => {
        if (!args.dataFile) return null;
        try {
            return loadDataset(args.dataFile);
        } catch (error) {
            throw new CliUsageError(`数据集加载失败: ${error.message}`, "支持 JSON 数组、JSONL（每行一个对象）或 CSV（首行表头）；每行必须是对象。");
        }
    })();
    const dataRows = dataset ? dataset.rows : [null];
    const rowResults = [];
    const notRun = [];
    let bailTriggered = false;
    // 输出层脱敏（#90）：所有已知敏感值在运行时逐步积累，文本与 --json 共用
    const allSecrets = new Set(collectSecretValues(baseVars, [
        baseOptions.authorization,
        ...baseOptions.globals.filter((item) => isSecretVarName(item.name)).map((item) => item.value)
    ]));
    const rememberSecrets = (vars, extra = []) => {
        for (const secret of collectSecretValues(vars, [baseOptions.authorization, ...extra])) allSecrets.add(secret);
    };
    const reports = [];
    const accumulateReport = (report) => {
        total += report.planned;
        passedTotal += report.passedSteps;
        // 因 failurePolicy:stop 未执行到位的步骤按失败统计；SKIP 步骤单独计数不并入失败
        const stoppedUnexecuted = report.planned - report.executed - report.skipped;
        actualFailedTotal += report.failed;
        stoppedUnexecutedTotal += stoppedUnexecuted;
        failedTotal += report.failed + stoppedUnexecuted;
        skippedTotal += report.skipped;
    };
    const reportSummary = (report) =>
        `Summary: passed=${report.passedSteps} failed=${report.failed} skipped=${report.skipped} executed=${report.executed}/${report.planned} planned (状态 ${report.status})`;
    // 单场景执行抽成可复用单元：并发模式下 entryPrint 指向场景私有缓冲，
    // 场景结束时一次性 flush，避免多个场景的 [PASS]/[FAIL]/[RETRY] 行交错。
    // 顺序模式下 entryPrint 就是全局 print，行为与历史串行输出完全一致。
    const runEntry = async (entry, entryPrint) => {
        if (!entry.url) throw new Error(`场景 ${entry.id} 缺少 url`);
        // 与 doctor 一致：相对路径必须位于配置目录内（防路径遍历），绝对路径保持兼容
        let scenarioPath;
        if (path.isAbsolute(entry.url)) scenarioPath = entry.url;
        else {
            try {
                scenarioPath = validatePath(configDir, entry.url);
            } catch (error) {
                throw new Error(
                    `场景 ${entry.id} 的 url 不安全: ${entry.url}\n` +
                    `原因: ${error.message}\n` +
                    "url 必须是配置目录内的相对路径"
                );
            }
        }
        let scenario = ScenarioTest.loadScenarioFile(scenarioPath, entry.id, ScenarioTest);
        scenario = await transformScenario(scenario, { config, configDir, entry, environment }, plugins);
        // 服务端可控值（resolve 后的 path/method、warning 文本可混入响应提取值）
        // 一律过 escapeInlineText：换行折成字面量防注入新行，CI 命令标记打散
        entryPrint(`\n# ${escapeInlineText(scenario.name)} (${escapeInlineText(entry.id)})`);
        const report = await ScenarioTest.createEngine(baseOptions).runScenario(scenario, {
            ...baseOptions,
            // 重试进度：retryUntil 轮询在间隔内长时间静默，输出每次失败重试防「挂死」观感；
            // 带步骤名——同场景多个轮询步骤（等订单→等发货）时进度行需能归属
            async onAttempt(info) {
                const label = info.errorType === "timeout" ? "超时" : (info.errorType ? "连接失败" : "未通过");
                const detail = info.errorType
                    ? (info.errorMessage ? escapeInlineText(info.errorMessage) : "")
                    : `status ${escapeInlineText(info.status)}${info.failedAssertion ? `，${escapeInlineText(info.failedAssertion)}` : ""}`;
                entryPrint(`  [RETRY] ${escapeInlineText(info.step?.name || "未命名步骤")} 第 ${info.attempt}/${info.totalAttempts} 次${label}${detail ? `（${detail}）` : ""}，${ScenarioTest.formatDuration(info.intervalMs)}后重试`);
            },
            async onStep(result, _stepIndex, runtime) {
                const runtimeForResolve = runtime || { vars: {} };
                const stepSecrets = collectSecretValues(runtimeForResolve.vars, [
                    baseOptions.authorization,
                    ...baseOptions.globals.filter((item) => isSecretVarName(item.name))
                        .map((item) => resolveString(item.value, runtimeForResolve))
                ]);
                for (const secret of stepSecrets) if (secret) allSecrets.add(secret);
                const redact = (value) => redactSecrets(value, stepSecrets);
                const mark = result.skipped ? "SKIP" : (result.passed ? "PASS" : "FAIL");
                entryPrint(`[${mark}] ${escapeInlineText(redact(result.name))} ${escapeInlineText(redact(result.method))} ${escapeInlineText(redact(result.path))} -> ${escapeInlineText(redact(result.status))} (${ScenarioTest.formatDuration(result.duration)})`);
                for (const warning of result.warnings || []) {
                    entryPrint(`  [WARN] ${escapeInlineText(redact(warning))}`);
                }
                // each/shape 失败明细：each 按失败元素（序号 1 基）展开，shape 按字段路径展开；
                // 嵌套 each 递归展开，路径用「 › 」串联定位
                const printEachDetail = (detail, prefix) => {
                    for (const item of detail || []) {
                        if (!item) continue;
                        if (!Array.isArray(item.assertions) || item.index === undefined) {
                            // shape 失败明细：{ path, expected, actual }
                            print(`      ↳ ${prefix}${escapeInlineText(item.path)}: expected=${formatFailureValue(redact(item.expected))} actual=${formatFailureValue(redact(item.actual))}`);
                            continue;
                        }
                        const label = `${prefix}第 ${item.index + 1} 项`;
                        for (const sub of item.assertions) {
                            if (sub.passed) continue;
                            entryPrint(`      ↳ ${label} ${escapeInlineText(redact(sub.name))}: expected=${formatFailureValue(redact(sub.expected))} actual=${formatFailureValue(redact(sub.actual))}`);
                            // 语义化失败原因（如 includes 对象实际值）：紧随明细行输出，引导替代写法
                            if (sub.reason) entryPrint(`        原因: ${escapeInlineText(redact(sub.reason))}`);
                            // 值超短值上限时展开为分块 diff（多行字符串/长 JSON），与顶层断言同口径
                            for (const line of failureDiffLines(redact(sub.expected), redact(sub.actual), "        ")) {
                                entryPrint(line);
                            }
                            printEachDetail(sub.detail, `${label} › `);
                        }
                    }
                };
                for (const assertion of result.assertions.filter((item) => !item.passed)) {
                    entryPrint(`  - ${escapeInlineText(redact(assertion.name))}: expected=${formatFailureValue(redact(assertion.expected))} actual=${formatFailureValue(redact(assertion.actual))}`);
                    // 语义化失败原因（如 includes 对象实际值）：引导改用 equals / 字段 path 断言；
                    // 静态文案同样过 escapeInlineText，防插件注入换行/CI 命令标记
                    if (assertion.reason) entryPrint(`      原因: ${escapeInlineText(redact(assertion.reason))}`);
                    // 短值保持单行口径；任一值序列化超 80 字符时展开结构化 diff 分块：
                    // 多行字符串按真实换行拆行（行号 + | 前缀，行内容转义防 CRLF 打乱终端）、
                    // 长对象/数组缩进展开、字符串值定位首个差异字符（1 基）并给上下文窗口
                    for (const line of failureDiffLines(redact(assertion.expected), redact(assertion.actual), "    ")) {
                        entryPrint(line);
                    }
                    printEachDetail(assertion.detail, "");
                }
                // 失败步骤补打响应体原文（截断）：断言层只有 expected/actual，
                // 服务端错误 payload 才是 CI/AI 诊断的关键上下文。
                // 请求体与请求头刻意不输出——注入后的 Authorization、登录密码类字段不应进日志；
                // 响应体可能回显 token（登录步骤断言失败时），日志合规敏感的团队可设
                // SCENARIO_NO_BODY_PRINT=1 关闭本输出
                if (!result.passed && !result.skipped && !process.env.SCENARIO_NO_BODY_PRINT) printFailedStepBody(result, entryPrint, () => stepSecrets);
            }
        });
        for (const plugin of plugins) {
            await plugin?.afterScenario?.(report, { config, configDir, entry, environment, scenario });
        }
        rememberSecrets(report.vars, report.results.flatMap((step) =>
            Object.entries(step.request?.headers || {})
                .filter(([name]) => isSecretVarName(name))
                .map(([, value]) => value)
                .filter((value) => typeof value === "string")));
        report.scenarioId = entry.id;
        report.tags = entry.tags || [];
        return report;
    };

    // 数据行外层（--data），行内按 --concurrency 串行或并发调度
    for (const [rowIndex, row] of dataRows.entries()) {
        if (bailTriggered) {
            for (const entry of entries) notRun.push({ id: entry.id, name: entry.name, url: entry.url, row: rowIndex + 1, reason: "bail" });
            continue;
        }
        const rowVars = row || {};
        // 数据行变量优先级介于配置 vars 与 --vars 之间：--vars 是本次 run 的临时覆盖
        baseOptions.vars = { ...baseVars, ...rowVars, ...(args.vars || {}) };
        const rowReports = new Array(entries.length);
        if (dataset) print(`\n## 数据行 ${rowIndex + 1}/${dataRows.length}${Object.keys(rowVars).length ? ` (${Object.keys(rowVars).join(", ")})` : ""}`);
        if (args.concurrency <= 1) {
            // 默认串行：保持历史输出顺序与逐场景即时进度（含出错立即中断）
            for (let index = 0; index < entries.length; index += 1) {
                if (bailTriggered) {
                    notRun.push({ id: entries[index].id, name: entries[index].name, url: entries[index].url, row: rowIndex + 1, reason: "bail" });
                    continue;
                }
                const report = await runEntry(entries[index], print);
                // JSON 输出按配置清单顺序收集，而非完成顺序
                rowReports[index] = report;
                reports.push(report);
                accumulateReport(report);
                print(reportSummary(report));
                // #71：失败后不再启动后续场景；已执行的场景完整跑完（含 always 清理）
                if (!report.passed && args.bail) bailTriggered = true;
            }
        } else {
            // 并发：每个场景先写入私有缓冲，场景结束一次性输出；rowReports 按 entries 下标回填，
            // 保证 --json 与串行一致按配置清单顺序输出（完成顺序不影响报告顺序）。
            let nextIndex = 0;
            let firstError = null;
            // 单独用布尔标记而不是靠 firstError 的真值判断：执行链可能以假值拒绝
            // （插件 transformScenario/afterScenario 抛 null/undefined/空串），
            // 那也必须与串行一致地中断并让退出码为 1，否则并发路径会静默产出带空洞的报告。
            let hasError = false;
            const workerCount = Math.min(args.concurrency, entries.length);
            const worker = async () => {
                while (true) {
                    if (hasError || bailTriggered) return;
                    const index = nextIndex;
                    nextIndex += 1;
                    if (index >= entries.length) return;
                    const bufferedLines = [];
                    const bufferedPrint = (...values) => bufferedLines.push(values.map((value) => String(value)).join(" "));
                    try {
                        const report = await runEntry(entries[index], bufferedPrint);
                        rowReports[index] = report;
                        accumulateReport(report);
                        bufferedPrint(reportSummary(report));
                        if (!report.passed && args.bail) bailTriggered = true;
                    } catch (error) {
                        // 失败场景可能已有部分进度：仍按块输出便于定位；首个错误最终抛出，
                        // 不再调度新场景，已在飞行的场景跑完后统一失败。
                        if (!hasError) {
                            hasError = true;
                            firstError = error;
                        }
                    } finally {
                        for (const line of bufferedLines) print(line);
                    }
                }
            };
            await Promise.all(Array.from({ length: workerCount }, () => worker()));
            if (hasError) throw firstError;
            for (let index = 0; index < entries.length; index += 1) {
                const report = rowReports[index];
                if (report) reports.push(report);
                else notRun.push({ id: entries[index].id, name: entries[index].name, url: entries[index].url, row: rowIndex + 1, reason: "bail" });
            }
        }
        if (dataset) rowResults.push({ index: rowIndex + 1, vars: rowVars, scenarios: rowReports.filter(Boolean) });
    }
    print(`\nOverall: ${passedTotal}/${total} passed`);
    if (bailTriggered) print(`\n--bail 已开启：${notRun.length} 个后续场景未执行，退出码保持非零。`);
    if (failedTotal) process.exitCode = 1;
    if (args.failOnSkip && skippedTotal > 0) {
        print(`\n--fail-on-skip 已开启，存在 ${skippedTotal} 个 SKIP 步骤，退出码置为 1`);
        process.exitCode = 1;
    }

    // #57 JUnit：与 stdout 人类输出/退出码正交；报告先脱敏再落盘（#90）
    const secretList = [...allSecrets];
    const safeReports = reports.map((report) => redactSecrets(report, secretList));
    if (args.junit) {
        const target = writeJUnitReport(args.junit, safeReports);
        print(`\nJUnit 报告: ${target}`);
    }

    const countSummary = `通过 ${passedTotal} 步，实际失败 ${actualFailedTotal} 步，条件跳过 ${skippedTotal} 步，因 stop 策略未执行 ${stoppedUnexecutedTotal} 步`;
    if (actualFailedTotal > 0) {
        print(`\n结论：执行失败。${countSummary}；未执行步骤不计入通过。`);
    } else if (passedTotal === 0 && skippedTotal > 0) {
        const exitText = args.failOnSkip ? "因 --fail-on-skip 开启，退出码为 1" : "按默认策略退出码为 0";
        print(`\n结论：全部跳过，未发起请求。${countSummary}；${exitText}。`);
    } else if (stoppedUnexecutedTotal > 0) {
        print(`\n结论：执行未完成。${countSummary}。`);
    } else {
        print(`\n结论：执行完成。${countSummary}${skippedTotal > 0 ? "；条件跳过的步骤未发起请求" : ""}。`);
    }
    if (args.json) {
        // 直接序列化 runScenario report（编程接口的稳定形状，不另造易漂移子集）；
        // 单场景输出 report 本身，多场景顶层包 { scenarios: [...] }。
        // 数据驱动时按行聚合；退出码与 JSON 正交：失败场景同样输出完整 JSON，仅置非零退出码。
        const payload = dataset
            ? {
                data: { file: dataset.file, format: dataset.format, rows: dataset.rows.length },
                results: rowResults.map((row) => ({
                    index: row.index,
                    vars: redactSecrets(row.vars, secretList),
                    scenarios: row.scenarios.map((report) => redactSecrets(report, secretList))
                })),
                ...(notRun.length ? { notRun } : {})
            }
            : (safeReports.length === 1 && !notRun.length
                ? safeReports[0]
                : { scenarios: safeReports, ...(notRun.length ? { notRun } : {}) });
        process.stdout.write(`${JSON.stringify(payload, null, 2)}\n`);
    }
}

// 失败诊断响应体截断上限（字符）：防巨型 HTML 错误页刷爆 CI 日志
const FAILURE_BODY_LIMIT = 2000;

// 响应体是服务端可控内容：含控制字符的行经 JSON 转义透出（ESC→\u001b 等），
// 防 ANSI 注入（清屏覆写/伪链接/OSC 52 写剪贴板）与裸 \r 打乱终端对齐；
// JSON.stringify 只转义 C0/引号/反斜杠——C1 控制字符（\x7f-\x9f，含 8 位 CSI U+009B）手动补转义；
// 纯可打印行保持原文不转义（JSON 转义会给引号/反斜杠加噪）
const BODY_CTRL_CHARS = /[\x00-\x1f\x7f-\x9f]/;
// GitHub Actions 新格式命令 ::xxx:: 是行首识别（Runner 会 TrimStart）：整行保留
// JSON 引号透出使行首变 "，解析器不再识别为命令（剥引号会与原文相同，防护空转）
const CI_LINE_START = /^\s*::/;
// ## 系标记（GH 旧格式 ##[、Azure ##vso[、TeamCity ##teamcity[）由 Runner 按整行
// IndexOf 识别，引号挡不住——defuseCiCommandMarkers 打散标记字节序；
// 命中任一即整行 JSON 引号 + 标记打散 + 控制字符转义，三道防护
const CI_ANYWHERE = /##\[|##vso\[|##teamcity\[/i;
function escapeBodyLine(line) {
    if (!BODY_CTRL_CHARS.test(line) && !CI_LINE_START.test(line) && !CI_ANYWHERE.test(line)) return line;
    return escapeC1(defuseCiCommandMarkers(JSON.stringify(line)));
}

// 错误对象输出：error.message/stack 可能混入服务端可控字节（如经模板注入进
// path 的换行，或适配器抛出的含响应内容错误），逐行套 escapeBodyLine——
// 普通行原文透出保持堆栈可读，行首 :: 命令、## 标记、控制字符行被打散/转义
function escapeErrorText(error) {
    return String(error?.stack || error).split("\n").map(escapeBodyLine).join("\n");
}

function printFailedStepBody(result, print = console.log, secretsOf = []) {
    const redact = (value) => redactSecrets(value, typeof secretsOf === "function" ? secretsOf() : secretsOf);
    const response = result?.response;
    if (!response || typeof response !== "object") return;
    const body = response.body;
    const bodyText = typeof response.bodyText === "string" ? response.bodyText : null;
    // saveResponseAs 时 bodyText 恒为 null、body 是保存信息 {savedTo,size,contentType}——
    // 凭 SAVED_RESPONSE 内部标记确认真实发生过保存，不靠字段形状推断：
    // 适配器结构化 body（bodyText 缺省归一化为 null）恰好含 savedTo+size 字段时不吞原文；
    // savedTo 可能经模板混入服务端可控字节（extract 提取值进路径），同样转义
    if (bodyText === null && body && typeof body === "object" && body[SAVED_RESPONSE] === true) {
        print(`  响应体已保存至 ${escapeBodyLine(redact(body.savedTo))}`);
        return;
    }
    let raw = bodyText ?? "";
    if (raw.trim() === "" && body !== null && body !== undefined) {
        // 适配器响应 bodyText 可为 null，结构化 body 序列化展示（同样截断/转义）
        if (typeof body === "string") raw = body;
        else {
            try { raw = JSON.stringify(body) ?? String(body); } catch { raw = String(body); }
        }
    }
    const text = String(redact(raw)).replace(/\r\n/g, "\n").trimEnd();
    if (text === "") return;
    const truncated = text.length > FAILURE_BODY_LIMIT;
    const shown = truncated ? text.slice(0, FAILURE_BODY_LIMIT) : text;
    const note = truncated ? `（共 ${text.length} 字符，截断显示前 ${FAILURE_BODY_LIMIT}）` : "";
    print(`  响应体${note}:`);
    for (const line of shown.split("\n")) print(`    ${escapeBodyLine(line)}`);
}
async function serveCommand(args) {
    const configPath = resolveConfigPath(args.config);
    const workspace = path.dirname(configPath);
    const libraryDist = path.dirname(path.resolve(process.argv[1]));
    const config = ScenarioTest.loadConfigFile(configPath, ScenarioTest);
    const startup = resolveStartupProxyTarget(config, args.env, args.baseUrl);
    if (startup.error) {
        throw new CliUsageError(
            startup.error,
            "请将 --env 设置为上面列出的环境 key 后重试。"
        );
    }
    // 启动日志打印实际生效值（默认/命令行来源），便于确认 --proxy-timeout 是否被识别
    const proxyTimeoutMs = args.proxyTimeout ?? DEFAULT_PROXY_TIMEOUT_MS;
    const server = createServeServer({
        workspace,
        libraryDist,
        port: args.port,
        config,
        defaultTarget: startup,
        // --base-url 固定覆盖所有请求的目标（与 run 模式一致）
        overrideBaseUrl: args.baseUrl || "",
        proxyTimeoutMs: args.proxyTimeout ?? undefined
    });
    server.on("error", (error) => {
        if (error?.code === "EADDRINUSE") {
            console.error(`错误：端口 ${args.port} 已被占用`);
            console.error("提示：请使用 --port <其他空闲端口> 指定端口后重试；或双击 start-scenario-test.cmd 重新申请空闲端口。");
            process.exitCode = 1;
            return;
        }
        console.error(`场景测试工作台启动失败: ${escapeInlineText(error?.message || String(error))}`);
        process.exitCode = 1;
    });
    server.listen(args.port, "127.0.0.1", () => {
        console.log(`场景测试工作台: http://127.0.0.1:${args.port}/`);
        console.log(`配置目录: ${workspace}`);
        if (startup.target) {
            console.log(`接口代理: ${startup.key} -> ${startup.target}`);
            console.log(`接口代理空闲超时: ${proxyTimeoutMs}ms${args.proxyTimeout === undefined ? "（默认）" : "（--proxy-timeout）"}`);
        }
        console.log("提示: serve 已自动启用同源接口代理；浏览器请求会先到当前工作台地址。双击项目内 start-scenario-test.cmd 可一键启动。");
    });
}

function importTimestamp(date = new Date()) {
    const pad = (value) => String(value).padStart(2, "0");
    return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`;
}

function scenarioIdFromOutput(output, timestamp) {
    const stem = path.basename(output, path.extname(output)).trim();
    const normalized = stem.replace(/[^\p{L}\p{N}._-]+/gu, "-").replace(/^-+|-+$/g, "");
    return normalized || `imported-${timestamp}`;
}

function defaultImportOutput(timestamp) {
    let candidate = path.resolve("scenarios", `imported-${timestamp}.js`);
    let suffix = 2;
    while (fs.existsSync(candidate)) {
        candidate = path.resolve("scenarios", `imported-${timestamp}-${suffix}.js`);
        suffix += 1;
    }
    return candidate;
}

function importCommand(args) {
    if (args.har && args.curl) {
        throw new CliUsageError("--har 与 --curl 不能同时使用", "一次导入只选择一种来源：HAR 文件或单条 curl 命令。");
    }
    if (!args.har && !args.curl) {
        throw new CliUsageError(
            "import 需要 --har 或 --curl",
            "示例：node scenario-test-cli.cjs import --har session.har；或 import --curl \"curl -X GET https://api.example.com/health\"。"
        );
    }
    const maxEntries = Number(args.maxEntries);
    if (!Number.isInteger(maxEntries) || maxEntries < 1) {
        throw new CliUsageError("--max-entries 必须是大于等于 1 的整数", "默认 50；请选择一个正整数上限后重试。");
    }
    const timestamp = importTimestamp();
    const output = args.output ? path.resolve(args.output) : defaultImportOutput(timestamp);
    const id = scenarioIdFromOutput(output, timestamp);
    let draft;
    try {
        draft = args.har
            ? createHarDraft(readHarFile(args.har), {
                source: args.har === "-" ? "stdin（HAR）" : path.basename(args.har),
                maxEntries,
                hosts: parseHostFilter(args.host)
            })
            : createCurlDraft(args.curl);
    } catch (error) {
        if (error instanceof ImportError) throw new CliUsageError(error.message, error.hint || undefined);
        throw error;
    }
    if (!draft.scenario.steps.length) {
        throw new CliUsageError(
            `未从 ${args.har ? "HAR " : "curl 命令"}中解析出可导入的 API 请求`,
            "HAR 可能只包含静态资源、预检请求或被 --host/--max-entries 过滤；请检查输入与过滤条件。"
        );
    }
    const content = renderDraftFile(draft, { id, generatedAt: new Date().toISOString() });
    fs.mkdirSync(path.dirname(output), { recursive: true });
    fs.writeFileSync(output, content, "utf8");
    const relativeOutput = path.relative(process.cwd(), output).split(path.sep).join("/") || output;
    console.log(`已生成场景草稿: ${relativeOutput}`);
    console.log(`场景 id: ${id}`);
    console.log(`导入步骤: ${draft.scenario.steps.length}`);
    if (draft.stats) {
        const filtered = (draft.stats.filteredStatic || 0) + (draft.stats.filteredInvalid || 0);
        console.log(`扫描请求: ${draft.stats.total}；过滤静态/预检/无效 ${filtered}；主机过滤 ${draft.stats.filteredHost || 0}；超出上限 ${draft.stats.omittedByLimit || 0}`);
    }
    const variables = Object.keys(draft.scenario.vars || {});
    if (variables.length) {
        console.log(`敏感头/查询参数占位变量: ${variables.join(", ")}`);
        console.log("提示: 请在 scenario.config.js 的 vars 或 run --vars 中提供真实值，不要提交明文凭据。");
    }
    console.log(`提示: 在 scenario.config.js 的 scenarios 中添加 { id: ${JSON.stringify(id)}, url: ${JSON.stringify(relativeOutput)} } 后即可 run。`);
    if (args.curl) {
        console.log("\n单步骤片段（可直接粘贴到 steps 数组）：");
        console.log(JSON.stringify(draft.scenario.steps[0], null, 2));
    }
}

function capabilitiesCommand(args) {
    const capabilities = buildCapabilities(contract);
    if (args.json) {
        // JSON 模式 stdout 纯净：只输出合法 JSON，不混入任何日志
        process.stdout.write(`${JSON.stringify(capabilities, null, 2)}\n`);
    } else {
        console.log(renderCapabilitiesText(capabilities));
    }
}

function doctorCommand(args) {
    // 配置缺失不提前抛错：把（可能不存在的）配置路径交给 doctor 汇总报告，
    // config 检查 FAIL 但版本/文件握手等其他检查继续执行，--json 仍输出结构化 JSON
    let configPath;
    let configDir;
    try {
        configPath = resolveConfigPath(args.config);
        configDir = path.dirname(configPath);
    } catch (error) {
        configPath = path.resolve(args.config || "scenario.config.js");
        configDir = path.dirname(configPath);
    }
    const report = buildDoctorReport({ configPath, api: ScenarioTest, configDir });
    if (args.json) {
        // JSON 模式 stdout 纯净：只输出合法 JSON
        process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
    } else {
        console.log(renderDoctorText(report));
    }
    process.exitCode = report.exitCode;
}

async function main() {
    const args = parseArgs(process.argv.slice(2));
    if (args.help) { printHelp(); return; }
    if (args.command === "init") await initCommand(args);
    else if (args.command === "serve") await serveCommand(args);
    else if (args.command === "capabilities") capabilitiesCommand(args);
    else if (args.command === "doctor") doctorCommand(args);
    else if (args.command === "import") importCommand(args);
    else await runCommand(args);
}

main().catch((error) => {
    if (error instanceof CliUsageError) {
        console.error(`错误：${escapeInlineText(error.message)}`);
        if (error.hint) console.error(`提示：${escapeInlineText(error.hint)}`);
    } else {
        console.error(escapeErrorText(error));
    }
    process.exitCode = 1;
});
