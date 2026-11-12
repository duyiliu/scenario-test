// doctor —— 项目静态体检（三方能力发现闭环的一部分）
//
// 原则：
//   - 复用现有 loader/defineConfig/defineScenario/path validation，不另写一套 DSL 校验器
//   - 汇总所有可继续检查的错误，不第一个错误就退出（config 无法加载等不能安全继续时除外）
//   - 有 FAIL 时退出码 1；只有 WARN/INFO 时退出码 0
//   - v23 起运行时去项目化：不再校验项目内副本/版本锁；场景加载失败附「升级安装方」提示
import fs from "node:fs";
import path from "node:path";
import { contract, CONTRACT_VERSION } from "./contract.js";
import { VERSION } from "./version.generated.js";
import { validatePath } from "./utils/path-validator.js";
import { loadConfigFile, loadScenarioFile } from "./node/loader.js";
import { INTERNAL_DIRECTORY, listLegacyRuntimeFiles } from "./project-layout.js";
import { isE2eProject } from "./e2e/extension.js";

// 场景/配置加载失败统一附带的升级提示：v23 后项目不再锁版本，错误多半来自
// 场景为更高 contract 版本所写，需升级安装方（Skill / 用户级运行时）
const UPGRADE_HINT = `若场景/配置为更高版本所写，请升级安装方运行时（更新 Skill 或重跑安装脚本）；当前运行时 v${VERSION}（contract v${CONTRACT_VERSION}）`;

// baseUrl 缺失本身不阻断 defineConfig（浏览器工作台可回退当前页面地址），但 CLI run
// 没有 baseUrl 会在执行期才报错；doctor 提前用 WARN 暴露，并说明顶层 baseUrl 回退规则。
// 已声明的 baseUrl 由 defineConfig 统一校验 http(s)://，非法值会在 config-load 阶段 FAIL。
// 弱断言诊断（#107 配套）：只断言 HTTP 状态/业务 code 的步骤无法证明业务结果；
// 写操作场景若没有任何业务断言（无后置状态验证）同样提示。诊断为 WARN，
// 不改变 doctor 退出码，也不强制场景结构——是否采纳由人决定。
const WEAK_ASSERTION_NOTE = "仅断言 HTTP 状态/响应 code，无法证明业务结果";
const WRITE_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

function stepMethodOf(step) {
    const raw = step.method || (step.request && step.request.method) || "GET";
    return String(raw).toUpperCase();
}

// 断言是否只覆盖「HTTP 状态」或「响应 code」这类 envelope 信息
function isEnvelopeOnlyAssertion(assertion) {
    if (!assertion || typeof assertion !== "object") return false;
    if ("status" in assertion) return true;
    // 业务包装体的 code 字段（未显式 from:headers/bodyText 时默认取 body）
    if (assertion.path === "code" && assertion.from === undefined) return true;
    return false;
}

function collectWeakAssertionFindings(scenario) {
    const findings = [];
    const steps = Array.isArray(scenario.steps) ? scenario.steps : [];
    const label = scenario.id || scenario.name || "未命名场景";
    const hasBusinessAssertion = steps.some((step) => (step.assertions || []).some((a) => !isEnvelopeOnlyAssertion(a)));
    const hasWriteStep = steps.some((step) => WRITE_METHODS.has(stepMethodOf(step)));
    if (!hasBusinessAssertion) {
        // 全场景没有任何业务断言：只读场景是弱断言；写场景还意味着没有后置状态验证
        findings.push({
            kind: hasWriteStep ? "write-no-postcheck" : "envelope-only",
            message: hasWriteStep
                ? `场景 ${label} 的所有步骤仅断言 HTTP 状态/响应 code，且含写操作却缺少后置状态验证（查询接口/返回体字段），无法证明业务结果`
                : `场景 ${label} 的所有步骤仅断言 HTTP 状态/响应 code，无法证明业务结果`
        });
        return findings;
    }
    // 已有业务断言时，写操作步骤可以只靠后置查询验证（推荐模式），
    // 只提示仍然只断言状态的只读步骤。
    steps.forEach((step, index) => {
        const assertions = step.assertions || [];
        const envelopeOnly = assertions.length === 0 || assertions.every((a) => isEnvelopeOnlyAssertion(a));
        if (envelopeOnly && !WRITE_METHODS.has(stepMethodOf(step))) {
            findings.push({
                kind: "envelope-only",
                message: `场景 ${label} 的只读步骤「${step.name || index + 1}」仅断言 HTTP 状态/响应 code，无法证明业务结果`
            });
        }
    });
    return findings;
}

function checkConfigBaseUrl(config) {
    const environments = Array.isArray(config.envs) ? config.envs : [];
    const fallback = typeof config.baseUrl === "string" ? config.baseUrl.trim() : "";
    const missingKeys = environments
        .filter((env) => !String(env.baseUrl || "").trim())
        .map((env) => env.key);
    if (environments.length === 0) {
        if (fallback) {
            return { name: "base-url", status: "PASS", message: `配置未声明 envs，顶层 baseUrl 可用: ${fallback}`, fix: "" };
        }
        return {
            name: "base-url",
            status: "WARN",
            message: "配置未声明 envs 且顶层 baseUrl 为空：CLI run 需要 --base-url 或配置 baseUrl",
            fix: "在 scenario.config.js 中补充 envs[].baseUrl 或顶层 baseUrl（http(s)://）"
        };
    }
    if (fallback) {
        return {
            name: "base-url",
            status: "PASS",
            message: missingKeys.length
                ? `环境 ${missingKeys.join(", ")} 未单独设置 baseUrl，将回退顶层 baseUrl: ${fallback}`
                : `环境 baseUrl 已声明（http(s)://），顶层回退地址: ${fallback}`,
            fix: ""
        };
    }
    if (missingKeys.length) {
        return {
            name: "base-url",
            status: "WARN",
            message: `环境 ${missingKeys.join(", ")} 未设置 baseUrl，且顶层 baseUrl 为空：CLI run 需要 --base-url 或配置 baseUrl`,
            fix: "为每个环境补充 http(s):// baseUrl，或声明顶层 baseUrl 作为回退"
        };
    }
    return { name: "base-url", status: "PASS", message: "所有环境均已声明 http(s):// baseUrl", fix: "" };
}

// 缺省段按 0 参与比较：此前 map(Number) 对未命中的可选组产出 NaN（解构默认值只兜
// undefined），NaN 参与比较恒 false——">=22" 在全部 v22.x（engines 声明的支持下限）
// 上误判 FAIL，仅主版本高于下限时因短路偶然正确；v22.9.0 对 >=22.9 同病
export function satisfiesNodeEngine(version, range) {
    const match = /^>=\s*(\d+)(?:\.(\d+)(?:\.(\d+))?)?/.exec(String(range || "").trim());
    if (!match) return false;
    const [major, minor, patch] = match.slice(1).map((segment) => Number(segment ?? 0));
    // 用正则提取数字段，忽略 pre-release 后缀（如 v18.0.0-rc.1），避免 Number("0-rc.1") 为 NaN 导致误判
    const current = /^v?(\d+)(?:\.(\d+)(?:\.(\d+))?)?/.exec(String(version).trim());
    if (!current) return false;
    const [curMajor, curMinor, curPatch] = current.slice(1).map((segment) => Number(segment ?? 0));
    if (curMajor !== major) return curMajor > major;
    if (curMinor !== minor) return curMinor > minor;
    return curPatch >= patch;
}

function checkReadableFile(filePath, key, fileName) {
    if (!fs.existsSync(filePath)) {
        return {
            name: key,
            status: "FAIL",
            message: `缺少文件 ${fileName}（${filePath}）`,
            fix: "补齐该文件后重新运行 doctor"
        };
    }
    try {
        const stat = fs.statSync(filePath);
        if (!stat.isFile()) throw new Error("路径不是普通文件");
        fs.readFileSync(filePath, "utf8");
        return { name: key, status: "PASS", message: `文件就绪: ${fileName}`, fix: "" };
    } catch (error) {
        return {
            name: key,
            status: "FAIL",
            message: `文件不可读取: ${fileName}（原因: ${error.message}）`,
            fix: "移走无效路径后重新运行 init"
        };
    }
}

export function buildDoctorReport(options) {
    const { configPath, api, configDir } = options;
    const checks = [];
    const info = [];

    // 1. Node 版本满足 package engines
    const engineRange = contract.engines?.node || ">=22";
    checks.push(satisfiesNodeEngine(process.version, engineRange)
        ? { name: "node-version", status: "PASS", message: `Node ${process.version} 满足 engines.node ${engineRange}`, fix: "" }
        : {
            name: "node-version",
            status: "FAIL",
            message: `Node ${process.version} 不满足 engines.node ${engineRange}`,
            fix: "升级 Node.js 到满足 engines 的版本后重试"
        });

    // 2. config 可加载（复用 loader/defineConfig）
    //    配置文件不存在时输出 name: "config" 的 FAIL（--json 结构化输出兼容），
    //    存在但加载失败时输出 name: "config-load"
    let config = null;
    if (!fs.existsSync(configPath)) {
        checks.push({
            name: "config",
            status: "FAIL",
            message: `配置文件不存在: ${configPath}`,
            fix: "创建 scenario.config.js（可用 init 生成模板），或通过 --config 指定正确的配置文件"
        });
    } else {
        try {
            config = loadConfigFile(configPath, api);
            checks.push({ name: "config-load", status: "PASS", message: `配置可加载: ${configPath}`, fix: "" });
        } catch (error) {
            const reason = String(error?.message || error);
            checks.push({
                name: "config-load",
                status: "FAIL",
                message: `配置文件加载失败: ${configPath}（原因: ${reason}）`,
                fix: `检查配置语法与 defineConfig 调用；${UPGRADE_HINT}`
            });
            // 只依据 defineConfig 写入的结构化 code 追加专项结论：配置脚本自身抛出的
            // 任意错误即使消息里含「未知键」或 baseUrl，也不能被误报成字段校验失败。
            if (error?.code === "SCENARIO_CONFIG_UNKNOWN_KEY") {
                checks.push({
                    name: "config-keys",
                    status: "FAIL",
                    message: `配置字段校验失败: ${reason}`,
                    fix: "按报错中「是否想写」或允许的键名修正拼写"
                });
            } else if (error?.code === "SCENARIO_CONFIG_BASE_URL") {
                checks.push({
                    name: "base-url",
                    status: "FAIL",
                    message: `baseUrl 校验失败: ${reason}`,
                    fix: "将 envs[].baseUrl 或顶层 baseUrl 改为 http:// 或 https:// 开头的完整 URL"
                });
            }
        }
    }

    // 3/4/5. 场景清单与文件（config 加载成功才可安全继续）
    if (config) {
        checks.push(checkConfigBaseUrl(config));
        const entries = config.scenarios || [];
        if (entries.length === 0) {
            checks.push({ name: "scenario-list", status: "PASS", message: "配置中暂无可检查的场景（scenarios 为空）", fix: "" });
        } else {
            let listOk = true;
            for (const entry of entries) {
                if (!entry.id || !entry.url) {
                    listOk = false;
                    checks.push({
                        name: "scenario-list",
                        status: "FAIL",
                        message: `场景清单项缺少 id 或 url（${JSON.stringify(entry)}）`,
                        fix: "在 scenario.config.js 中为每个场景项提供 id、name、url"
                    });
                    continue;
                }
                if (entry.manual === true) {
                    info.push({
                        name: "manual-scenario",
                        scenarioId: entry.id,
                        message: `场景 ${entry.id} 标记为 manual:true（需要人工准备数据或写数据），--all 默认排除，请用 --scenario ${entry.id} 显式执行`
                    });
                }
                let scenarioPath;
                try {
                    // 与 run 命令保持一致：绝对路径直接接受（不禁止），仅提示建议使用相对路径；
                    // 相对路径仍做配置目录内越界校验（防路径遍历）
                    scenarioPath = path.isAbsolute(entry.url) ? entry.url : validatePath(configDir, entry.url);
                } catch (error) {
                    listOk = false;
                    checks.push({
                        name: "scenario-list",
                        status: "FAIL",
                        message: `场景 ${entry.id} 的 url 不安全: ${entry.url}（原因: ${error.message}）`,
                        fix: "url 必须是配置目录内的相对路径"
                    });
                    continue;
                }
                if (path.isAbsolute(entry.url)) {
                    checks.push({
                        name: "absolute-scenario-path",
                        status: "WARN",
                        message: `场景 ${entry.id} 使用绝对路径: ${entry.url}（run 可正常执行，但建议使用配置目录内相对路径，便于项目迁移）`,
                        fix: "将 scenario.config.js 中该场景的 url 改为相对路径"
                    });
                }
                if (!fs.existsSync(scenarioPath)) {
                    listOk = false;
                    checks.push({
                        name: "scenario-list",
                        status: "FAIL",
                        message: `场景文件不存在: ${scenarioPath}（场景 ${entry.id}）`,
                        fix: `创建该文件，或在 scenario.config.js 中修正 url`
                    });
                    continue;
                }
                try {
                    const scenario = loadScenarioFile(scenarioPath, entry.id, api);
                    if (scenario.name) {
                        checks.push({
                            name: "scenario-register",
                            status: "PASS",
                            message: `场景 ${entry.id} 加载并注册成功（${scenarioPath}）`,
                            fix: ""
                        });
                        // 弱断言是提示而非失败：AI 编写规则（references/author.md）已要求优先
                        // 增强/补后置断言，这里给确定性的兜底信号，避免假绿被当成完整验证
                        for (const finding of collectWeakAssertionFindings({ ...scenario, id: entry.id })) {
                            checks.push({
                                name: "weak-assertions",
                                status: "WARN",
                                scenarioId: finding.scenarioId,
                                message: finding.message,
                                fix: "补充响应体/后置查询断言（如查询创建结果、状态变更后的记录），使断言可证明业务结果"
                            });
                        }
                        // manual 场景不进默认执行：写操作若只存在于 manual 场景，
                        // CI/批量 run 不会覆盖，等于回归里没有这条验证。
                        const writeSteps = (scenario.steps || []).filter((step) => WRITE_METHODS.has(stepMethodOf(step)));
                        if (entry.manual === true && writeSteps.length > 0) {
                            checks.push({
                                name: "manual-write-scenario",
                                status: "WARN",
                                scenarioId: entry.id,
                                message: `场景 ${entry.id} 标记为 manual 且包含写操作（${writeSteps.length} 步）：默认 run 不会执行它，CI 不覆盖这些写操作`,
                                fix: "确认是否必须手动执行；若要纳入回归，移除 manual: true 并保证数据清理可重复执行"
                            });
                        }
                    }
                } catch (error) {
                    listOk = false;
                    checks.push({
                        name: "scenario-register",
                        status: "FAIL",
                        message: `场景 ${entry.id} 加载/注册失败: ${scenarioPath}（原因: ${error.message}）`,
                        fix: `检查场景文件：registerScenario(id, ...) 的 id 必须与 scenario.config.js 清单 id 一致；断言/when/保留变量须通过 defineScenario 校验。${UPGRADE_HINT}`
                    });
                }
            }
            if (listOk) {
                checks.push({ name: "scenario-list", status: "PASS", message: `场景清单合法（${entries.length} 项，文件均存在）`, fix: "" });
            }
        }
    }

    // 6. 运行时与旧版副本检查（v23 起项目不再保留运行时副本，AI 规则由安装方提供）
    checks.push({
        name: "cli",
        status: "PASS",
        message: `运行时版本 v${VERSION}（contract v${CONTRACT_VERSION}），项目使用安装方运行时`,
        fix: ""
    });
    const legacy = listLegacyRuntimeFiles(configDir);
    if (legacy.length) {
        checks.push({
            name: "legacy-runtime",
            status: "WARN",
            message: `检测到旧版项目内运行时副本 ${legacy.length} 项（如 ${INTERNAL_DIRECTORY}/scenario-test-cli.cjs）`,
            fix: `执行 init --clean 移除旧副本（不会动 scenario.config.js / scenarios/），或确认后手动删除 ${INTERNAL_DIRECTORY}/ 与 index.html`
        });
    } else {
        checks.push({
            name: "legacy-runtime",
            status: "PASS",
            message: "无旧版项目内运行时副本",
            fix: ""
        });
    }

    // E2E 为显式可选能力：不触发安装，也不访问被测服务。
    const e2eDir = path.join(configDir, "e2e");
    if (isE2eProject(configDir)) {
        checks.push(checkReadableFile(path.join(e2eDir, "package.json"), "e2e-package.json", "package.json"));
        // playwright 配置允许 js/ts/mjs/cjs 任意一种；auth 适配非必需（可放 helpers/ 或不写登录态用例），缺失仅提示。
        const pwConfig = ["playwright.config.ts", "playwright.config.js", "playwright.config.mjs", "playwright.config.cjs"]
            .map((n) => path.join(e2eDir, n)).find((p) => fs.existsSync(p));
        checks.push(pwConfig
            ? { name: "e2e-playwright.config", status: "PASS", message: `已找到 ${path.basename(pwConfig)}`, fix: "" }
            : { name: "e2e-playwright.config", status: "FAIL", message: `缺少 playwright.config.{js,ts,mjs,cjs}（${e2eDir}）`, fix: "补齐该文件后重新运行 doctor" });
        const authAdapter = ["auth-adapter.js", "auth-adapter.ts", "auth-adapter.mjs", path.join("helpers", "auth.ts"), path.join("helpers", "auth.js")]
            .map((n) => path.join(e2eDir, n)).find((p) => fs.existsSync(p));
        checks.push(authAdapter
            ? { name: "e2e-auth-adapter", status: "PASS", message: `已找到 ${path.relative(e2eDir, authAdapter)}`, fix: "" }
            : { name: "e2e-auth-adapter", status: "WARN", message: "未找到登录态适配（auth-adapter.* 或 helpers/auth.*）", fix: "若有用例需要登录态，请在 e2e/ 下提供适配文件；纯访客用例可忽略" });
        const cli = path.join(e2eDir, "node_modules", "@playwright", "test", "cli.js");
        checks.push(fs.existsSync(cli)
            ? { name: "e2e-dependencies", status: "PASS", message: "已安装本地 Playwright", fix: "" }
            : { name: "e2e-dependencies", status: "WARN", message: "尚未安装本地 Playwright", fix: `进入 ${e2eDir} 执行 npm install，再执行 npx playwright install chromium` });
        info.push({ name: "e2e-browser", message: "浏览器可用性与 E2E_BASE_URL 需在项目环境确认；doctor 不启动浏览器" });
    } else if (fs.existsSync(e2eDir)) {
        info.push({ name: "e2e-external", message: "检测到自管 E2E 目录，未启用框架托管 E2E" });
    }

    const summary = { passed: 0, warned: 0, failed: 0, info: info.length };
    for (const check of checks) {
        if (check.status === "PASS") summary.passed += 1;
        else if (check.status === "WARN") summary.warned += 1;
        else summary.failed += 1;
    }
    const exitCode = summary.failed > 0 ? 1 : 0;
    return {
        tool: "scenario-test doctor",
        runtimeVersion: VERSION,
        contractVersion: CONTRACT_VERSION,
        status: exitCode === 0 ? "OK" : "FAILED",
        checks,
        info,
        summary,
        exitCode
    };
}

const STATUS_MARK = { PASS: "[PASS]", WARN: "[WARN]", FAIL: "[FAIL]", INFO: "[INFO]" };

export function renderDoctorText(report) {
    const lines = [];
    lines.push(`场景测试 Doctor`);
    lines.push(`版本: v${report.runtimeVersion}（contract v${report.contractVersion}）`);
    lines.push("");
    for (const check of report.checks) {
        lines.push(`${STATUS_MARK[check.status] || check.status} ${check.name}: ${check.message}`);
        if (check.fix) lines.push(`       如何修: ${check.fix}`);
    }
    for (const item of report.info) {
        lines.push(`[INFO] ${item.name}: ${item.message}`);
    }
    lines.push("");
    lines.push(`摘要: ${report.summary.passed} PASS, ${report.summary.warned} WARN, ${report.summary.failed} FAIL, ${report.summary.info} INFO`);
    lines.push(report.exitCode === 0 ? "结果: OK（退出码 0）" : "结果: FAILED（退出码 1）");
    return lines.join("\n");
}
