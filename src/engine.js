import {
    applyExtract,
    applyGeneratedVar,
    assertNoReservedVars,
    assertNotReservedVar,
    buildAssertions,
    buildUrl,
    collectMissingTemplateVars,
    completeProtocolRelativeUrl,
    hasHeader,
    headersToObject,
    isPlainObject,
    joinUrl,
    missingTemplateVarWarnings,
    parseBody,
    evaluateWhen,
    appendGlobalQuery,
    normalizeByteLimit,
    randomUuid,
    resolve,
    resolveClone,
    resolveString,
    setRuntimeVar
} from "./core.js";
import { contract } from "./contract.js";
import { defineScenario, listAdapters } from "./registry.js";
import { validateAdapterResponse } from "./adapter-types.js";
import { escapeInlineText } from "./utils/failure-diff.js";

function now() {
    return globalThis.performance?.now ? globalThis.performance.now() : Date.now();
}

function abortReason(signal) {
    return signal?.reason || new Error("执行已取消");
}

function timeoutErrorMessage(timeoutMs) {
    return `请求超时（${timeoutMs}ms）`;
}

// 单次执行失败是否由请求/适配器超时引起：优先看 createRequestSignal 写入的结构化标记，
// 不依赖本地化错误文案。
function isTimeoutError(error) {
    return Boolean(error?.scenarioTimedOut || error?.scenarioContext?.timedOut);
}

// 供 retryOn/onAttempt 与重试超时消息使用的错误文本：fetch 的 TypeError("fetch failed")
// 把真实原因收在 cause，透出 ECONNREFUSED/ENOTFOUND 等，便于 CI 与进度行直接定位。
function describeError(error) {
    const message = String(error?.message || error || "请求执行失败");
    const causeDetail = error?.cause
        ? (error.cause.code || error.cause.message || String(error.cause))
        : "";
    return causeDetail && !message.includes(causeDetail)
        ? `${message}（${causeDetail}）`
        : message;
}

// retryUntil 退避：第 n 次重试等待 = intervalMs * intervalFactor^(n-1)，封顶 maxIntervalMs，
// 最后应用 100ms 下限（下限优先于封顶，maxIntervalMs < 100 时仍防高频轮询）。
// 定义期已校验 factor >= 1 / maxIntervalMs >= intervalMs；直接 runStep 绕过定义期时
// 按安全默认处理（非法 factor 视为 1、未声明上限不封顶），保持旧固定间隔兼容。
function retryBackoffIntervalMs(retry, attempt, maxElapsedMs) {
    // 用 isFinite 判定而非 ||——显式 0 表示「按最小间隔执行」，不应被 falsy 吞回默认 2000ms
    const rawIntervalMs = Number(retry?.intervalMs);
    const baseIntervalMs = Number.isFinite(rawIntervalMs) ? rawIntervalMs : 2000;
    const rawFactor = Number(retry?.intervalFactor);
    const intervalFactor = Number.isFinite(rawFactor) && rawFactor >= 1 ? rawFactor : 1;
    const rawMaxIntervalMs = Number(retry?.maxIntervalMs);
    const maxIntervalMs = Number.isFinite(rawMaxIntervalMs) && rawMaxIntervalMs >= 0
        ? rawMaxIntervalMs
        : Infinity;
    let computed = baseIntervalMs * Math.pow(intervalFactor, Math.max(0, attempt - 1));
    // 指数增长溢出为 Infinity 时不能直接交给 setTimeout（会被截断成 1ms 导致高频轮询）；
    // 未声明上限时用总时限作安全上界。
    if (!Number.isFinite(computed)) {
        computed = Number.isFinite(maxIntervalMs) ? maxIntervalMs : maxElapsedMs;
    }
    computed = Math.min(computed, maxIntervalMs);
    return Math.max(100, computed);
}

function delay(milliseconds, signal) {
    if (!milliseconds) return Promise.resolve();
    // 与 createRequestSignal 对齐：signal 已中止时立即拒绝，否则 addEventListener 不会触发，
    // 取消要白等完整 interval 才被下一轮循环发现
    if (signal?.aborted) return Promise.reject(abortReason(signal));
    return new Promise((resolveDelay, reject) => {
        // 正常到期必须摘除 abort 监听：retryUntil 轮询在同一个父 signal 上反复挂
        // { once:true } 监听（只在 abort 时移除），监听器会随尝试次数累积——工作台
        // 整场执行复用单个 abortController，Node ≥11 个监听器即打
        // MaxListenersExceededWarning 污染 stderr，也构成内存泄漏
        const onAbort = () => {
            clearTimeout(timer);
            reject(abortReason(signal));
        };
        const timer = setTimeout(() => {
            signal?.removeEventListener("abort", onAbort);
            resolveDelay();
        }, milliseconds);
        signal?.addEventListener("abort", onAbort, { once: true });
    });
}

// 超时错误：带结构化标记，供调用方精确识别超时（不依赖匹配本地化文案）
function createTimeoutError(timeoutMs, message) {
    const error = new Error(message || timeoutErrorMessage(timeoutMs));
    error.scenarioTimedOut = true;
    return error;
}

// Node/浏览器 setTimeout 单次延时上限（2^31-1ms）：超过会被实现截断为 1ms。
// 大超时按剩余时间分段续排，避免「配置 2147483648ms 却约 1ms 就超时」。
const MAX_TIMER_DELAY_MS = 2147483647;

function scheduleTimeout(callback, timeoutMs) {
    let timer = null;
    let disposed = false;
    const deadline = now() + timeoutMs;
    const tick = () => {
        if (disposed) return;
        const remaining = deadline - now();
        if (remaining <= 0) {
            callback();
            return;
        }
        timer = setTimeout(tick, Math.min(remaining, MAX_TIMER_DELAY_MS));
    };
    tick();
    return {
        clear() {
            disposed = true;
            if (timer) clearTimeout(timer);
        }
    };
}

// 超时链：step.timeoutMs（定义期已校验正数）→ request.timeoutMs（整串模板在
// 运行期解析）→ 配置默认值。request.timeoutMs 解析后的非法值不能继续静默钳制，
// 否则超时配置失效且无法定位——在发请求前明确报错。
function resolveTimeoutMs(step, request, options) {
    // step.timeoutMs 不解析模板；直接 runStep 绕过定义期时保留既有兜底：
    // 非法值按 30000ms，避免负数/Infinity/字符串 "0" 导致永不超时
    const stepTimeoutSource = step.timeoutMs || undefined;
    if (stepTimeoutSource !== undefined) {
        const stepTimeout = Number(stepTimeoutSource);
        return Number.isFinite(stepTimeout) && stepTimeout > 0 ? stepTimeout : 30000;
    }
    if (request.timeoutMs !== undefined) {
        const requestTimeoutSource = request.timeoutMs;
        // 模板解析结果可能是 boolean/数组/对象：Number(true) === 1、Number([5000]) === 5000，
        // 直接 Number() 会把非数字值当成有效超时——只接受 number 或非空数字字符串
        const hasNumericType = typeof requestTimeoutSource === "number"
            || (typeof requestTimeoutSource === "string" && requestTimeoutSource.trim() !== "");
        const requestTimeout = hasNumericType ? Number(requestTimeoutSource) : NaN;
        if (!hasNumericType || !Number.isFinite(requestTimeout) || requestTimeout <= 0) {
            const value = typeof requestTimeoutSource === "string"
                || (typeof requestTimeoutSource === "object" && requestTimeoutSource !== null)
                ? JSON.stringify(requestTimeoutSource)
                : String(requestTimeoutSource);
            throw new Error(
                `步骤 ${step.name || "未命名步骤"} 的 request.timeoutMs 解析后不是有效的正数毫秒（当前 ${value}），请检查变量值`
            );
        }
        return requestTimeout;
    }
    const configuredTimeout = Number(options.requestTimeoutMs);
    return Number.isFinite(configuredTimeout) && configuredTimeout > 0 ? configuredTimeout : 30000;
}

function createRequestSignal(parentSignal, timeoutMs) {
    const controller = new AbortController();
    // 超时状态由 signal 内部维护，不依赖浏览器是否把 abort reason 传播为 fetch 拒绝原因
    let timedOut = false;
    const abort = () => controller.abort(abortReason(parentSignal));
    if (parentSignal?.aborted) abort();
    else parentSignal?.addEventListener("abort", abort, { once: true });
    const timer = timeoutMs > 0
        ? scheduleTimeout(() => { timedOut = true; controller.abort(createTimeoutError(timeoutMs)); }, timeoutMs)
        : null;
    return {
        signal: controller.signal,
        timedOut() {
            return timedOut;
        },
        dispose() {
            if (timer) timer.clear();
            parentSignal?.removeEventListener("abort", abort);
        }
    };
}

// 造数派生池（IDCARD_TEST_REGIONS / PHONE_TEST_PREFIXES / USCC_ALPHABET）由 core.js 导出，
// 与浏览器工作台共用同一名单

function createRunIdentifiers() {
    const timestamp = String(Date.now());
    // Node 19+ 与浏览器统一走 core.randomUuid（浏览器非安全上下文退 getRandomValues）
    const random = randomUuid().replace(/-/g, "").slice(0, 8);
    return {
        runId: `${timestamp}-${random}`,
        runNo: `${timestamp.slice(-6)}-${random.slice(0, 4)}`
    };
}

// generatedVars 各类型造数实现收敛在 core.js（applyGeneratedVar），
// 与浏览器工作台共用同一实现——本文件只负责 vars 的组装顺序
function buildGeneratedVars(scenario, layers, environmentVariables, options = {}) {
    const identifiers = createRunIdentifiers();
    const suiteVars = layers.suite || {};
    const configVars = layers.configVars || {};
    const optionVars = layers.optionVars || {};
    // 保留变量冲突在使用前尽早报错：config/options vars 不得声明 runId/runNo
    assertNoReservedVars(scenario.vars, "场景 vars");
    assertNoReservedVars(configVars, "配置 vars");
    assertNoReservedVars(optionVars, "选项 vars");
    // 优先级（低 → 高）：suite 提取值 < 场景 vars < 配置 vars < 选项 vars
    const vars = { ...suiteVars, ...(scenario.vars || {}), ...configVars, ...optionVars, ...identifiers };

    // ✅ 是否在错误消息中显示详细信息（仅开发模式）
    // 浏览器产物（UMD/ESM）无 process 全局，必须先探测再读取，否则 runScenario 调用即崩
    const verboseErrors = options.verboseErrors
        || (typeof process !== "undefined" && process.env?.SCENARIO_VERBOSE_ERRORS === "true");

    for (const [name, environmentName] of Object.entries(scenario.envVars || {})) {
        assertNotReservedVar(name, `场景 envVars`);
        const value = environmentVariables?.[environmentName] ?? vars[name];
        if (value === undefined || value === null || value === "") {
            // ✅ 生产模式不泄露环境变量名
            if (verboseErrors) {
                throw new Error(
                    `缺少场景变量: vars.${name}\n` +
                    `环境变量映射: ${environmentName}\n` +
                    `提示: 在配置中设置 vars.${name} 或设置环境变量 ${environmentName}`
                );
            } else {
                throw new Error(
                    `缺少必需的场景变量: vars.${name}\n` +
                    `提示: 请在配置文件的 vars 中设置该变量，或通过环境变量提供\n` +
                    `详细信息可通过设置 SCENARIO_VERBOSE_ERRORS=true 查看`
                );
            }
        }
        setRuntimeVar(vars, name, value);
    }
    for (const definition of scenario.generatedVars || []) {
        if (!definition?.name) continue;
        assertNotReservedVar(definition.name, "generatedVars");
        // 定义期（defineScenario）已校验类型枚举；这里防御性复查，防止插件 transform 后漂移
        if (!contract.generatedVars.types.includes(definition.type)) {
            throw new Error(`不支持的 generatedVars 类型: ${definition.type}`);
        }
        // 时间源 seam：测试可经 createEngine/runScenario 的 now/clock 注入固定时钟；
        // 浏览器工作台走同一 core.applyGeneratedVar 且不注入时回落 Date.now。
        applyGeneratedVar(definition, vars, identifiers, { now: options.now, clock: options.clock });
    }
    // vars 由引擎统一构建，执行期 extract 是唯一写入方；不做冻结，场景/插件不应直接修改
    return vars;
}

export function createRuntime(scenario, options = {}) {
    const config = options.config || {};
    // run 级共享命名空间（#69）：suite 提取产物作为最低优先级基底并入 vars，
    // 兼容 v16 的 {{vars.<name>}} 写法；场景/配置/选项 vars 同名时一律优先于 suite（#113）。
    const suite = isPlainObject(options.suite)
        ? options.suite
        : (isPlainObject(options.suiteVars) ? options.suiteVars : {});
    const runtime = {
        vars: buildGeneratedVars(
            scenario,
            { suite, configVars: config.vars || {}, optionVars: options.vars || {} },
            options.environmentVariables || {},
            { now: options.now, clock: options.clock }
        ),
        // suite 是本次 run 跨场景共享命名空间：同一对象引用会传给后续场景，写入顺序即场景执行顺序。
        // suiteVars 为 v16 兼容别名，指向同一容器（{{vars.<name>}} 仍可读到底层的 suite 提取值）。
        suite: suite,
        suiteVars: suite,
        lastResponse: null,
        lastResponseBody: null,
        // 每个运行时独立 Cookie Jar（#65）：不落盘、不跨场景共享；未开启时不会写入
        cookieJar: []
    };
    return runtime;
}

// 收集本步骤模板引用的未定义顶层变量（#66）。只扫描真正参与解析的字段，
// 不扫描 name/adapter（前者原样展示、后者是模块名）
function collectStepMissingVars(step, runtime, missing) {
    collectMissingTemplateVars(step.path, runtime.vars, missing);
    collectMissingTemplateVars(step.params, runtime.vars, missing);
    collectMissingTemplateVars(step.request, runtime.vars, missing);
    collectMissingTemplateVars(step.when, runtime.vars, missing);
    collectMissingTemplateVars(step.assertions, runtime.vars, missing);
    collectMissingTemplateVars(step.extract, runtime.vars, missing);
    collectMissingTemplateVars(step.saveResponseAs, runtime.vars, missing);
    return missing;
}

function chooseAdapter(step, adapters) {
    // adapter 字段存在（非 undefined）即视为显式适配器意图：""/null/false 等
    // 非法值不回落 matches/HTTP——定义期已拒绝，直接调 runStep 绕过定义校验
    // 时也应明确报「未注册适配器」而非静默走 HTTP 丢 body
    if (step.adapter !== undefined) {
        const name = typeof step.adapter === "string" ? step.adapter : String(step.adapter);
        return { name, adapter: adapters.get(name) };
    }
    for (const [name, adapter] of adapters.entries()) {
        if (typeof adapter.matches === "function" && adapter.matches(step)) return { name, adapter };
    }
    return null;
}

// 无适配器命中时，步骤至少要声明一个会发起 HTTP 的字段；否则 executeHttp 会用空
// path 请求 baseUrl 根路径，根路径返回 2xx 就 PASSED——适配器名/插件加载拼错会
// 变成假绿（#115）。status/timeoutMs/saveResponseAs 不产生请求，不计入执行字段：
// 只写 status: 200 的步骤同样没有可验证的目标，必须显式报错而非打根路径。
const HTTP_EXECUTION_KEYS = ["method", "path", "params", "request"];

// 读取响应体并支持中途取消：fetch 的 signal abort 是否传播给 body 流随实现而异，
// 这里显式监听 signal，保证"读体"阶段同样受超时/取消控制。
// maxBytes > 0 时边读边计数：超过上限立即取消读取并抛出结构化错误，
// 不把超限响应完整读进内存（非 saveResponseAs 路径同样受上限保护）。
function readBodyChunks(response, signal, maxBytes = 0) {
    // 无 body 的响应也必须先检查中止：fetch 忽略 abort 并在总时限后返回时，
    // 不能继续进入 saveResponseAs 等后续副作用。
    if (signal?.aborted) return Promise.reject(abortReason(signal));
    if (!response.body) return Promise.resolve([]);
    const reader = response.body.getReader();
    const chunks = [];
    let totalBytes = 0;
    return new Promise((resolve, reject) => {
        const onAbort = () => {
            reader.cancel().catch(() => {});
            reject(abortReason(signal));
        };
        if (signal) {
            if (signal.aborted) { onAbort(); return; }
            signal.addEventListener("abort", onAbort, { once: true });
        }
        (async () => {
            try {
                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;
                    totalBytes += value.byteLength;
                    if (maxBytes > 0 && totalBytes > maxBytes) {
                        reader.cancel().catch(() => {});
                        throw createResponseTooLargeError(totalBytes, maxBytes);
                    }
                    chunks.push(value);
                }
                resolve(chunks);
            } catch (error) {
                reject(error);
            } finally {
                if (signal) signal.removeEventListener("abort", onAbort);
            }
        })();
    });
}

function createResponseTooLargeError(bytesRead, limitBytes) {
    // 超限即取消读取以保护内存，无法得知后续响应总长度；字段必须诚实地表达
    // “已读取字节数”，不能命名为完整响应体的实际大小
    const error = new Error(`响应体超过大小上限: 已读取 ${bytesRead} 字节，限制 ${limitBytes} 字节`);
    error.scenarioResponseTooLarge = true;
    error.responseTooLarge = { bytesRead, limitBytes };
    return error;
}

function resolveMaxResponseBytes(options = {}) {
    // 只有 undefined 表示“未提供”，继续回落 config；显式 null/0/负数等按
    // normalizeByteLimit 统一归一化为不限，避免 run options 无法覆盖引擎/配置上限
    const value = options.maxResponseBytes === undefined
        ? options.config?.maxResponseBytes
        : options.maxResponseBytes;
    return normalizeByteLimit(value);
}

// 上传上限要把“未声明”和“显式 0/null=不限制”区分开：前者回落到 config 或
// createNodeIo 默认值，后者必须覆盖上游上限。返回 undefined 表示调用方未声明上限。
function resolveMaxUploadBytes(options = {}) {
    // 与 maxResponseBytes 同一归一化口径：只有 undefined 才回落 config；
    // 显式 null/0/负数等统一由 normalizeByteLimit 视为不限
    const value = options.maxUploadBytes === undefined
        ? options.config?.maxUploadBytes
        : options.maxUploadBytes;
    return value === undefined ? undefined : normalizeByteLimit(value);
}

// 流式保存的响应体包装：边转发边计数字节、监听取消/超时 signal，并把读取错误
// （包括字符串等非 Error 拒绝值）传给下游流水线。body 为空时也返回已关闭的空流，
// 保证只实现 saveResponseStream 的 io 仍能创建零字节文件。
function createSaveBodyStream(body, signal, maxBytes) {
    if (!body) {
        return new ReadableStream({
            start(controller) {
                if (signal?.aborted) controller.error(abortReason(signal));
                else controller.close();
            }
        });
    }
    const reader = body.getReader();
    let totalBytes = 0;
    let finished = false;
    let onAbort = null;
    const cleanup = () => {
        finished = true;
        if (onAbort && signal) signal.removeEventListener("abort", onAbort);
        onAbort = null;
    };
    const cancelReader = (reason) => reader.cancel(reason).catch(() => {});
    return new ReadableStream({
        start(controller) {
            if (!signal) return;
            onAbort = () => {
                if (finished) return;
                cleanup();
                cancelReader(abortReason(signal));
                controller.error(abortReason(signal));
            };
            if (signal.aborted) onAbort();
            else signal.addEventListener("abort", onAbort, { once: true });
        },
        async pull(controller) {
            if (finished) return;
            try {
                const { done, value } = await reader.read();
                // 等待读取期间可能已被取消，此时不再 enqueue/close
                if (finished) return;
                if (done) {
                    cleanup();
                    controller.close();
                    return;
                }
                totalBytes += value.byteLength;
                if (maxBytes > 0 && totalBytes > maxBytes) {
                    cleanup();
                    cancelReader();
                    controller.error(createResponseTooLargeError(totalBytes, maxBytes));
                    return;
                }
                controller.enqueue(value);
            } catch (error) {
                if (finished) return;
                cleanup();
                controller.error(error);
            }
        },
        cancel(reason) {
            cleanup();
            return cancelReader(reason);
        }
    });
}

// 按 content-type 的 charset 构造解码器（如 GBK 老系统）；缺省或非法/不支持的 charset 回退 UTF-8
function decoderForContentType(contentType) {
    const match = /charset\s*=\s*"?([^;"\s]+)"?/i.exec(String(contentType || ""));
    if (!match) return new TextDecoder();
    try { return new TextDecoder(match[1]); } catch { return new TextDecoder(); }
}

// ===== 内存 Cookie Jar（#65，仅 run --cookie-jar 开启）=====
// Set-Cookie 是响应级元数据，不进入对外 response 形状（Symbol 不会被 JSON 序列化）
const SET_COOKIES = Symbol("scenario-test.setCookies");

function defaultCookiePath(pathname) {
    const index = String(pathname || "/").lastIndexOf("/");
    if (index <= 0) return "/";
    return String(pathname).slice(0, index) || "/";
}

function parseSetCookie(line, requestUrl) {
    const text = String(line || "").trim();
    if (!text) return null;
    const parts = text.split(";");
    const pair = parts.shift() || "";
    const separator = pair.indexOf("=");
    if (separator <= 0) return null;
    const cookie = {
        name: pair.slice(0, separator).trim(),
        value: pair.slice(separator + 1).trim(),
        domain: requestUrl.hostname.toLowerCase(),
        path: defaultCookiePath(requestUrl.pathname),
        expiresAt: Infinity,
        secure: false
    };
    for (const attribute of parts) {
        const eq = attribute.indexOf("=");
        const key = (eq >= 0 ? attribute.slice(0, eq) : attribute).trim().toLowerCase();
        const value = eq >= 0 ? attribute.slice(eq + 1).trim() : "";
        if (key === "domain" && value) cookie.domain = value.replace(/^\./, "").toLowerCase();
        else if (key === "path" && value.startsWith("/")) cookie.path = value;
        else if (key === "max-age") {
            const seconds = Number(value);
            if (Number.isFinite(seconds)) cookie.expiresAt = Date.now() + seconds * 1000;
        } else if (key === "expires") {
            const timestamp = Date.parse(value);
            if (Number.isFinite(timestamp)) cookie.expiresAt = timestamp;
        } else if (key === "secure") cookie.secure = true;
    }
    return cookie;
}

function hostMatchesCookie(hostname, domain) {
    const host = String(hostname || "").toLowerCase();
    return host === domain || host.endsWith(`.${domain}`);
}

// 公共后缀简表（不内嵌完整 PSL）：Domain 落到这些后缀上等于把 cookie 挂给整片站点，
// 浏览器同样拒绝（#119）
const PUBLIC_SUFFIXES = new Set([
    "com", "net", "org", "edu", "gov", "mil", "int", "arpa",
    "cn", "uk", "jp", "kr", "de", "fr", "ru", "br", "in", "au", "ca", "us",
    "hk", "tw", "sg", "nz", "mx", "tr", "io", "co", "me", "dev", "app", "test",
    "local", "internal", "localhost",
    "co.uk", "com.cn", "net.cn", "org.cn", "gov.cn", "com.hk", "com.tw", "co.jp",
    "com.au", "co.kr", "com.sg", "com.br", "co.in", "co.nz", "com.mx", "com.tr", "com.ru"
]);

// Cookie Domain 必须是请求主机本身或其可注册父域：拒绝跨站 Domain（api.example.com
// 设 Domain=victim.com 会把 cookie 发往 victim.com）与公共后缀（Domain=com）
function isCookieDomainAllowed(requestHost, domain) {
    const host = String(requestHost || "").toLowerCase();
    const value = String(domain || "").toLowerCase();
    if (!host || !value) return false;
    if (host === value) return true;
    if (!hostMatchesCookie(host, value)) return false;
    return !PUBLIC_SUFFIXES.has(value) && value.includes(".");
}

function pathMatchesCookie(pathname, cookiePath) {
    if (pathname === cookiePath) return true;
    const prefix = cookiePath.endsWith("/") ? cookiePath : `${cookiePath}/`;
    return pathname.startsWith(prefix);
}

function activeJarCookies(jar, url) {
    return (jar || []).filter((cookie) =>
        cookie.expiresAt > Date.now()
        && hostMatchesCookie(url.hostname, cookie.domain)
        && pathMatchesCookie(url.pathname || "/", cookie.path)
        && (!cookie.secure || url.protocol === "https:"));
}

function storeSetCookies(runtime, lines, requestUrl) {
    if (!lines || !lines.length) return;
    if (!Array.isArray(runtime.cookieJar)) runtime.cookieJar = [];
    for (const line of lines) {
        const cookie = parseSetCookie(line, requestUrl);
        if (!cookie) continue;
        // 跨站/公共后缀 Domain 直接丢弃，避免把凭据 cookie 带到其他站点
        if (!isCookieDomainAllowed(requestUrl.hostname, cookie.domain)) continue;
        runtime.cookieJar = runtime.cookieJar.filter((item) =>
            !(item.name === cookie.name && item.domain === cookie.domain && item.path === cookie.path));
        // Max-Age<=0 / 已过期：删除同名 Cookie，不写入
        if (cookie.expiresAt > Date.now()) runtime.cookieJar.push(cookie);
    }
}

// 步骤显式 Cookie（含全局 cookie 参数合并结果）同名优先于 Jar
function applyCookieJar(headers, runtime, url) {
    const explicitKey = Object.keys(headers).find((key) => key.toLowerCase() === "cookie");
    const explicitText = explicitKey ? String(headers[explicitKey] || "") : "";
    const explicitNames = new Set(explicitText.split(";").map((pair) => pair.split("=")[0].trim().toLowerCase()).filter(Boolean));
    const jarText = activeJarCookies(runtime.cookieJar, url)
        .filter((cookie) => !explicitNames.has(cookie.name.toLowerCase()))
        .map((cookie) => `${cookie.name}=${cookie.value}`)
        .join("; ");
    if (!jarText) return;
    if (explicitKey) headers[explicitKey] = `${jarText}; ${explicitText}`;
    else headers.Cookie = jarText;
}

async function readResponse(response, step, io, runtime, signal, options = {}) {
    const headers = headersToObject(response.headers);
    const contentType = String(headers["content-type"] || "");
    const maxResponseBytes = resolveMaxResponseBytes(options);
    // Set-Cookie 可能是多值：优先用 Headers.getSetCookie()，缺失时回退单值。
    // 必须在 saveResponseAs 提前返回之前采集，否则落盘步骤会丢 Cookie
    const setCookies = typeof response.headers?.getSetCookie === "function"
        ? response.headers.getSetCookie()
        : (headers["set-cookie"] ? [headers["set-cookie"]] : []);
    if (step.saveResponseAs) {
        const relativePath = resolveString(step.saveResponseAs, runtime);
        const metadata = { contentType, headers, maxResponseBytes };
        // 优先流式落盘：response.body 直接接到 io 的文件流，避免响应体全量驻留内存；
        // 包装流同时负责 maxResponseBytes 校验与超时/取消，失败时 io 只清理本次临时文件
        if (io?.saveResponseStream) {
            const saved = await io.saveResponseStream(
                relativePath,
                createSaveBodyStream(response.body, signal, maxResponseBytes),
                metadata
            );
            const savedResponse = { status: response.status, headers, body: saved, bodyText: null };
            if (setCookies.length) savedResponse[SET_COOKIES] = setCookies;
            return savedResponse;
        }
        // 回退：环境仅实现 saveResponse 时仍先缓冲，但上限检查发生在写盘之前
        if (io?.saveResponse) {
            const chunks = await readBodyChunks(response, signal, maxResponseBytes);
            const total = chunks.reduce((sum, chunk) => sum + chunk.byteLength, 0);
            // 单块响应直接复用（fetch 的 chunk 已是独立 Uint8Array），多块才合并；
            // 避免旧实现无论块数都再复制一份造成的峰值翻倍
            const data = chunks.length === 1 ? chunks[0] : new Uint8Array(total);
            if (chunks.length > 1) {
                let offset = 0;
                for (const chunk of chunks) { data.set(chunk, offset); offset += chunk.byteLength; }
            }
            const saved = await io.saveResponse(relativePath, data, metadata);
            const savedResponse = { status: response.status, headers, body: saved, bodyText: null };
            if (setCookies.length) savedResponse[SET_COOKIES] = setCookies;
            return savedResponse;
        }
    }
    const chunks = await readBodyChunks(response, signal, maxResponseBytes);
    const decoder = decoderForContentType(contentType);
    const bodyText = chunks.map((chunk) => decoder.decode(chunk, { stream: true })).join("") + decoder.decode();
    const responseData = { status: response.status, headers, body: parseBody(bodyText, contentType), bodyText };
    if (setCookies.length) responseData[SET_COOKIES] = setCookies;
    return responseData;
}

async function executeHttp(step, runtime, options) {
    // resolveClone 单遍历等价于 resolve(clone(...))：容器全新、模板解析，语义见 core.js
    const request = resolveClone(step.request || {}, runtime) || {};
    const method = String(step.method || request.method || "GET").toUpperCase();
    let requestPath = buildUrl(step.path || request.path || "", step.params || request.params, runtime);
    const headers = { ...(request.headers || {}) };
    const absoluteUrl = /^(?:https?:)?\/\//i.test(requestPath);
    const allowEnvironmentAuthorization = !absoluteUrl || request.useEnvironmentAuthorization === true;
    const globals = options.globals || [];
    if (allowEnvironmentAuthorization && globals.length) {
        // query：追加 URL 参数，跳过步骤参数已存在的 key；与浏览器 cURL 预览共用实现
        requestPath = appendGlobalQuery(requestPath, globals, runtime);
        // cookie：多个全局 cookie 合并为一个 Cookie 头，追加到已有 Cookie 之后
        const cookieParts = globals
            .filter((global) => global.type === "cookie")
            .map((global) => `${global.name}=${resolveString(global.value, runtime)}`);
        if (cookieParts.length) {
            const cookieKey = Object.keys(headers).find((key) => key.toLowerCase() === "cookie");
            const mergedCookie = cookieKey
                ? `${headers[cookieKey]}; ${cookieParts.join("; ")}`
                : cookieParts.join("; ");
            if (cookieKey) headers[cookieKey] = mergedCookie;
            else headers.Cookie = mergedCookie;
        }
        // header：步骤显式声明同名头时全局参数不覆盖
        for (const global of globals) {
            if (global.type !== "header" || hasHeader(headers, global.name)) continue;
            headers[global.name] = resolveString(global.value, runtime);
        }
    }
    if (options.authorization && allowEnvironmentAuthorization && !hasHeader(headers, "Authorization")) {
        headers.Authorization = options.authorization;
    }
    // 协议相对 URL（//host/path）在浏览器可用，Node 原生 fetch 会报 Failed to parse URL；
    // 按 baseUrl 的协议补全，双端行为一致（#121）
    const requestUrl = completeProtocolRelativeUrl(joinUrl(options.baseUrl, requestPath), options.baseUrl);
    let parsedRequestUrl = null;
    if (options.cookieJar) {
        try { parsedRequestUrl = new URL(requestUrl); } catch { parsedRequestUrl = null; }
        if (parsedRequestUrl) applyCookieJar(headers, runtime, parsedRequestUrl);
    }
    const fetchOptions = { method, headers };
    if (request.credentials !== undefined) fetchOptions.credentials = request.credentials;
    if (request.redirect !== undefined) fetchOptions.redirect = request.redirect;
    if (request.fileUpload) {
        if (!options.io?.createUploadBody) throw new Error("当前运行环境不支持 fileUpload");
        const upload = await options.io.createUploadBody(
            resolve(request.fileUpload, runtime),
            runtime,
            { maxUploadBytes: resolveMaxUploadBytes(options) }
        );
        fetchOptions.body = upload.body;
        // 自定义 io 返回 Web ReadableStream、Node Readable 或其他异步可迭代流时，
        // Node fetch 必须显式声明半双工；FormData（Blob/File）不受此限制
        if (upload.body && (
            typeof upload.body.getReader === "function"
            || typeof upload.body[Symbol.asyncIterator] === "function"
        )) {
            fetchOptions.duplex = "half";
        }
        for (const [name, value] of Object.entries(upload.headers || {})) headers[name] = value;
        for (const key of Object.keys(headers)) {
            if (key.toLowerCase() === "content-type" && upload.omitContentType) delete headers[key];
        }
    } else if (request.body !== undefined && request.body !== null && !["GET", "HEAD"].includes(method)) {
        if (typeof request.body === "string") fetchOptions.body = request.body;
        else {
            if (!hasHeader(headers, "Content-Type")) headers["Content-Type"] = "application/json";
            fetchOptions.body = JSON.stringify(request.body);
        }
    }
    const timeoutMs = resolveTimeoutMs(step, request, options);
    const requestSignal = createRequestSignal(options.signal, timeoutMs);
    fetchOptions.signal = requestSignal.signal;
    try {
        const response = await options.fetch(requestUrl, fetchOptions);
        const responseData = await readResponse(response, step, options.io, runtime, requestSignal.signal, options);
        if (options.cookieJar && parsedRequestUrl) {
            storeSetCookies(runtime, responseData[SET_COOKIES], parsedRequestUrl);
        }
        return { method, path: requestPath, request: { headers, body: request.body }, response: responseData };
    } catch (error) {
        // 失败也返回注入后的最终请求（Authorization/全局头/合并 cookie/query）与超时标记，
        // 供工作台失败诊断；由 runStep 的 catch 统一装配进结果
        if (error && typeof error === "object" && !error.scenarioContext) {
            error.scenarioContext = {
                method,
                path: requestPath,
                request: { headers, body: request.body },
                timedOut: requestSignal.timedOut(),
                timeoutMs
            };
        }
        throw error;
    } finally {
        requestSignal.dispose();
    }
}

class AdapterExecutionError extends Error {
    constructor(adapterName, originalError, step) {
        // 适配器可能 reject 非 Error 值（字符串/null 等）：直接读 .message 会抛 TypeError
        // 或输出 undefined，掩盖真实失败原因；统一降级为 String()（null/undefined 保留可读文案）。
        const detail = originalError?.message
            || (originalError === undefined ? "undefined" : String(originalError));
        const message = `适配器 ${adapterName} 执行失败: ${detail}`;
        // cause 保留原始错误链；结构化标记透传——适配器内部超时/请求现场被包装后
        // 仍按 TIMEOUT 归类并透出 method/path/request，不再降级为无上下文的 ERROR
        super(message, { cause: originalError });
        this.name = "AdapterExecutionError";
        this.adapterName = adapterName;
        this.originalError = originalError;
        this.stepName = step?.name || "未命名步骤";
        if (originalError?.scenarioTimedOut) this.scenarioTimedOut = true;
        if (originalError?.scenarioContext) this.scenarioContext = originalError.scenarioContext;
        if (originalError?.responseTooLarge) this.responseTooLarge = originalError.responseTooLarge;
        if (originalError?.uploadTooLarge) this.uploadTooLarge = originalError.uploadTooLarge;
    }
}

// 适配器执行超时包装：createRequestSignal 的 signal 只对「尊重 signal 的适配器」有效，
// 适配器可能完全不看 signal（sleep/阻塞 IO）——必须同时与 signal 竞速，超时即返回，
// 否则挂死的适配器会让整个场景永久卡住（retryUntil.maxElapsedMs 只在 attempt 之间检查）。
function raceWithSignal(promise, signal) {
    if (!signal) return promise;
    if (signal.aborted) {
        // 竞速开始前 signal 已中止：仍要挂接底层 Promise 的 rejection 处理，
        // 否则它在稍后拒绝时会成为 unhandledRejection（取消语义已由返回的 reject 表达）。
        promise.catch(() => {});
        return Promise.reject(abortReason(signal));
    }
    return new Promise((resolveRace, rejectRace) => {
        const onAbort = () => rejectRace(abortReason(signal));
        signal.addEventListener("abort", onAbort, { once: true });
        promise.then(
            (value) => { signal.removeEventListener("abort", onAbort); resolveRace(value); },
            (error) => { signal.removeEventListener("abort", onAbort); rejectRace(error); }
        );
    });
}

async function executeAdapter(adapter, adapterName, step, runtime, options) {
    if (!adapter) throw new Error(`未注册步骤适配器: ${adapterName || "unknown"}`);

    let output;
    // request 对象整体 resolve 后再取 timeoutMs：request.timeoutMs 支持整串 {{ }} 模板
    // （如 "{{vars.timeout}}"），与 executeHttp 同口径；其余字段仍在 execute 前按
    // beforeExecute 修改后的 step 重新解析，钩子语义不变
    const request = isPlainObject(step.request) ? resolveClone(step.request, runtime) : {};
    // 与 executeHttp 同一超时链路口径：step.timeoutMs → request.timeoutMs → 配置默认值；
    // 模板解析后的非法值明确报错，直接 runStep 的非法 step.timeoutMs 仍钳制为 30000
    const timeoutMs = resolveTimeoutMs(step, request, options);
    const requestSignal = createRequestSignal(options.signal, timeoutMs);
    // 适配器钩子与 execute 都拿到带超时的 signal（原 options.signal 仍可由父级取消）
    const adapterOptions = { ...options, signal: requestSignal.signal, timeoutMs };

    // 钩子协议：钩子收到的是步骤原始定义（未做 {{vars.*}} 替换）。
    // beforeExecute 对 step 的修改会随深拷贝进入 execute；execute 收到 resolve 后的独立副本，
    // 副本内的修改不会泄漏回原始 step 或后续步骤。
    try {
        output = await raceWithSignal((async () => {
            // 前置钩子（step 为原始定义）
            if (typeof adapter.beforeExecute === "function") {
                await adapter.beforeExecute({ step, runtime, options: adapterOptions });
            }

            // 执行主逻辑（step 为变量替换后的副本）
            let result = await adapter.execute({ step: resolveClone(step, runtime), runtime, options: adapterOptions });

            // 后置钩子（step 为原始定义；返回值可覆盖 result）
            if (typeof adapter.afterExecute === "function") {
                result = await adapter.afterExecute({ step, runtime, options: adapterOptions, output: result }) || result;
            }
            return result;
        })(), requestSignal.signal);
    } catch (error) {
        // 超时由本函数产生时补结构化请求现场：runStep 据此按 TIMEOUT 归类并透出
        // method/path 与超时毫秒数（不依赖错误文案）
        if (requestSignal.timedOut() && error && typeof error === "object" && !error.scenarioContext) {
            error.scenarioContext = {
                method: "ADAPTER",
                path: adapterName || step.adapter || "adapter",
                request: null,
                timedOut: true,
                timeoutMs
            };
        }
        // 错误钩子（step 为原始定义）
        if (typeof adapter.onError === "function") {
            try {
                await adapter.onError({ step, runtime, options: adapterOptions, error });
            } catch (hookError) {
                console.warn(`适配器 ${escapeInlineText(adapterName)} 错误钩子失败: ${escapeInlineText(hookError?.message || hookError)}`);
            }
        }
        throw new AdapterExecutionError(adapterName, error, step);
    } finally {
        requestSignal.dispose();
    }
    
    // 统一走 adapter-types 的响应校验，避免引擎内另写一份校验逻辑
    validateAdapterResponse(output, adapterName);
    const response = output?.response || output;

    return {
        method: output.method || "ADAPTER",
        path: output.path || step.adapter || "adapter",
        request: output.request || null,
        response: {
            status: response.status,
            headers: response.headers || {},
            body: response.body ?? null,
            bodyText: response.bodyText ?? null
        }
    };
}

export function createEngine(engineOptions = {}) {
    // 作用域隔离：每个引擎实例有独立的适配器注册表
    const scopedAdapters = engineOptions.isolateAdapters !== false
        ? new Map([...listAdapters()])
        : listAdapters();
    
    // 注册实例级适配器
    if (engineOptions.adapters) {
        for (const [name, adapter] of Object.entries(engineOptions.adapters)) {
            if (adapter && typeof adapter.execute === "function") {
                scopedAdapters.set(name, adapter);
            }
        }
    }
    
    const adapters = scopedAdapters;
    const fetchImpl = engineOptions.fetch || (typeof globalThis.fetch === "function"
        ? (...args) => globalThis.fetch(...args)
        : null);
    if (typeof fetchImpl !== "function") throw new Error("缺少 fetch 实现");

    async function runStep(step, runtime, runOptions = {}) {
        const startedAt = now();
        const options = {
            ...engineOptions,
            ...runOptions,
            fetch: fetchImpl,
            adapters,
            requestTimeoutMs: runOptions.requestTimeoutMs || engineOptions.requestTimeoutMs || 30000
        };
        // 常见写法会把可选配置字段（值为 undefined）整体透传进 run options；
        // 展开会用它覆盖引擎级上限，导致已配置的限制被静默绕过。只有 undefined
        // 才回填引擎级值，显式 null/0 仍保留为“运行级不限”。
        if (options.maxResponseBytes === undefined) options.maxResponseBytes = engineOptions.maxResponseBytes;
        if (options.maxUploadBytes === undefined) options.maxUploadBytes = engineOptions.maxUploadBytes;
        if (step.when !== undefined) {
            const shouldRun = evaluateWhen(step.when, runtime, { stepName: step.name });
            if (!shouldRun) {
                // when 模板引用缺失变量时仍要告警（条件本身按来源缺失/空串处理）
                const missing = collectMissingTemplateVars(step.when, runtime.vars, new Set());
                return {
                    name: step.name || "未命名步骤",
                    method: "SKIP",
                    path: resolveString(step.path || "", runtime),
                    status: "SKIPPED",
                    duration: now() - startedAt,
                    passed: true,
                    skipped: true,
                    always: step.always === true,
                    error: "",
                    warnings: missingTemplateVarWarnings(missing),
                    assertions: [],
                    request: null,
                    response: null
                };
            }
        }
        let lastExecution;
        let assertions = [];
        let stepWarnings = [];
        // 适配器选择不随尝试变化，先算一次；无适配器命中时守住「至少声明一个 HTTP
        // 执行字段」的底线（实际拦截在 try 内，按步骤 ERROR 归一化，不 reject 整个 run）
        const selection = chooseAdapter(step, adapters);
        // 未定义模板变量告警跨 retryUntil 尝试累积（同一变量只报一次）
        const missingVars = new Set();
        const retry = step.retryUntil || null;
        // maxAttempts 语义 = 最大尝试总次数（含首次请求），与字段名一致；默认 10。
        // 历史实现为 maxAttempts + 1（重试次数语义），与字段名矛盾，v0.5.18 起对齐。
        const totalAttempts = retry ? Math.max(1, Number(retry.maxAttempts || 10)) : 1;
        // retryOn 默认 ["assertion"] 保持既有语义；未声明/非法值不会意外开启 error/timeout 重试。
        const retryOn = new Set(
            retry
                ? (retry.retryOn === undefined
                    ? contract.retryUntil.defaultRetryOn
                    : (Array.isArray(retry.retryOn) ? retry.retryOn : []))
                    .filter((type) => contract.retryUntil.retryOn.includes(type))
                : []
        );
        // maxElapsedMs 是 retryUntil 轮询的总时限（硬约束，契约 note 同口径，#121）：
        // 在途执行、异步 onAttempt 回调与退避等待都并入同一截止 signal 竞速，
        // 不再只对 retryOn 含 error/timeout 的路径生效——默认 assertion 重试下
        // 慢请求/挂起的回调同样可能在总时限后 PASSED。
        const enforceAttemptDeadline = Boolean(retry);
        // ✅ 添加重试超时保护
        const retryStartTime = now();
        const maxElapsedMs = retry?.maxElapsedMs || 300000; // 默认 5 分钟
        let lastAttemptError = null;
        const retryTimeoutError = (attemptCount) => {
            const lastErrorText = lastAttemptError
                ? `\n最后错误: ${describeError(lastAttemptError)}`
                : "";
            return createTimeoutError(
                maxElapsedMs,
                `重试超时: 已尝试 ${attemptCount} 次，耗时超过 ${maxElapsedMs}ms${lastErrorText}\n` +
                `提示: 考虑调整 retryUntil.maxElapsedMs 或检查接口响应`
            );
        };
        try {
            // 无适配器命中又无 HTTP 执行字段：拼错的适配器私有键会静默 GET 根路径并 PASSED
            if (!selection && !HTTP_EXECUTION_KEYS.some((key) => step[key] !== undefined)) {
                throw new Error(
                    `步骤 ${step.name || "未命名步骤"} 未匹配任何适配器，且缺少 HTTP 执行字段（${HTTP_EXECUTION_KEYS.join("/")}）—— 请检查 adapter 名与插件是否已加载，或补全 path/request 等请求字段`
                );
            }
            for (let attempt = 1; attempt <= totalAttempts; attempt += 1) {
                if (options.signal?.aborted) throw abortReason(options.signal);

                // ✅ 检查总耗时（结构化超时 → 报告状态 TIMEOUT 而非 ERROR）；到达总时限即结束
                if (retry) {
                    const elapsedMs = now() - retryStartTime;
                    if (elapsedMs >= maxElapsedMs) throw retryTimeoutError(attempt - 1);
                }

                // 单次执行也必须受总时限约束：在途请求可能跑得比剩余 maxElapsedMs 更久
                // （timeoutMs 更大或适配器忽略 signal）。为本次尝试创建截止 signal，
                // 到期主动 abort，并与执行 Promise 竞速，保证步骤不会在总时限后仍 PASSED。
                let attemptDeadline = null;
                if (enforceAttemptDeadline) {
                    const remainingMs = maxElapsedMs - (now() - retryStartTime);
                    if (remainingMs <= 0) throw retryTimeoutError(attempt - 1);
                    attemptDeadline = createRequestSignal(options.signal, remainingMs);
                }

                let attemptError = null;
                let attemptErrorType = "";
                try {
                    // 每次尝试前扫描模板：首次解析时才可能发现新缺失；Set 去重保证 retryUntil 只报一次
                    collectStepMissingVars(step, runtime, missingVars);
                    const attemptStartedAt = now();
                    const attemptOptions = attemptDeadline
                        ? { ...options, signal: attemptDeadline.signal }
                        : options;
                    const execution = selection
                        ? executeAdapter(selection.adapter, selection.name, step, runtime, attemptOptions)
                        : executeHttp(step, runtime, attemptOptions);
                    lastExecution = attemptDeadline
                        ? await raceWithSignal(execution, attemptDeadline.signal)
                        : await execution;
                    // 单次请求耗时（毫秒）：供 { target: "duration", lte: N } 等耗时断言使用；
                    // 适配器自带计时时不覆盖。计入 result.response，报告/工作台可见
                    if (lastExecution.response && typeof lastExecution.response === "object"
                        && lastExecution.response.durationMs === undefined) {
                        lastExecution.response.durationMs = now() - attemptStartedAt;
                    }
                    runtime.lastResponse = lastExecution.response;
                    // lastResponseBody 是解析后的响应体（双端一致）；原始文本见 response.bodyText
                    runtime.lastResponseBody = lastExecution.response.body;
                    const extractResult = applyExtract(step, lastExecution.response, runtime);
                    stepWarnings = [...missingTemplateVarWarnings(missingVars), ...extractResult.warnings];
                    assertions = buildAssertions(step, lastExecution.response, runtime, { stepName: step.name });
                    // required: true 且路径不存在 → 当前步骤失败
                    if (extractResult.failures.length) assertions.push(...extractResult.failures);
                } catch (error) {
                    // 取消始终立即终止，不参与重试（含等待间隔中的取消由 delay 拒绝）
                    if (options.signal?.aborted) throw error;
                    // 总时限到期中断在途执行：按 retryUntil 超时返回 TIMEOUT，而不是把
                    // 截止 signal 的 abort 当成普通网络错误继续重试。
                    if (attemptDeadline?.timedOut()
                        || (now() - retryStartTime) >= maxElapsedMs) {
                        throw retryTimeoutError(attempt);
                    }
                    const errorType = isTimeoutError(error) ? "timeout" : "error";
                    // 未开启对应 retryOn 或已是最后一次尝试：保持历史语义，直接交给外层 catch 归类
                    if (!retry || !retryOn.has(errorType) || attempt === totalAttempts) throw error;
                    attemptError = error;
                    attemptErrorType = errorType;
                    lastAttemptError = error;
                    // 失败尝试没有可信响应/断言结果：清掉上一轮值，避免 onAttempt 透出陈旧状态
                    stepWarnings = [];
                    assertions = [];
                } finally {
                    attemptDeadline?.dispose();
                }

                // 即使执行成功，只要实际耗时已达到总时限也不能通过（fetch/适配器可能
                // 忽略 abort 后才返回）；按总时限返回 TIMEOUT。
                if (attemptDeadline?.timedOut()
                    || (now() - retryStartTime) >= maxElapsedMs) {
                    throw retryTimeoutError(attempt);
                }

                const failedAssertion = attemptError
                    ? ""
                    : (assertions.find((item) => !item.passed)?.name || "");
                if (!attemptError
                    && (assertions.every((item) => item.passed)
                        || attempt === totalAttempts
                        || !retryOn.has("assertion"))) break;

                // 按当前尝试序号计算退避间隔（第 1 次重试 = intervalMs），并保留下限/封顶/总时限约束。
                const intervalMs = retryBackoffIntervalMs(retry, attempt, maxElapsedMs);
                // 总时限已到（仅新重试路径）：不再回调/等待，直接按 TO 结束。
                if (enforceAttemptDeadline && (now() - retryStartTime) >= maxElapsedMs) {
                    throw retryTimeoutError(attempt);
                }
                // 回调前估算实际等待，仅用于进度提示；回调结束后会重新按剩余额度计算。
                // 所有 retryUntil 路径都按剩余总时限截断等待：退避可能指数增长，
                // 不能再等完整 interval 后才在下一轮发现已超过 maxElapsedMs。
                const remainingForWait = Math.max(0, maxElapsedMs - (now() - retryStartTime));
                const waitBeforeCallback = Math.max(0, Math.min(intervalMs, remainingForWait));
                const attemptCallback = runOptions.onAttempt ?? engineOptions.onAttempt;
                if (attemptCallback) {
                    const callbackInfo = {
                        step,
                        attempt,
                        totalAttempts,
                        intervalMs: waitBeforeCallback,
                        status: attemptError ? null : (lastExecution.response?.status ?? null),
                        failedAssertion,
                        errorType: attemptErrorType,
                        errorMessage: attemptError ? describeError(attemptError) : ""
                    };
                    // 异步 onAttempt 同样受总时限约束：回调挂起/耗时超限时不能拖过 maxElapsedMs。
                    // 包一层 Promise 把同步抛错也纳入竞速；竞速后重新检查是否已到期。
                    const callbackPromise = Promise.resolve().then(() => attemptCallback(callbackInfo));
                    if (enforceAttemptDeadline) {
                        const callbackRemainingMs = maxElapsedMs - (now() - retryStartTime);
                        if (callbackRemainingMs <= 0) throw retryTimeoutError(attempt);
                        const callbackDeadline = createRequestSignal(options.signal, callbackRemainingMs);
                        try {
                            await raceWithSignal(callbackPromise, callbackDeadline.signal);
                        } catch (error) {
                            if (options.signal?.aborted) throw error;
                            if (callbackDeadline.timedOut()
                                || (now() - retryStartTime) >= maxElapsedMs) {
                                throw retryTimeoutError(attempt);
                            }
                            throw error;
                        } finally {
                            callbackDeadline.dispose();
                        }
                    } else {
                        await callbackPromise;
                    }
                }
                // 回调可能已消耗掉剩余额度：重新计算等待时长，到期就直接 TO（仅新重试路径）。
                if (enforceAttemptDeadline && (now() - retryStartTime) >= maxElapsedMs) {
                    throw retryTimeoutError(attempt);
                }
                // 等待时长不得超过 maxElapsedMs 剩余额度：否则总时限已到仍会白等完整
                // interval（例如 maxElapsedMs=50ms、intervalMs=10000ms 时多等 10 秒）。
                // 仅新重试路径：等待被总时限截断时，等满剩余额度即视为到时，直接返回 TIMEOUT。
                // 不能只依赖下一轮顶部按 >= 判定——定时器可能提早几毫秒触发，届时会凭空
                // 多发起一次注定无法在总时限内完成的尝试（并多发一次 onAttempt）。
                const remainingBeforeWait = maxElapsedMs - (now() - retryStartTime);
                const waitMs = Math.max(0, Math.min(intervalMs, remainingBeforeWait));
                const waitConsumesDeadline = enforceAttemptDeadline && intervalMs >= remainingBeforeWait;
                // error/timeout 重试额外透出 errorType/errorMessage，便于显示「连接失败」。
                await delay(waitMs, options.signal);
                if (waitConsumesDeadline) throw retryTimeoutError(attempt);
            }
            const failed = assertions.find((item) => !item.passed);
            return {
                name: step.name || "未命名步骤",
                method: lastExecution.method,
                path: lastExecution.path,
                status: lastExecution.response.status,
                duration: now() - startedAt,
                passed: !failed,
                always: step.always === true,
                error: failed?.name || "",
                warnings: stepWarnings,
                assertions,
                request: lastExecution.request,
                response: lastExecution.response
            };
        } catch (error) {
            // 失败语义对齐：结构化判别取消/超时，不再依赖匹配本地化错误文案
            const context = error?.scenarioContext || null;
            const cancelled = Boolean(options.signal?.aborted);
            const timedOut = !cancelled && Boolean(error?.scenarioTimedOut || context?.timedOut);
            // fetch 的 TypeError("fetch failed") 把真实原因收在 error.cause
            // （ENOTFOUND/ECONNREFUSED/证书错误等）——透出 cause 让 CI 日志直接可定位；
            // cause 文本已被包装进 message（如 AdapterExecutionError）时不重复拼接
            const causeDetail = error?.cause
                ? (error.cause.code || error.cause.message || String(error.cause))
                : "";
            const causeText = causeDetail && !String(error?.message || "").includes(causeDetail)
                ? `（${causeDetail}）`
                : "";
            const errorMessage = cancelled
                ? "用户已取消执行"
                : (timedOut ? (error?.message?.includes("超时") ? error.message : (context?.timeoutMs ? timeoutErrorMessage(context.timeoutMs) : "请求超时")) : `${error?.message || "请求执行失败"}${causeText}`);
            const method = (context && context.method)
                || String(step.method || (step.request && step.request.method) || "GET").toUpperCase();
            const path = (context && context.path) || resolveString(step.path || "", runtime);
            // 大小上限错误以结构化字段随结果透出（CLI/工作台可直接读取，无需解析本地化文案）
            const responseTooLarge = error?.responseTooLarge || null;
            const uploadTooLarge = error?.uploadTooLarge || null;
            const errorCode = responseTooLarge ? "responseTooLarge" : (uploadTooLarge ? "uploadTooLarge" : "");
            return {
                name: step.name || "未命名步骤",
                method,
                path,
                status: cancelled ? "CANCELLED" : (timedOut ? "TIMEOUT" : "ERROR"),
                duration: now() - startedAt,
                passed: false,
                always: step.always === true,
                cancelled,
                timedOut,
                errorCode,
                ...(responseTooLarge ? { responseTooLarge } : {}),
                ...(uploadTooLarge ? { uploadTooLarge } : {}),
                error: errorMessage,
                warnings: [],
                assertions: [{ name: cancelled ? "执行未取消" : (timedOut ? "请求未超时" : "请求执行成功"), passed: false, actual: errorMessage, expected: "无异常" }],
                request: (context && context.request) || null,
                response: null
            };
        }
    }

    async function runScenario(input, runOptions = {}) {
        const scenario = defineScenario(input);
        const config = runOptions.config || engineOptions.config || {};
        const runtime = createRuntime(scenario, {
            config,
            vars: { ...(engineOptions.vars || {}), ...(runOptions.vars || {}) },
            environmentVariables: runOptions.environmentVariables || engineOptions.environmentVariables,
            // suite（别名 suiteVars）：runOptions 显式传入优先，未传时回落引擎级默认
            suite: runOptions.suite !== undefined ? runOptions.suite
                : (runOptions.suiteVars !== undefined ? runOptions.suiteVars
                    : (engineOptions.suite !== undefined ? engineOptions.suite : engineOptions.suiteVars)),
            // 单次运行显式覆盖优先于引擎级默认；?? 保留 now: 0 这类合法固定值
            now: runOptions.now ?? engineOptions.now,
            clock: runOptions.clock ?? engineOptions.clock
        });
        const results = [];
        // failurePolicy:stop 后只继续执行 always 步骤（#56）；用户取消时不补跑清理
        let halted = false;
        for (let index = 0; index < scenario.steps.length; index += 1) {
            const step = scenario.steps[index];
            if (halted && step.always !== true) {
                // 已取消时不再补跑任何步骤（包括 always）：取消语义优先
                if (runOptions.signal?.aborted) break;
                const skipped = {
                    name: step.name || "未命名步骤",
                    method: "SKIP",
                    path: "",
                    status: "SKIPPED",
                    duration: 0,
                    passed: true,
                    skipped: true,
                    error: "",
                    warnings: ["前置步骤失败（failurePolicy: stop），非 always 步骤未执行"],
                    assertions: [],
                    request: null,
                    response: null,
                    stepNo: index + 1
                };
                results.push(skipped);
                try {
                    await (runOptions.onStep ?? engineOptions.onStep)?.(skipped, index, runtime);
                } catch (hookError) {
                    skipped.passed = false;
                    skipped.skipped = false;
                    skipped.status = "ERROR";
                    skipped.error = `onStep 回调抛错: ${hookError?.message || hookError}`;
                }
                continue;
            }
            const result = await runStep(step, runtime, { ...runOptions, config });
            result.stepNo = index + 1;
            results.push(result);
            // onStep 支持引擎级默认（与 runStep 内 onAttempt 的 {...engineOptions, ...runOptions} 合并对齐）。
            // 回调抛错不可向上抛——否则 runScenario 整体 reject、调用方拿不到任何 report；
            // 与 onAttempt 同口径降级为该步骤 ERROR（fail-loud，不静默吞掉回调 bug）
            try {
                await (runOptions.onStep ?? engineOptions.onStep)?.(result, index, runtime);
            } catch (hookError) {
                const message = `onStep 回调抛错: ${hookError?.message || hookError}`;
                result.passed = false;
                // 回调异常使该步骤实际产生了失败结果：skipped 必须清掉——
                // 否则 skipped+passed:false 的步骤既不计 failed 也不计 passedSteps，
                // 场景会报 SKIPPED/PASSED 而 results 里躺着 ERROR 行（残留假绿）
                result.skipped = false;
                result.status = "ERROR";
                result.error = message;
                result.assertions.push({ name: "onStep 回调无异常", passed: false, actual: escapeInlineText(hookError?.message || hookError), expected: "无异常" });
            }
            if (!result.passed && scenario.failurePolicy !== "continue") halted = true;
            if (runOptions.signal?.aborted) break;
        }
        // SKIP 可观测性：skipped 优先于 passed，绝不把 SKIP 计入 passedSteps/executed
        const skipped = results.filter((item) => item.skipped).length;
        const executed = results.length - skipped;
        const failed = results.filter((item) => !item.skipped && !item.passed).length;
        const passedSteps = results.filter((item) => !item.skipped && item.passed).length;
        // 取消单列 CANCELLED：任一步骤被取消即判 CANCELLED，或 signal 中止且未执行到位（步骤间取消）。
        // 最后一步执行中被取消时 results 已满员，仅看长度会误判 FAILED——与浏览器 buildOverallReport 对齐
        const cancelled = results.some((item) => item.cancelled)
            || (Boolean(runOptions.signal?.aborted) && results.length < scenario.steps.length);
        const status = cancelled ? "CANCELLED"
            : failed > 0 ? "FAILED"
            : (executed === 0 ? "SKIPPED" : "PASSED");
        return {
            scenarioName: scenario.name,
            passed: failed === 0 && results.length === scenario.steps.length,
            status,
            planned: scenario.steps.length,
            executed,
            passedSteps,
            failed,
            skipped,
            results,
            // 取消导致未进入循环的剩余步骤（供 JUnit/报告标注）
            unexecuted: scenario.steps.slice(results.length).map((step) => step.name || "未命名步骤"),
            vars: runtime.vars,
            // 报告保留本次场景结束时的 suite 快照；共享对象继续被后续场景使用
            // suiteVars 为 v16 兼容别名，与 suite 同内容
            suite: { ...(runtime.suite || runtime.suiteVars || {}) },
            suiteVars: { ...(runtime.suite || runtime.suiteVars || {}) }
        };
    }

    return { runStep, runScenario, createRuntime };
}

export async function runScenario(scenario, options = {}) {
    return createEngine(options).runScenario(scenario, options);
}
