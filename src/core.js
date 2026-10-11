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

export function getByPath(source, valuePath) {
    if (!valuePath) return source;
    const tokens = String(valuePath).match(/[^.\[\]]+|\[(?:-?\d+|".*?"|'.*?')\]/g) || [];
    let cursor = source;
    for (const token of tokens) {
        if (cursor === undefined || cursor === null) return undefined;
        const key = token.startsWith("[")
            ? token.slice(1, -1).replace(/^['"]|['"]$/g, "")
            : token;
        cursor = cursor[key];
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
    if (text.startsWith("vars.")) return getByPath(runtime.vars, text.slice(5));
    if (text.startsWith("lastResponse.")) return getByPath(runtime.lastResponse, text.slice(13));
    if (text.startsWith("lastResponseBody.")) return getByPath(runtime.lastResponseBody, text.slice(17));
    if (Object.prototype.hasOwnProperty.call(runtime.vars || {}, text)) return runtime.vars[text];
    return getByPath(runtime.vars, text);
}

export function resolveString(value, runtime) {
    if (typeof value !== "string") return value;
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

export function validateAssertion(definition, context) {
    const where = formatAssertionContext(context);
    const prefix = where ? `${where}断言无效` : "断言无效";
    if (!isPlainObject(definition)) throw new TypeError(`${prefix}: 断言必须是对象`);
    const keys = Object.keys(definition);
    const operators = keys.filter((key) => ASSERTION_OPERATORS.includes(key));
    const unknown = keys.filter((key) => !ASSERTION_OPERATORS.includes(key) && !ASSERTION_META_KEYS.includes(key));
    if (unknown.length) {
        throw new TypeError(
            `${prefix}: 包含未知键 ${unknown.map((key) => `"${key}"`).join(", ")}，` +
            `允许的元数据键为 ${ASSERTION_META_KEYS.join("/")}，操作符为 ${ASSERTION_OPERATORS.join("/")}`
        );
    }
    if (!operators.length) {
        throw new TypeError(`${prefix}: 必须至少包含一个操作符（${ASSERTION_OPERATORS.join("/")}）`);
    }
    // each：期望值为子断言定义对象或其数组，递归复用同一 schema 校验，
    // 让非法子断言（缺操作符/未知键/非对象项）在定义期 fail-fast 并定位到具体项
    if (definition.each !== undefined) {
        const eachLabel = `${prefix}: each 的期望值必须是子断言对象或其数组`;
        if (Array.isArray(definition.each)) {
            definition.each.forEach((sub, subIndex) => {
                if (!isPlainObject(sub)) throw new TypeError(`${eachLabel}（第 ${subIndex + 1} 项不是对象）`);
                validateAssertion(sub, context);
            });
        } else if (isPlainObject(definition.each)) {
            validateAssertion(definition.each, context);
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
    return `{${Object.keys(value).sort()
        .filter((key) => stableStringify(value[key]) !== "undefined")
        .map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`)
        .join(",")}}`;
}

export function evaluateAssertion(definition, response, runtime, context) {
    // 执行期也校验：防止插件 transform 之后产生非法断言定义
    validateAssertion(definition, context);
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
        passed = passed && (Array.isArray(actual)
            ? actual.some((item) => stableStringify(item) === stableStringify(expected))
            : String(actual == null ? "" : actual).includes(String(expected)));
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
            actual.forEach((element, index) => {
                const elementResponse = { status: undefined, headers: {}, body: element, bodyText: "" };
                const subResults = subDefinitions.map((sub) => evaluateAssertion(sub, elementResponse, runtime, context));
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
        passed = passed && Array.isArray(expected)
            && expected.some((item) => stableStringify(item) === stableStringify(actual));
    }
    // startsWith/endsWith：字符串化后比较，口径与 includes 字符串分支一致
    // （null/undefined 实际值视为空串；大小写敏感，无隐式类型转换放行）
    for (const op of ["startsWith", "endsWith"]) {
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
    for (const op of ["gt", "gte", "lt", "lte"]) {
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

const USCC_ALPHABET = "0123456789ABCDEFGHJKLMNPQRTUWXY";
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
