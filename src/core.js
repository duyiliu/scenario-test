import md5Impl from "blueimp-md5";
import { contract } from "./contract.js";

export { contract, CONTRACT_VERSION } from "./contract.js";

// 全局参数支持的类型：追加到每个请求的 header / cookie / query（来自 contract）
export const GLOBAL_TYPES = [...contract.globals.types];

export function isGlobalParam(item) {
    return Boolean(item && GLOBAL_TYPES.includes(item.type) && typeof item.name === "string" && item.name.trim());
}

export function normalizeGlobalParam(item) {
    return { type: item.type, name: item.name, value: item.value == null ? "" : String(item.value) };
}

// 合并多组全局参数：按 type:name 去重，后合并的覆盖先合并的
export function mergeGlobals(...lists) {
    const merged = new Map();
    for (const list of lists) {
        for (const item of list || []) {
            if (!isGlobalParam(item)) continue;
            merged.set(`${item.type}:${item.name}`, normalizeGlobalParam(item));
        }
    }
    return [...merged.values()];
}

export function clone(value) {
    return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
}

export function isPlainObject(value) {
    return Object.prototype.toString.call(value) === "[object Object]";
}

// saveResponseAs 落盘结果的内部标记：io.saveResponse 返回值打标，
// CLI 据此区分「真实保存信息」与业务响应恰好含 savedTo/size 字段的对象——
// JSON 序列化不可表达 Symbol，服务端/适配器业务数据无法伪造
export const SAVED_RESPONSE = Symbol.for("scenario-test.savedResponse");

// 路径严格分词：点段（任意非 .[] 字符）与下标段（整数下标或引号键，引号内支持
// \" \' \\ 转义）交替组成；任一段不合法返回 null，供调用方区分「取不到」与「写错」。
// getByPath 此前用宽松 match 分词——vars[]、vars[ 等畸形写法被静默忽略剩余字符，
// 空 token 序列甚至返回根对象本身（when 条件意外成立）
const PATH_SEGMENT = /[^.\[\]]+/y;
const PATH_BRACKET = /\[(?:-?\d+|"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')\]/y;
// 分词是 {{vars.*}} 模板、断言/extract 裸路径取值的公共热路径：同一路径串在多步骤
// 与 retryUntil 轮询间反复出现，按字符串缓存结果（有界 FIFO 防路径爆炸占内存，
// 非法路径的 null 同样缓存）。缓存内部数组冻结——防止经任何引用改写污染后续取值；
// 对外按公开声明 `string[] | null` 返回可变副本（调用方 push/splice 不抛错、
// 也不影响缓存），公开 API 约定保持与旧版一致
const PATH_TOKEN_CACHE_LIMIT = 256;
const pathTokenCache = new Map();

export function tokenizePath(valuePath) {
    const rest = String(valuePath);
    if (!pathTokenCache.has(rest)) {
        const tokens = tokenizePathStrict(rest);
        if (pathTokenCache.size >= PATH_TOKEN_CACHE_LIMIT) {
            pathTokenCache.delete(pathTokenCache.keys().next().value);
        }
        pathTokenCache.set(rest, tokens === null ? null : Object.freeze(tokens));
    }
    const cached = pathTokenCache.get(rest);
    // 扁平数组小，复制成本远低于重新分词；每调用方拿到独立可变副本
    return cached === null ? null : [...cached];
}

function tokenizePathStrict(rest) {
    const tokens = [];
    // 前导点形式（.key）为既有公开口径（headers 子路径使用）：最多容忍一个
    let index = rest.startsWith(".") ? 1 : 0;
    // 下标段后只允许 . 分隔、连续下标或结尾——["a"]key 这种无分隔写法非法
    let prevBracket = false;
    while (index < rest.length) {
        const isBracket = rest[index] === "[";
        if (!isBracket && prevBracket) return null;
        const pattern = isBracket ? PATH_BRACKET : PATH_SEGMENT;
        pattern.lastIndex = index;
        const match = pattern.exec(rest);
        if (!match) return null;
        tokens.push(match[0]);
        index += match[0].length;
        prevBracket = isBracket;
        // 点分隔符不能连续出现或收尾（a..b / a. 非法；a.[0] 维持旧口径放行）
        if (rest[index] === ".") {
            index += 1;
            if (index >= rest.length || rest[index] === ".") return null;
            prevBracket = false;
        }
    }
    // 非空路径分不出任何段（如 "."）：判非法而非返回根对象
    return tokens.length ? tokens : null;
}

export function getByPath(source, valuePath) {
    if (!valuePath) return source;
    // 畸形路径（vars[]、vars[、a..b、未闭合下标）返回 undefined 而非取到错误值/根对象
    const tokens = tokenizePath(valuePath);
    if (!tokens) return undefined;
    let cursor = source;
    for (const token of tokens) {
        if (cursor === undefined || cursor === null) return undefined;
        const inner = token.startsWith("[") ? token.slice(1, -1) : null;
        // 数组上的裸负整数下标（records[-1]）表示倒数第 N 项；
        // 引号键（records["-1"]）与非数组光标维持属性名语义
        if (inner !== null && /^-\d+$/.test(inner) && Array.isArray(cursor)) {
            cursor = cursor[cursor.length + Number(inner)];
            continue;
        }
        // 引号键去掉包围引号并反转义——只反转义声明支持的 \" \' \\，其余 \x
        // 序列按字面保留（源对象键含 \b 等反斜杠字符时与旧口径一致，不会改键名）
        const key = inner === null ? token : inner.replace(/^['"]|['"]$/g, "").replace(/\\(["'\\])/g, "$1");
        // 只读自有键：继承成员（__proto__/constructor/prototype 及一切原型方法）对路径
        // 导航不可见——否则 vars["__proto__"] 取到 Object.prototype、exists 断言被继承
        // 成员骗成真；JSON 数据键（含字面 "__proto__" 自有键）不受影响。
        // hasOwnProperty.call 对原始类型自动装箱（"abc".length / ("abc")[0] 仍为自有键可读）
        cursor = Object.prototype.hasOwnProperty.call(cursor, key) ? cursor[key] : undefined;
    }
    return cursor;
}

export function evalExpression(expression, runtime) {
    const text = String(expression || "").trim();
    if (!text) return "";
    if (text === "vars") return runtime.vars;
    // 模板变量语义（双端一致，勿单边修改）：
    //   lastResponse      完整响应对象（status / headers / body / bodyText）
    //   lastResponseBody  解析后的响应体（JSON 已转为对象；原始文本用断言 from: "bodyText" 获取）
    if (text === "lastResponse") return runtime.lastResponse;
    if (text === "lastResponseBody") return runtime.lastResponseBody;
    // 「根名.」前缀已消费分隔符，余段再以 . 开头属双点畸形（vars..a）——
    // 定义期 tokenizePath 拒绝，运行期同口径判缺而非借前导点兼容取到值
    if (text.startsWith("vars.")) {
        const sub = text.slice(5);
        return sub && !sub.startsWith(".") ? getByPath(runtime.vars, sub) : undefined;
    }
    if (text.startsWith("vars[")) return getByPath(runtime.vars, text.slice(4));
    if (text.startsWith("lastResponse.")) {
        const sub = text.slice(13);
        return sub && !sub.startsWith(".") ? getByPath(runtime.lastResponse, sub) : undefined;
    }
    if (text.startsWith("lastResponse[")) return getByPath(runtime.lastResponse, text.slice(12));
    if (text.startsWith("lastResponseBody.")) {
        const sub = text.slice(17);
        return sub && !sub.startsWith(".") ? getByPath(runtime.lastResponseBody, sub) : undefined;
    }
    if (text.startsWith("lastResponseBody[")) return getByPath(runtime.lastResponseBody, text.slice(16));
    if (Object.prototype.hasOwnProperty.call(runtime.vars || {}, text)) return runtime.vars[text];
    return getByPath(runtime.vars, text);
}

export function resolveString(value, runtime) {
    if (typeof value !== "string") return value;
    // 无模板文本占绝大多数：一次子串扫描直接返回，
    // 跳过下方整串 match + 全局 replace + 残留 test 三轮正则
    if (!value.includes("{{")) return value;
    let current = value;
    const seen = new Set();
    for (let depth = 0; depth < 10; depth += 1) {
        if (seen.has(current)) return current;
        seen.add(current);
        const whole = current.match(/^\s*\{\{\s*(.+?)\s*\}\}\s*$/);
        if (whole) {
            const direct = evalExpression(whole[1], runtime);
            if (direct === undefined) return "";
            if (typeof direct !== "string") return direct;
            current = direct;
            continue;
        }
        const replaced = current.replace(/\{\{\s*(.+?)\s*\}\}/g, (_, expression) => {
            const resolved = evalExpression(expression, runtime);
            if (resolved === undefined || resolved === null) return "";
            return typeof resolved === "object" ? JSON.stringify(resolved) : String(resolved);
        });
        if (replaced === current || !/\{\{\s*.+?\s*\}\}/.test(replaced)) return replaced;
        current = replaced;
    }
    return current;
}

export function resolve(value, runtime) {
    if (Array.isArray(value)) return value.map((item) => resolve(item, runtime));
    if (isPlainObject(value)) {
        return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, resolve(item, runtime)]));
    }
    return resolveString(value, runtime);
}

function headerKey(headers, name) {
    const target = String(name || "").toLowerCase();
    return Object.keys(headers || {}).find((item) => item.toLowerCase() === target);
}

export function headerValue(headers, name) {
    const key = headerKey(headers, name);
    return key === undefined ? undefined : headers[key];
}

// from:"headers" 配 path 的取值：首段按 HTTP 头名大小写不敏感匹配（HTTP/2 响应头全小写），
// 与 header 简写（headerValue）口径一致；首段之后的子路径维持 getByPath 既有语义（在头值上取子路径）。
// 通用路径导航（from:"response" / 模板 lastResponse.headers.*）不经过此处，保持精确匹配。
export function getHeaderByPath(headers, valuePath) {
    if (!valuePath) return headers;
    const text = String(valuePath);
    const match = text.match(/[^.\[\]]+|\[(?:-?\d+|".*?"|'.*?')\]/);
    if (!match) return getByPath(headers, text);
    const token = match[0];
    const key = token.startsWith("[")
        ? token.slice(1, -1).replace(/^['"]|['"]$/g, "")
        : token;
    const matched = headerKey(headers, key);
    if (matched === undefined) return undefined;
    const rest = text.slice(match.index + token.length);
    return rest ? getByPath(headers[matched], rest) : headers[matched];
}

export function hasHeader(headers, name) {
    return headerValue(headers, name) !== undefined;
}

export function headersToObject(headers) {
    const result = {};
    if (headers && typeof headers.forEach === "function") {
        headers.forEach((value, key) => { result[key] = value; });
    }
    return result;
}

export function joinUrl(baseUrl, requestPath) {
    if (/^https?:\/\//i.test(requestPath || "")) return requestPath;
    const base = String(baseUrl || "").replace(/\/+$/, "");
    const tail = String(requestPath || "").replace(/^\/+/, "");
    return base ? `${base}/${tail}` : tail;
}

export function buildUrl(requestPath, params, runtime) {
    const rawPath = resolveString(requestPath || "", runtime);
    if (!params || !isPlainObject(params)) return rawPath;
    const resolved = resolve(params, runtime);
    const query = Object.entries(resolved)
        .filter(([, value]) => value !== undefined && value !== null)
        .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
        .join("&");
    if (!query) return rawPath;
    return `${rawPath}${rawPath.includes("?") ? "&" : "?"}${query}`;
}

export function parseBody(text, contentType) {
    if (!text) return null;
    const value = String(text);
    if (String(contentType || "").toLowerCase().includes("json") || /^[\[{]/.test(value.trim())) {
        try { return JSON.parse(value); } catch { return value; }
    }
    return value;
}

// ===== 断言 schema（唯一操作符名单来自 contract，registry 定义期与执行期共用）=====
export const ASSERTION_OPERATORS = Object.keys(contract.assertions.operators);
export const ASSERTION_META_KEYS = [...contract.assertions.metaKeys];
// 执行期键白名单查询 O(1) 化：evaluateAssertion 每次求值都过一遍 validateAssertion
const ASSERTION_OPERATOR_SET = new Set(ASSERTION_OPERATORS);
const ASSERTION_META_KEY_SET = new Set(ASSERTION_META_KEYS);
// 字符串边界操作符（数值操作符名单见 contract.assertions.numericOperators，勿另写副本）
const STRING_EDGE_OPERATORS = ["startsWith", "endsWith"];

export function formatAssertionContext(context) {
    if (!context) return "";
    if (typeof context === "string") return context;
    const parts = [];
    if (context.scenarioName) parts.push(`场景 ${context.scenarioName}`);
    if (context.stepNo !== undefined) parts.push(`第 ${context.stepNo} 步`);
    if (context.stepName) parts.push(`步骤 ${context.stepName}`);
    if (context.assertionNo !== undefined) parts.push(`第 ${context.assertionNo} 条`);
    return parts.join(" ");
}

export function validateAssertion(definition, context, options = {}) {
    const where = formatAssertionContext(context);
    const prefix = where ? `${where}断言无效` : "断言无效";
    if (!isPlainObject(definition)) throw new TypeError(`${prefix}: 断言必须是对象`);
    const keys = Object.keys(definition);
    const operators = keys.filter((key) => ASSERTION_OPERATOR_SET.has(key));
    const unknown = keys.filter((key) => !ASSERTION_OPERATOR_SET.has(key) && !ASSERTION_META_KEY_SET.has(key));
    if (unknown.length) {
        throw new TypeError(
            `${prefix}: 包含未知键 ${unknown.map((key) => `"${key}"`).join(", ")}，` +
            `允许的元数据键为 ${ASSERTION_META_KEYS.join("/")}，操作符为 ${ASSERTION_OPERATORS.join("/")}`
        );
    }
    if (!operators.length) {
        throw new TypeError(`${prefix}: 必须至少包含一个操作符（${ASSERTION_OPERATORS.join("/")}）`);
    }
    // from/target 白名单：未识别值在 assertionActual 里静默落到 body 分支——
    // 拼错（"statu"/"bodyy"）会让断言在错误来源上求值，同名字段存在时产生假绿
    if (definition.target !== undefined && !contract.assertions.targets.includes(definition.target)) {
        throw new TypeError(`${prefix}: target 只支持 ${contract.assertions.targets.join("/")}（当前 ${JSON.stringify(definition.target)}）`);
    }
    if (definition.from !== undefined && !contract.assertions.from.includes(definition.from)) {
        throw new TypeError(`${prefix}: from 只支持 ${contract.assertions.from.join("/")}（当前 ${JSON.stringify(definition.from)}，缺省按 body 取值）`);
    }
    // 裸 path（断言/when/extract 的 path 不经模板解析）必须与运行期 getByPath 同口径
    // 严格分词：a..b 这类畸形路径此前静默判缺，exists:false 断言会产生假绿；
    // 空串按运行期 falsy 语义取整个来源（下游在用写法），放行。
    // {{ }} 在顶层 path 是死写法（path 按字面取键不解析）——只有 each 子断言的
    // path 会随期望值整体 resolve，其余位置含 {{ 一律定义期即拒
    if (definition.path !== undefined) {
        if (typeof definition.path !== "string") {
            throw new TypeError(`${prefix}: path 必须是字符串（当前 ${JSON.stringify(definition.path)}）`);
        }
        if (definition.path.includes("{{") && !options.inEach) {
            throw new TypeError(
                `${prefix}: path 不支持 {{ }} 模板——断言的 path 按字面取键不做解析，` +
                `{{vars.x}} 会被当成字面键名查找不到（exists:false 因此恒真的假绿）。` +
                `动态键名仅 each 子断言内有效（期望值整体先做模板解析），或改用 vars 来源断言`
            );
        }
        if (definition.path !== "" && !definition.path.includes("{{") && tokenizePath(definition.path) === null) {
            throw new TypeError(`${prefix}: path 不是合法路径写法（支持 点段/整数下标/引号键，如 a.b、list[-1]、a["x>y"]；当前 ${JSON.stringify(definition.path)}）`);
        }
    }
    // each 子断言的作用对象是数组元素：elementResponse 仅 body=元素 与 runtime.vars 有实值，
    // header/target/status 与 from:"headers"/"bodyText" 读的响应级通道恒为 undefined/"" 死值——
    // exists:false 恒真假绿、exists:true 恒假。一律拒绝，响应级断言请提升到顶层
    if (options.inEach
        && (definition.header !== undefined || definition.target !== undefined
            || (definition.from !== undefined && definition.from !== "body" && definition.from !== "vars"))) {
        throw new TypeError(`${prefix}: each 子断言作用在数组元素上，不支持 header/target 及 from:"headers"/"bodyText" 响应级通道（恒取死值）——请提升到顶层断言`);
    }
    // header 简写按字面取头名不解析——{{ }} 在顶层是死写法（头名 {{vars.h}}
    // 字面不存在 → exists:false 恒真假绿）；纯空白头名同理恒查不到
    if (definition.header !== undefined) {
        if (typeof definition.header !== "string" || definition.header.trim() === "") {
            throw new TypeError(`${prefix}: header 必须是非空字符串（当前 ${JSON.stringify(definition.header)}）`);
        }
        if (definition.header.includes("{{") && !options.inEach) {
            throw new TypeError(`${prefix}: header 不支持 {{ }} 模板——头名按字面匹配不做解析`);
        }
    }
    // matches 静态期望值定义期即编译校验：非法正则此前在执行期被吞成断言失败，
    // 呈现为"值不匹配"而非"正则写错"。含 {{ 模板的期望值跳过（运行时解析后再判）
    if (definition.matches !== undefined && !String(definition.matches).includes("{{")) {
        try { new RegExp(String(definition.matches)); }
        catch (error) {
            throw new TypeError(`${prefix}: matches 期望值不是合法正则表达式（${definition.matches}）: ${error.message}`);
        }
    }
    // each：期望值为子断言定义对象或其数组，递归复用同一 schema 校验，
    // 让非法子断言（缺操作符/未知键/非对象项）在定义期 fail-fast 并定位到具体项
    if (definition.each !== undefined) {
        const eachLabel = `${prefix}: each 的期望值必须是子断言对象或其数组`;
        if (Array.isArray(definition.each)) {
            definition.each.forEach((sub, subIndex) => {
                if (!isPlainObject(sub)) throw new TypeError(`${eachLabel}（第 ${subIndex + 1} 项不是对象）`);
                validateAssertion(sub, context, { inEach: true });
            });
        } else if (isPlainObject(definition.each)) {
            validateAssertion(definition.each, context, { inEach: true });
        } else {
            throw new TypeError(eachLabel);
        }
    }
    return definition;
}

function assertionActual(definition, response, runtime) {
    if (definition.target === "status") return response.status;
    // 单次请求耗时（毫秒）：由 engine 在每次尝试后挂载到 response.durationMs
    if (definition.target === "duration") return response && typeof response === "object" ? response.durationMs : undefined;
    if (definition.header) return headerValue(response.headers, definition.header);
    if (definition.from === "vars") return definition.path ? getByPath(runtime.vars, definition.path) : runtime.vars;
    if (definition.from === "headers") return definition.path ? getHeaderByPath(response.headers, definition.path) : response.headers;
    if (definition.from === "bodyText") return response.bodyText;
    return definition.path ? getByPath(response.body, definition.path) : response.body;
}

// 深比较底座：键序不敏感的稳定序列化。
// JSON.stringify 直接比较时对象键顺序不同即判不等（如 Java 服务端 HashMap 序列化顺序不稳定），
// 与契约中 equals 的「JSON 深比较相等」描述不符。此处先按键名排序再序列化，使
// equals / notEquals / includes / oneOf（含 each 子断言递归）对键序不敏感；
// 值语义与 JSON 对齐：对象里值为 undefined 的键与 JSON.stringify 一样忽略（{a:undefined} ≡ {}）。
function stableStringify(value) {
    if (value === undefined) return "undefined";
    if (value === null || typeof value !== "object") return JSON.stringify(value);
    if (Array.isArray(value)) return `[${value.map((item) => stableStringify(item)).join(",")}]`;
    // 单趟组装：此前 filter+map 各序列化一次同一子树——每层 2× 冗余，
    // 深层嵌套被指数放大（equals/notEquals/includes/oneOf 的深比较底座）
    const entries = [];
    for (const key of Object.keys(value).sort()) {
        const text = stableStringify(value[key]);
        if (text !== "undefined") entries.push(`${JSON.stringify(key)}:${text}`);
    }
    return `{${entries.join(",")}}`;
}

export function evaluateAssertion(definition, response, runtime, context) {
    // 执行期也校验：防止插件 transform 之后产生非法断言定义
    validateAssertion(definition, context);
    return evaluateValidatedAssertion(definition, response, runtime, context);
}

function evaluateValidatedAssertion(definition, response, runtime, context) {
    let actual = assertionActual(definition, response, runtime);
    let expected;
    let passed = true;
    // each 失败元素明细：[{ index, actual, assertions }]，仅在存在失败元素时挂到结果上
    let eachFailures = null;
    if (definition.exists !== undefined) {
        expected = Boolean(definition.exists);
        const exists = actual !== undefined && actual !== null && actual !== "";
        passed = passed && exists === expected;
    }
    if (Object.prototype.hasOwnProperty.call(definition, "equals")) {
        expected = resolve(definition.equals, runtime);
        passed = passed && stableStringify(actual) === stableStringify(expected);
    }
    if (Object.prototype.hasOwnProperty.call(definition, "notEquals")) {
        expected = resolve(definition.notEquals, runtime);
        passed = passed && stableStringify(actual) !== stableStringify(expected);
    }
    if (Object.prototype.hasOwnProperty.call(definition, "includes")) {
        expected = resolve(definition.includes, runtime);
        if (Array.isArray(actual)) {
            // 仅在累计结果仍可能通过且实际数组非空时序列化：空数组必然失败、
            // 前序操作符已失败时也无需再比较——避免对不可序列化值（如 BigInt）
            // 做无谓的 JSON 序列化而把普通断言失败升级为步骤异常
            passed = passed && actual.length > 0;
            if (passed) {
                // 期望值序列化移出逐项比较循环：此前每个元素重复序列化同一 expected
                const expectedText = stableStringify(expected);
                passed = actual.some((item) => stableStringify(item) === expectedText);
            }
        } else {
            passed = passed && String(actual == null ? "" : actual).includes(String(expected));
        }
    }
    // each：数组逐项断言——对实际数组的每个元素套用子断言（对象或其数组），
    // 以 { body: 元素 } 合成响应复用同一求值管线（子断言 path 相对元素自身）。
    // every 语义：任一元素任一子断言失败则整体失败，空数组恒通过；
    // 非数组实际值 / 期望值形状非法直接失败（与 oneOf 非数组口径一致：FAIL 而非抛异常）
    if (Object.prototype.hasOwnProperty.call(definition, "each")) {
        expected = resolve(definition.each, runtime);
        const subDefinitions = Array.isArray(expected) ? expected : isPlainObject(expected) ? [expected] : null;
        passed = passed && Array.isArray(actual) && subDefinitions !== null;
        // 遍历全部元素收集失败项（不短路）：透出失败元素下标（0 基）与该元素上全部
        // 子断言的求值结果，让工作台/报告能定位「第几项、哪个子断言错」；嵌套 each 的
        // 子结果递归求值，自带各自的 detail。非数组/期望值形状非法的失败不产生元素级
        // 明细（此时 actual/expected 自身已可定位）；仅在确有失败元素时挂 detail 字段
        if (passed) {
            // 子断言定义由本调用的 resolve() 新鲜生成、不逃逸出同步遍历——
            // 逐元素重复 validateAssertion 是纯浪费，N 元素 × M 子断言降为 M 次
            for (const sub of subDefinitions) validateAssertion(sub, context);
            actual.forEach((element, index) => {
                const elementResponse = { status: undefined, headers: {}, body: element, bodyText: "" };
                const subResults = subDefinitions.map((sub) => evaluateValidatedAssertion(sub, elementResponse, runtime, context));
                if (subResults.some((result) => !result.passed)) {
                    (eachFailures ??= []).push({ index, actual: element, assertions: subResults });
                    passed = false;
                }
            });
        }
    }
    if (definition.matches !== undefined) {
        expected = resolve(definition.matches, runtime);
        // 隐式默认断言（无显式 status/assertions 时追加的 HTTP 2xx 检查）仅对数字
        // HTTP 状态码生效；本地适配器（返回 status: "LOCAL"）不参与匹配
        if (!(definition.implicit === true && typeof actual !== "number")) {
            try { passed = passed && new RegExp(String(expected)).test(String(actual == null ? "" : actual)); }
            catch { passed = false; }
        }
    }
    if (definition.oneOf !== undefined) {
        expected = resolve(definition.oneOf, runtime);
        if (Array.isArray(expected)) {
            // 同 includes：空候选集合直接失败；累计已失败或候选为空时不序列化 actual
            passed = passed && expected.length > 0;
            if (passed) {
                // actual 序列化移出候选比较循环：此前每个候选项重复序列化同一 actual
                const actualText = stableStringify(actual);
                passed = expected.some((item) => stableStringify(item) === actualText);
            }
        } else {
            passed = false;
        }
    }
    // startsWith/endsWith：字符串化后比较，口径与 includes 字符串分支一致
    // （null/undefined 实际值视为空串；大小写敏感，无隐式类型转换放行）
    for (const op of STRING_EDGE_OPERATORS) {
        if (!Object.prototype.hasOwnProperty.call(definition, op)) continue;
        expected = resolve(definition[op], runtime);
        const text = String(actual == null ? "" : actual);
        passed = passed && (op === "startsWith" ? text.startsWith(String(expected)) : text.endsWith(String(expected)));
    }
    // length：比较所用实际值为容器长度（数组元素数/字符串字符数/对象键数），
    // 结果里的 actual 也回写为该长度，让断言表直接可读；非容器类型直接失败（与数值操作符口径一致）
    if (Object.prototype.hasOwnProperty.call(definition, "length")) {
        expected = resolve(definition.length, runtime);
        const lengthOf = Array.isArray(actual) ? actual.length
            : (typeof actual === "string" ? actual.length
                : (isPlainObject(actual) ? Object.keys(actual).length : null));
        if (lengthOf !== null) actual = lengthOf;
        passed = passed && lengthOf !== null
            && typeof expected === "number" && Number.isFinite(expected)
            && lengthOf === expected;
    }
    for (const op of contract.assertions.numericOperators) {
        if (!Object.prototype.hasOwnProperty.call(definition, op)) continue;
        expected = resolve(definition[op], runtime);
        // 只接受有限 number，不做字符串隐式转换；类型不符时断言失败而非抛异常
        const comparable = typeof actual === "number" && Number.isFinite(actual)
            && typeof expected === "number" && Number.isFinite(expected);
        if (!comparable) { passed = false; continue; }
        if (op === "gt") passed = passed && actual > expected;
        else if (op === "gte") passed = passed && actual >= expected;
        else if (op === "lt") passed = passed && actual < expected;
        else passed = passed && actual <= expected;
    }
    return {
        name: definition.name || definition.path || "断言",
        passed,
        actual,
        expected,
        // detail 仅在 each 存在失败元素时出现；通过时保持既有四字段形状（旧消费方不受影响）
        ...(eachFailures ? { detail: eachFailures } : {})
    };
}

export function buildAssertions(step, response, runtime, context) {
    const definitions = Array.isArray(step.assertions) ? [...step.assertions] : [];
    if (step.status !== undefined && !definitions.some((item) => item.target === "status")) {
        definitions.unshift({ name: `返回 HTTP ${step.status}`, target: "status", equals: step.status });
    } else if (step.status === undefined && definitions.length === 0) {
        definitions.push({ name: "返回 HTTP 2xx", target: "status", matches: "^2\\d\\d$", implicit: true });
    }
    return definitions.map((definition, index) => evaluateAssertion(definition, response, runtime, { ...(context || {}), assertionNo: index + 1 }));
}

// ===== 保留变量（来自 contract）=====
export const RESERVED_VARS = [...contract.reservedVars];

export function assertNotReservedVar(name, label) {
    if (RESERVED_VARS.includes(name)) {
        throw new Error(`${label || "变量"} "${name}" 是运行时自动生成的保留变量，禁止声明或覆盖`);
    }
}

export function assertNoReservedVars(source, label) {
    for (const name of Object.keys(source || {})) {
        assertNotReservedVar(name, label);
    }
}

export function applyExtract(step, response, runtime) {
    const warnings = [];
    const failures = [];
    for (const definition of step.extract || []) {
        if (!definition || !definition.name) continue;
        assertNotReservedVar(definition.name, "extract 变量");
        // required 与 default 语义互斥（一个要缺失即失败、一个要缺失即兜底），同声明即定义错误
        const hasDefault = definition.default !== undefined;
        if (definition.required === true && hasDefault) {
            throw new TypeError(`extract 变量 ${definition.name}: required: true 与 default 互斥，只能声明其一`);
        }
        // 与浏览器端完全同语义的提取来源解析：
        //   target:'status' / header 为简写（优先级最高）
        //   from: 'headers' | 'bodyText' | 'response'（默认 body）
        let source = response.body;
        if (definition.target === "status") source = response.status;
        else if (definition.header) source = headerValue(response.headers, definition.header);
        else if (definition.from === "headers") source = response.headers;
        else if (definition.from === "bodyText") source = response.bodyText;
        else if (definition.from === "response") source = response;
        // from:"headers" 的 path 首段按头名大小写不敏感匹配（getHeaderByPath）；其余来源维持 getByPath
        const value = definition.path
            ? (definition.from === "headers" ? getHeaderByPath(source, definition.path) : getByPath(source, definition.path))
            : source;
        if (value === undefined) {
            if (hasDefault) {
                // 声明默认值即显式兜底：模板照常解析（可引用先提取的变量），缺失不再产生 warning；
                // 仅 undefined 判定缺失——JSON null 是真实响应值，不触发兜底
                runtime.vars[definition.name] = resolve(definition.default, runtime);
                continue;
            }
            if (definition.required === true) {
                failures.push({
                    name: `提取 ${definition.name}（路径不存在）`,
                    passed: false,
                    actual: undefined,
                    expected: `路径 ${definition.path || "(整个响应)"} 存在`
                });
            } else {
                warnings.push(`提取变量 ${definition.name}：路径 ${definition.path || "(整个响应)"} 不存在，变量值为 undefined（required 未开启，不影响执行）`);
            }
        }
        runtime.vars[definition.name] = value;
    }
    return { warnings, failures };
}

export function md5(value) {
    return md5Impl(String(value));
}

export function generateSignature(params, secretValue) {
    const pairs = Object.keys(params || {}).sort().map((key) => `${key}=${params[key] == null ? "" : params[key]}`);
    pairs.push(`apiSecret=${secretValue == null ? "" : secretValue}`);
    return md5(pairs.join("&")).toUpperCase();
}

// ==================== 校验位底座（GB 11643-1999） ====================
// 通用加权校验码算法：身份证（18 位）、部分行政区划类证号共用。
// 双端（浏览器/Node）一致实现，纯函数无 I/O。

const GB11643_WEIGHTS = [7, 9, 10, 5, 8, 4, 2, 1, 6, 3, 7, 9, 10, 5, 8, 4, 2];
const GB11643_CHECK_CODES = "10X98765432";

/**
 * 计算前 17 位数字串的 GB 11643 校验码（大写 X）。
 * 输入非法（长度非 17 / 含非数字）时抛错，由调用方保证输入合法。
 */
export function gb11643Checksum(first17Digits) {
    const text = String(first17Digits || "");
    if (!/^\d{17}$/.test(text)) {
        throw new Error(`GB11643 校验位输入必须是 17 位数字: ${text}`);
    }
    let sum = 0;
    for (let i = 0; i < 17; i += 1) {
        sum += (text.charCodeAt(i) - 48) * GB11643_WEIGHTS[i];
    }
    return GB11643_CHECK_CODES[sum % 11];
}

/**
 * 组合中国大陆 18 位居民身份证号（仅用于测试造数）。
 *
 * @param {object} parts
 * @param {string} parts.regionCode    6 位行政区划编码
 * @param {string} parts.birthDate     出生日期，YYYY-MM-DD
 * @param {number} parts.sequence      3 位顺序码（0-999）；第 17 位奇=男、偶=女由调用方保证
 * @returns {string} 18 位身份证号（校验位合法）
 */
export function buildChinaIdNumber({ regionCode, birthDate, sequence }) {
    const dateText = String(birthDate || "");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateText)) {
        throw new Error(`身份证出生日期必须是 YYYY-MM-DD: ${dateText}`);
    }
    const normalized = dateText.replace(/-/g, "");
    // 0005-05-05 之类格式合法但语义荒谬的日期交由调用方校验；此处只做日历合法性
    const year = Number(normalized.slice(0, 4));
    const month = Number(normalized.slice(4, 6));
    const day = Number(normalized.slice(6, 8));
    const probe = new Date(Date.UTC(year, month - 1, day));
    if (probe.getUTCFullYear() !== year || probe.getUTCMonth() !== month - 1 || probe.getUTCDate() !== day) {
        throw new Error(`身份证出生日期不是合法日历日期: ${dateText}`);
    }
    const seq = Number(sequence);
    if (!Number.isInteger(seq) || seq < 0 || seq > 999) {
        throw new Error(`身份证顺序码必须是 0-999 整数: ${sequence}`);
    }
    const first17 = `${regionCode}${normalized}${String(seq).padStart(3, "0")}`;
    return `${first17}${gb11643Checksum(first17)}`;
}

/**
 * 把任意种子字符串确定性地映射到 [0, maxExclusive) 的整数。
 * 双端一致（md5 为纯算法），用于从 runId/变量名派生顺序码，保证跨轮唯一、轮内互异。
 */
export function seedToIndex(seed, maxExclusive) {
    const hex = md5(String(seed == null ? "" : seed)).slice(0, 8);
    return Number.parseInt(hex, 16) % maxExclusive;
}

/**
 * 把任意种子字符串确定性地映射到 [0, 1) 的均匀小数。
 * 取 md5 前 12 位十六进制（约 48 位分辨率），供加权枚举造数按累计权重选值：
 * 同轮同变量稳定、跨轮变化，且不依赖 Math.random（Node/浏览器双端一致、可复现）。
 */
export function seedToUnit(seed) {
    const hex = md5(String(seed == null ? "" : seed)).slice(0, 12);
    return Number.parseInt(hex, 16) / 16 ** 12;
}

/**
 * 按权重从种子确定性选取下标（weights 为非负数组，调用方保证至少一个 > 0）。
 * 命中概率之比即权重之比；权重为 0 的候选项永不被选中。
 */
export function pickWeightedIndex(seed, weights) {
    const total = weights.reduce((sum, weight) => sum + weight, 0);
    let threshold = seedToUnit(seed) * total;
    for (let index = 0; index < weights.length; index += 1) {
        threshold -= weights[index];
        if (threshold < 0) return index;
    }
    return weights.length - 1;
}

// ==================== Luhn 校验位（银行卡号，ISO/IEC 7812-1） ====================

/**
 * 计算数字串的 Luhn 校验位（返回 "0"-"9"）。
 * 拼接后整体满足 Luhn 校验（加权和 mod 10 == 0）。输入非法（空/含非数字）时抛错。
 */
export function luhnCheckDigit(firstDigits) {
    const text = String(firstDigits || "");
    if (!/^\d+$/.test(text)) {
        throw new Error(`Luhn 校验位输入必须是纯数字: ${text}`);
    }
    let sum = 0;
    let double = true; // 紧邻校验位的一侧（最右输入位）乘 2
    for (let i = text.length - 1; i >= 0; i -= 1) {
        let digit = text.charCodeAt(i) - 48;
        if (double) {
            digit *= 2;
            if (digit > 9) digit -= 9;
        }
        sum += digit;
        double = !double;
    }
    return String((10 - (sum % 10)) % 10);
}

// ==================== 统一社会信用代码校验位（GB 32100-2015） ====================
// 18 位 = 登记管理部门(1) + 机构类别(1) + 登记管理机关行政区划(6) + 主体标识码(9) + 校验位(1)。
// 字符集不含 I、O、S、V、Z（31 个字符），校验位 = 字符集[(31 - Σ(字符值×权重) mod 31) mod 31]。

// 造数确定性派生池：Node 引擎与浏览器工作台共用（engine.js / browser/ui/runtime.js），
// 单一事实来源避免双端漂移
export const USCC_ALPHABET = "0123456789ABCDEFGHJKLMNPQRTUWXY";
// idcard 未显式声明 regionCode 时使用的真实行政区划测试池（容量扩展用，均为真实存在的区县级编码）
export const IDCARD_TEST_REGIONS = ["110101", "110105", "310101", "440103", "510107", "330102", "420102", "610103"];
// phone 未显式声明 prefix 时使用的测试号段池（均为三大运营商+虚商真实在用号段）
export const PHONE_TEST_PREFIXES = ["138", "139", "150", "155", "158", "159", "176", "177", "185", "186", "187", "199"];
const USCC_WEIGHTS = [1, 3, 9, 27, 19, 26, 16, 17, 20, 29, 25, 13, 8, 24, 10, 30, 28];

/**
 * 计算前 17 位统一社会信用代码的校验字符。
 * 输入非法（长度非 17 / 含字符集外字符）时抛错。
 */
export function usccCheckChar(first17Chars) {
    const text = String(first17Chars || "").toUpperCase();
    if (text.length !== 17) {
        throw new Error(`USCC 校验位输入必须是 17 位字符: ${text}`);
    }
    let sum = 0;
    for (let i = 0; i < 17; i += 1) {
        const value = USCC_ALPHABET.indexOf(text[i]);
        if (value < 0) {
            throw new Error(`USCC 含非法字符 ${text[i]}（允许字符集: ${USCC_ALPHABET}）`);
        }
        sum += value * USCC_WEIGHTS[i];
    }
    return USCC_ALPHABET[(31 - (sum % 31)) % 31];
}

/**
 * 组合 18 位统一社会信用代码（仅用于测试造数）。
 *
 * @param {object} parts
 * @param {string} parts.categoryCode   2 位登记管理部门+机构类别（如 "91" 企业法人）
 * @param {string} parts.regionCode     6 位行政区划编码
 * @param {string} parts.orgCode        9 位主体标识码（组织机构代码，31 字符集）
 * @returns {string} 18 位统一社会信用代码（校验位合法）
 */
export function buildUsccCode({ categoryCode, regionCode, orgCode }) {
    const category = String(categoryCode || "");
    const region = String(regionCode || "");
    const org = String(orgCode || "").toUpperCase();
    if (!/^\d{2}$/.test(category)) {
        throw new Error(`USCC 登记管理部门+机构类别必须是 2 位数字: ${category}`);
    }
    if (!/^\d{6}$/.test(region)) {
        throw new Error(`USCC 行政区划必须是 6 位数字: ${region}`);
    }
    if (!new RegExp(`^[0-9A-HJ-NP-RTUWXY]{9}$`).test(org)) {
        throw new Error(`USCC 主体标识码必须是 9 位（字符集 ${USCC_ALPHABET}）: ${org}`);
    }
    const first17 = `${category}${region}${org}`;
    return `${first17}${usccCheckChar(first17)}`;
}

// ==================== generatedVars 造数（Node/浏览器双端共用） ====================
// 单个定义 → 写入 vars 的完整逻辑收敛于此，engine.js 与 browser/ui/runtime.js 只负责
// 各自 vars 的组装顺序，不得各自维护类型分支（历史漂移：浏览器端曾缺 idcard/luhn 等四类型）。

// timestamp 造数 offset 的单位 → 毫秒；只提供固定跨度单位，不引入月/年等日历单位（月末歧义）
export const TIMESTAMP_OFFSET_UNITS = Object.freeze({ ms: 1, s: 1000, m: 60000, h: 3600000, d: 86400000, w: 604800000 });
// format 的合法形态：token（YYYY/MM/DD/HH/mm/ss）与任意非字母字符自由组合；
// 任何字母序列必须恰好构成合法 token——残缺/近似片段（"M"、"yyyy"、"dd"）整体拒绝而不是输出字面量
export const TIMESTAMP_FORMAT_PATTERN = /^(?:YYYY|MM|DD|HH|mm|ss|[^A-Za-z])*$/;

export function parseTimestampOffset(offset) {
    const match = /^([+-]?\d+)(ms|s|m|h|d|w)$/.exec(String(offset));
    if (!match) {
        throw new Error(`generatedVars timestamp 的 offset 必须形如 "-7d"/"+8d"/"30m"（数字+单位 ms/s/m/h/d/w）: ${offset}`);
    }
    return Number(match[1]) * TIMESTAMP_OFFSET_UNITS[match[2]];
}

// 按本地时间展开 format token（mm 为分钟、MM 为月份，大小写敏感）
export function formatTimestamp(ms, format) {
    const date = new Date(ms);
    const pad = (value) => String(value).padStart(2, "0");
    const tokens = {
        YYYY: String(date.getFullYear()).padStart(4, "0"),
        MM: pad(date.getMonth() + 1),
        DD: pad(date.getDate()),
        HH: pad(date.getHours()),
        mm: pad(date.getMinutes()),
        ss: pad(date.getSeconds())
    };
    return String(format).replace(/YYYY|MM|DD|HH|mm|ss/g, (token) => tokens[token]);
}

// 枚举造数（可带权重）定义校验：values 非空数组、weights 缺省等权或与 values 等长的非负数字数组、
// 至少一个权重 > 0（全 0 会导致抽取退化到末位）；返回规范化后的 values/weights
export function normalizeEnumDefinition(definition) {
    const values = definition.values;
    if (!Array.isArray(values) || values.length === 0) {
        throw new Error(`generatedVars enum 的 values 必须是非空数组: ${definition.name}`);
    }
    const weights = definition.weights == null
        ? values.map(() => 1)
        : (Array.isArray(definition.weights) ? definition.weights : null);
    if (!weights) {
        throw new Error(`generatedVars enum 的 weights 必须是数字数组: ${definition.name}`);
    }
    if (weights.length !== values.length) {
        throw new Error(`generatedVars enum 的 weights 长度必须与 values 一致（${weights.length} vs ${values.length}）: ${definition.name}`);
    }
    const normalized = weights.map((weight, index) => {
        const value = Number(weight);
        if (!Number.isFinite(value) || value < 0) {
            throw new Error(`generatedVars enum 的 weights 第 ${index + 1} 项必须是非负有限数字: ${weight}`);
        }
        return value;
    });
    if (!normalized.some((weight) => weight > 0)) {
        throw new Error(`generatedVars enum 的 weights 至少需要一项大于 0: ${definition.name}`);
    }
    return { values, weights: normalized };
}

function defaultUuidHex() {
    if (!globalThis.crypto?.randomUUID) throw new Error("当前环境不支持 crypto.randomUUID");
    return globalThis.crypto.randomUUID().replace(/-/g, "");
}

/**
 * 把单个 generatedVars 定义按类型求值并写入 vars（vars[definition.name]）。
 * 双端一致：造数按 identifiers.runId 与变量名确定性派生（轮内稳定、跨轮变化）。
 * @param {object} definition 已通过 defineScenario 类型枚举校验的定义
 * @param {object} vars 目标 vars 对象（先声明的变量可被后声明引用）
 * @param {object} identifiers { runId } 运行标识（确定性种子）
 * @param {object} [deps] 环境可选项：deps.uuidHex 覆盖 uuidHex 实现（浏览器端有降级链）
 */
export function applyGeneratedVar(definition, vars, identifiers, deps = {}) {
    const name = definition.name;
    const uuidHex = deps.uuidHex || defaultUuidHex;
    if (definition.type === "timestamp") {
        // 时间戳造数：offset 相对当前时间偏移（如 "-7d"/"+8d"）；unit 决定数值粒度
        // （ms 默认向后兼容 / s 秒级）；format（本地时间 token）输出字符串，与 unit 互斥。
        const base = Date.now() + (definition.offset == null ? 0 : parseTimestampOffset(definition.offset));
        if (definition.format != null) {
            if (definition.unit != null) {
                throw new Error(`generatedVars timestamp 的 format 与 unit 互斥，只能声明其一: ${name}`);
            }
            if (!/(?:YYYY|MM|DD|HH|mm|ss)/.test(definition.format) || !TIMESTAMP_FORMAT_PATTERN.test(definition.format)) {
                throw new Error(`generatedVars timestamp 的 format 仅支持 YYYY/MM/DD/HH/mm/ss 的本地时间组合（如 YYYY-MM-DD HH:mm:ss）: ${definition.format}`);
            }
            vars[name] = formatTimestamp(base, definition.format);
        } else if (definition.unit != null && definition.unit !== "ms") {
            if (definition.unit !== "s") {
                throw new Error(`generatedVars timestamp 的 unit 只支持 ms（默认）/s: ${definition.unit}`);
            }
            vars[name] = Math.floor(base / 1000);
        } else {
            vars[name] = base;
        }
        return;
    }
    if (definition.type === "uuid") {
        // 标准带连字符 UUID v4（uuidHex 为 32 位无连字符形式），适配以 UUID 为业务主键的接口
        if (!globalThis.crypto?.randomUUID) throw new Error("当前环境不支持 crypto.randomUUID");
        vars[name] = globalThis.crypto.randomUUID();
        return;
    }
    if (definition.type === "uuidHex") {
        vars[name] = uuidHex();
        return;
    }
    if (definition.type === "idcard") {
        // 中国大陆 18 位身份证号（测试造数）：出生日期必填 YYYY-MM-DD；
        // gender MALE/FEMALE（默认 MALE）约束顺序码第 17 位奇偶；
        // regionCode 6 位行政区划（不声明时从真实测试区划池按轮次派生）。
        // 顺序码 = hash(runId + 变量名) % 500 * 2 + 性别位：随轮次变化、轮内不同名变量互异，
        // 校验位按 GB 11643 计算；同(性别,出生日期)下唯一容量约 4000，极小概率撞库时重跑即换号。
        const gender = definition.gender == null ? "MALE" : definition.gender;
        if (gender !== "MALE" && gender !== "FEMALE") {
            throw new Error(`generatedVars idcard 的 gender 只支持 MALE/FEMALE: ${gender}`);
        }
        // 未显式声明区划时从真实测试区划池按轮次派生，把唯一容量从 500/性别/生日 扩至 8 倍
        const regionCode = definition.regionCode == null
            ? IDCARD_TEST_REGIONS[seedToIndex(identifiers.runId, IDCARD_TEST_REGIONS.length)]
            : String(definition.regionCode);
        if (!/^\d{6}$/.test(regionCode)) {
            throw new Error(`generatedVars idcard 的 regionCode 必须是 6 位数字: ${regionCode}`);
        }
        const seqBase = seedToIndex(`${identifiers.runId}|${name}`, 500);
        vars[name] = buildChinaIdNumber({
            regionCode,
            birthDate: definition.birthDate,
            sequence: seqBase * 2 + (gender === "MALE" ? 1 : 0)
        });
        return;
    }
    if (definition.type === "luhn") {
        // 银行卡号（Luhn 校验，测试造数）：prefix 数字卡头（默认 "62" 银联）、length 12-19（默认 16）；
        // 卡头与校验位之间的数字由 runId+变量名逐位派生，末位按 Luhn 算法补齐。
        const length = definition.length == null ? 16 : Number(definition.length);
        if (!Number.isInteger(length) || length < 12 || length > 19) {
            throw new Error(`generatedVars luhn 的 length 必须是 12-19 整数: ${definition.length}`);
        }
        const prefix = definition.prefix == null ? "62" : String(definition.prefix);
        if (!/^\d{1,16}$/.test(prefix) || prefix.length >= length) {
            throw new Error(`generatedVars luhn 的 prefix 必须是短于卡号长度的数字卡头: ${definition.prefix}`);
        }
        let body = "";
        for (let i = 0; i < length - 1 - prefix.length; i += 1) {
            body += seedToIndex(`${identifiers.runId}|${name}|${i}`, 10);
        }
        const first = `${prefix}${body}`;
        vars[name] = `${first}${luhnCheckDigit(first)}`;
        return;
    }
    if (definition.type === "phone") {
        // 大陆手机号（测试造数）：prefix 三位号段（1[3-9]x），缺省从测试号段池按轮次派生；
        // 后 8 位由 runId+变量名逐位派生，撞业务唯一约束时重跑即换号。
        const prefix = definition.prefix == null
            ? PHONE_TEST_PREFIXES[seedToIndex(identifiers.runId, PHONE_TEST_PREFIXES.length)]
            : String(definition.prefix);
        if (!/^1[3-9]\d$/.test(prefix)) {
            throw new Error(`generatedVars phone 的 prefix 必须是 1[3-9] 开头的 3 位号段: ${definition.prefix}`);
        }
        let tail = "";
        for (let i = 0; i < 8; i += 1) {
            tail += seedToIndex(`${identifiers.runId}|${name}|${i}`, 10);
        }
        vars[name] = `${prefix}${tail}`;
        return;
    }
    if (definition.type === "uscc") {
        // 统一社会信用代码（GB 32100-2015，测试造数）：登记管理部门+机构类别固定 91（企业法人）；
        // regionCode 6 位行政区划（默认 110100），主体标识码 9 位由 runId+变量名逐位派生（31 字符集），
        // 校验位按 GB 32100 计算。
        const regionCode = definition.regionCode == null ? "110100" : String(definition.regionCode);
        if (!/^\d{6}$/.test(regionCode)) {
            throw new Error(`generatedVars uscc 的 regionCode 必须是 6 位数字: ${definition.regionCode}`);
        }
        let orgCode = "";
        for (let i = 0; i < 9; i += 1) {
            orgCode += USCC_ALPHABET[seedToIndex(`${identifiers.runId}|${name}|${i}`, USCC_ALPHABET.length)];
        }
        vars[name] = buildUsccCode({ categoryCode: "91", regionCode, orgCode });
        return;
    }
    if (definition.type === "md5") {
        const source = (definition.parts || []).map((part) => vars[part] == null ? "" : String(vars[part])).join("");
        vars[name] = md5(source);
        return;
    }
    if (definition.type === "signature") {
        const params = Object.fromEntries(Object.entries(definition.params || {})
            .map(([key, variableName]) => [key, vars[variableName]]));
        // 从 vars 中获取密钥但不在错误消息中暴露
        const secret = vars[definition.secretVar || "apiSecret"];
        if (!secret) {
            throw new Error(`签名生成失败: 缺少密钥变量 vars.${definition.secretVar || "apiSecret"}`);
        }
        vars[name] = generateSignature(params, secret);
        return;
    }
    if (definition.type === "enum") {
        // 枚举造数（可带权重）：从 values 按 weights 抽取一个值。按 runId+变量名确定性派生
        // （轮内稳定、跨轮变化、双端一致），命中概率之比即权重之比。
        const { values, weights } = normalizeEnumDefinition(definition);
        vars[name] = values[pickWeightedIndex(`${identifiers.runId}|${name}`, weights)];
        return;
    }
    throw new Error(`不支持的 generatedVars 类型: ${definition.type}`);
}

export function maskSecret(value) {
    if (value === undefined || value === null || value === "") return "";
    const text = String(value);
    return text.length > 12 ? `${text.slice(0, 4)}...${text.slice(-4)}` : "***";
}

export function sanitizeSensitive(value, key = "", sensitiveNames = []) {
    // 场景测试用于项目内联调，执行上下文和调试数据应保留原始值。
    // 保留该导出仅为兼容旧项目调用。
    return value;
}

export function formatDuration(milliseconds) {
    if (!Number.isFinite(milliseconds)) return "-";
    return milliseconds >= 1000 ? `${(milliseconds / 1000).toFixed(2)} s` : `${milliseconds.toFixed(0)} ms`;
}
