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
    queryPairs,
    resolve,
    resolveClone,
    resolveString
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

function createRequestSignal(parentSignal, timeoutMs) {
    const controller = new AbortController();
    // 超时状态由 signal 内部维护，不依赖浏览器是否把 abort reason 传播为 fetch 拒绝原因
    let timedOut = false;
    const abort = () => controller.abort(abortReason(parentSignal));
    if (parentSignal?.aborted) abort();
    else parentSignal?.addEventListener("abort", abort, { once: true });
    const timer = timeoutMs > 0
        ? setTimeout(() => { timedOut = true; controller.abort(createTimeoutError(timeoutMs)); }, timeoutMs)
        : null;
    return {
        signal: controller.signal,
        timedOut() {
            return timedOut;
        },
        dispose() {
            if (timer) clearTimeout(timer);
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
        vars[name] = value;
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

export function createRuntime(scenario, options = {}) {
    const config = options.config || {};
    return {
        vars: buildGeneratedVars(
            scenario,
            { ...(config.vars || {}), ...(options.vars || {}) },
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
function readBodyChunks(response, signal) {
    if (!response.body) return Promise.resolve([]);
    const reader = response.body.getReader();
    const chunks = [];
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

// 按 content-type 的 charset 构造解码器（如 GBK 老系统）；缺省或非法/不支持的 charset 回退 UTF-8
function decoderForContentType(contentType) {
    const match = /charset\s*=\s*"?([^;"\s]+)"?/i.exec(String(contentType || ""));
    if (!match) return new TextDecoder();
    try { return new TextDecoder(match[1]); } catch { return new TextDecoder(); }
}

async function readResponse(response, step, io, runtime, signal) {
    const headers = headersToObject(response.headers);
    const contentType = String(headers["content-type"] || "");
    const chunks = await readBodyChunks(response, signal);
    if (step.saveResponseAs && io?.saveResponse) {
        const data = new Uint8Array(chunks.reduce((total, chunk) => total + chunk.length, 0));
        let offset = 0;
        for (const chunk of chunks) { data.set(chunk, offset); offset += chunk.length; }
        const saved = await io.saveResponse(resolveString(step.saveResponseAs, runtime), data, { contentType, headers });
        return { status: response.status, headers, body: saved, bodyText: null };
    }
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
        // query：追加 URL 参数，跳过步骤参数已存在的 key
        const existingKeys = new Set();
        const queryIndex = requestPath.indexOf("?");
        if (queryIndex >= 0) {
            for (const pair of requestPath.slice(queryIndex + 1).split("&")) {
                const key = pair.split("=")[0];
                if (key) existingKeys.add(decodeURIComponent(key));
            }
        }
        const queryParts = [];
        for (const global of globals) {
            if (global.type !== "query" || existingKeys.has(global.name)) continue;
            // 数组值（含模板整体解析出的数组）按重复 key 展开，与 buildUrl 同一实现
            queryParts.push(...queryPairs(global.name, resolve(global.value, runtime)));
        }
        if (queryParts.length) requestPath = `${requestPath}${queryIndex >= 0 ? "&" : "?"}${queryParts.join("&")}`;
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
        const upload = await options.io.createUploadBody(resolve(request.fileUpload, runtime), runtime);
        fetchOptions.body = upload.body;
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
    const rawTimeoutMs = Number(step.timeoutMs || request.timeoutMs || options.requestTimeoutMs || 30000);
    // 非法/非正超时统一钳制为默认值，避免负数/Infinity/字符串"0"导致永不超时
    const timeoutMs = Number.isFinite(rawTimeoutMs) && rawTimeoutMs > 0 ? rawTimeoutMs : 30000;
    const requestSignal = createRequestSignal(options.signal, timeoutMs);
    fetchOptions.signal = requestSignal.signal;
    try {
        const response = await options.fetch(joinUrl(options.baseUrl, requestPath), fetchOptions);
        const responseData = await readResponse(response, step, options.io, runtime, requestSignal.signal);
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
        const message = `适配器 ${adapterName} 执行失败: ${originalError.message}`;
        // cause 保留原始错误链；结构化标记透传——适配器内部超时/请求现场被包装后
        // 仍按 TIMEOUT 归类并透出 method/path/request，不再降级为无上下文的 ERROR
        super(message, { cause: originalError });
        this.name = "AdapterExecutionError";
        this.adapterName = adapterName;
        this.originalError = originalError;
        this.stepName = step?.name || "未命名步骤";
        if (originalError?.scenarioTimedOut) this.scenarioTimedOut = true;
        if (originalError?.scenarioContext) this.scenarioContext = originalError.scenarioContext;
    }
}

// 适配器执行超时包装：createRequestSignal 的 signal 只对「尊重 signal 的适配器」有效，
// 适配器可能完全不看 signal（sleep/阻塞 IO）——必须同时与 signal 竞速，超时即返回，
// 否则挂死的适配器会让整个场景永久卡住（retryUntil.maxElapsedMs 只在 attempt 之间检查）。
function raceWithSignal(promise, signal) {
    if (!signal) return promise;
    if (signal.aborted) return Promise.reject(abortReason(signal));
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
    const request = isPlainObject(step.request) ? step.request : {};
    // 与 executeHttp 同一超时链路口径：step.timeoutMs → request.timeoutMs → 配置默认值；
    // 非法/非正值钳制为 30000，避免 "0"/负数/Infinity 导致永不超时
    const rawTimeoutMs = Number(step.timeoutMs || request.timeoutMs || options.requestTimeoutMs || 30000);
    const timeoutMs = Number.isFinite(rawTimeoutMs) && rawTimeoutMs > 0 ? rawTimeoutMs : 30000;
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
        // ✅ 添加重试超时保护
        const retryStartTime = now();
        const maxElapsedMs = retry?.maxElapsedMs || 300000; // 默认 5 分钟
        try {
            for (let attempt = 1; attempt <= totalAttempts; attempt += 1) {
                if (options.signal?.aborted) throw abortReason(options.signal);

                // ✅ 检查总耗时（同样标记为结构化超时，报告状态为 TIMEOUT 而非 ERROR）
                if (retry && (now() - retryStartTime) > maxElapsedMs) {
                    throw createTimeoutError(
                        maxElapsedMs,
                        `重试超时: 已尝试 ${attempt - 1} 次，耗时超过 ${maxElapsedMs}ms\n` +
                        `提示: 考虑调整 retryUntil.maxElapsedMs 或检查接口响应`
                    );
                }

                const selection = chooseAdapter(step, adapters);
                const attemptStartedAt = now();
                lastExecution = selection
                    ? await executeAdapter(selection.adapter, selection.name, step, runtime, options)
                    : await executeHttp(step, runtime, options);
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
                if (assertions.every((item) => item.passed) || attempt === totalAttempts) break;

                // ✅ 确保最小重试间隔：显式小值（含 0）钳到下限 100ms 防高频轮询。
                // 用 isFinite 判定而非 ||——显式 0 表示「按最小间隔执行」，
                // 不应被 falsy 静默吞回默认 2000ms（定义期口径：≥0 合法）
                const rawIntervalMs = Number(retry.intervalMs);
                const intervalMs = Math.max(100, Number.isFinite(rawIntervalMs) ? rawIntervalMs : 2000);
                // 重试进度回调：轮询步骤在间隔内长时间静默，CLI/工作台可据此
                // 输出「第 N/M 次未通过，X 后重试」避免日志看起来像挂死。
                // ?? 与 onStep 合并口径一致：runOptions 显式传 undefined 视为未提供、回落引擎级
                await (runOptions.onAttempt ?? engineOptions.onAttempt)?.({
                    step,
                    attempt,
                    totalAttempts,
                    intervalMs,
                    status: lastExecution.response?.status ?? null,
                    failedAssertion: assertions.find((item) => !item.passed)?.name || ""
                });
                await delay(intervalMs, options.signal);
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
            return {
                name: step.name || "未命名步骤",
                method,
                path,
                status: cancelled ? "CANCELLED" : (timedOut ? "TIMEOUT" : "ERROR"),
                duration: now() - startedAt,
                passed: false,
                cancelled,
                timedOut,
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
