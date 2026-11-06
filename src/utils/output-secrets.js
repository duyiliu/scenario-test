import { isSecretVarName, redactSecrets } from '../core.js';

// 从请求头和 JSON 请求体收集命中既有名称规则的字符串，供输出层脱敏。
export function collectRequestSecretValues(request) {
    const found = new Set();
    const seen = new WeakSet();
    function visit(value, sensitive = false) {
        if (typeof value === 'string') { if (sensitive && value) found.add(value); return; }
        if (!value || typeof value !== 'object' || seen.has(value)) return;
        seen.add(value);
        for (const [key, child] of Object.entries(value)) visit(child, sensitive || isSecretVarName(key));
    }
    visit(request?.headers);
    let body = request?.body;
    if (typeof body === 'string') {
        try { body = JSON.parse(body); } catch { /* 非 JSON 请求体不猜测字段含义 */ }
    }
    visit(body);
    return [...found];
}

// 回显可能把 JSON 再包在字符串里；先处理更长的转义形式，避免部分替换。
export function outputSecretVariants(values) {
    const result = new Set();
    for (const value of values || []) {
        if (typeof value !== 'string' || !value) continue;
        let variant = value;
        for (let depth = 0; depth < 4; depth++) {
            result.add(variant);
            variant = JSON.stringify(variant).slice(1, -1);
        }
    }
    return [...result].sort((a, b) => b.length - a.length);
}

// 仅对已知请求敏感值做替换；不按响应字段名扩大过滤范围。
export function redactKnownOutput(value, values) {
    const secrets = outputSecretVariants(values);
    const seen = new WeakMap();
    function copy(item) {
        if (typeof item === 'string') return redactSecrets(item, secrets);
        if (!item || typeof item !== 'object') return item;
        if (seen.has(item)) return seen.get(item);
        const result = Array.isArray(item) ? [] : {};
        seen.set(item, result);
        for (const key of Object.keys(item)) result[key] = copy(item[key]);
        return result;
    }
    return copy(value);
}
