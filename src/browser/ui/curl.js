import * as core from "../../core.js";

// POSIX shell 单引号转义：单引号内不做 $VAR/$(...)/反引号展开，值中的 ' 用 '\'' 收尾再续开。
// 复制出的命令与工作台实际发送值一致，也避免变量值借复制粘贴注入命令。
export function shellSingleQuote(value) {
    return "'" + String(value).replace(/'/g, "'\\''") + "'";
}

// 生成步骤的 cURL 预览。与执行期共用 core.buildUrl / core.appendGlobalQuery，
// 保证 globals query 的 key 去重与 fragment 位置（参数拼在 # 之前）两边一致。
export function buildStepCurl(step, options) {
    if (!step) return '';
    var opts = options || {};
    var runtime = { vars: opts.vars || {}, suite: opts.suite || {} };
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

    // 与引擎同口径：协议相对 URL 按 baseUrl 协议补全（#121）
    var fullUrl = core.completeProtocolRelativeUrl(core.joinUrl(opts.baseUrl || '', requestPath), opts.baseUrl);
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
