import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import {
    getConfig,
    getScenario,
    registerScenario
} from "../registry.js";

// ⚠️ 信任前提：配置/场景文件是任意 JS，vm.runInContext 仅做上下文隔离、
// 不构成安全边界（注入的宿主对象如 console 可经 constructor 链逃逸拿到宿主全局）。
// 只加载可信来源的配置与场景；不要为不可信输入引入"隔离"依赖——需要真隔离时用子进程。
//
// timeout（#120）：配置/场景文件死循环会永久挂住 CLI/doctor，vm 执行必须带时限。
// 超时按结构错误抛出（含文件名），调用方可直接判失败；默认 10s，可用 options.timeoutMs 覆盖。
export const DEFAULT_DEFINITION_TIMEOUT_MS = 10000;

export function executeDefinitionFile(filePath, api, options = {}) {
    const absolutePath = path.resolve(filePath);
    const timeout = Number.isFinite(options.timeoutMs) && options.timeoutMs > 0
        ? options.timeoutMs
        : DEFAULT_DEFINITION_TIMEOUT_MS;
    const moduleObject = { exports: {} };
    const windowObject = { ScenarioTest: api };
    const context = {
        ScenarioTest: api,
        window: windowObject,
        module: moduleObject,
        exports: moduleObject.exports,
        console,
        URL,
        URLSearchParams,
        setTimeout,
        clearTimeout
    };
    context.global = context;
    context.globalThis = context;
    vm.createContext(context);
    try {
        vm.runInContext(fs.readFileSync(absolutePath, "utf8"), context, { filename: absolutePath, timeout });
    } catch (error) {
        // vm 超时报错文案不含文件路径（或为本地化前的英文），补上来源便于定位
        if (error && error.code === "ERR_SCRIPT_EXECUTION_TIMEOUT") {
            error.message = `定义文件执行超时（${timeout}ms，疑似死循环）: ${absolutePath}
${error.message}`;
        }
        throw error;
    }
    return { context, window: windowObject, exports: moduleObject.exports };
}

export function loadConfigFile(filePath, api, options = {}) {
    const previousConfig = getConfig();
    const loaded = executeDefinitionFile(filePath, api, options);
    const exported = loaded.exports?.default || loaded.exports;
    const registeredConfig = getConfig();
    const config = (registeredConfig !== previousConfig ? registeredConfig : null)
        || (exported && Object.keys(exported).length ? exported : null);
    if (!config) throw new Error(`配置文件未注册配置: ${filePath}`);
    return api.defineConfig(config);
}

// 已加载场景的来源文件路径：此前只按 id 命中注册表即返回——同一进程加载同名 id
// 的另一个文件（跨配置/长驻进程复用）会静默拿到第一个文件的陈旧场景。改为
// 「同 id 且同文件路径」才走缓存；同 id 不同路径继续执行文件，由 registerScenario
// 的后注册覆盖语义接管，避免错配。
const loadedScenarioPaths = new Map();

export function loadScenarioFile(filePath, id, api, options = {}) {
    const absolutePath = path.resolve(filePath);
    const existing = getScenario(id);
    if (existing && loadedScenarioPaths.get(id) === absolutePath) return existing;
    const loaded = executeDefinitionFile(absolutePath, api, options);
    let scenario = getScenario(id);
    const exported = loaded.exports?.default || loaded.exports;
    if (!scenario && exported && Array.isArray(exported.steps)) scenario = registerScenario(id, exported);
    if (!scenario) throw new Error(`场景文件未注册 ${id}: ${filePath}`);
    loadedScenarioPaths.set(id, absolutePath);
    return scenario;
}
