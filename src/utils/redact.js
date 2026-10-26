// 报告/日志脱敏（无 I/O）：敏感名判定与 maskSecret 统一来自 core.js，CLI、工作台与
// 编程接口的诊断输出共用同一口径。只在「输出视图」上脱敏，不改写引擎返回的原始结果，
// 避免丢失本地调试所需的原始值。
import { isPlainObject, isSecretName, maskSecret } from "../core.js";
import { safeDecodeComponent } from "./safe-decode.js";

// 短密钥（如 token: "t"）做整串包含替换会把报告中所有字母 t 打码，损失可读性。
// 短值仍按敏感键名整值脱敏；只有长度达到该阈值才做任意位置的子串替换。
const SUBSTRING_REDACT_MIN_LENGTH = 6;

// 已脱敏的报告对象：buildOverallReport 先脱敏，buildMarkdownReport 再调用时直接复用，
// 避免把 "abcd...wxyz" 这类脱敏形态当成新密钥二次折叠成 "***"。
const sanitizedReports = new WeakSet();

function addSecret(target, value) {
    if (value === undefined || value === null || value === "") return;
    target.add(String(value));
}

function collectLeafSecrets(value, target, seen = new Set()) {
    if (value === undefined || value === null) return;
    if (typeof value !== "object") {
        addSecret(target, value);
        return;
    }
    if (seen.has(value)) return;
    seen.add(value);
    if (Array.isArray(value)) {
        for (const item of value) collectLeafSecrets(item, target, seen);
        return;
    }
    for (const item of Object.values(value)) collectLeafSecrets(item, target, seen);
}

// 收集敏感变量/敏感字段的值：键名命中 SECRET_VAR_PATTERN 时，其整棵子树的值都视为密钥。
// 这些值用于识别「断言期望值来自敏感变量」「响应体回显了同一密钥」等没有键名上下文的回显。
export function collectSecretValues(source, target = new Set()) {
    const seen = new Set();
    const visit = (value, key, inheritedSensitive) => {
        if (value === undefined || value === null) return;
        const sensitive = inheritedSensitive || (key !== "" && isSecretName(key));
        if (sensitive) {
            collectLeafSecrets(value, target);
            return;
        }
        if (typeof value !== "object") return;
        if (seen.has(value)) return;
        seen.add(value);
        if (Array.isArray(value)) {
            for (const item of value) visit(item, "", false);
            return;
        }
        for (const [childKey, item] of Object.entries(value)) visit(item, childKey, false);
    };
    visit(source, "", false);
    return target;
}

// URL query 中的敏感键（如 globals query token）：值不在 vars 中时也要能按值脱敏。
function collectQuerySecrets(url, target) {
    if (typeof url !== "string") return;
    const fragmentIndex = url.indexOf("#");
    const withoutFragment = fragmentIndex < 0 ? url : url.slice(0, fragmentIndex);
    const queryIndex = withoutFragment.indexOf("?");
    if (queryIndex < 0) return;
    for (const pair of withoutFragment.slice(queryIndex + 1).split("&")) {
        if (!pair) continue;
        const separator = pair.indexOf("=");
        if (separator < 0) continue;
        const key = safeDecodeComponent(pair.slice(0, separator));
        if (!key || !isSecretName(key)) continue;
        const rawValue = pair.slice(separator + 1);
        // URL 中的值可能已 percent-encode：同时收集原始片段与解码值，报告路径与错误消息都能命中
        addSecret(target, rawValue);
        addSecret(target, safeDecodeComponent(rawValue));
    }
}

function collectReportQuerySecrets(report, target) {
    const reports = Array.isArray(report?.scenarios) ? report.scenarios : [report];
    for (const item of reports) {
        for (const result of item?.results || []) collectQuerySecrets(result?.path, target);
    }
}

function redactText(text, secrets) {
    if (!text || !secrets.size) return text;
    let result = text;
    // 长值优先替换：避免短值先命中长密钥的一部分后留下残余片段
    const ordered = [...secrets].filter(Boolean).sort((left, right) => right.length - left.length);
    for (const secret of ordered) {
        if (result === secret) return maskSecret(secret);
        if (secret.length < SUBSTRING_REDACT_MIN_LENGTH || !result.includes(secret)) continue;
        result = result.split(secret).join(maskSecret(secret));
    }
    return result;
}

function sanitizeValue(value, secrets, key, inheritedSensitive, seen) {
    if (value === undefined || value === null) return value;
    const sensitive = inheritedSensitive || (key !== "" && isSecretName(key));
    const type = typeof value;
    if (type === "string") return sensitive ? maskSecret(value) : redactText(value, secrets);
    if (type === "number" || type === "bigint") {
        const text = String(value);
        return sensitive || secrets.has(text) ? maskSecret(text) : value;
    }
    if (type === "boolean") return sensitive ? maskSecret(value) : value;
    if (type !== "object") return value;
    if (!Array.isArray(value) && !isPlainObject(value)) return value;
    if (seen.has(value)) return seen.get(value);
    if (Array.isArray(value)) {
        const result = [];
        seen.set(value, result);
        for (const item of value) result.push(sanitizeValue(item, secrets, "", sensitive, seen));
        return result;
    }
    const result = {};
    seen.set(value, result);
    // 内部 Symbol 标记（如 SAVED_RESPONSE）不参与 JSON 输出，但 CLI 诊断需要据此
    // 区分真实落盘提示与业务字段巧合；克隆时原样保留
    for (const symbol of Object.getOwnPropertySymbols(value)) {
        const descriptor = Object.getOwnPropertyDescriptor(value, symbol);
        if (descriptor) Object.defineProperty(result, symbol, descriptor);
    }
    for (const [childKey, item] of Object.entries(value)) {
        // 用 defineProperty 写入：报告里若出现自有键 "__proto__"，直接赋值会改写原型链
        Object.defineProperty(result, childKey, {
            value: sanitizeValue(item, secrets, childKey, sensitive, seen),
            enumerable: true,
            writable: true,
            configurable: true
        });
    }
    return result;
}

// 任意输出值的脱敏副本；options.vars 传入运行时变量，options.extraValues 补充不在 vars 中的
// 密钥（如 config authorization）。options.collect=false 时仅用显式 secrets。
export function sanitizeSensitiveForOutput(value, options = {}) {
    const secrets = options.secrets instanceof Set ? new Set(options.secrets) : new Set();
    if (options.collect !== false) collectSecretValues(value, secrets);
    if (options.vars) collectSecretValues(options.vars, secrets);
    for (const extra of options.extraValues || []) addSecret(secrets, extra);
    return sanitizeValue(value, secrets, "", false, new WeakMap());
}

// runScenario 报告的输出副本：vars、断言 expected/actual/each detail、请求头/体、
// 响应头/体/bodyText、错误与路径中的敏感值统一脱敏；原始 report 不被修改。
export function sanitizeReportForOutput(report, options = {}) {
    if (report && typeof report === "object" && sanitizedReports.has(report)) return report;
    const secrets = new Set(options.secrets instanceof Set ? options.secrets : []);
    collectSecretValues(report, secrets);
    if (options.vars) collectSecretValues(options.vars, secrets);
    for (const extra of options.extraValues || []) addSecret(secrets, extra);
    collectReportQuerySecrets(report, secrets);
    const sanitized = sanitizeValue(report, secrets, "", false, new WeakMap());
    if (sanitized && typeof sanitized === "object") sanitizedReports.add(sanitized);
    return sanitized;
}
