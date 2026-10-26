import * as core from "../../core.js";

// POSIX shell 单引号转义：单引号内不做 $VAR/$(...)/反引号展开，值中的 ' 用 '\'' 收尾再续开。
// 复制出的命令与工作台实际发送值一致，也避免变量值借复制粘贴注入命令。
export function shellSingleQuote(value) {
    return "'" + String(value).replace(/'/g, "'\\''") + "'";
}

// 生成 curl 时合并代理路由头：requestPath 必须传模板解析后的真实路径——
// 模板可能把看起来相对的 stepPath 解析成外部绝对 URL，此时不能附带本地路由头。
// 同名头按 HTTP 语义大小写不敏感覆盖，避免生成两个同名头导致 serve 无法识别环境。
export function applyCurlProxyHeaders(headers, requestPath, proxyHeaders) {
    if (!proxyHeaders) return headers;
    if (/^(?:https?:)?\/\//i.test(String(requestPath || ''))) return headers;
    Object.keys(proxyHeaders).forEach(function (key) {
        core.setHeaderValue(headers, key, proxyHeaders[key]);
    });
    return headers;
}

// 生成步骤的 cURL 预览。与执行期共用 core.buildUrl / core.appendGlobalQuery，
// 保证 globals query 的 key 去重与 fragment 位置（参数拼在 # 之前）两边一致。
export function buildStepCurl(step, options) {
    if (!step) return '';
    var opts = options || {};
    var runtime = { vars: opts.vars || {} };
    var globals = opts.globals || [];
    var method = String(step.method || (step.request && step.request.method) || 'GET').toUpperCase();
    var stepPath = step.path || (step.request && step.request.path) || '';
    var stepParams = step.params || (step.request && step.request.params);
    var requestPath = core.buildUrl(stepPath, stepParams, runtime);
    // 与引擎 executeHttp 同一判断：绝对/协议相对 URL 默认不注入环境 globals，
    // 仅步骤显式声明 request.useEnvironmentAuthorization === true 时启用。
    var absoluteUrl = /^(?:https?:)?\/\//i.test(requestPath);
    var allowEnvironment = !absoluteUrl || (step.request && step.request.useEnvironmentAuthorization === true);
    var environmentGlobals = allowEnvironment ? globals : [];
    requestPath = core.appendGlobalQuery(requestPath, environmentGlobals, runtime);
    var headers = {};

    // 拼接 globals 的 cookie
    var cookieParts = environmentGlobals
        .filter(function (global) { return global.type === 'cookie'; })
        .map(function (global) { return global.name + '=' + core.resolveString(global.value, runtime); });

    // headers
    environmentGlobals.forEach(function (g) {
        if (g.type === 'header' && g.name) {
            headers[g.name] = core.resolveString(g.value || '', runtime);
        }
    });
    if (step.request && step.request.headers) {
        var reqHeaders = step.request.headers;
        if (typeof reqHeaders === 'object' && reqHeaders !== null) {
            Object.keys(reqHeaders).forEach(function (k) {
                headers[k] = core.resolveString(String(reqHeaders[k]), runtime);
            });
        }
    }
    if (cookieParts.length) {
        var cookieKey = Object.keys(headers).find(function (key) { return key.toLowerCase() === 'cookie'; });
        var mergedCookie = cookieKey ? (headers[cookieKey] + '; ' + cookieParts.join('; ')) : cookieParts.join('; ');
        if (cookieKey) headers[cookieKey] = mergedCookie;
        else headers.Cookie = mergedCookie;
    }

    // 复制出的 curl 要复现工作台当前所选环境：代理模式下同样携带环境路由头；
    // 用解析后的 requestPath 判断绝对 URL，模板解析出的外部地址不得附带本地路由头
    applyCurlProxyHeaders(headers, requestPath, opts.proxyHeaders);

    var fullUrl = core.joinUrl(opts.baseUrl || '', requestPath);
    var parts = ['curl -X ' + method + ' ' + shellSingleQuote(fullUrl)];

    Object.keys(headers).forEach(function (key) {
        parts.push('-H ' + shellSingleQuote(key + ': ' + String(headers[key])));
    });

    if (step.request && step.request.body != null) {
        var bodyVal = step.request.body;
        var bodyStr = typeof bodyVal === 'string' ? bodyVal : JSON.stringify(bodyVal);
        bodyStr = core.resolveString(bodyStr, runtime);
        parts.push('-d ' + shellSingleQuote(bodyStr));
    }
    return parts.join(' \\\n  ');
}
