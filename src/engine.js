import {
    applyExtract,
    applyGeneratedVar,
    assertNoReservedVars,
    assertNotReservedVar,
    buildAssertions,
    buildUrl,
    hasHeader,
    headersToObject,
    isPlainObject,
    joinUrl,
    parseBody,
    evaluateWhen,
    appendGlobalQuery,
    normalizeByteLimit,
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
    const random = globalThis.crypto?.randomUUID
        ? globalThis.crypto.randomUUID().replace(/-/g, "").slice(0, 8)
        : Math.random().toString(16).slice(2, 10).padEnd(8, "0");
    return {
        runId: `${timestamp}-${random}`,
        runNo: `${timestamp.slice(-6)}-${random.slice(0, 4)}`
    };
}

// generatedVars 各类型造数实现收敛在 core.js（applyGeneratedVar），
// 与浏览器工作台共用同一实现——本文件只负责 vars 的组装顺序
function buildGeneratedVars(scenario, baseVars, environmentVariables, options = {}) {
    const identifiers = createRunIdentifiers();
    // 保留变量冲突在使用前尽早报错：config/options vars 不得声明 runId/runNo
    assertNoReservedVars(scenario.vars, "场景 vars");
    assertNoReservedVars(baseVars, "配置/选项 vars");
    const vars = { ...(scenario.vars || {}), ...(baseVars || {}), ...identifiers };

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
        applyGeneratedVar(definition, vars, identifiers);
    }
    // vars 由引擎统一构建，执行期 extract 是唯一写入方；不做冻结，场景/插件不应直接修改
    return vars;
}

// 环境级变量：显式传入 environment 对象/环境 key 时按 key 从 config.envs 选取；
// 未显式指定时回落到 config.defaultEnvKey。env.vars 只作为 vars 的一层，
// 调用方显式传入的 vars（CLI --vars 已合并）仍然优先。
function selectedEnvironmentVars(config, options = {}) {
    const explicit = options.environment ?? options.env ?? options.environmentKey;
    let environment = null;
    if (isPlainObject(explicit)) {
        environment = explicit;
    } else {
        const key = typeof explicit === "string" && explicit ? explicit : config.defaultEnvKey;
        environment = (Array.isArray(config.envs) ? config.envs : []).find((item) => item && item.key === key) || null;
    }
    return isPlainObject(environment?.vars) ? environment.vars : {};
}

export function createRuntime(scenario, options = {}) {
    const config = options.config || {};
    return {
        vars: buildGeneratedVars(
            scenario,
            { ...(config.vars || {}), ...selectedEnvironmentVars(config, options), ...(options.vars || {}) },
            options.environmentVariables || {}
        ),
        lastResponse: null,
        lastResponseBody: null
    };
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

async function readResponse(response, step, io, runtime, signal, options = {}) {
    const headers = headersToObject(response.headers);
    const contentType = String(headers["content-type"] || "");
    const maxResponseBytes = resolveMaxResponseBytes(options);
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
            return { status: response.status, headers, body: saved, bodyText: null };
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
            return { status: response.status, headers, body: saved, bodyText: null };
        }
    }
    const chunks = await readBodyChunks(response, signal, maxResponseBytes);
    const decoder = decoderForContentType(contentType);
    const bodyText = chunks.map((chunk) => decoder.decode(chunk, { stream: true })).join("") + decoder.decode();
    return { status: response.status, headers, body: parseBody(bodyText, contentType), bodyText };
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
        const response = await options.fetch(joinUrl(options.baseUrl, requestPath), fetchOptions);
        const responseData = await readResponse(response, step, options.io, runtime, requestSignal.signal, options);
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
                return {
                    name: step.name || "未命名步骤",
                    method: "SKIP",
                    path: resolveString(step.path || "", runtime),
                    status: "SKIPPED",
                    duration: now() - startedAt,
                    passed: true,
                    skipped: true,
                    error: "",
                    warnings: [],
                    assertions: [],
                    request: null,
                    response: null
                };
            }
        }
        let lastExecution;
        let assertions = [];
        let stepWarnings = [];
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
        // 只有显式启用 error/timeout 重试的路径才把 maxElapsedMs 扩展到在途执行、
        // 异步回调与迟到响应；默认/仅 assertion 路径保持旧语义（只在尝试之间检查总时限）。
        const enforceAttemptDeadline = retryOn.has("error") || retryOn.has("timeout");
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
            for (let attempt = 1; attempt <= totalAttempts; attempt += 1) {
                if (options.signal?.aborted) throw abortReason(options.signal);

                // ✅ 检查总耗时（同样标记为结构化超时，报告状态为 TIMEOUT 而非 ERROR）
                // 默认/仅 assertion 路径保持旧实现严格大于（耗时恰好等于 maxElapsedMs 仍发起下一次尝试）；
                // 显式 error/timeout 重试路径在到达总时限（>=）时立即结束。
                if (retry) {
                    const elapsedMs = now() - retryStartTime;
                    const expired = enforceAttemptDeadline
                        ? elapsedMs >= maxElapsedMs
                        : elapsedMs > maxElapsedMs;
                    if (expired) throw retryTimeoutError(attempt - 1);
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
                    const selection = chooseAdapter(step, adapters);
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
                    stepWarnings = extractResult.warnings;
                    assertions = buildAssertions(step, lastExecution.response, runtime, { stepName: step.name });
                    // required: true 且路径不存在 → 当前步骤失败
                    if (extractResult.failures.length) assertions.push(...extractResult.failures);
                } catch (error) {
                    // 取消始终立即终止，不参与重试（含等待间隔中的取消由 delay 拒绝）
                    if (options.signal?.aborted) throw error;
                    // 总时限到期中断在途执行：按 retryUntil 超时返回 TIMEOUT，而不是把
                    // 截止 signal 的 abort 当成普通网络错误继续重试。
                    if (enforceAttemptDeadline
                        && (attemptDeadline?.timedOut()
                            || (now() - retryStartTime) >= maxElapsedMs)) {
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
                if (enforceAttemptDeadline && (attemptDeadline?.timedOut()
                    || (now() - retryStartTime) >= maxElapsedMs)) {
                    throw retryTimeoutError(attempt);
                }

                const failedAssertion = attemptError
                    ? ""
                    : (assertions.find((item) => !item.passed)?.name || "");
                if (!attemptError
                    && (assertions.every((item) => item.passed)
                        || attempt === totalAttempts
                        || !retryOn.has("assertion"))) break;

                // ✅ 确保最小重试间隔：显式小值（含 0）钳到下限 100ms 防高频轮询。
                // 用 isFinite 判定而非 ||——显式 0 表示「按最小间隔执行」，
                // 不应被 falsy 静默吞回默认 2000ms（定义期口径：≥0 合法）
                const rawIntervalMs = Number(retry.intervalMs);
                const intervalMs = Math.max(100, Number.isFinite(rawIntervalMs) ? rawIntervalMs : 2000);
                // 总时限已到（仅新重试路径）：不再回调/等待，直接按 TO 结束。
                if (enforceAttemptDeadline && (now() - retryStartTime) >= maxElapsedMs) {
                    throw retryTimeoutError(attempt);
                }
                // 回调前估算实际等待，仅用于进度提示；回调结束后会重新按剩余额度计算。
                const remainingForWait = enforceAttemptDeadline
                    ? Math.max(0, maxElapsedMs - (now() - retryStartTime))
                    : Infinity;
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
                // 截断后下一轮顶部按 >= 判定并返回 TIMEOUT，实际耗时贴近配置总时限。
                const waitMs = enforceAttemptDeadline
                    ? Math.max(0, Math.min(intervalMs, maxElapsedMs - (now() - retryStartTime)))
                    : intervalMs;
                // error/timeout 重试额外透出 errorType/errorMessage，便于显示「连接失败」。
                await delay(waitMs, options.signal);
            }
            const failed = assertions.find((item) => !item.passed);
            return {
                name: step.name || "未命名步骤",
                method: lastExecution.method,
                path: lastExecution.path,
                status: lastExecution.response.status,
                duration: now() - startedAt,
                passed: !failed,
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
            environment: runOptions.environment ?? runOptions.env ?? engineOptions.environment ?? engineOptions.env,
            vars: { ...(engineOptions.vars || {}), ...(runOptions.vars || {}) },
            environmentVariables: runOptions.environmentVariables || engineOptions.environmentVariables
        });
        const results = [];
        for (let index = 0; index < scenario.steps.length; index += 1) {
            const result = await runStep(scenario.steps[index], runtime, { ...runOptions, config });
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
            if (!result.passed && scenario.failurePolicy !== "continue") break;
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
            vars: runtime.vars
        };
    }

    return { runStep, runScenario, createRuntime };
}

export async function runScenario(scenario, options = {}) {
    return createEngine(options).runScenario(scenario, options);
}
