import { isPlainObject, validateAssertion, assertNoReservedVars, assertNotReservedVar } from "./core.js";
import { contract } from "./contract.js";
import { validateAdapter } from "./adapter-types.js";

const scenarioRegistry = new Map();
const adapterRegistry = new Map();
let currentConfig = null;

function invariant(condition, message) {
    if (!condition) throw new TypeError(message);
}

function nonEmptyString(value) {
    return typeof value === "string" && Boolean(value.trim());
}

function assertUnique(items, field, label) {
    const seen = new Set();
    for (const item of items) {
        const value = item[field];
        invariant(!seen.has(value), `${label}重复: ${value}`);
        seen.add(value);
    }
}

function normalizeGlobals(globals, label) {
    const types = contract.globals.types;
    const result = Array.isArray(globals) ? globals.map((item, index) => {
        invariant(isPlainObject(item), `${label}第 ${index + 1} 个全局参数必须是对象`);
        invariant(types.includes(item.type), `${label}第 ${index + 1} 个全局参数 type 必须是 ${types.join("/")}`);
        invariant(nonEmptyString(item.name), `${label}第 ${index + 1} 个全局参数缺少 name`);
        return { type: item.type, name: item.name, value: item.value == null ? "" : String(item.value) };
    }) : [];
    const seen = new Set();
    for (const item of result) {
        const key = `${item.type}:${item.name}`;
        invariant(!seen.has(key), `${label}全局参数重复: ${key}`);
        seen.add(key);
    }
    return result;
}

export function defineScenario(input) {
    invariant(isPlainObject(input), "场景必须是对象");
    invariant(typeof input.name === "string" && input.name.trim(), "场景缺少 name");
    invariant(Array.isArray(input.steps), `场景 ${input.name} 缺少 steps 数组`);
    // 保留变量 runId/runNo 由运行时自动生成，定义期拒绝场景 vars 声明
    assertNoReservedVars(input.vars, `场景 ${input.name} 的 vars`);
    // generatedVars：定义期校验类型枚举（来源 contract.generatedVars.types）；
    // 保留变量与字段完整性仍由运行时（engine）校验，保持 0.4.0 报错时机不变
    for (const definition of input.generatedVars || []) {
        invariant(isPlainObject(definition), `场景 ${input.name} 的 generatedVars 项必须是对象`);
        invariant(nonEmptyString(definition.name), `场景 ${input.name} 的 generatedVars 项缺少 name`);
        invariant(
            contract.generatedVars.types.includes(definition.type),
            `场景 ${input.name} 的 generatedVars 类型不支持: ${definition.type}（支持 ${contract.generatedVars.types.join("/")}）`
        );
    }
    input.steps.forEach((step, index) => {
        invariant(isPlainObject(step), `场景 ${input.name} 第 ${index + 1} 步必须是对象`);
        invariant(nonEmptyString(step.name), `场景 ${input.name} 第 ${index + 1} 步缺少 name`);
        if (step.method !== undefined) invariant(nonEmptyString(step.method), `步骤 ${step.name} 的 method 无效`);
        // GET/HEAD 不能携带请求体：executeHttp 对这两种方法静默丢弃 request.body，
        // fileUpload 则交给 fetch 抛底层英文错——两种静默失败定义期即拒。
        // 模板方法（{{...}}）定义期无法确定最终值，跳过；adapter 步骤的 request 语义
        // 由适配器自行定义，不约束。
        const requestDef = isPlainObject(step.request) ? step.request : {};
        const rawMethod = String(step.method || requestDef.method || "GET");
        const effectiveMethod = rawMethod.toUpperCase();
        if (step.adapter === undefined && !rawMethod.includes("{{") && (effectiveMethod === "GET" || effectiveMethod === "HEAD")) {
            invariant(
                (requestDef.body === undefined || requestDef.body === null) && requestDef.fileUpload === undefined,
                `步骤 ${step.name} 的 ${effectiveMethod} 请求不能携带请求体（request.body / request.fileUpload 会被丢弃），请改用 POST/PUT/PATCH 等方法，或把参数放进 params`
            );
        }
        // 断言定义期 fail-fast：定位到场景名、步骤序号、断言序号
        const stepContext = { scenarioName: input.name, stepNo: index + 1, stepName: step.name };
        if (step.assertions !== undefined) {
            invariant(Array.isArray(step.assertions), `步骤 ${step.name} 的 assertions 必须是数组`);
            step.assertions.forEach((definition, assertionIndex) => {
                validateAssertion(definition, { ...stepContext, assertionNo: assertionIndex + 1 });
            });
        }
        // retryUntil 真实协议：{ maxAttempts, intervalMs, maxElapsedMs }，本身不含断言。
        // 重试判定只用步骤顶层 assertions——放在 retryUntil 内的 assertions 从不执行，
        // 定义期直接拒绝并指引迁移，避免"以为会按它重试、实际一次即停"的静默失效。
        if (step.retryUntil !== undefined) {
            invariant(isPlainObject(step.retryUntil), `步骤 ${step.name} 的 retryUntil 必须是对象`);
            invariant(
                step.retryUntil.assertions === undefined,
                `步骤 ${step.name} 的 retryUntil 不支持 assertions 字段（重试判定使用步骤顶层 assertions），请把断言移到步骤的 assertions`
            );
            const maxAttempts = Number(step.retryUntil.maxAttempts ?? 10);
            const intervalMs = Number(step.retryUntil.intervalMs ?? 2000);
            const maxElapsedMs = Number(step.retryUntil.maxElapsedMs ?? 300000);
            invariant(Number.isInteger(maxAttempts) && maxAttempts >= 1, `步骤 ${step.name} 的 maxAttempts 必须是正整数`);
            invariant(Number.isFinite(intervalMs) && intervalMs >= 0, `步骤 ${step.name} 的 intervalMs 不能为负数`);
            invariant(Number.isFinite(maxElapsedMs) && maxElapsedMs > 0, `步骤 ${step.name} 的 maxElapsedMs 必须是正数`);
        }
        // when 对象形式只能从 vars 取值，不允许 body/status/header；
        // 非对象形式（模板字符串/布尔）保持兼容不做校验。
        if (step.when !== undefined && isPlainObject(step.when)) {
            if (!contract.when.sources.includes(step.when.from)) {
                throw new TypeError(
                    `步骤 ${step.name} 的 when 对象形式只允许 from: "vars"（当前为 ${JSON.stringify(step.when.from)}），` +
                    "不允许从响应 body/status/header 取条件"
                );
            }
            if (step.when.target !== undefined || step.when.header !== undefined) {
                throw new TypeError(`步骤 ${step.name} 的 when 对象形式不允许使用 target/header 条件`);
            }
            validateAssertion(step.when, stepContext);
        }
    });
    const failurePolicy = input.failurePolicy || "stop";
    invariant(contract.scenario.failurePolicies.includes(failurePolicy), "failurePolicy 只能是 stop 或 continue");
    return { ...input, failurePolicy, steps: [...input.steps] };
}

export function defineConfig(input) {
    invariant(isPlainObject(input), "配置必须是对象");
    const globals = normalizeGlobals(input.globals, "全局");
    const envs = Array.isArray(input.envs) ? input.envs.map((env) => ({
        ...env,
        globals: normalizeGlobals(env.globals, `环境 ${env.key} 的`)
    })) : [];
    for (const env of envs) {
        invariant(nonEmptyString(env.key) && nonEmptyString(env.name), "每个环境必须包含非空 key 和 name");
    }
    assertUnique(envs, "key", "环境 key");
    const scenarios = (Array.isArray(input.scenarios) ? input.scenarios : []).map((entry, index) => {
        if (typeof entry === "string") {
            invariant(nonEmptyString(entry), `第 ${index + 1} 个场景地址不能为空`);
            return { id: entry, name: entry, url: entry };
        }
        invariant(isPlainObject(entry), `第 ${index + 1} 个场景清单项无效`);
        const url = entry.url || entry.file || entry.path || "";
        const id = entry.id || url || `scenario-${index + 1}`;
        invariant(nonEmptyString(id), `第 ${index + 1} 个场景缺少 id`);
        invariant(nonEmptyString(url), `场景 ${id} 缺少 url`);
        if (entry.manual !== undefined) {
            invariant(typeof entry.manual === "boolean", `场景 ${id} 的 manual 必须是布尔值`);
        }
        return { ...entry, id, name: entry.name || id, url };
    });
    assertUnique(scenarios, "id", "场景 id");
    const variables = Array.isArray(input.variables) ? input.variables.map((item, index) => {
        invariant(isPlainObject(item), `第 ${index + 1} 个变量定义无效`);
        invariant(nonEmptyString(item.name), `第 ${index + 1} 个变量缺少 name`);
        if (item.env !== undefined) invariant(nonEmptyString(item.env), `变量 ${item.name} 的 env 无效`);
        return { ...item };
    }) : [];
    assertUnique(variables, "name", "变量 name");
    const defaultEnvKey = input.defaultEnvKey || envs[0]?.key || "";
    invariant(!defaultEnvKey || envs.some((env) => env.key === defaultEnvKey), `defaultEnvKey 不存在: ${defaultEnvKey}`);
    const requestTimeoutMs = Number(input.requestTimeoutMs ?? 30000);
    invariant(Number.isFinite(requestTimeoutMs) && requestTimeoutMs > 0, "requestTimeoutMs 必须是正数");
    return {
        ...input,
        globals,
        envs,
        scenarios,
        variables,
        defaultEnvKey,
        requestTimeoutMs,
        vars: { ...(input.scenarioVars || {}), ...(input.vars || {}) },
        storagePrefix: input.storagePrefix || "scenario-test"
    };
}

export function registerConfig(config) {
    currentConfig = defineConfig(config);
    return currentConfig;
}

export function getConfig() {
    return currentConfig;
}

export function registerScenario(id, scenario) {
    invariant(typeof id === "string" && id.trim(), "场景 id 不能为空");
    const normalized = defineScenario(scenario);
    scenarioRegistry.set(id, normalized);
    return normalized;
}

export function getScenario(id) {
    return scenarioRegistry.get(id);
}

export function clearScenarios() {
    scenarioRegistry.clear();
}

export function registerAdapter(name, adapter) {
    invariant(typeof name === "string" && name.trim(), "适配器名称不能为空");
    
    // 运行时验证适配器协议
    validateAdapter(adapter, name);
    
    // 支持可选的初始化钩子
    if (typeof adapter.initialize === "function") {
        try {
            adapter.initialize();
        } catch (error) {
            throw new TypeError(`适配器 ${name} 初始化失败: ${error.message}`);
        }
    }
    
    adapterRegistry.set(name, adapter);
    return adapter;
}

export function getAdapter(name) {
    return adapterRegistry.get(name);
}

export function listAdapters() {
    return new Map(adapterRegistry);
}

export function unregisterAdapter(name) {
    const adapter = adapterRegistry.get(name);
    if (adapter && typeof adapter.dispose === "function") {
        try {
            adapter.dispose();
        } catch (error) {
            console.warn(`适配器 ${name} 清理失败:`, error);
        }
    }
    return adapterRegistry.delete(name);
}

export function clearAdapters() {
    for (const [name, adapter] of adapterRegistry.entries()) {
        if (typeof adapter.dispose === "function") {
            try {
                adapter.dispose();
            } catch (error) {
                console.warn(`适配器 ${name} 清理失败:`, error);
            }
        }
    }
    adapterRegistry.clear();
}
