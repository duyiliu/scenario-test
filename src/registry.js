import { isPlainObject, normalizeGlobalParam, tokenizePath, validateAssertion, assertNoReservedVars, assertNotReservedVar, normalizeWhenDefinition } from "./core.js";
import { escapeInlineText } from "./utils/failure-diff.js";
import { contract } from "./contract.js";
import { validateAdapter } from "./adapter-types.js";

const scenarioRegistry = new Map();
const adapterRegistry = new Map();
let currentConfig = null;

function invariant(condition, message, code) {
    if (!condition) {
        const error = new TypeError(message);
        // doctor 只对 defineConfig 自身产生的配置校验错误做专项诊断；用结构化 code
        // 区分配置脚本自己抛出的任意错误，避免按消息子串误报。
        if (code) error.code = code;
        throw error;
    }
}

function nonEmptyString(value) {
    return typeof value === "string" && Boolean(value.trim());
}

// 定义期错误里的值展示：字符串带引号（区分 "5000" 与 5000），
// Infinity/NaN 等 JSON 无法表达的数值走 String
function describeValue(value) {
    if (typeof value === "string") return JSON.stringify(value);
    if (Array.isArray(value)) return "数组";
    if (isPlainObject(value)) return "对象";
    return String(value);
}

// 继承的可枚举属性会被运行期 clone 的 JSON 序列化丢弃（只保留自有属性）。
// 返回第一个继承键供报错定位；无继承键返回 null。
function inheritedEnumerableKey(value) {
    for (const key in value) {
        if (!Object.prototype.hasOwnProperty.call(value, key)) return key;
    }
    return null;
}

// request.headers 要求「普通对象」：core.isPlainObject 只按 toString 标签判定，
// 自定义类实例同样返回 [object Object]——这里额外检查原型链，拒绝 Foo 实例。
// 同时兼容 node:vm 沙箱中创建的对象：跨 realm 的 Object.prototype 原型为 null，
// 但 constructor 仍是对方 realm 的 Object，且 Object.prototype === prototype。
function isPlainHeadersObject(value) {
    if (!isPlainObject(value)) return false;
    const prototype = Object.getPrototypeOf(value);
    if (prototype === null) return true;
    if (Object.getPrototypeOf(prototype) !== null) return false;
    // constructor 必须是「自己的」Object 构造器：伪装成 proto.constructor = Object
    // 的自定义原型会因 Object.prototype !== proto 被识别
    if (typeof prototype.constructor !== "function" || prototype.constructor.name !== "Object") return false;
    if (prototype.constructor.prototype !== prototype) return false;
    return inheritedEnumerableKey(value) === null;
}

// 场景/步骤顶层键白名单：名单唯一来源是 contract（勿另写副本）。
// 拼错的 assertions/retryUntil/timeoutMs 此前被 defineScenario 静默接受——业务断言
// 消失、重试/超时静默失效，接口返回 2xx 即假绿；这里按契约名单定义期直接拒绝。
function describeUnknownKeys(input, allowed) {
    const allowedSet = new Set(allowed);
    return Object.keys(input).filter((key) => !allowedSet.has(key));
}

// 轻量编辑距离：用于识别拼写/大小写错误（assertion→assertions、retryuntill→retryUntil、
// timeoutMS→timeoutMs），但不把适配器私有配置键（如 prepareLocal）误判为未知 DSL 字段。
function editDistance(a, b) {
    const rows = Array.from({ length: a.length + 1 }, (_, index) => [index]);
    for (let column = 1; column <= b.length; column += 1) rows[0][column] = column;
    for (let row = 1; row <= a.length; row += 1) {
        for (let column = 1; column <= b.length; column += 1) {
            rows[row][column] = Math.min(
                rows[row - 1][column] + 1,
                rows[row][column - 1] + 1,
                rows[row - 1][column - 1] + (a[row - 1] === b[column - 1] ? 0 : 1)
            );
        }
    }
    return rows[a.length][b.length];
}

function findKeySuggestion(key, allowed) {
    const lower = key.toLowerCase();
    return allowed.find((candidate) => {
        const target = candidate.toLowerCase();
        return target === lower || editDistance(lower, target) <= 1;
    });
}

function looksLikeKeyTypo(key, allowed) {
    return findKeySuggestion(key, allowed) !== undefined;
}

// 步骤声明这些字段即视为 HTTP 执行面（或非适配器步骤）：未知键按拼写错误拒绝。
// 名单从 contract 派生（只排除 name/adapter 这两个非执行字段），勿另写副本。
// 未声明任何 HTTP 字段的步骤可能是 matches 自动分发的适配器步骤，其自定义配置键
// （如 `{ name, prepareLocal: true }`）不属于 DSL，不在白名单校验范围。
const HTTP_STEP_KEYS = contract.scenario.stepKeys.filter((key) => key !== "name" && key !== "adapter");

function unknownKeysMessage(label, unknownKeys, allowed, hint = "") {
    // 拼写相近时直接点名正确字段（assertion → "assertions"），避免只列出整份白名单
    // 让调用方自己对照；无相近候选时仍保留原有「未知键 + 允许键」口径。
    const described = unknownKeys.map((key) => {
        const suggestion = findKeySuggestion(key, allowed);
        return suggestion ? `"${key}"（是否想写 "${suggestion}"？）` : `"${key}"`;
    });
    return `${label} 包含未知键 ${described.join(", ")}，允许的键为 ${allowed.join("/")}${hint}`;
}

function assertKnownKeys(input, allowed, label, hint = "") {
    const unknownKeys = describeUnknownKeys(input, allowed);
    invariant(
        unknownKeys.length === 0,
        unknownKeysMessage(label, unknownKeys, allowed, hint),
        "SCENARIO_CONFIG_UNKNOWN_KEY"
    );
}

// baseUrl 允许缺省（运行时回退到顶层 config.baseUrl；浏览器工作台最终还可回退当前页面
// 地址），但一旦声明就必须是 http(s):// URL——协议缺失/拼错此前直到真正发请求才暴露。
// 返回值同时做规范化：去首尾空白，纯空白按空串（缺省）处理，避免 truthy 空白串遮蔽回退。
function normalizeBaseUrl(value, label) {
    if (value === undefined || value === null) return value;
    invariant(
        typeof value === "string",
        `${label} 必须是 http(s):// URL 字符串（当前 ${JSON.stringify(value)}）`,
        "SCENARIO_CONFIG_BASE_URL"
    );
    const trimmed = value.trim();
    // 空串/纯空白等同未声明：保持 `environment.baseUrl || config.baseUrl` 回退语义
    if (!trimmed) return "";
    invariant(
        /^https?:\/\//i.test(trimmed),
        `${label} 必须以 http:// 或 https:// 开头（当前 ${JSON.stringify(value)}）`,
        "SCENARIO_CONFIG_BASE_URL"
    );
    let parsed;
    try {
        parsed = new URL(trimmed);
    } catch {
        invariant(false, `${label} 不是合法的 http(s) URL（当前 ${JSON.stringify(value)}）`, "SCENARIO_CONFIG_BASE_URL");
    }
    invariant(
        (parsed.protocol === "http:" || parsed.protocol === "https:") && Boolean(parsed.hostname),
        `${label} 不是合法的 http(s) URL（当前 ${JSON.stringify(value)}）`,
        "SCENARIO_CONFIG_BASE_URL"
    );
    return trimmed;
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
        // 规范化复用 core.normalizeGlobalParam，勿再写同形副本
        return normalizeGlobalParam(item);
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
    const unknownScenarioKeys = describeUnknownKeys(input, contract.scenario.keys);
    invariant(
        unknownScenarioKeys.length === 0,
        unknownKeysMessage(`场景 ${input.name}`, unknownScenarioKeys, contract.scenario.keys, "（场景顶层只接受契约声明的字段）")
    );
    // 保留变量 runId/runNo 与原型链安全键由运行时自动生成/占位，定义期拒绝场景 vars/envVars 声明
    assertNoReservedVars(input.vars, `场景 ${input.name} 的 vars`);
    assertNoReservedVars(input.envVars, `场景 ${input.name} 的 envVars`);
    assertTemplatePathsOnly(input, `场景 ${input.name}`);
    // generatedVars：定义期校验类型枚举（来源 contract.generatedVars.types）与保留变量名；
    // 字段完整性仍由运行时（engine）校验
    let generatedVarIndex = 0;
    for (const definition of input.generatedVars || []) {
        generatedVarIndex += 1;
        const label = `场景 ${input.name} 的 generatedVars 第 ${generatedVarIndex} 项`;
        invariant(isPlainObject(definition), `${label} 必须是对象`);
        invariant(nonEmptyString(definition.name), `${label} 缺少 name`);
        assertNotReservedVar(definition.name, `${label} name`);
        invariant(
            contract.generatedVars.types.includes(definition.type),
            `场景 ${input.name} 的 generatedVars 类型不支持: ${definition.type}（支持 ${contract.generatedVars.types.join("/")}）`
        );
    }
    input.steps.forEach((step, index) => {
        invariant(isPlainObject(step), `场景 ${input.name} 第 ${index + 1} 步必须是对象`);
        invariant(nonEmptyString(step.name), `场景 ${input.name} 第 ${index + 1} 步缺少 name`);
        const stepLabel = `场景 ${input.name} 第 ${index + 1} 步（步骤 ${step.name}）`;
        // B3：request/params 非对象会在运行期被静默忽略（headers/body/method 或整个 query
        // 丢弃），请求照发并可能 PASS——定义期直接拒绝，并禁止 step.params 与 request.params
        // 双写（运行期只取 step.params，另一份静默失效）。
        if (step.request !== undefined) {
            invariant(
                isPlainObject(step.request),
                `步骤 ${step.name} 的 request 必须是对象（当前 ${JSON.stringify(step.request)}，非对象会在运行期被静默忽略）`
            );
            // request 会被 clone(JSON) 深拷贝：继承字段不会进入运行期，
            // 例如 Object.create({ headers }) 会在定义期看似合法、运行时静默丢头
            const inheritedRequestKey = inheritedEnumerableKey(step.request);
            invariant(
                inheritedRequestKey === null,
                `${stepLabel} 的 request 包含继承的可枚举字段 "${inheritedRequestKey}"（运行期 clone 只保留自有字段，会静默丢失；请改为对象自有字段）`
            );
            if (step.request.params !== undefined) {
                invariant(
                    isPlainObject(step.request.params),
                    `步骤 ${step.name} 的 request.params 必须是对象（当前 ${JSON.stringify(step.request.params)}，非对象会导致整个 query 被静默丢弃）`
                );
            }
        }
        if (step.params !== undefined) {
            invariant(
                isPlainObject(step.params),
                `步骤 ${step.name} 的 params 必须是对象（当前 ${JSON.stringify(step.params)}，非对象会导致整个 query 被静默丢弃）`
            );
        }
        if (step.params !== undefined && isPlainObject(step.request) && step.request.params !== undefined) {
            invariant(
                false,
                `步骤 ${step.name} 同时声明了 params 与 request.params，运行期只取 params（request.params 会被静默忽略），请二选一`
            );
        }
        if (step.method !== undefined) invariant(nonEmptyString(step.method), `步骤 ${step.name} 的 method 无效`);
        // step.method 不经 {{ }} 解析（executeHttp 用原始值），模板写法会按字面方法名
        // 发送——恒为死写法，定义期直接拒绝；request.method 在 request 对象内会解析，
        // 动态方法应写在那里。
        // 仅显式 adapter 的步骤跳过 HTTP 相容校验（adapter.execute 收到 resolveClone(step)，
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
            // 未知键即拒：retryOnn/interval 等拼写错误此前被静默忽略，
            // 引擎回落默认 assertion 策略，网络错误重试完全不生效。
            const unknownRetryKeys = Object.keys(step.retryUntil)
                .filter((key) => !contract.retryUntil.keys.includes(key));
            invariant(
                unknownRetryKeys.length === 0,
                `步骤 ${step.name} 的 retryUntil 包含未知键 ${unknownRetryKeys.map((key) => `"${key}"`).join(", ")}，允许的键为 ${contract.retryUntil.keys.join("/")}`
            );
            const maxAttempts = Number(step.retryUntil.maxAttempts ?? 10);
            const intervalMs = Number(step.retryUntil.intervalMs ?? 2000);
            const maxElapsedMs = Number(step.retryUntil.maxElapsedMs ?? 300000);
            invariant(Number.isInteger(maxAttempts) && maxAttempts >= 1, `步骤 ${step.name} 的 maxAttempts 必须是正整数`);
            // intervalMs 定义期只校验非负有限数：显式 0 表示「按最小间隔执行」，
            // 运行期在 engine.js 统一钳制下限 100ms（未声明/非法值按默认 2000ms）
            invariant(Number.isFinite(intervalMs) && intervalMs >= 0, `步骤 ${step.name} 的 intervalMs 不能为负数`);
            invariant(Number.isFinite(maxElapsedMs) && maxElapsedMs > 0, `步骤 ${step.name} 的 maxElapsedMs 必须是正数`);
            // retryOn：声明哪些失败类型参与重试；默认 ["assertion"] 保持历史语义。
            // 非数组/未知值定义期即拒，避免拼写错误使 error/timeout 重试静默失效。
            if (step.retryUntil.retryOn !== undefined) {
                invariant(
                    Array.isArray(step.retryUntil.retryOn),
                    `步骤 ${step.name} 的 retryOn 必须是数组（支持 ${contract.retryUntil.retryOn.join("/")}）`
                );
                for (const retryType of step.retryUntil.retryOn) {
                    invariant(
                        contract.retryUntil.retryOn.includes(retryType),
                        `步骤 ${step.name} 的 retryOn 项只支持 ${contract.retryUntil.retryOn.join("/")}（当前 ${JSON.stringify(retryType)}）`
                    );
                }
            }
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
        // when 对象形式来源：vars/lastResponse/status，或 target:"status" 读取上一步状态码；
        // 非对象形式只支持模板字符串（{{vars.x}}）与布尔——裸字符串 "false"/数字/数组
        // 运行期按 truthiness 判定恒真（when:"false" 照样执行），是典型误写，定义期即拒。
        if (step.when !== undefined) {
            if (isPlainObject(step.when)) {
                const hasFrom = step.when.from !== undefined;
                if (hasFrom && !contract.when.sources.includes(step.when.from)) {
                    throw new TypeError(
                        `步骤 ${step.name} 的 when 对象形式来源只支持 ${contract.when.sources.join("/")}（当前为 ${JSON.stringify(step.when.from)}），` +
                        "不允许从其他响应来源取条件"
                    );
                }
                if (!hasFrom && step.when.target === undefined) {
                    throw new TypeError(
                        `步骤 ${step.name} 的 when 对象形式必须声明来源 from（${contract.when.sources.join("/")}）或 target: "${contract.when.targets.join("/")}"`
                    );
                }
                if (step.when.target !== undefined && !contract.when.targets.includes(step.when.target)) {
                    throw new TypeError(
                        `步骤 ${step.name} 的 when 对象形式 target 只支持 ${contract.when.targets.join("/")}（当前 ${JSON.stringify(step.when.target)}）；duration 等其余响应级通道仅用于 assertions`
                    );
                }
                // from 与 target 互斥：目标通道单独声明即可，混用会让一个来源被静默忽略
                if (hasFrom && step.when.target !== undefined) {
                    throw new TypeError(
                        `步骤 ${step.name} 的 when 对象形式不允许使用 target/header 条件与 from 混用（target: "${contract.when.targets.join("/")}" 单独使用即可）`
                    );
                }
                if (step.when.header !== undefined) {
                    throw new TypeError(`步骤 ${step.name} 的 when 对象形式不允许使用 header 条件`);
                }
                // lastResponse/status 归一化到断言 schema（body / target:status）后再复用同一套
                // 校验：路径分词、操作符、each 子断言等规则与断言完全一致
                validateAssertion(normalizeWhenDefinition(step.when), stepContext);
            } else {
                invariant(
                    typeof step.when === "boolean"
                        || (typeof step.when === "string" && /^\s*\{\{[^{}]*\S[^{}]*\}\}\s*$/.test(step.when)),
                    `步骤 ${step.name} 的 when 只支持对象断言、整串 {{ }} 模板（如 "{{vars.flag}}"，resolve 保真值）或布尔值` +
                    `（当前 ${JSON.stringify(step.when)}——裸字符串按真值判定、部分模板如 "pre {{vars.x}}" 解析成非空串恒真，均非本意）`
                );
            }
        }
        // 未知键校验先于步骤字段类型校验：先保留既有校验的报错优先级（如 adapter/match
        // 豁免提示、GET 带体、method 模板等），纯拼写错误也在这里明确失败。
        // HTTP 步骤严格拒绝所有未知键；适配器步骤（显式 adapter 或未声明 HTTP 字段的
        // matches 自动分发步骤）允许私有配置键（如 `{ name, prepareLocal: true }`），
        // 但拼写/大小写疑似 DSL 字段的键仍然拒绝，避免假绿。
        const unknownStepKeys = describeUnknownKeys(step, contract.scenario.stepKeys);
        const hasHttpExecution = step.adapter === undefined && HTTP_STEP_KEYS.some((key) => step[key] !== undefined);
        const rejectedKeys = hasHttpExecution
            ? unknownStepKeys
            : unknownStepKeys.filter((key) => looksLikeKeyTypo(key, contract.scenario.stepKeys));
        invariant(
            rejectedKeys.length === 0,
            unknownKeysMessage(`场景 ${input.name} 第 ${index + 1} 步（步骤 ${step.name}）`, rejectedKeys, contract.scenario.stepKeys)
        );
        // timeoutMs/saveResponseAs/path/request.path/request.timeoutMs/request.headers 的定义期
        // 类型校验统一放在既有校验（request/params/adapter/method/GET 带体/assertions/
        // retryUntil/extract/when/未知键）之后，保持既有报错优先级不回归。
        // timeoutMs 不做 {{ }} 解析（executeHttp/executeAdapter 直接用原始值），
        // 非数字/0/负数/字符串会在运行期被静默钳制为 30000ms，超时配置实际失效。
        // 显式 0 不做「使用默认值」语义：省略字段即默认值，写 0 属死写法，定义期拒绝。
        if (step.timeoutMs !== undefined) {
            invariant(
                typeof step.timeoutMs === "number" && Number.isFinite(step.timeoutMs) && step.timeoutMs > 0,
                `${stepLabel} 的 timeoutMs 必须是正数（毫秒，且不支持 {{ }} 模板；当前 ${describeValue(step.timeoutMs)}——非法值会被运行期静默钳制为 30000ms）`
            );
        }
        // request.timeoutMs 与 step.timeoutMs 共用运行期超时链（step 优先），区别是 request 对象
        // 会整体 resolve：支持整串 {{ }} 模板（CHANGELOG「request.timeoutMs 支持模板变量」）。
        // 其余值（非数字/0/负数/非模板字符串）同样会被 Number()+钳制静默降级为 30000ms，定义期拒绝。
        if (requestDef.timeoutMs !== undefined) {
            const requestTimeoutMs = requestDef.timeoutMs;
            const isWholeTemplate = typeof requestTimeoutMs === "string"
                && /^\s*\{\{[^{}]*\S[^{}]*\}\}\s*$/.test(requestTimeoutMs);
            invariant(
                isWholeTemplate || (typeof requestTimeoutMs === "number" && Number.isFinite(requestTimeoutMs) && requestTimeoutMs > 0),
                `${stepLabel} 的 request.timeoutMs 必须是正数或整串 {{ }} 模板（当前 ${describeValue(requestTimeoutMs)}——非法值会被运行期静默钳制为 30000ms）`
            );
        }
        // saveResponseAs 空串会被 readResponse 的 truthiness 判断静默跳过保存，
        // 非字符串要等响应体读完才在 io.saveResponse/validatePath 抛错；允许 {{ }} 模板
        if (step.saveResponseAs !== undefined) {
            invariant(
                nonEmptyString(step.saveResponseAs),
                `${stepLabel} 的 saveResponseAs 必须是非空字符串（允许 {{ }} 模板；当前 ${describeValue(step.saveResponseAs)}——空串会静默不保存）`
            );
        }
        // path/request.path 非字符串：带 params 时 buildUrl 的 rawPath.includes("?") 抛
        // TypeError，不带 params 时被 joinUrl 隐式 String()，行为不一致。
        // 空串表示根路径，允许；模板允许。
        if (step.path !== undefined) {
            invariant(
                typeof step.path === "string",
                `${stepLabel} 的 path 必须是字符串（允许 {{ }} 模板；当前 ${describeValue(step.path)}）`
            );
        }
        if (requestDef.path !== undefined) {
            invariant(
                typeof requestDef.path === "string",
                `${stepLabel} 的 request.path 必须是字符串（允许 {{ }} 模板；当前 ${describeValue(requestDef.path)}）`
            );
        }
        // request.headers 非对象会被 { ...(request.headers || {}) } 展开成字符串下标键，
        // 产生无效请求头（如 headers: "X-A: 1" → {0:"X",1:":",...}）
        if (requestDef.headers !== undefined) {
            invariant(
                isPlainHeadersObject(requestDef.headers),
                `${stepLabel} 的 request.headers 必须是普通对象（当前 ${describeValue(requestDef.headers)}——非对象会被展开成字符串下标键，产生无效请求头）`
            );
        }
    });
    const failurePolicy = input.failurePolicy || "stop";
    invariant(contract.scenario.failurePolicies.includes(failurePolicy), "failurePolicy 只能是 stop 或 continue");
    return { ...input, failurePolicy, steps: [...input.steps] };
}

export function defineConfig(input) {
    invariant(isPlainObject(input), "配置必须是对象");
    assertKnownKeys(input, contract.config.configKeys, "配置", "（配置顶层只接受契约声明的字段）");
    assertTemplatePathsOnly(input, "配置");
    const baseUrl = normalizeBaseUrl(input.baseUrl, "配置顶层 baseUrl");
    const globals = normalizeGlobals(input.globals, "全局");
    const envs = Array.isArray(input.envs) ? input.envs.map((env, index) => {
        invariant(isPlainObject(env), `第 ${index + 1} 个环境定义无效`);
        assertKnownKeys(env, contract.config.environmentKeys, `第 ${index + 1} 个环境`, "（环境只接受契约声明的字段）");
        return {
            ...env,
            globals: normalizeGlobals(env.globals, `环境 ${env.key} 的`)
        };
    }) : [];
    for (const env of envs) {
        invariant(nonEmptyString(env.key) && nonEmptyString(env.name), "每个环境必须包含非空 key 和 name");
        env.baseUrl = normalizeBaseUrl(env.baseUrl, `环境 ${env.key} 的 baseUrl`);
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
        assertKnownKeys(item, contract.config.variableKeys, `变量 ${item.name}`, "（变量只接受契约声明的字段）");
        if (item.label !== undefined) invariant(typeof item.label === "string", `变量 ${item.name} 的 label 必须是字符串`);
        if (item.env !== undefined) invariant(nonEmptyString(item.env), `变量 ${item.name} 的 env 无效`);
        if (item.required !== undefined) invariant(typeof item.required === "boolean", `变量 ${item.name} 的 required 必须是布尔值`);
        return { ...item };
    }) : [];
    assertUnique(variables, "name", "变量 name");
    const defaultEnvKey = input.defaultEnvKey || envs[0]?.key || "";
    invariant(!defaultEnvKey || envs.some((env) => env.key === defaultEnvKey), `defaultEnvKey 不存在: ${defaultEnvKey}`);
    const requestTimeoutMs = Number(input.requestTimeoutMs ?? 30000);
    invariant(Number.isFinite(requestTimeoutMs) && requestTimeoutMs > 0, "requestTimeoutMs 必须是正数");
    return {
        ...input,
        baseUrl,
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
