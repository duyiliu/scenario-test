// doctor —— 项目静态体检（三方能力发现闭环的一部分）
//
// 原则：
//   - 复用现有 loader/defineConfig/defineScenario/path validation，不另写一套 DSL 校验器
//   - 汇总所有可继续检查的错误，不第一个错误就退出（config 无法加载等不能安全继续时除外）
//   - 有 FAIL 时退出码 1；只有 WARN/INFO 时退出码 0
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { contract, CONTRACT_VERSION } from "./contract.js";
import { VERSION } from "./version.generated.js";
import { validatePath } from "./utils/path-validator.js";
import { loadConfigFile, loadScenarioFile } from "./node/loader.js";
import { FRAMEWORK_FILES, createProjectLayout, resolveLayoutFromConfigDir } from "./project-layout.js";

const UMD_VERSION_PATTERN = /\/\*! scenario-test v(\d+\.\d+\.\d+) \*\//;
const DTS_VERSION_PATTERN = /scenario-test v(\d+\.\d+\.\d+)/;

function extractArtifactVersion(filePath, pattern) {
    const head = fs.readFileSync(filePath, "utf8").slice(0, 4096);
    const match = pattern.exec(head);
    return match ? match[1] : null;
}

function sha256Of(filePath) {
    return crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
}

function checkRuntimeArtifact(filePath, fileName, key, pattern) {
    if (!fs.existsSync(filePath)) {
        return {
            name: key,
            status: "WARN",
            message: `缺少运行时副本 ${fileName}（${filePath}）`,
            fix: "运行 init 补齐（不传 --force 不会覆盖项目文件）"
        };
    }
    try {
        const stat = fs.statSync(filePath);
        if (!stat.isFile()) throw new Error("路径不是普通文件");
        const version = pattern ? extractArtifactVersion(filePath, pattern) : null;
        if (pattern === null) fs.accessSync(filePath, fs.constants.R_OK);
        if (version !== null && version !== VERSION) {
            return {
                name: key,
                status: "FAIL",
                message: `版本不一致：${fileName} 是 v${version}，当前 CLI 是 v${VERSION}`,
                fix: `用 v${VERSION} 的 CLI 重新 init 刷新运行时副本`
            };
        }
        return {
            name: key,
            status: "PASS",
            message: `运行时副本就绪: ${fileName}${version ? `（v${version}）` : ""}`,
            fix: ""
        };
    } catch (error) {
        return {
            name: key,
            status: "FAIL",
            message: `运行时副本不可读取: ${fileName}（${filePath}，原因: ${error.message}）`,
            fix: "移走无效路径或修复文件读取权限后，用当前版本 CLI 重新 init"
        };
    }
}

function checkCapabilitiesFile(filePath) {
    if (!fs.existsSync(filePath)) {
        return {
            name: "capabilities",
            status: "WARN",
            message: "缺少运行时副本 scenario-test-capabilities.json",
            fix: "运行 init 补齐（不传 --force 不会覆盖项目文件）"
        };
    }
    try {
        const parsed = JSON.parse(fs.readFileSync(filePath, "utf8"));
        if (parsed.schema !== "scenario-test-capabilities") {
            return {
                name: "capabilities",
                status: "FAIL",
                message: "scenario-test-capabilities.json 不是合法的能力清单（schema 不匹配）",
                fix: "用当前版本 CLI 重新 init 生成"
            };
        }
        if (parsed.version !== VERSION || parsed.contractVersion !== CONTRACT_VERSION) {
            return {
                name: "capabilities",
                status: "FAIL",
                message: `版本不一致：capabilities.json 是 v${parsed.version}（contract v${parsed.contractVersion}），当前 CLI 是 v${VERSION}（contract v${CONTRACT_VERSION}）`,
                fix: `用 v${VERSION} 的 CLI 重新 init 生成 scenario-test-capabilities.json`
            };
        }
        return { name: "capabilities", status: "PASS", message: `版本一致（v${parsed.version}，contract v${parsed.contractVersion}）`, fix: "" };
    } catch (error) {
        return {
            name: "capabilities",
            status: "FAIL",
            message: `scenario-test-capabilities.json 解析失败: ${error.message}`,
            fix: "用当前版本 CLI 重新 init 生成"
        };
    }
}

function checkVersionLock(filePath) {
    if (!fs.existsSync(filePath)) {
        return {
            name: "version-lock",
            status: "WARN",
            message: "缺少项目版本锁 .scenario-test-version.json",
            fix: "运行 init 写入版本锁（不传 --force 不会覆盖项目文件）"
        };
    }
    let lock;
    try {
        lock = JSON.parse(fs.readFileSync(filePath, "utf8"));
    } catch (error) {
        return {
            name: "version-lock",
            status: "FAIL",
            message: `.scenario-test-version.json 解析失败: ${error.message}`,
            fix: "修复或删除版本锁后用当前版本 CLI 重新 init 生成"
        };
    }
    if (!lock || typeof lock !== "object" || Array.isArray(lock)) {
        return {
            name: "version-lock",
            status: "FAIL",
            message: "版本锁必须是 JSON 对象",
            fix: "修复版本锁后用当前版本 CLI 重新 init 生成"
        };
    }
    if (lock.runtimeVersion !== VERSION || lock.contractVersion !== CONTRACT_VERSION) {
        return {
            name: "version-lock",
            status: "FAIL",
            message: `版本不一致：版本锁记录 v${lock.runtimeVersion}（contract v${lock.contractVersion}），当前 CLI 是 v${VERSION}（contract v${CONTRACT_VERSION}）`,
            fix: `使用 v${VERSION} 的 CLI 重新 init（自动刷新运行时副本与版本锁，不覆盖项目配置/场景）`
        };
    }
    const extras = [];
    const files = lock.files && typeof lock.files === "object" ? lock.files : null;
    if (!files) {
        extras.push({
            name: "version-lock",
            status: "WARN",
            message: "版本锁缺少 files 字段（预期文件名清单）",
            fix: "用当前版本 CLI 重新 init 刷新版本锁"
        });
    } else {
        for (const [kind, fileName] of Object.entries(files)) {
            const target = path.join(path.dirname(filePath), String(fileName));
            if (!fs.existsSync(target)) {
                extras.push({
                    name: "version-lock",
                    status: "WARN",
                    message: `版本锁声明 ${kind} 文件 ${fileName} 不存在`,
                    fix: `运行 init 补齐 ${fileName}（不传 --force 不会覆盖项目文件）`
                });
            }
        }
    }
    const sha256 = lock.sha256 && typeof lock.sha256 === "object" ? lock.sha256 : null;
    if (!sha256) {
        // 与 files 缺失同样显式告警：旧格式/被截断的锁不应静默跳过内容校验仍判 PASS
        extras.push({
            name: "version-lock",
            status: "WARN",
            message: "版本锁缺少 sha256 指纹记录，无法校验运行时文件完整性",
            fix: "用当前版本 CLI 重新 init 刷新版本锁"
        });
    } else {
        // 判失配的范围与 init 的 shouldRefreshFramework 对齐（锁声明 files 之内的框架文件）：
        // 锁内出现框架之外的 sha256 条目时失配可自愈（重新 init 不刷新），不应 FAIL 卡死
        const declaredFiles = files ? new Set(Object.values(files)) : null;
        for (const [fileName, expected] of Object.entries(sha256)) {
            if (declaredFiles && !declaredFiles.has(fileName)) continue;
            const target = path.join(path.dirname(filePath), fileName);
            if (!fs.existsSync(target)) continue;
            let actual;
            try {
                if (!fs.statSync(target).isFile()) throw new Error("路径不是普通文件");
                actual = sha256Of(target);
            } catch (error) {
                extras.push({
                    name: "version-lock",
                    status: "FAIL",
                    message: `${fileName} 无法校验 SHA256（原因: ${error.message}）`,
                    fix: "移走无效路径或修复文件读取权限后，用当前版本 CLI 重新 init"
                });
                continue;
            }
            if (actual !== expected) {
                // 内容被替换是最强可疑信号：文件缺失可由 init 修复，内容被替换意味着来源不明，
                // 必须 FAIL（退出码 1）拦下，避免 CI/安装脚本把被篡改的运行时当健康放行
                extras.push({
                    name: "version-lock",
                    status: "FAIL",
                    message: `${fileName} 的 SHA256 与版本锁记录不一致（文件可能被替换）`,
                    fix: "若是有意替换运行时文件，用当前版本 CLI 重新 init 刷新版本锁；否则检查文件来源"
                });
            }
        }
        if (files) {
            const uncovered = [...new Set(Object.values(files))].filter((fileName) => !(fileName in sha256));
            if (uncovered.length) {
                extras.push({
                    name: "version-lock",
                    status: "WARN",
                    message: `版本锁 sha256 未覆盖文件: ${uncovered.join(", ")}`,
                    fix: "用当前版本 CLI 重新 init 刷新版本锁"
                });
            }
        }
    }
    return {
        name: "version-lock",
        status: "PASS",
        message: `版本一致（v${lock.runtimeVersion}，contract v${lock.contractVersion}）`,
        fix: "",
        extra: extras
    };
}

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
// undefined），NaN 参与比较恒 false——">=18" 在全部 v18.x（engines 声明的支持下限）
// 上误判 FAIL，仅主版本高于下限时因短路偶然正确；v18.17.0 对 >=18.17 同病
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
            message: `缺少 AI 规则文件 ${fileName}（${filePath}）`,
            fix: "运行 init 补齐（不会覆盖项目配置/场景）"
        };
    }
    try {
        const stat = fs.statSync(filePath);
        if (!stat.isFile()) throw new Error("路径不是普通文件");
        fs.readFileSync(filePath, "utf8");
        return { name: key, status: "PASS", message: `AI 规则就绪: ${fileName}`, fix: "" };
    } catch (error) {
        return {
            name: key,
            status: "FAIL",
            message: `AI 规则文件不可读取: ${fileName}（原因: ${error.message}）`,
            fix: "移走无效路径后重新运行 init"
        };
    }
}

export function buildDoctorReport(options) {
    const { configPath, api, configDir } = options;
    const checks = [];
    const info = [];

    // 1. Node 版本满足 package engines
    const engineRange = contract.engines?.node || ">=18";
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
                fix: "检查配置语法与 defineConfig 调用；修复后重新运行 doctor"
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
                    }
                } catch (error) {
                    listOk = false;
                    checks.push({
                        name: "scenario-register",
                        status: "FAIL",
                        message: `场景 ${entry.id} 加载/注册失败: ${scenarioPath}（原因: ${error.message}）`,
                        fix: "检查场景文件：registerScenario(id, ...) 的 id 必须与 scenario.config.js 清单 id 一致；断言/when/保留变量须通过 defineScenario 校验"
                    });
                }
            }
            if (listOk) {
                checks.push({ name: "scenario-list", status: "PASS", message: `场景清单合法（${entries.length} 项，文件均存在）`, fix: "" });
            }
        }
    }

    // 6. AI 规则就绪检查（不依赖 config，可继续检查）
    let layout;
    try {
        layout = resolveLayoutFromConfigDir(configDir);
    } catch (error) {
        layout = createProjectLayout(path.dirname(configDir), path.basename(configDir));
        checks.push({
            name: "framework-directory",
            status: "FAIL",
            message: error.message,
            fix: "移走无效路径或修复读取权限后重新运行 init"
        });
    }
    checks.push({
        name: "cli",
        status: "PASS",
        message: `CLI 版本 v${VERSION}（contract v${CONTRACT_VERSION}）`,
        fix: ""
    });
    for (const [key, fileName] of Object.entries({ authoringPrompt: FRAMEWORK_FILES.authoringPrompt, patterns: FRAMEWORK_FILES.patterns })) {
        checks.push(checkReadableFile(layout.frameworkPath(fileName), key, fileName));
    }

    // 7. 运行时副本握手：UMD/d.ts 版本、能力清单、版本锁（含文件存在性与 SHA256）
    checks.push(checkRuntimeArtifact(layout.frameworkPath(FRAMEWORK_FILES.cli), FRAMEWORK_FILES.cli, "runtime-cli", null));
    checks.push(checkRuntimeArtifact(layout.frameworkPath(FRAMEWORK_FILES.umd), FRAMEWORK_FILES.umd, "umd", UMD_VERSION_PATTERN));
    checks.push(checkRuntimeArtifact(layout.frameworkPath(FRAMEWORK_FILES.dts), FRAMEWORK_FILES.dts, "dts", DTS_VERSION_PATTERN));
    checks.push(checkCapabilitiesFile(layout.frameworkPath(FRAMEWORK_FILES.capabilities)));
    const lockResult = checkVersionLock(layout.frameworkPath(FRAMEWORK_FILES.versionLock));
    checks.push({ name: lockResult.name, status: lockResult.status, message: lockResult.message, fix: lockResult.fix });
    if (lockResult.extra) checks.push(...lockResult.extra);

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
