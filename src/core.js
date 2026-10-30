import md5Impl from "blueimp-md5";
import { contract } from "./contract.js";
import { safeDecodeComponent } from "./utils/safe-decode.js";

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

// 字节上限归一化：仅有限正数生效（向下取整），其余（0/负数/NaN/Infinity/空值）
// 统一视为“不限制”以保持既有行为。config 与 run options 共用同一口径
// （engine 的 maxResponseBytes/maxUploadBytes、node io 的 maxUploadBytes）。
export function normalizeByteLimit(value) {
    const limit = Number(value);
    return Number.isFinite(limit) && limit > 0 ? Math.floor(limit) : 0;
}

// 路径严格分词：点段（任意非 .[] 字符）与下标段（整数下标、引号键或通配 [*]，
// 引号内支持 \" \' \\ 转义）交替组成；任一段不合法返回 null，供调用方区分
// 「取不到」与「写错」。getByPath 此前用宽松 match 分词——vars[]、vars[ 等畸形写法被
// 静默忽略剩余字符，空 token 序列甚至返回根对象本身（when 条件意外成立）
const PATH_SEGMENT = /[^.\[\]]+/y;
const PATH_BRACKET = /\[(?:-?\d+|"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|\*)\]/y;
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
    // 通配段走展开分支；纯标量/下标路径继续走下方原热路径，行为与性能零变化
    if (tokens.includes("[*]")) return getByWildcardPath(source, tokens);
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

// 通配展开结果必须与「路径本身恰好取到数组」区分：items[*].tags 应产出数组的数组，
// 而不是把每项 tags 展平。内部包装符号只在本次递归内出现，不会泄漏给调用方。
const WILDCARD_EXPANSION = Symbol("scenario-test.wildcardExpansion");

function isWildcardExpansion(value) {
    return value !== null && typeof value === "object" && value[WILDCARD_EXPANSION] === true;
}

// 与 getByPath 标量分支同口径的单 token 导航（负下标/引号键/原型链安全）。
function navigatePathToken(cursor, token) {
    const inner = token.startsWith("[") ? token.slice(1, -1) : null;
    if (inner !== null && /^-\d+$/.test(inner) && Array.isArray(cursor)) {
        return cursor[cursor.length + Number(inner)];
    }
    const key = inner === null ? token : inner.replace(/^['"]|['"]$/g, "").replace(/\\(["'\\])/g, "$1");
    return Object.prototype.hasOwnProperty.call(cursor, key) ? cursor[key] : undefined;
}

function walkWildcardPath(cursor, tokens, index) {
    if (index >= tokens.length) return cursor;
    const token = tokens[index];
    if (token === "[*]") {
        // 通配段只在真实数组上展开；非数组按路径缺失处理（required/default 语义随之上浮）
        if (!Array.isArray(cursor)) return undefined;
        const values = [];
        for (let itemIndex = 0; itemIndex < cursor.length; itemIndex += 1) {
            // 与标量路径同口径只读自有下标：稀疏数组空位/原型链上的同号成员不参与展开
            if (!Object.prototype.hasOwnProperty.call(cursor, itemIndex)) continue;
            const result = walkWildcardPath(cursor[itemIndex], tokens, index + 1);
            // 元素缺失该子路径时跳过，不产出 undefined 洞；嵌套通配结果展平为一级数组
            if (result === undefined) continue;
            if (isWildcardExpansion(result)) {
                // 不用 push(...result.values)：超大嵌套数组会撞实参数量上限
                for (const value of result.values) values.push(value);
            } else values.push(result);
        }
        return { [WILDCARD_EXPANSION]: true, values };
    }
    if (cursor === undefined || cursor === null) return undefined;
    return walkWildcardPath(navigatePathToken(cursor, token), tokens, index + 1);
}

function getByWildcardPath(source, tokens) {
    const result = walkWildcardPath(source, tokens, 0);
    return isWildcardExpansion(result) ? result.values : result;
}

export function evalExpression(expression, runtime) {
    const text = String(expression || "").trim();
    if (!text) return "";
    if (text === "vars") return runtime.vars;
    // suite：本次 run 跨场景共享的命名空间（extract scope: "suite" 写入）
    if (text === "suite") return runtime.suite || runtime.suiteVars;
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
    if (text.startsWith("suite.")) {
        const sub = text.slice(6);
        return sub && !sub.startsWith(".") ? getByPath(runtime.suite || runtime.suiteVars, sub) : undefined;
    }
    if (text.startsWith("suite[")) return getByPath(runtime.suite || runtime.suiteVars, text.slice(5));
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
        const whole = current.match(/^\s*\{\{\s*([^{}]+?)\s*\}\}\s*$/);
        if (whole) {
            const direct = evalExpression(whole[1], runtime);
            if (direct === undefined) return "";
            if (typeof direct !== "string") return direct;
            current = direct;
            continue;
        }
        const replaced = current.replace(/\{\{\s*([^{}]+?)\s*\}\}/g, (_, expression) => {
            const resolved = evalExpression(expression, runtime);
            if (resolved === undefined || resolved === null) return "";
            return typeof resolved === "object" ? JSON.stringify(resolved) : String(resolved);
        });
        if (replaced === current || !/\{\{\s*[^{}]+?\s*\}\}/.test(replaced)) return replaced;
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

// ===== 未定义模板变量诊断（#66）=====
// 模板里引用 vars.X 或裸变量，而 runtime.vars 没有自有键 X 时记录根变量名。
// 只记录顶层缺失：vars.user.name 在 user 存在时不告警（子路径缺失属业务值缺失），
// lastResponse* 不参与（无上一步响应是合法状态）。行为仍保持「解析为空串」不变。
export function templateExpressionRoot(expression) {
    const text = String(expression || "").trim();
    if (!text || text === "vars") return null;
    // 响应级来源与 suite 命名空间不是变量缺失（suite 为本次 run 跨场景共享变量，
    // {{suite.x}} 的根是命名空间而非 vars.suite）
    if (text.startsWith("lastResponse")) return null;
    if (text === "suite" || text.startsWith("suite.") || text.startsWith("suite[")) return null;
    let pathText;
    if (text.startsWith("vars.")) pathText = text.slice(5);
    else if (text.startsWith("vars[")) pathText = text.slice(4);
    else pathText = text;
    if (!pathText || pathText.startsWith(".")) return null;
    const tokens = tokenizePath(pathText);
    if (!tokens || !tokens.length) return null;
    const token = tokens[0];
    if (token.startsWith("[")) {
        const inner = token.slice(1, -1).replace(/^['"]|['"]$/g, "");
        return inner || null;
    }
    return token;
}

export function collectMissingTemplateVars(value, vars, missing = new Set(), seen = new WeakSet()) {
    if (typeof value === "string") {
        if (!value.includes("{{")) return missing;
        for (const match of value.matchAll(/\{\{\s*([^{}]+?)\s*\}\}/g)) {
            const root = templateExpressionRoot(match[1]);
            if (root && !Object.prototype.hasOwnProperty.call(vars || {}, root)) missing.add(root);
        }
        return missing;
    }
    if (value === null || typeof value !== "object" || seen.has(value)) return missing;
    seen.add(value);
    if (Array.isArray(value)) {
        for (const item of value) collectMissingTemplateVars(item, vars, missing, seen);
        return missing;
    }
    if (isPlainObject(value)) {
        for (const item of Object.values(value)) collectMissingTemplateVars(item, vars, missing, seen);
    }
    return missing;
}

export function missingTemplateVarWarnings(missing) {
    return [...missing].map((name) =>
        `模板变量 vars.${name} 未定义，已按空串解析（检查变量名拼写，或补充 config/scenario vars、extract 与 --vars）`);
}

// resolve(clone(value)) 的单遍历等价实现（引擎热路径：步骤 request/step 每次尝试都要复制+解析）。
// 容器（对象/数组）全新、叶子共享——字符串不可变，整串模板解析出的对象仍与旧实现一样按引用返回。
// 语义必须与 clone 完全一致：undefined 键剥离、数组空位/undefined 补 null、非有限数字转 null、
// -0 归零、__proto__ 按自有数据键保留（不污染原型）、循环引用抛 TypeError。
// 非纯 JSON 数据（Date/Map/Set/BigInt/带 toJSON 的对象等）与循环引用一律回退到
// resolve(clone(value))：这些少见形态的标准化与报错行为（Date → ISO 串、原生
// "Converting circular structure to JSON"）逐字不变，无需在此重复实现 JSON.stringify 的细节。
const RESOLVE_CLONE_FALLBACK = Symbol("resolveCloneFallback");

export function resolveClone(value, runtime) {
    const fast = resolveCloneFast(value, runtime, new Set());
    return fast === RESOLVE_CLONE_FALLBACK ? resolve(clone(value), runtime) : fast;
}

// ancestors 只记录当前递归路径（进入时入栈、退出时出栈）：兄弟节点重复引用不是循环，
// 与 JSON.stringify 的 circular 判定口径一致。遇到需要回退的形态立即整体回退，
// 保证回退后的 clone 能看到完整输入、报错/标准化与旧实现完全相同。
function resolveCloneFast(value, runtime, ancestors) {
    if (typeof value === "string") return resolveString(value, runtime);
    if (value === null) return null;
    if (typeof value === "number") {
        // JSON.stringify 把 NaN/Infinity 写成 null，-0 写成 0
        if (!Number.isFinite(value)) return null;
        return value === 0 ? 0 : value;
    }
    if (typeof value === "boolean") return value;
    if (value === undefined) return undefined;
    // function / symbol / bigint：交由 clone 处理（对象键被丢弃、数组元素变 null、BigInt 抛 TypeError）
    if (typeof value !== "object") return RESOLVE_CLONE_FALLBACK;
    if (ancestors.has(value)) return RESOLVE_CLONE_FALLBACK;
    if (Array.isArray(value)) {
        // 数组自带 toJSON 时 JSON.stringify 会调用它，交回旧实现
        if (typeof value.toJSON === "function") return RESOLVE_CLONE_FALLBACK;
        ancestors.add(value);
        try {
            const result = new Array(value.length);
            for (let index = 0; index < value.length; index += 1) {
                const item = resolveCloneFast(value[index], runtime, ancestors);
                if (item === RESOLVE_CLONE_FALLBACK) return RESOLVE_CLONE_FALLBACK;
                // 稀疏数组空位与 undefined 在 JSON 中都序列化为 null
                result[index] = item === undefined ? null : item;
            }
            return result;
        } finally {
            ancestors.delete(value);
        }
    }
    // 非普通对象（Date/Map/Set/类数组宿主对象等）或带 toJSON 的对象：交回旧实现
    if (!isPlainObject(value) || typeof value.toJSON === "function") return RESOLVE_CLONE_FALLBACK;
    ancestors.add(value);
    try {
        const result = {};
        for (const key of Object.keys(value)) {
            const item = value[key];
            // 自有 undefined 值键被 JSON.stringify 丢弃
            if (item === undefined) continue;
            const resolved = resolveCloneFast(item, runtime, ancestors);
            if (resolved === RESOLVE_CLONE_FALLBACK) return RESOLVE_CLONE_FALLBACK;
            // function / symbol 值同样被丢弃
            if (resolved === undefined) continue;
            if (key === "__proto__") {
                // 直接赋值会改写结果对象的原型（原型链污染），按数据键定义
                Object.defineProperty(result, key, { value: resolved, enumerable: true, writable: true, configurable: true });
            } else {
                result[key] = resolved;
            }
        }
        return result;
    } finally {
        ancestors.delete(value);
    }
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
    // 绝对 URL 与协议相对 URL（//host/path）都自带主机：不得再拼到 baseUrl 上。
    // 协议相对写法此前只被 ^https?:// 识别，前导 // 被 strip 后拼成
    // "http://base/cdn.example.com/x" —— 形式有效但发往错误主机。
    if (/^(?:https?:)?\/\//i.test(requestPath || "")) return requestPath;
    const base = String(baseUrl || "").replace(/\/+$/, "");
    const tail = String(requestPath || "").replace(/^\/+/, "");
    return base ? `${base}/${tail}` : tail;
}

// 协议相对 URL（//host/path）按 baseUrl 的协议补全：浏览器 fetch 可直接用，
// Node 原生 fetch 会报 Failed to parse URL；引擎与 cURL 预览共用，双端口径一致（#121）
export function completeProtocolRelativeUrl(url, baseUrl) {
    const text = String(url || "");
    if (!text.startsWith("//")) return text;
    let protocol = "https:";
    try {
        const baseProtocol = new URL(String(baseUrl || "")).protocol;
        if (baseProtocol === "http:" || baseProtocol === "https:") protocol = baseProtocol;
    } catch { /* baseUrl 非法/缺失时按 https 补全 */ }
    return `${protocol}${text}`;
}

// 单个查询参数（含数组值）序列化为 key=value 对：数组展开为重复 key（tags=1&tags=2），
// 与 Spring 等主流服务端数组语义一致。buildUrl、执行期 globals query 注入与浏览器
// cURL 预览共用本实现，避免三处各自 String() 造成静默语义偏差。
export function queryPairs(key, value) {
    const encodedKey = encodeURIComponent(key);
    if (Array.isArray(value)) {
        return value
            .filter((item) => item !== undefined && item !== null)
            .map((item) => `${encodedKey}=${encodeURIComponent(String(item))}`);
    }
    if (value === undefined || value === null) return [];
    return [`${encodedKey}=${encodeURIComponent(String(value))}`];
}

// 按 fragment（#）拆分 URL。查询参数必须拼在 fragment 之前：浏览器 fetch 不会发送
// fragment 之后的内容，拼到 # 之后会让参数静默丢失。
export function splitUrlFragment(url) {
    const text = String(url || "");
    const fragmentIndex = text.indexOf("#");
    return fragmentIndex < 0
        ? { path: text, fragment: "" }
        : { path: text.slice(0, fragmentIndex), fragment: text.slice(fragmentIndex) };
}

// 读取 URL 已有 query 的 key 集合（只看 fragment 之前的部分）。
// 单个畸形百分号编码（bad%zz、字面 %）不应抛 URIError 中断整个请求：失败时保留原串。
export function queryKeys(url) {
    const keys = new Set();
    const { path } = splitUrlFragment(url);
    const queryIndex = path.indexOf("?");
    if (queryIndex < 0) return keys;
    for (const pair of path.slice(queryIndex + 1).split("&")) {
        const key = pair.split("=")[0];
        if (key) keys.add(safeDecodeComponent(key));
    }
    return keys;
}

// 把已序列化的 query 对拼到 URL 上：保留原 fragment，参数总是追加在 fragment 之前。
export function appendQueryPairs(url, pairs) {
    const text = String(url || "");
    if (!pairs || !pairs.length) return text;
    const { path, fragment } = splitUrlFragment(text);
    return `${path}${path.includes("?") ? "&" : "?"}${pairs.join("&")}${fragment}`;
}

// 注入环境 globals query（跳过 URL 中已存在的 key）。引擎执行与浏览器 cURL 预览共用，
// 保证两边拼接位置（含 fragment 处理）始终一致。
export function appendGlobalQuery(url, globals, runtime) {
    const existingKeys = queryKeys(url);
    const pairs = [];
    for (const global of globals || []) {
        if (global.type !== "query" || existingKeys.has(global.name)) continue;
        // 数组值（含模板整体解析出的数组）按重复 key 展开，与 buildUrl 同一实现
        pairs.push(...queryPairs(global.name, resolve(global.value, runtime)));
    }
    return appendQueryPairs(url, pairs);
}

export function buildUrl(requestPath, params, runtime) {
    const rawPath = resolveString(requestPath || "", runtime);
    if (!params || !isPlainObject(params)) return rawPath;
    const resolved = resolve(params, runtime);
    const pairs = Object.entries(resolved).flatMap(([key, value]) => queryPairs(key, value));
    return appendQueryPairs(rawPath, pairs);
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

// ===== shape 断言（jsonSchema-lite，无第三方依赖）=====
const SHAPE_KEYS = new Set(contract.assertions.shape.keys);
const SHAPE_TYPES = new Set(contract.assertions.shape.types);

export function validateShapeSchema(schema, trail = "shape") {
    if (!isPlainObject(schema)) throw new TypeError(`${trail} 必须是对象（jsonSchema-lite 子集）`);
    const unknown = Object.keys(schema).filter((key) => !SHAPE_KEYS.has(key));
    if (unknown.length) {
        throw new TypeError(`${trail} 包含未知键 ${unknown.map((key) => `"${key}"`).join(", ")}，允许的 shape 键为 ${[...SHAPE_KEYS].join("/")}`);
    }
    if (schema.type !== undefined && !SHAPE_TYPES.has(schema.type)) {
        throw new TypeError(`${trail}.type 只支持 ${[...SHAPE_TYPES].join("/")}（当前 ${JSON.stringify(schema.type)}）`);
    }
    if (schema.required !== undefined) {
        if (!Array.isArray(schema.required) || schema.required.some((name) => typeof name !== "string" || !name)) {
            throw new TypeError(`${trail}.required 必须是非空字符串数组`);
        }
    }
    if (schema.properties !== undefined) {
        if (!isPlainObject(schema.properties)) throw new TypeError(`${trail}.properties 必须是对象`);
        for (const [key, sub] of Object.entries(schema.properties)) {
            validateShapeSchema(sub, `${trail}.properties.${key}`);
        }
    }
    if (schema.items !== undefined) validateShapeSchema(schema.items, `${trail}.items`);
    if (schema.enum !== undefined && !Array.isArray(schema.enum)) {
        throw new TypeError(`${trail}.enum 必须是数组`);
    }
    if (schema.additionalProperties !== undefined && typeof schema.additionalProperties !== "boolean") {
        throw new TypeError(`${trail}.additionalProperties 必须是布尔值`);
    }
    // 仅声明空对象是无意义断言（永远通过），定义期拒绝避免假绿
    if (schema.type === undefined && schema.required === undefined && schema.properties === undefined
        && schema.items === undefined && schema.enum === undefined && schema.additionalProperties === undefined) {
        throw new TypeError(`${trail} 至少需要声明 type/required/properties/items/enum/additionalProperties 之一`);
    }
    return schema;
}

// 实际值的 JSON 类型名：integer 与 number 区分开，便于失败明细直接说明「期望 integer，实际 string」
function shapeActualType(value) {
    if (value === null) return "null";
    if (Array.isArray(value)) return "array";
    if (typeof value === "number") {
        if (!Number.isFinite(value)) return "number";
        return Number.isInteger(value) ? "integer" : "number";
    }
    if (typeof value === "string") return "string";
    if (typeof value === "boolean") return "boolean";
    if (typeof value === "undefined") return "undefined";
    if (typeof value === "bigint") return "bigint";
    if (isPlainObject(value)) return "object";
    return typeof value;
}

function shapeTypeMatches(value, type) {
    if (type === "null") return value === null;
    if (type === "array") return Array.isArray(value);
    if (type === "object") return isPlainObject(value);
    if (type === "integer") return typeof value === "number" && Number.isInteger(value);
    if (type === "number") return typeof value === "number" && Number.isFinite(value);
    return typeof value === type;
}

function shapeChildPath(parent, key) {
    const text = String(key);
    const simple = /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(text);
    if (simple) return parent ? `${parent}.${text}` : text;
    const bracket = `[${JSON.stringify(text)}]`;
    return parent ? `${parent}${bracket}` : bracket;
}

function shapeIndexPath(parent, index) {
    return parent ? `${parent}[${index}]` : `[${index}]`;
}

function pushShapeFailure(failures, failure) {
    failures.push({
        path: failure.path || "(根)",
        expected: failure.expected,
        actual: failure.actual,
        // 实际值类型：显式传入时以调用方为准（如缺失必填字段为 undefined），否则按值推断
        actualType: failure.actualType || shapeActualType(failure.actual),
        expectedType: failure.expectedType,
        reason: failure.reason
    });
}

// 递归收集全部结构失败（不短路）：字段路径、期望类型/值、实际类型/值与可读原因一并保留，
// 供 AssertionResult.detail 复用 each 的分层明细结构透出。
function collectShapeFailures(value, schema, path, failures) {
    // 未显式声明 type 时按已声明的结构键推断：required/properties/additionalProperties → object，
    // items → array，避免漏写 type 时对非对象/非数组值静默通过。
    const type = schema.type !== undefined
        ? schema.type
        : (schema.properties !== undefined || schema.required !== undefined || schema.additionalProperties !== undefined
            ? "object"
            : (schema.items !== undefined ? "array" : undefined));
    const actualType = shapeActualType(value);
    if (type !== undefined && !shapeTypeMatches(value, type)) {
        pushShapeFailure(failures, {
            path,
            expected: `type: ${type}`,
            expectedType: type,
            actual: value,
            actualType,
            reason: `类型不符：期望 ${type}，实际 ${actualType}`
        });
        // 根类型不符时继续下钻 properties/items 只会产生噪声
        return failures;
    }
    if (Array.isArray(schema.enum)) {
        const actualText = stableStringify(value);
        if (!schema.enum.some((candidate) => stableStringify(candidate) === actualText)) {
            pushShapeFailure(failures, {
                path,
                expected: `enum: ${JSON.stringify(schema.enum)}`,
                actual: value,
                actualType,
                reason: `取值不在 enum 允许范围（实际 ${actualType}）`
            });
        }
    }
    if (isPlainObject(value)) {
        const properties = isPlainObject(schema.properties) ? schema.properties : {};
        for (const key of schema.required || []) {
            if (!Object.prototype.hasOwnProperty.call(value, key) || value[key] === undefined) {
                pushShapeFailure(failures, {
                    path: shapeChildPath(path, key),
                    expected: "必填字段存在",
                    actual: undefined,
                    actualType: "undefined",
                    reason: "缺少必填字段"
                });
            }
        }
        for (const [key, child] of Object.entries(properties)) {
            if (!Object.prototype.hasOwnProperty.call(value, key) || value[key] === undefined) continue;
            collectShapeFailures(value[key], child, shapeChildPath(path, key), failures);
        }
        if (schema.additionalProperties === false) {
            for (const key of Object.keys(value)) {
                if (Object.prototype.hasOwnProperty.call(properties, key)) continue;
                pushShapeFailure(failures, {
                    path: shapeChildPath(path, key),
                    expected: "不允许的额外字段",
                    actual: value[key],
                    actualType: shapeActualType(value[key]),
                    reason: `additionalProperties:false：出现未声明键 "${key}"`
                });
            }
        }
    }
    if (Array.isArray(value) && schema.items !== undefined) {
        value.forEach((item, index) => collectShapeFailures(item, schema.items, shapeIndexPath(path, index), failures));
    }
    return failures;
}

// 对外保留 evaluateShape(schema, actual)：返回可直接渲染的明细项。
// 每项同时携带 each 的 index/assertions 分层结构与 path 等扁平字段，
// 既能复用工作台/CLI 的 each 明细渲染，也兼容仅读取 path/expected/actual 的旧消费方。
export function evaluateShape(schema, actual) {
    const failures = collectShapeFailures(actual, schema, "", []);
    return failures.map((failure, index) => ({
        index,
        path: failure.path,
        expected: failure.expected,
        actual: failure.actual,
        value: failure.actual,
        expectedType: failure.expectedType,
        actualType: failure.actualType,
        reason: failure.reason,
        assertions: [{
            name: failure.path,
            passed: false,
            expected: failure.expected,
            actual: failure.actual,
            reason: failure.reason,
            expectedType: failure.expectedType,
            actualType: failure.actualType
        }]
    }));
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
    // exists 只接受 boolean：运行期是 Boolean(definition.exists) 的直判，
    // "false"/0 这类非空值会被当成 true，模板也不会解析——两条都是假绿入口
    if (definition.exists !== undefined && typeof definition.exists !== "boolean") {
        throw new TypeError(
            `${prefix}: exists 只接受 boolean（当前 ${JSON.stringify(definition.exists)}）；` +
            `字符串、数字与 {{ }} 模板都会被当成真值，请改用布尔字面量或改用 when 条件控制步骤`
        );
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
            throw new TypeError(`${prefix}: path 不是合法路径写法（支持 点段/整数下标/引号键/通配段 [*]，如 a.b、list[-1]、a["x>y"]、items[*].id；当前 ${JSON.stringify(definition.path)}）`);
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
    // shape：结构定义在定义期完整校验（未知键/类型名/嵌套递归），避免运行期静默忽略拼错
    if (definition.shape !== undefined) {
        validateShapeSchema(definition.shape, `${prefix}: shape`);
    }
    // each：期望值为子断言定义对象或其数组，递归复用同一 schema 校验，
    // 让非法子断言（缺操作符/未知键/非对象项）在定义期 fail-fast 并定位到具体项
    if (definition.each !== undefined) {        const eachLabel = `${prefix}: each 的期望值必须是子断言对象或其数组`;
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
    if (definition.from === "suite") {
        const suite = runtime.suite || runtime.suiteVars;
        return definition.path ? getByPath(suite, definition.path) : suite;
    }
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
    // BigInt 等 JSON 不可表示值此前经 JSON.stringify 抛 TypeError，把 equals/notEquals
    // 的「断言失败」升级为步骤 ERROR——与 includes/oneOf 已修的口径不一致。bigint:
    // 前缀与字符串 "1"、数字 1 区分开（1n ≠ 1 ≠ "1"），适配器返回的 BigInt 字段可正常比较
    if (typeof value === "bigint") return `bigint:${value.toString()}`;
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

// includes 对 plain object 实际值的失败原因：非数组分支会走 String(actual)，对象恒为
// "[object Object]"，断言必然失败且看起来像「对象不包含期望值」——属静默语义陷阱。
// 保持失败口径不变（历史上恒 false，不可能有正当依赖），仅把原因换成可操作引导。
const INCLUDES_OBJECT_ACTUAL_REASON =
    "includes 不支持对象类型的实际值（String(actual) 恒为 \"[object Object]\"，断言必然失败）：" +
    "对象深比较请改用 equals，或对具体字段用 path 断言（如 path: \"data.id\"）";

// 断言定义执行期校验去重：retryUntil 轮询里同一定义对象每次尝试都会重新进
// evaluateAssertion——同一对象的校验结果不变（插件 transform 在 runScenario 前完成，
// 步内定义不会被改写），WeakSet 记忆已校验对象，把 N 次尝试 × M 条断言降为 M 次。
// each 子断言是每次 resolve() 新建的独立对象，天然不命中缓存，仍由 each 分支逐次校验。
const validatedAssertions = new WeakSet();

// matches 正则编译缓存：retryUntil 轮询与同值静态正则（如隐式 ^2\d\d$）此前
// 每条断言每次尝试都重新 new RegExp。按解析后的期望值字符串缓存编译结果；
// new RegExp 不携带 /g /y flag，.test() 无 lastIndex 状态，共享安全。
// 有界 FIFO 防模板期望值无限增长占内存（与 tokenizePath 缓存同思路）。
const MATCHES_PATTERN_CACHE_LIMIT = 128;
const matchesPatternCache = new Map();

function compiledMatchesPattern(expected) {
    const key = String(expected);
    let compiled = matchesPatternCache.get(key);
    if (!compiled) {
        compiled = new RegExp(key);
        if (matchesPatternCache.size >= MATCHES_PATTERN_CACHE_LIMIT) {
            matchesPatternCache.delete(matchesPatternCache.keys().next().value);
        }
        matchesPatternCache.set(key, compiled);
    }
    return compiled;
}

export function evaluateAssertion(definition, response, runtime, context) {
    // 执行期也校验：防止插件 transform 之后产生非法断言定义
    if (!validatedAssertions.has(definition)) {
        validateAssertion(definition, context);
        // 走到这里定义必是 plain object（否则上一行已抛），WeakSet 只收对象
        validatedAssertions.add(definition);
    }
    return evaluateValidatedAssertion(definition, response, runtime, context);
}

function evaluateValidatedAssertion(definition, response, runtime, context) {
    let actual = assertionActual(definition, response, runtime);
    let expected;
    let passed = true;
    // 失败原因（语义化引导）：目前仅 includes 命中 plain object 实际值时产生，
    // 通过断言/其余操作符不携带该键，保持既有四字段形状
    let reason = "";
    // each 失败元素明细：[{ index, actual, assertions }]，仅在存在失败元素时挂到结果上
    let eachFailures = null;
    // shape 失败明细：[{ path, expected, actual }]，仅失败时挂到 detail
    let shapeFailures = null;
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
        if (isPlainObject(actual)) {
            // 对象实际值：不再走字符串化分支——结果与历史一致（失败），但透出语义化原因，
            // 引导改用 equals 做对象深比较或对具体字段 path 断言
            passed = false;
            reason = INCLUDES_OBJECT_ACTUAL_REASON;
        } else if (Array.isArray(actual)) {
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
    if (Object.prototype.hasOwnProperty.call(definition, "shape")) {
        expected = resolve(definition.shape, runtime);
        let shapeDefinitionError = "";
        if (isPlainObject(expected)) {
            try {
                // 定义期已校验；模板解析后可能改变 enum/required 等值，运行期再校一次，
                // 非法定义按断言失败处理并给出字段级明细，而非抛异常中断整个步骤。
                validateShapeSchema(expected);
            } catch (error) {
                shapeDefinitionError = error?.message || String(error);
            }
        } else {
            shapeDefinitionError = "shape 定义必须是对象（jsonSchema-lite 子集）";
        }
        if (shapeDefinitionError) {
            passed = false;
            const actualType = shapeActualType(expected);
            shapeFailures = [{
                index: 0,
                path: "(根)",
                expected: "shape 定义对象",
                actual: actualType,
                value: expected,
                expectedType: "object",
                actualType,
                reason: shapeDefinitionError,
                assertions: [{
                    name: "(根)",
                    passed: false,
                    expected: "shape 定义对象",
                    actual: actualType,
                    reason: shapeDefinitionError,
                    expectedType: "object",
                    actualType
                }]
            }];
        } else {
            const failures = evaluateShape(expected, actual);
            if (failures.length) {
                shapeFailures = failures;
                passed = false;
            }
        }
    }
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
            try { passed = passed && compiledMatchesPattern(expected).test(String(actual == null ? "" : actual)); }
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
        // reason 仅在 includes 命中对象实际值时出现；通过时保持既有四字段形状
        ...(reason ? { reason } : {}),
        // detail 仅在 each/shape 存在失败明细时出现；通过时保持既有四字段形状（旧消费方不受影响）。
        // 同一断言同时声明 each + shape 时合并为一份明细，避免后者覆盖前者。
        ...((eachFailures && eachFailures.length) || (shapeFailures && shapeFailures.length)
            ? { detail: [...(eachFailures || []), ...(shapeFailures || [])] }
            : {})
    };
}

export function normalizeWhenDefinition(definition) {
    if (!isPlainObject(definition)) return definition;
    const normalized = { ...definition };
    // when 的来源口径向已有能力靠拢：lastResponse 取上一步响应 body（与 extract from:"body" /
    // 模板 {{lastResponse.*}} 的 body 子路径同口径）；status 等价于断言 target:"status"。
    // 归一化后复用断言 schema 校验/求值，避免在 when 内维护第二套操作符语义。
    if (normalized.from === "lastResponse") normalized.from = "body";
    else if (normalized.from === "status") {
        delete normalized.from;
        normalized.target = "status";
    }
    return normalized;
}

// when 对象形式：来源 vars/lastResponse/status 或 target:"status"，复用断言求值管线。
// 第一步（无上一步响应）引用 lastResponse/status 时按来源缺失处理——条件直接不成立，
// 不因空响应抛错中断场景；这与「变量缺失」按断言自身语义求值不同。
export function evaluateWhen(definition, runtime, context) {
    if (!isPlainObject(definition)) return Boolean(resolve(definition, runtime));
    const usesPreviousResponse = definition.from === "lastResponse"
        || definition.from === "status"
        || definition.target === "status";
    const previous = runtime ? runtime.lastResponse : null;
    if (usesPreviousResponse && (previous === undefined || previous === null)) return false;
    const response = previous && typeof previous === "object"
        ? {
            status: previous.status,
            headers: previous.headers || {},
            body: previous.body,
            bodyText: previous.bodyText || ""
        }
        : { status: undefined, headers: {}, body: undefined, bodyText: "" };
    return evaluateAssertion(normalizeWhenDefinition(definition), response, runtime, context).passed;
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

/**
 * 安全写入运行时 vars：普通赋值遇到 "__proto__" 会走 Object.prototype 的原型 setter——
 * 对象值改写 vars 原型、原始值被静默丢弃。defineProperty 始终生成普通自有可写键，
 * 作为定义期保留名拦截之外的运行期兜底（直接调用 runStep/applyGeneratedVar 时同样生效）。
 */
export function setRuntimeVar(vars, name, value) {
    Object.defineProperty(vars, name, {
        value,
        writable: true,
        enumerable: true,
        configurable: true
    });
    return value;
}

export function applyExtract(step, response, runtime) {
    const warnings = [];
    const failures = [];
    // 共享作用域写入点：scope:"suite" 只写 run 级 suite 命名空间（#69）；
    // suiteVars 是 v16 的兼容别名，两者在引擎/工作台运行时指向同一对象。
    // 直接调用 applyExtract 的宿主若只提供其中之一，这里补齐引用并同步写入。
    const storeSuite = (name, value) => {
        if (!isPlainObject(runtime.suite)) runtime.suite = {};
        setRuntimeVar(runtime.suite, name, value);
        if (runtime.suiteVars !== runtime.suite) {
            if (!isPlainObject(runtime.suiteVars)) runtime.suiteVars = runtime.suite;
            else setRuntimeVar(runtime.suiteVars, name, value);
        }
    };
    const store = (name, value, suiteScope) => {
        if (suiteScope) storeSuite(name, value);
        else setRuntimeVar(runtime.vars, name, value);
    };
    for (const definition of step.extract || []) {
        if (!definition || !definition.name) continue;
        assertNotReservedVar(definition.name, "extract 变量");
        // scope: "suite" 写入本次 run 共享命名空间（跨场景复用），默认 step 作用域仍写 runtime.vars
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
        // 空响应体（204/空 body 经 parseBody 得到 null）按「路径缺失」处理：此前
        // required: true 会把 null 当成有效值写入并 PASS（#121）；JSON 字面量 null
        // 的 bodyText 非空，仍视为真实响应值
        const emptyBodyWithoutPath = value === null
            && !definition.path
            && (definition.from === undefined || definition.from === "body")
            && (response.bodyText === null || response.bodyText === undefined || response.bodyText === "");
        const missing = value === undefined || emptyBodyWithoutPath;
        if (missing) {
            if (hasDefault) {
                // 声明默认值即显式兜底：模板照常解析（可引用先提取的变量），缺失不再产生 warning；
                // 仅 undefined 判定缺失——JSON null 是真实响应值，不触发兜底
                store(definition.name, resolve(definition.default, runtime), definition.scope === "suite");
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
        store(definition.name, value, definition.scope === "suite");
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

// UUID v4：Node 18 的 globalThis.crypto 有 getRandomValues 但还没有 randomUUID
// （randomUUID 仅 node:crypto 导出）；用 getRandomValues 按 RFC 4122 手工组装，
// 保持浏览器 / Node 18+ 同一降级链，避免 generatedVars uuid 在 Node 18 直接抛错
export function randomUuid() {
    const crypto = globalThis.crypto;
    if (typeof crypto?.randomUUID === "function") return crypto.randomUUID();
    if (typeof crypto?.getRandomValues === "function") {
        const bytes = crypto.getRandomValues(new Uint8Array(16));
        bytes[6] = (bytes[6] & 0x0f) | 0x40;
        bytes[8] = (bytes[8] & 0x3f) | 0x80;
        const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
        return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
    }
    throw new Error("当前环境不支持 crypto.randomUUID/getRandomValues");
}

function defaultUuidHex() {
    return randomUuid().replace(/-/g, "");
}

// 时间源 seam：默认系统时钟；测试可注入 now 函数、clock 对象（{ now() }）或固定毫秒值。
// 浏览器工作台不注入时与 Node 引擎同样走 Date.now，双端口径一致。
function resolveNowSource(deps = {}) {
    const candidate = deps.now ?? deps.clock;
    if (typeof candidate === "function") return candidate;
    if (candidate && typeof candidate.now === "function") return () => candidate.now();
    if (typeof candidate === "number" && Number.isFinite(candidate)) return () => candidate;
    return Date.now;
}

/**
 * 把单个 generatedVars 定义按类型求值并写入 vars（vars[definition.name]）。
 * 双端一致：造数按 identifiers.runId 与变量名确定性派生（轮内稳定、跨轮变化）。
 * @param {object} definition 已通过 defineScenario 类型枚举校验的定义
 * @param {object} vars 目标 vars 对象（先声明的变量可被后声明引用）
 * @param {object} identifiers { runId } 运行标识（确定性种子）
 * @param {object} [deps] 环境可选项：deps.uuidHex 覆盖 uuidHex 实现（浏览器端有降级链）；
 *                       deps.now/deps.clock 覆盖时间源（测试注入固定时钟）
 */
export function applyGeneratedVar(definition, vars, identifiers, deps = {}) {
    const name = definition.name;
    const uuidHex = deps.uuidHex || defaultUuidHex;
    // 可注入时间源（#12）：测试用固定时钟精确断言 offset/format，生产不传时仍用 Date.now
    const now = resolveNowSource(deps);
    if (definition.type === "timestamp") {
        // 时间戳造数：offset 相对当前时间偏移（如 "-7d"/"+8d"）；unit 决定数值粒度
        // （ms 默认向后兼容 / s 秒级）；format（本地时间 token）输出字符串，与 unit 互斥。
        const base = now() + (definition.offset == null ? 0 : parseTimestampOffset(definition.offset));
        if (definition.format != null) {
            if (definition.unit != null) {
                throw new Error(`generatedVars timestamp 的 format 与 unit 互斥，只能声明其一: ${name}`);
            }
            if (!/(?:YYYY|MM|DD|HH|mm|ss)/.test(definition.format) || !TIMESTAMP_FORMAT_PATTERN.test(definition.format)) {
                throw new Error(`generatedVars timestamp 的 format 仅支持 YYYY/MM/DD/HH/mm/ss 的本地时间组合（如 YYYY-MM-DD HH:mm:ss）: ${definition.format}`);
            }
            setRuntimeVar(vars, name, formatTimestamp(base, definition.format));
        } else if (definition.unit != null && definition.unit !== "ms") {
            if (definition.unit !== "s") {
                throw new Error(`generatedVars timestamp 的 unit 只支持 ms（默认）/s: ${definition.unit}`);
            }
            setRuntimeVar(vars, name, Math.floor(base / 1000));
        } else {
            setRuntimeVar(vars, name, base);
        }
        return;
    }
    if (definition.type === "uuid") {
        // 标准带连字符 UUID v4（uuidHex 为 32 位无连字符形式），适配以 UUID 为业务主键的接口
        setRuntimeVar(vars, name, randomUuid());
        return;
    }
    if (definition.type === "uuidHex") {
        setRuntimeVar(vars, name, uuidHex());
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
        setRuntimeVar(vars, name, buildChinaIdNumber({
            regionCode,
            birthDate: definition.birthDate,
            sequence: seqBase * 2 + (gender === "MALE" ? 1 : 0)
        }));
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
        setRuntimeVar(vars, name, `${first}${luhnCheckDigit(first)}`);
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
        setRuntimeVar(vars, name, `${prefix}${tail}`);
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
        setRuntimeVar(vars, name, buildUsccCode({ categoryCode: "91", regionCode, orgCode }));
        return;
    }
    if (definition.type === "md5") {
        const source = (definition.parts || []).map((part) => vars[part] == null ? "" : String(vars[part])).join("");
        setRuntimeVar(vars, name, md5(source));
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
        setRuntimeVar(vars, name, generateSignature(params, secret));
        return;
    }
    if (definition.type === "enum") {
        // 枚举造数（可带权重）：从 values 按 weights 抽取一个值。按 runId+变量名确定性派生
        // （轮内稳定、跨轮变化、双端一致），命中概率之比即权重之比。
        const { values, weights } = normalizeEnumDefinition(definition);
        setRuntimeVar(vars, name, values[pickWeightedIndex(`${identifiers.runId}|${name}`, weights)]);
        return;
    }
    throw new Error(`不支持的 generatedVars 类型: ${definition.type}`);
}

// ===== 敏感值脱敏（#90）=====
// 变量名启发式名单：CLI 输出层与浏览器工作台共用同一口径（勿在 UI 另写副本）
export const SECRET_VAR_PATTERN = /(token|secret|password|passwd|auth|credential|api[-_]?key|cookie)/i;

export function isSecretVarName(name) {
    return SECRET_VAR_PATTERN.test(String(name || ""));
}

export function maskSecret(value) {
    if (value === undefined || value === null || value === "") return "";
    const text = String(value);
    return text.length > 12 ? `${text.slice(0, 4)}...${text.slice(-4)}` : "***";
}

// 收集需要从输出中抹掉的原始值：命中敏感变量名的 vars + 调用方补充的授权/全局参数值。
// 仅字符串化标量（对象整体脱敏交给 redactSecrets 的键名分支）
export function collectSecretValues(vars, extra = []) {
    const secrets = new Set();
    for (const [name, value] of Object.entries(vars || {})) {
        if (!isSecretVarName(name)) continue;
        if (value === undefined || value === null || value === "") continue;
        if (typeof value === "object") continue;
        secrets.add(String(value));
    }
    for (const value of extra || []) {
        if (value === undefined || value === null || value === "") continue;
        secrets.add(String(value));
    }
    return [...secrets];
}

// 深度脱敏：字符串按已知敏感值替换；对象键命中敏感名时整体替换为 maskSecret。
// 只替换长度 ≥4 的已知值（避免把 1-2 字符密钥当作子串把整段文本打碎），
// 但整串恰好等于短密钥时仍脱敏。
export function redactSecrets(value, secrets, seen = new WeakMap()) {
    if (typeof value === "string") {
        let text = value;
        for (const secret of secrets || []) {
            if (!secret) continue;
            if (text === secret) return maskSecret(secret);
            if (secret.length >= 4 && text.includes(secret)) {
                text = text.split(secret).join(maskSecret(secret));
            }
        }
        return text;
    }
    if (value === null || typeof value !== "object") return value;
    // 共享引用/循环引用：返回同一个已脱敏副本，避免第二次遇到时直接返回原始未脱敏对象
    if (seen.has(value)) return seen.get(value);
    if (Array.isArray(value)) {
        const result = [];
        seen.set(value, result);
        for (const item of value) result.push(redactSecrets(item, secrets, seen));
        return result;
    }
    if (!isPlainObject(value)) return value;
    const result = {};
    seen.set(value, result);
    for (const [key, item] of Object.entries(value)) {
        if (isSecretVarName(key) && item !== undefined && item !== null && item !== "") {
            if (Array.isArray(item)) result[key] = item.map((entry) => (entry !== null && typeof entry === "object" ? "***" : maskSecret(entry)));
            else if (typeof item === "object") result[key] = "***";
            else result[key] = maskSecret(item);
        } else {
            result[key] = redactSecrets(item, secrets, seen);
        }
    }
    return result;
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
