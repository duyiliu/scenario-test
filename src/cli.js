import fs from "node:fs";
import http from "node:http";
import https from "node:https";
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
import { validatePath, isRealPathWithinRoot } from "./utils/path-validator.js";
import { mergeGlobals, normalizeGlobalParam, SAVED_RESPONSE } from "./core.js";
import { FRAMEWORK_FILES, resolveProjectLayout } from "./project-layout.js";
import { defuseCiCommandMarkers, escapeC1, escapeInlineText, failureDiffLines, formatFailureValue } from "./utils/failure-diff.js";

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
    const args = { command: "run", all: false, config: "", scenario: "", env: "", baseUrl: "", authorization: "", vars: {}, port: 4300, project: "", dir: "", force: false, noInput: false, allowExternalPlugins: false, failOnSkip: false, json: false, help: false };
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
                // 可重复选项按出现顺序叠加；同 key 后者覆盖前者。
                // 用 Object.fromEntries 而非直接赋值：--vars __proto__=x 必须成为
                // 自有键并由引擎 assertNoReservedVars 拒绝，不能改写对象原型。
                args[valueOption.prop] = Object.fromEntries([
                    ...Object.entries(args[valueOption.prop] || {}),
                    parsed
                ]);
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
    if (args.timeout !== undefined && (!Number.isFinite(args.timeout) || args.timeout <= 0)) {
        throw new CliUsageError(
            "--timeout 必须是大于 0 的毫秒数",
            "示例：--timeout 5000；该值会覆盖配置中的 requestTimeoutMs。"
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

function configVariables(config, overrides = {}) {
    const values = { ...(config.vars || {}) };
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
    const entries = args.all
        ? config.scenarios.filter((item) => !item.manual)
        : requested.length
            ? config.scenarios.filter((item) => [item.id, item.name, item.url].some((key) => requested.includes(key)))
            : config.scenarios.filter((item) => [item.id, item.name, item.url].includes(config.scenarios[0]?.id));
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
    const baseOptions = {
        config,
        baseUrl: String(args.baseUrl || environment.baseUrl || config.baseUrl || "").replace(/\/+$/, ""),
        authorization: args.authorization || environment.authorization || config.authorization || "",
        globals: mergeGlobals(config.globals, environment.globals, envGlobals),
        requestTimeoutMs: args.timeout ?? config.requestTimeoutMs,
        vars: configVariables(config, args.vars),
        environmentVariables: process.env,
        io: ScenarioTest.createNodeIo(configDir),
        adapters
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
    const reports = [];
    for (const entry of entries) {
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
        print(`\n# ${escapeInlineText(scenario.name)} (${escapeInlineText(entry.id)})`);
        const report = await ScenarioTest.createEngine(baseOptions).runScenario(scenario, {
            ...baseOptions,
            // 重试进度：retryUntil 轮询在间隔内长时间静默，输出每次失败重试防「挂死」观感；
            // 带步骤名——同场景多个轮询步骤（等订单→等发货）时进度行需能归属
            async onAttempt(info) {
                const label = info.errorType === "timeout" ? "超时" : (info.errorType ? "连接失败" : "未通过");
                const detail = info.errorType
                    ? (info.errorMessage ? escapeInlineText(info.errorMessage) : "")
                    : `status ${escapeInlineText(info.status)}${info.failedAssertion ? `，${escapeInlineText(info.failedAssertion)}` : ""}`;
                print(`  [RETRY] ${escapeInlineText(info.step?.name || "未命名步骤")} 第 ${info.attempt}/${info.totalAttempts} 次${label}${detail ? `（${detail}）` : ""}，${ScenarioTest.formatDuration(info.intervalMs)}后重试`);
            },
            async onStep(result) {
                const mark = result.skipped ? "SKIP" : (result.passed ? "PASS" : "FAIL");
                print(`[${mark}] ${escapeInlineText(result.name)} ${escapeInlineText(result.method)} ${escapeInlineText(result.path)} -> ${escapeInlineText(result.status)} (${ScenarioTest.formatDuration(result.duration)})`);
                for (const warning of result.warnings || []) {
                    print(`  [WARN] ${escapeInlineText(warning)}`);
                }
                // each 失败明细：失败断言下逐行列出失败元素（序号 1 基）与失败子断言的期望/实际值；
                // 嵌套 each 递归展开，路径用「 › 」串联定位「第几项的第几项」（JSON 报告同口径已透出）
                const printEachDetail = (detail, prefix) => {
                    for (const item of detail || []) {
                        const label = `${prefix}第 ${item.index + 1} 项`;
                        for (const sub of item.assertions) {
                            if (sub.passed) continue;
                            print(`      ↳ ${label} ${escapeInlineText(sub.name)}: expected=${formatFailureValue(sub.expected)} actual=${formatFailureValue(sub.actual)}`);
                            // 语义化失败原因（如 includes 对象实际值）：紧随明细行输出，引导替代写法
                            if (sub.reason) print(`        原因: ${escapeInlineText(sub.reason)}`);
                            // 值超短值上限时展开为分块 diff（多行字符串/长 JSON），与顶层断言同口径
                            for (const line of failureDiffLines(sub.expected, sub.actual, "        ")) {
                                print(line);
                            }
                            printEachDetail(sub.detail, `${label} › `);
                        }
                    }
                };
                for (const assertion of result.assertions.filter((item) => !item.passed)) {
                    print(`  - ${escapeInlineText(assertion.name)}: expected=${formatFailureValue(assertion.expected)} actual=${formatFailureValue(assertion.actual)}`);
                    // 语义化失败原因（如 includes 对象实际值）：引导改用 equals / 字段 path 断言；
                    // 静态文案同样过 escapeInlineText，防插件注入换行/CI 命令标记
                    if (assertion.reason) print(`      原因: ${escapeInlineText(assertion.reason)}`);
                    // 短值保持单行口径；任一值序列化超 80 字符时展开结构化 diff 分块：
                    // 多行字符串按真实换行拆行（行号 + | 前缀，行内容转义防 CRLF 打乱终端）、
                    // 长对象/数组缩进展开、字符串值定位首个差异字符（1 基）并给上下文窗口
                    for (const line of failureDiffLines(assertion.expected, assertion.actual, "    ")) {
                        print(line);
                    }
                    printEachDetail(assertion.detail, "");
                }
                // 失败步骤补打响应体原文（截断）：断言层只有 expected/actual，
                // 服务端错误 payload 才是 CI/AI 诊断的关键上下文。
                // 请求体与请求头刻意不输出——注入后的 Authorization、登录密码类字段不应进日志；
                // 响应体可能回显 token（登录步骤断言失败时），日志合规敏感的团队可设
                // SCENARIO_NO_BODY_PRINT=1 关闭本输出
                if (!result.passed && !result.skipped && !process.env.SCENARIO_NO_BODY_PRINT) printFailedStepBody(result, print);
            }
        });
        for (const plugin of plugins) {
            await plugin?.afterScenario?.(report, { config, configDir, entry, environment, scenario });
        }
        reports.push(report);
        total += report.planned;
        passedTotal += report.passedSteps;
        // 因 failurePolicy:stop 未执行到位的步骤按失败统计；SKIP 步骤单独计数不并入失败
        const stoppedUnexecuted = report.planned - report.executed - report.skipped;
        actualFailedTotal += report.failed;
        stoppedUnexecutedTotal += stoppedUnexecuted;
        failedTotal += report.failed + stoppedUnexecuted;
        skippedTotal += report.skipped;
        print(`Summary: passed=${report.passedSteps} failed=${report.failed} skipped=${report.skipped} executed=${report.executed}/${report.planned} planned (状态 ${report.status})`);
    }
    print(`\nOverall: ${passedTotal}/${total} passed`);
    if (failedTotal) process.exitCode = 1;
    if (args.failOnSkip && skippedTotal > 0) {
        print(`\n--fail-on-skip 已开启，存在 ${skippedTotal} 个 SKIP 步骤，退出码置为 1`);
        process.exitCode = 1;
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
        // 退出码与 JSON 正交：失败场景同样输出完整 JSON，仅置非零退出码。
        const payload = reports.length === 1 ? reports[0] : { scenarios: reports };
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

function printFailedStepBody(result, print = console.log) {
    const response = result?.response;
    if (!response || typeof response !== "object") return;
    const body = response.body;
    const bodyText = typeof response.bodyText === "string" ? response.bodyText : null;
    // saveResponseAs 时 bodyText 恒为 null、body 是保存信息 {savedTo,size,contentType}——
    // 凭 SAVED_RESPONSE 内部标记确认真实发生过保存，不靠字段形状推断：
    // 适配器结构化 body（bodyText 缺省归一化为 null）恰好含 savedTo+size 字段时不吞原文；
    // savedTo 可能经模板混入服务端可控字节（extract 提取值进路径），同样转义
    if (bodyText === null && body && typeof body === "object" && body[SAVED_RESPONSE] === true) {
        print(`  响应体已保存至 ${escapeBodyLine(body.savedTo)}`);
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
    const text = raw.replace(/\r\n/g, "\n").trimEnd();
    if (text === "") return;
    const truncated = text.length > FAILURE_BODY_LIMIT;
    const shown = truncated ? text.slice(0, FAILURE_BODY_LIMIT) : text;
    const note = truncated ? `（共 ${text.length} 字符，截断显示前 ${FAILURE_BODY_LIMIT}）` : "";
    print(`  响应体${note}:`);
    for (const line of shown.split("\n")) print(`    ${escapeBodyLine(line)}`);
}

function safeFile(root, relativePath) {
    const candidate = path.resolve(root, relativePath);
    const relative = path.relative(root, candidate);
    if (!relative || relative.startsWith("..") || path.isAbsolute(relative)) return null;
    // serve 真实读文件：junction/符号链接在词法层不可见，按真实位置再判一次
    return isRealPathWithinRoot(root, candidate) ? candidate : null;
}

function contentType(filePath) {
    return ({
        ".html": "text/html; charset=utf-8",
        ".js": "application/javascript; charset=utf-8",
        ".json": "application/json; charset=utf-8",
        ".css": "text/css; charset=utf-8",
        ".svg": "image/svg+xml",
        ".txt": "text/plain; charset=utf-8"
    })[path.extname(filePath).toLowerCase()] || "application/octet-stream";
}

function serveStaticFile(response, filePath) {
    const headers = { "Cache-Control": "no-store", "Content-Type": contentType(filePath) };
    if (path.extname(filePath).toLowerCase() !== ".html") {
        const stream = fs.createReadStream(filePath);
        stream.on("error", () => {
            if (response.headersSent) { response.destroy(); return; }
            response.writeHead(500);
            response.end("Internal Server Error");
        });
        stream.on("open", () => {
            response.writeHead(200, headers);
            stream.pipe(response);
        });
        return;
    }
    fs.readFile(filePath, "utf8", function (error, html) {
        if (error) {
            response.writeHead(500);
            response.end("Internal Server Error");
            return;
        }
        const marker = "<script>window.__SCENARIO_TEST_SERVE_PROXY__ = true;</script>";
        const headPattern = /<head(?:\s[^>]*)?>/i;
        const content = headPattern.test(html)
            ? html.replace(headPattern, function (head) { return head + marker; })
            : marker + html;
        response.writeHead(200, headers);
        response.end(content);
    });
}

function resolveServeProxyTarget(config, envKey, baseUrlOverride) {
    // serve 保留环境 baseUrl 作为上游目标，并在返回的 HTML 中注入代理模式标记让浏览器强制使用当前同源地址
    if (config.envs?.length) {
        // 与 run 的 selectEnvironment 一致：环境不存在时报错退出。
        // 静默回退 envs[0] 会把请求代理到错误后端（可能是生产），且日志仍显示用户输入的环境名
        const environment = selectEnvironment(config, envKey);
        // --base-url 临时覆盖代理目标（与 run 模式一致）；日志标注覆盖来源，避免与配置环境混淆
        const overridden = Boolean(baseUrlOverride);
        return {
            key: overridden ? `${environment.key}（--base-url 覆盖）` : environment.key,
            target: String(overridden ? baseUrlOverride : environment.baseUrl || "").replace(/\/+$/, "")
        };
    }
    return {
        key: config.defaultEnvKey || "default",
        target: String(baseUrlOverride || config.baseUrl || "").replace(/\/+$/, "")
    };
}

// 转发时剔除 hop-by-hop 头（RFC 7230 §6.1），避免把客户端连接语义泄漏给上游；
// Node 会按 targetUrl 重建 host/connection，显式删除可防止冲突。
const HOP_BY_HOP_HEADERS = new Set([
    "connection", "keep-alive", "proxy-authenticate", "proxy-authorization",
    "te", "trailer", "transfer-encoding", "upgrade", "host"
]);

// 上游空闲超时：响应头尚未发出时返回 502；传输中途超时/断连则无法再写响应头，
// 只能销毁下游连接。参数化（如 --proxy-timeout）需扩展 contract，暂以常量 + README 说明为准。
const PROXY_TIMEOUT_MS = 30000;

function abortProxyResponse(response) {
    if (response.destroyed || response.writableEnded) return;
    response.destroy();
}

function respondProxyError(response, message) {
    // 响应已开始（writeHead + pipe 进行中）时二次 writeHead 会抛 ERR_HTTP_HEADERS_SENT，
    // 从事件回调冒泡成 uncaughtException 直接杀死 serve 进程；此时只能断开连接
    if (response.headersSent) { abortProxyResponse(response); return; }
    response.writeHead(502, { "Content-Type": "text/plain; charset=utf-8" });
    response.end(message);
}

// 按代理目标协议选择转发模块；无法识别（缺 http(s):// 前缀或非法 URL）时返回 null，
// 由调用方降级为 502 提示——代理目标错误属于配置问题，不应让 serve 进程退出。
function proxyTransport(targetUrl) {
    try {
        const protocol = new URL(targetUrl).protocol;
        if (protocol === "https:") return https;
        if (protocol === "http:") return http;
    } catch {
        return null;
    }
    return null;
}

// RFC 7230 §6.1：Connection 头点名的字段同样是逐跳的，需随静态名单一并剔除
function connectionNamedHeaders(connectionValue) {
    return String(connectionValue || "")
        .split(",")
        .map((item) => item.trim().toLowerCase())
        .filter(Boolean);
}

function proxyRequest(request, response, targetUrl) {
    const transport = proxyTransport(targetUrl);
    if (!transport) {
        respondProxyError(
            response,
            `Bad Gateway: 接口代理目标无效: ${targetUrl}\n` +
            "请检查环境 baseUrl，必须带协议前缀（http:// 或 https://）"
        );
        return;
    }
    const headers = {};
    const requestCloseNamed = new Set(connectionNamedHeaders(request.headers.connection));
    for (const [name, value] of Object.entries(request.headers)) {
        const lower = String(name).toLowerCase();
        if (!HOP_BY_HOP_HEADERS.has(lower) && !requestCloseNamed.has(lower)) headers[name] = value;
    }
    let upstream;
    try {
        // 保持原拼接语义：targetUrl 已去尾部斜杠，若带路径前缀则原样保留
        upstream = transport.request(targetUrl + request.url, {
            method: request.method,
            headers,
            // serve 是本地联调代理，内网 https 后端普遍使用自签证书；
            // 与 vite/webpack-dev-server 的 proxy secure:false 同语义，放宽上游证书校验
            ...(transport === https ? { rejectUnauthorized: false } : {})
        }, (upstreamResponse) => {
            // 响应方向同样剔除 hop-by-hop 头，避免把上游连接语义（transfer-encoding/keep-alive 等）透传给浏览器；
            // Connection 点名的自定义字段同样剔除
            const responseHeaders = {};
            const upstreamCloseNamed = new Set(connectionNamedHeaders(upstreamResponse.headers.connection));
            for (const [name, value] of Object.entries(upstreamResponse.headers)) {
                const lower = String(name).toLowerCase();
                if (!HOP_BY_HOP_HEADERS.has(lower) && !upstreamCloseNamed.has(lower)) responseHeaders[name] = value;
            }
            response.writeHead(upstreamResponse.statusCode || 502, responseHeaders);
            // 响应已开始后上游传输中途断连/重置：不能再写 502（二次 writeHead 会抛
            // ERR_HTTP_HEADERS_SENT），直接销毁下游连接，让浏览器立即失败而不是无限等待
            upstreamResponse.on("error", () => abortProxyResponse(response));
            upstreamResponse.on("aborted", () => abortProxyResponse(response));
            upstreamResponse.pipe(response);
        });
    } catch (error) {
        // 请求构造阶段（非法 URL 等）可能同步抛错，此处兜底为 502
        respondProxyError(response, `Bad Gateway: 接口代理请求构造失败: ${error.message}`);
        return;
    }
    upstream.setTimeout(PROXY_TIMEOUT_MS, () => {
        upstream.destroy(new Error("接口代理超时"));
    });
    upstream.on("error", () => {
        respondProxyError(response, "Bad Gateway: 无法连接接口代理目标或代理超时");
    });
    request.pipe(upstream);
}

// Host 白名单：serve 绑定 127.0.0.1 仅供本机回环访问。校验 Host 头可阻断 DNS rebinding 等
// 跨源读取（攻击域名解析到 127.0.0.1 后，浏览器请求仍会携带攻击者的 Host），
// 与 vite/webpack-dev-server 的 host 校验同类加固
function isAllowedServeHost(hostHeader, port) {
    const host = String(hostHeader || "").trim().toLowerCase();
    return [`127.0.0.1:${port}`, `localhost:${port}`, `[::1]:${port}`, "127.0.0.1", "localhost", "[::1]"].includes(host);
}

async function serveCommand(args) {
    const configPath = resolveConfigPath(args.config);
    const workspace = path.dirname(configPath);
    const libraryDist = path.dirname(path.resolve(process.argv[1]));
    const config = ScenarioTest.loadConfigFile(configPath, ScenarioTest);
    const { key: proxyEnvKey, target: proxyTarget } = resolveServeProxyTarget(config, args.env, args.baseUrl);
    const server = http.createServer((request, response) => {
        try {
            if (!isAllowedServeHost(request.headers.host, args.port)) {
                response.writeHead(403);
                response.end("Forbidden");
                return;
            }
            const pathname = decodeURIComponent(new URL(request.url, "http://127.0.0.1").pathname);
            let filePath;
            if (pathname === "/__scenario-test__/scenario-test.umd.js") filePath = path.join(libraryDist, "scenario-test.umd.js");
            else if (pathname === "/dist/scenario-test.umd.js") {
                // 仓库内示例的 index.html 引用 ../../dist/scenario-test.umd.js（浏览器规范化为 /dist/...）
                filePath = path.join(libraryDist, "scenario-test.umd.js");
            }
            else if (pathname === "/node_modules/@yc_yzkj/scenario-test/dist/scenario-test.umd.js") {
                // 兼容 npm 包路径引用；运行时副本优先由项目 .scenario-test/ 提供
                filePath = path.join(libraryDist, "scenario-test.umd.js");
            }
            else {
                const relativePath = pathname === "/" ? "index.html" : pathname.replace(/^\/+/, "");
                filePath = safeFile(workspace, relativePath);
            }
            if (!filePath) { response.writeHead(403); response.end("Forbidden"); return; }
            fs.stat(filePath, (error, stat) => {
                if (error || !stat.isFile()) {
                    // 静态文件未命中且配置了接口代理时，按同源请求转发到后端，绕开浏览器 CORS
                    if (proxyTarget) { proxyRequest(request, response, proxyTarget); return; }
                    response.writeHead(404); response.end("Not Found"); return;
                }
                serveStaticFile(response, filePath);
            });
        } catch {
            response.writeHead(400);
            response.end("Bad Request");
        }
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
        if (proxyTarget) console.log(`接口代理: ${proxyEnvKey} -> ${proxyTarget}`);
        console.log("提示: serve 已自动启用同源接口代理；浏览器请求会先到当前工作台地址。双击项目内 start-scenario-test.cmd 可一键启动。");
    });
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
