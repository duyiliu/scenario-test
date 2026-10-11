import {
    applyExtract,
    assertNoReservedVars,
    assertNotReservedVar,
    buildAssertions,
    buildUrl,
    buildChinaIdNumber,
    buildUsccCode,
    clone,
    generateSignature,
    hasHeader,
    headersToObject,
    joinUrl,
    luhnCheckDigit,
    md5,
    parseBody,
    evaluateAssertion,
    pickWeightedIndex,
    resolve,
    resolveString,
    seedToIndex
} from "./core.js";
import { contract } from "./contract.js";
import { defineScenario, listAdapters } from "./registry.js";
import { validateAdapterResponse } from "./adapter-types.js";

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
        const timer = setTimeout(resolveDelay, milliseconds);
        if (signal) {
            signal.addEventListener("abort", () => {
                clearTimeout(timer);
                reject(abortReason(signal));
            }, { once: true });
        }
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

// idcard 未显式声明 regionCode 时使用的真实行政区划测试池（容量扩展用，均为真实存在的区县级编码）
const IDCARD_TEST_REGIONS = ["110101", "110105", "310101", "440103", "510107", "330102", "420102", "610103"];
// phone 未显式声明 prefix 时使用的测试号段池（均为三大运营商+虚商真实在用号段）
const PHONE_TEST_PREFIXES = ["138", "139", "150", "155", "158", "159", "176", "177", "185", "186", "187", "199"];
// uscc 主体标识码（9 位）的派生字符集：与 core 的 USCC_ALPHABET 保持一致
const USCC_ORG_ALPHABET = "0123456789ABCDEFGHJKLMNPQRTUWXY";

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

// timestamp 造数 offset 的单位 → 毫秒；只提供固定跨度单位，不引入月/年等日历单位（月末歧义）
const TIMESTAMP_OFFSET_UNITS = Object.freeze({ ms: 1, s: 1000, m: 60000, h: 3600000, d: 86400000, w: 604800000 });
// format 的合法形态：token（YYYY/MM/DD/HH/mm/ss）与任意非字母字符自由组合；
// 任何字母序列必须恰好构成合法 token——残缺/近似片段（"M"、"yyyy"、"dd"）整体拒绝而不是输出字面量
const TIMESTAMP_FORMAT_PATTERN = /^(?:YYYY|MM|DD|HH|mm|ss|[^A-Za-z])*$/;

function parseTimestampOffset(offset) {
    const match = /^([+-]?\d+)(ms|s|m|h|d|w)$/.exec(String(offset));
    if (!match) {
        throw new Error(`generatedVars timestamp 的 offset 必须形如 "-7d"/"+8d"/"30m"（数字+单位 ms/s/m/h/d/w）: ${offset}`);
    }
    return Number(match[1]) * TIMESTAMP_OFFSET_UNITS[match[2]];
}

// 枚举造数（可带权重）定义校验：values 非空数组、weights 缺省等权或与 values 等长的非负数字数组、
// 至少一个权重 > 0（全 0 会导致抽取退化到末位）；返回规范化后的 values/weights
function normalizeEnumDefinition(definition) {
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

// 按本地时间展开 format token（mm 为分钟、MM 为月份，大小写敏感）
function formatTimestamp(ms, format) {
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
        if (definition.type === "timestamp") {
            // 时间戳造数：offset 相对当前时间偏移（如 "-7d"/"+8d"）；unit 决定数值粒度
            // （ms 默认向后兼容 / s 秒级）；format（本地时间 token）输出字符串，与 unit 互斥。
            const base = Date.now() + (definition.offset == null ? 0 : parseTimestampOffset(definition.offset));
            if (definition.format != null) {
                if (definition.unit != null) {
                    throw new Error(`generatedVars timestamp 的 format 与 unit 互斥，只能声明其一: ${definition.name}`);
                }
                if (!/(?:YYYY|MM|DD|HH|mm|ss)/.test(definition.format) || !TIMESTAMP_FORMAT_PATTERN.test(definition.format)) {
                    throw new Error(`generatedVars timestamp 的 format 仅支持 YYYY/MM/DD/HH/mm/ss 的本地时间组合（如 YYYY-MM-DD HH:mm:ss）: ${definition.format}`);
                }
                vars[definition.name] = formatTimestamp(base, definition.format);
            } else if (definition.unit != null && definition.unit !== "ms") {
                if (definition.unit !== "s") {
                    throw new Error(`generatedVars timestamp 的 unit 只支持 ms（默认）/s: ${definition.unit}`);
                }
                vars[definition.name] = Math.floor(base / 1000);
            } else {
                vars[definition.name] = base;
            }
        } else if (definition.type === "uuid") {
            // 标准带连字符 UUID v4（uuidHex 为 32 位无连字符形式），适配以 UUID 为业务主键的接口
            if (!globalThis.crypto?.randomUUID) throw new Error("当前环境不支持 crypto.randomUUID");
            vars[definition.name] = globalThis.crypto.randomUUID();
        } else if (definition.type === "uuidHex") {
            if (!globalThis.crypto?.randomUUID) throw new Error("当前环境不支持 crypto.randomUUID");
            vars[definition.name] = globalThis.crypto.randomUUID().replace(/-/g, "");
        } else if (definition.type === "idcard") {
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
            let regionCode = definition.regionCode == null
                ? IDCARD_TEST_REGIONS[seedToIndex(identifiers.runId, IDCARD_TEST_REGIONS.length)]
                : String(definition.regionCode);
            if (!/^\d{6}$/.test(regionCode)) {
                throw new Error(`generatedVars idcard 的 regionCode 必须是 6 位数字: ${regionCode}`);
            }
            const seqBase = seedToIndex(`${identifiers.runId}|${definition.name}`, 500);
            vars[definition.name] = buildChinaIdNumber({
                regionCode,
                birthDate: definition.birthDate,
                sequence: seqBase * 2 + (gender === "MALE" ? 1 : 0)
            });
        } else if (definition.type === "luhn") {
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
                body += seedToIndex(`${identifiers.runId}|${definition.name}|${i}`, 10);
            }
            const first = `${prefix}${body}`;
            vars[definition.name] = `${first}${luhnCheckDigit(first)}`;
        } else if (definition.type === "phone") {
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
                tail += seedToIndex(`${identifiers.runId}|${definition.name}|${i}`, 10);
            }
            vars[definition.name] = `${prefix}${tail}`;
        } else if (definition.type === "uscc") {
            // 统一社会信用代码（GB 32100-2015，测试造数）：登记管理部门+机构类别固定 91（企业法人）；
            // regionCode 6 位行政区划（默认 110100），主体标识码 9 位由 runId+变量名逐位派生（31 字符集），
            // 校验位按 GB 32100 计算。
            const regionCode = definition.regionCode == null ? "110100" : String(definition.regionCode);
            if (!/^\d{6}$/.test(regionCode)) {
                throw new Error(`generatedVars uscc 的 regionCode 必须是 6 位数字: ${definition.regionCode}`);
            }
            let orgCode = "";
            for (let i = 0; i < 9; i += 1) {
                orgCode += USCC_ORG_ALPHABET[seedToIndex(`${identifiers.runId}|${definition.name}|${i}`, USCC_ORG_ALPHABET.length)];
            }
            vars[definition.name] = buildUsccCode({ categoryCode: "91", regionCode, orgCode });
        } else if (definition.type === "md5") {
            const source = (definition.parts || []).map((name) => vars[name] == null ? "" : String(vars[name])).join("");
            vars[definition.name] = md5(source);
        } else if (definition.type === "signature") {
            const params = Object.fromEntries(Object.entries(definition.params || {})
                .map(([key, variableName]) => [key, vars[variableName]]));
            // ✅ 从 vars 中获取密钥但不在错误消息中暴露
            const secret = vars[definition.secretVar || "apiSecret"];
            if (!secret) {
                throw new Error(`签名生成失败: 缺少密钥变量 vars.${definition.secretVar || "apiSecret"}`);
            }
            vars[definition.name] = generateSignature(params, secret);
        } else if (definition.type === "enum") {
            // 枚举造数（可带权重）：从 values 按 weights 抽取一个值。按 runId+变量名确定性派生
            // （轮内稳定、跨轮变化、双端一致），命中概率之比即权重之比。
            const { values, weights } = normalizeEnumDefinition(definition);
            vars[definition.name] = values[pickWeightedIndex(`${identifiers.runId}|${definition.name}`, weights)];
        } else {
            throw new Error(`不支持的 generatedVars 类型: ${definition.type}`);
        }
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
    if (step.adapter) return { name: step.adapter, adapter: adapters.get(step.adapter) };
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
    const request = resolve(clone(step.request || {}), runtime) || {};
    const method = String(step.method || request.method || "GET").toUpperCase();
    let requestPath = buildUrl(step.path || request.path || "", step.params || request.params, runtime);
    const headers = { ...(request.headers || {}) };
    const absoluteUrl = /^https?:\/\//i.test(requestPath);
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
        const queryPairs = [];
        for (const global of globals) {
            if (global.type !== "query" || existingKeys.has(global.name)) continue;
            queryPairs.push(`${encodeURIComponent(global.name)}=${encodeURIComponent(String(resolveString(global.value, runtime)))}`);
        }
        if (queryPairs.length) requestPath = `${requestPath}${queryIndex >= 0 ? "&" : "?"}${queryPairs.join("&")}`;
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
        super(message);
        this.name = "AdapterExecutionError";
        this.adapterName = adapterName;
        this.originalError = originalError;
        this.stepName = step?.name || "未命名步骤";
    }
}

async function executeAdapter(adapter, adapterName, step, runtime, options) {
    if (!adapter) throw new Error(`未注册步骤适配器: ${adapterName || "unknown"}`);

    let output;

    // 钩子协议：钩子收到的是步骤原始定义（未做 {{vars.*}} 替换）。
    // beforeExecute 对 step 的修改会随深拷贝进入 execute；execute 收到 resolve 后的独立副本，
    // 副本内的修改不会泄漏回原始 step 或后续步骤。
    try {
        // 前置钩子（step 为原始定义）
        if (typeof adapter.beforeExecute === "function") {
            await adapter.beforeExecute({ step, runtime, options });
        }

        // 执行主逻辑（step 为变量替换后的副本）
        output = await adapter.execute({ step: resolve(clone(step), runtime), runtime, options });

        // 后置钩子（step 为原始定义；返回值可覆盖 output）
        if (typeof adapter.afterExecute === "function") {
            output = await adapter.afterExecute({ step, runtime, options, output }) || output;
        }
    } catch (error) {
        // 错误钩子（step 为原始定义）
        if (typeof adapter.onError === "function") {
            try {
                await adapter.onError({ step, runtime, options, error });
            } catch (hookError) {
                console.warn(`适配器 ${adapterName} 错误钩子失败:`, hookError);
            }
        }
        throw new AdapterExecutionError(adapterName, error, step);
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
            const shouldRun = typeof step.when === "object"
                ? evaluateAssertion(step.when, { status: 0, headers: {}, body: null, bodyText: "" }, runtime, { stepName: step.name }).passed
                : Boolean(resolve(step.when, runtime));
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

                // ✅ 确保最小重试间隔
                const intervalMs = Math.max(100, Number(retry.intervalMs || 2000));
                // 重试进度回调：轮询步骤在间隔内长时间静默，CLI/工作台可据此
                // 输出「第 N/M 次未通过，X 后重试」避免日志看起来像挂死
                await options.onAttempt?.({
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
            const errorMessage = cancelled
                ? "用户已取消执行"
                : (timedOut ? (error?.message?.includes("超时") ? error.message : (context?.timeoutMs ? timeoutErrorMessage(context.timeoutMs) : "请求超时")) : (error?.message || "请求执行失败"));
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
            // onStep 支持引擎级默认（与 runStep 内 onAttempt 的 {...engineOptions, ...runOptions} 合并对齐）
            await (runOptions.onStep ?? engineOptions.onStep)?.(result, index, runtime);
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
