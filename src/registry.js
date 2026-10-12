import { isPlainObject, tokenizePath, validateAssertion, assertNoReservedVars, assertNotReservedVar } from "./core.js";
import { escapeInlineText } from "./utils/failure-diff.js";
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

// 注意：共享 /g 正则仅可用于 matchAll（克隆 lastIndex）；若改为 .exec/.test 会从
// 上次 lastIndex 继续导致静默漏检——届时需在函数内 new RegExp 或重置 lastIndex。
const TEMPLATE_EXPR_PATTERN = /\{\{\s*([^{}]+?)\s*\}\}/g;
const TEMPLATE_OPERATOR_CHARS = /[><=!&|?:()]/;
const TEMPLATE_PATH_HINT = "模板只做路径取值（vars.* / lastResponse.* / lastResponseBody.*），比较/三元/逻辑判断请改用断言或 when 对象形式；若键名本身含运算符字符，请改用引号键写法 vars[\"a:b\"]";

// 模板只做路径取值（vars.* / lastResponse.* / lastResponseBody.*），不支持表达式。
// {{vars.a > 0}} 这类表达式会被当成键名查找并静默得到空串/undefined——when 静默跳过、
// 断言静默失败、extract 静默取 undefined。定义期用与运行期 getByPath 相同的严格分词
// 校验：整式分词失败时按「含运算符→表达式误写 / 无运算符→路径畸形」区分报错；
// 裸段内含运算符字符同样报错；引号键/下标段内部字符豁免（vars["a>b"]、["a]>b"] 合法）。
// 无 {{}} 的普通文本不查。
function assertTemplatePathsOnly(value, trail, seen = new WeakSet()) {
    if (typeof value === "string") {
        if (!value.includes("{{")) return;
        for (const match of value.matchAll(TEMPLATE_EXPR_PATTERN)) {
            const expression = match[1].trim();
            const tokens = tokenizePath(expression);
            if (tokens === null) {
                // 分词失败：优先按运算符误写报（vars.a > 0、vars["a" > "b"]、[0 > 1] 等），
                // 无运算符字符才是路径畸形（vars[]、vars[、未闭合引号等）
                invariant(
                    !TEMPLATE_OPERATOR_CHARS.test(expression),
                    `${trail} 的模板 {{${expression}}} 不允许使用运算符：${TEMPLATE_PATH_HINT}`
                );
                invariant(false, `${trail} 的模板 {{${expression}}} 不是合法路径写法：支持 点段/整数下标/引号键（vars.a、list[-1]、vars["a>b"]），不允许空下标或未闭合括号`);
                continue;
            }
            for (const token of tokens) {
                if (token.startsWith("[")) continue;
                invariant(
                    !TEMPLATE_OPERATOR_CHARS.test(token),
                    `${trail} 的模板 {{${expression}}} 不允许使用运算符：${TEMPLATE_PATH_HINT}`
                );
            }
        }
        return;
    }
    // 循环引用输入（vars.x = input 等）直接返回：执行期 clone 会以 TypeError 报错，
    // 此处只保证不递归爆栈
    if (value === null || typeof value !== "object" || seen.has(value)) return;
    seen.add(value);
    if (Array.isArray(value)) {
        value.forEach((item, index) => assertTemplatePathsOnly(item, `${trail}[${index}]`, seen));
        return;
    }
    if (isPlainObject(value)) {
        for (const [key, item] of Object.entries(value)) {
            assertTemplatePathsOnly(item, `${trail}.${key}`, seen);
        }
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
    assertTemplatePathsOnly(input, `场景 ${input.name}`);
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
        // step.method 不经 {{ }} 解析（executeHttp 用原始值），模板写法会按字面方法名
        // 发送——恒为死写法，定义期直接拒绝；request.method 在 request 对象内会解析，
        // 动态方法应写在那里。
        // 仅显式 adapter 的步骤跳过 HTTP 相容校验（adapter.execute 收到 resolve(clone(step))，
        // method 模板会被解析、request 语义由适配器自行定义）。matches 自动认领不能用于
        // 此处放行：定义期可见的是全局注册表，运行期用的是引擎创建时的快照 + 实例
        // 适配器（createEngine({adapters})/isolateAdapters），两个集合可能不同——
        // 自动认领放行可能产生「定义期认为适配器处理、运行期实际发 HTTP 静默丢 body」
        // 的假通过；由适配器处理的步骤须显式声明 adapter 字段。
        const isAdapterStep = step.adapter !== undefined;
        // adapter 字段存在时必须是非空字符串：运行期 if (step.adapter) 对 ""/null/false
        // 按无适配器处理会走 HTTP 静默丢 body——定义期直接拒绝杜绝假通过
        if (isAdapterStep) {
            invariant(
                typeof step.adapter === "string" && step.adapter.trim() !== "",
                `步骤 ${step.name} 的 adapter 必须是非空字符串（已注册适配器名），当前值运行期会被当成无适配器走 HTTP`
            );
        }
        if (typeof step.method === "string" && step.method.includes("{{") && !isAdapterStep) {
            invariant(false, `步骤 ${step.name} 的 method 不支持模板写法（step.method 不做 {{ }} 解析，会按字面量发送），请写具体方法名或改用 request.method 模板；适配器步骤请显式声明 adapter 字段`);
        }
        // GET/HEAD 不能携带请求体：executeHttp 对这两种方法静默丢弃 request.body，
        // fileUpload 则交给 fetch 抛底层英文错——两种静默失败定义期即拒。
        // request.method 模板在运行期解析、定义期无法确定最终方法，跳过相容校验。
        const requestDef = isPlainObject(step.request) ? step.request : {};
        const rawMethod = String(step.method || requestDef.method || "GET");
        const effectiveMethod = rawMethod.toUpperCase();
        const methodIsTemplate = step.method === undefined && String(requestDef.method || "").includes("{{");
        if (!isAdapterStep && !methodIsTemplate && (effectiveMethod === "GET" || effectiveMethod === "HEAD")) {
            invariant(
                (requestDef.body === undefined || requestDef.body === null)
                    && (requestDef.fileUpload === undefined || requestDef.fileUpload === null),
                `步骤 ${step.name} 的 ${effectiveMethod} 请求不能携带请求体（request.body / request.fileUpload 会被丢弃），请改用 POST/PUT/PATCH 等方法、把参数放进 params，或显式声明 adapter 交给适配器处理`
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
        // extract 项定义期校验：此前 extract 完全无校验——非对象项/缺 name 运行期
        // 静默跳过（连 warning 都没有），name 撞保留变量、required+default 互斥、
        // from/target 拼错、path 畸形都拖到运行期才错或静默吞掉
        if (step.extract !== undefined) {
            invariant(Array.isArray(step.extract), `步骤 ${step.name} 的 extract 必须是数组`);
            step.extract.forEach((item, extractIndex) => {
                const label = `步骤 ${step.name} 的 extract 第 ${extractIndex + 1} 项`;
                invariant(isPlainObject(item), `${label} 必须是对象（{ name, path?, from?, required?, default? }）`);
                // 未知键即拒：heder/fromm 这类拼错此前静默落到 body 来源，同断言 metaKeys 口径
                const unknownKeys = Object.keys(item).filter((key) => !contract.extract.metaKeys.includes(key));
                invariant(
                    unknownKeys.length === 0,
                    `${label} 包含未知键 ${unknownKeys.map((key) => `"${key}"`).join(", ")}，允许的键为 ${contract.extract.metaKeys.join("/")}`
                );
                invariant(nonEmptyString(item.name), `${label} 缺少 name`);
                invariant(
                    !item.name.includes("{{"),
                    `${label} 的 name 不支持 {{ }} 模板——变量名按字面使用不解析，会写成死变量（当前 ${JSON.stringify(item.name)}）`
                );
                assertNotReservedVar(item.name, `${label} name`);
                invariant(
                    item.required === undefined || typeof item.required === "boolean",
                    `${label} 的 required 必须是布尔值（当前 ${JSON.stringify(item.required)}——非 true 值会静默降级为「非必需」）`
                );
                invariant(
                    !(item.required === true && item.default !== undefined),
                    `${label} 的 required: true 与 default 互斥，只能声明其一`
                );
                if (item.header !== undefined) {
                    invariant(
                        typeof item.header === "string" && item.header.trim() !== "" && !item.header.includes("{{"),
                        `${label} 的 header 必须是非空字符串且不支持 {{ }} 模板（头名按字面匹配不解析；当前 ${JSON.stringify(item.header)}）`
                    );
                }
                if (item.target !== undefined) {
                    invariant(
                        contract.extract.targets.includes(item.target),
                        `${label} 的 target 只支持 ${contract.extract.targets.join("/")}（当前 ${JSON.stringify(item.target)}）`
                    );
                }
                if (item.from !== undefined) {
                    invariant(
                        contract.extract.from.includes(item.from),
                        `${label} 的 from 只支持 ${contract.extract.from.join("/")}（当前 ${JSON.stringify(item.from)}，缺省按 body 取值）`
                    );
                }
                if (item.path !== undefined) {
                    // extract 的 path 按字面取键不做模板解析——含 {{ 是死写法，定义期即拒；
                    // 空串按运行期 falsy 语义取整个来源（下游在用写法），放行
                    invariant(
                        typeof item.path === "string" && !item.path.includes("{{")
                            && (item.path === "" || tokenizePath(item.path) !== null),
                        `${label} 的 path 不是合法路径写法（支持 点段/整数下标/引号键，不支持 {{ }} 模板；当前 ${JSON.stringify(item.path)}）`
                    );
                }
            });
        }
        // when 对象形式只能从 vars 取值，不允许 body/status/header；
        // 非对象形式只支持模板字符串（{{vars.x}}）与布尔——裸字符串 "false"/数字/数组
        // 运行期按 truthiness 判定恒真（when:"false" 照样执行），是典型误写，定义期即拒。
        if (step.when !== undefined) {
            if (isPlainObject(step.when)) {
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
            } else {
                invariant(
                    typeof step.when === "boolean"
                        || (typeof step.when === "string" && /^\s*\{\{[^{}]*\S[^{}]*\}\}\s*$/.test(step.when)),
                    `步骤 ${step.name} 的 when 只支持对象断言、整串 {{ }} 模板（如 "{{vars.flag}}"，resolve 保真值）或布尔值` +
                    `（当前 ${JSON.stringify(step.when)}——裸字符串按真值判定、部分模板如 "pre {{vars.x}}" 解析成非空串恒真，均非本意）`
                );
            }
        }
    });
    const failurePolicy = input.failurePolicy || "stop";
    invariant(contract.scenario.failurePolicies.includes(failurePolicy), "failurePolicy 只能是 stop 或 continue");
    return { ...input, failurePolicy, steps: [...input.steps] };
}

export function defineConfig(input) {
    invariant(isPlainObject(input), "配置必须是对象");
    assertTemplatePathsOnly(input, "配置");
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
            console.warn(`适配器 ${escapeInlineText(name)} 清理失败: ${escapeInlineText(error?.message || error)}`);
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
                console.warn(`适配器 ${escapeInlineText(name)} 清理失败: ${escapeInlineText(error?.message || error)}`);
            }
        }
    }
    adapterRegistry.clear();
}
