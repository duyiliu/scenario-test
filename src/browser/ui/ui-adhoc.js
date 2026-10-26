import { esc, fmt, safeJson, sanitizeSensitive } from './ui-utils.js';
import { clone, isPlainObject, evalExpression } from '../../core.js';
import { safeDecodeComponent } from '../../utils/safe-decode.js';

const workbenchAdhoc = (function () {
    'use strict';

    var appConfig = {};

    var adhocReturnFocus = null;

    var adhocState = {
        request: null,
        result: null,
        running: false
    };

    function parseJsonEditor(value, fieldName) {
        var text = String(value || '').trim();
        if (!text) return {};
        try {
            return JSON.parse(text);
        } catch (e) {
            throw new Error(fieldName + ' 必须是合法 JSON');
        }
    }

    function resolveAdhocValue(value, runtime) {
        if (Array.isArray(value)) return value.map(function (item) { return resolveAdhocValue(item, runtime); });
        if (isPlainObject(value)) {
            return Object.keys(value).reduce(function (result, key) {
                result[key] = resolveAdhocValue(value[key], runtime);
                return result;
            }, {});
        }
        if (typeof value !== 'string') return value;
        return value.replace(/\{\{\s*(.+?)\s*\}\}/g, function (template, expr) {
            var resolved = evalExpression(expr, runtime);
            if (resolved === undefined || resolved === null || resolved === '') return template;
            return typeof resolved === 'object' ? JSON.stringify(resolved) : String(resolved);
        });
    }

    function hasAdhocTemplate(value) {
        if (typeof value === 'string') return /\{\{\s*.+?\s*\}\}/.test(value);
        if (Array.isArray(value)) return value.some(hasAdhocTemplate);
        if (isPlainObject(value)) return Object.keys(value).some(function (key) { return hasAdhocTemplate(value[key]); });
        return false;
    }

    function parseQueryParamsFromUrl(fullPath) {
        var pathStr = String(fullPath || '');
        var qIdx = pathStr.indexOf('?');
        if (qIdx < 0) return { basePath: pathStr, params: {} };
        var basePath = pathStr.substring(0, qIdx);
        var searchStr = pathStr.substring(qIdx + 1);
        var params = {};
        if (searchStr) {
            searchStr.split('&').forEach(function (pair) {
                if (!pair) return;
                var parts = pair.split('=');
                var key = safeDecodeComponent(parts[0] || '');
                var val = safeDecodeComponent(parts.slice(1).join('=') || '');
                if (key) params[key] = val;
            });
        }
        return { basePath: basePath, params: params };
    }

    function buildAdhocRequest(step, activeRuntime, currentScenario) {
        var runtime = activeRuntime || {
            vars: Object.assign({}, (currentScenario || {}).vars || {}, appConfig.vars || {}),
            lastResponse: null,
            lastResponseBody: null
        };
        var request = resolveAdhocValue(clone(step.request || {}), runtime) || {};
        var resolvedPath = resolveAdhocValue(step.path || request.path || '', runtime);
        var parsed = parseQueryParamsFromUrl(resolvedPath);
        
        var rawParams = step.params || request.params;
        var resolvedParams = rawParams ? resolveAdhocValue(rawParams, runtime) : {};
        var mergedParams = Object.assign({}, parsed.params, isPlainObject(resolvedParams) ? resolvedParams : {});

        return {
            name: (step.name || '未命名步骤') + '（临时调试）',
            method: String(step.method || request.method || 'GET').toUpperCase(),
            path: parsed.basePath,
            params: Object.keys(mergedParams).length > 0 ? mergedParams : null,
            headers: request.headers && isPlainObject(request.headers) ? request.headers : {},
            body: request.body === undefined ? null : request.body
        };
    }

    function buildAdhocStep(values) {
        var path = String(values.path || '').trim();
        if (!path) throw new Error('请求路径不能为空');
        var params = values.params;
        var headers = parseJsonEditor(values.headers, '请求头');
        var bodyText = String(values.body || '').trim();
        var body = bodyText ? parseJsonEditor(bodyText, '请求体') : undefined;
        if (params && !isPlainObject(params)) throw new Error('Query 参数必须是 Key-Value 对象');
        if (!isPlainObject(headers)) throw new Error('请求头必须是 JSON 对象');
        if (hasAdhocTemplate(path) || hasAdhocTemplate(params) || hasAdhocTemplate(headers) || hasAdhocTemplate(body)) {
            throw new Error('仍有未解析的 {{vars.xxx}} 参数，请填写实际值后再执行');
        }
        return {
            name: values.name || '临时请求',
            method: String(values.method || 'GET').toUpperCase(),
            path: path,
            params: params,
            request: { headers: headers, body: body },
            timeoutMs: Number(appConfig.requestTimeoutMs || 30000)
        };
    }

    function showAdhocError(message) {
        var node = document.getElementById('adhocError');
        if (!node) return;
        node.textContent = message || '';
        node.classList.toggle('hidden', !message);
    }

    function renderAdhocResult(result) {
        var node = document.getElementById('adhocResult');
        if (!node) return;
        if (!result) {
            node.classList.add('hidden');
            node.innerHTML = '';
            return;
        }
        var statusClass = result.passed ? 'text-emerald-700' : 'text-rose-700';
        var response = result.response || { headers: {}, body: null };
        node.classList.remove('hidden');
        node.innerHTML = '<div class="flex items-center justify-between"><div class="text-sm font-bold ' + statusClass + '">' + (result.passed ? '请求完成' : '请求失败') + '</div><div class="text-xs text-slate-500">状态：' + esc(result.status) + ' ｜ 耗时：' + esc(fmt(result.duration)) + '</div></div>' +
            (result.error ? '<div class="mt-3 rounded border border-rose-200 bg-rose-50 p-2 text-sm text-rose-700">' + esc(result.error) + '</div>' : '') +
            '<div class="mt-3 grid gap-3 md:grid-cols-2"><div><div class="mb-1 text-[11px] font-bold uppercase tracking-wider text-slate-500">响应头</div><pre class="overflow-x-auto rounded bg-slate-900 p-3 text-xs leading-tight text-slate-300">' + esc(safeJson(sanitizeSensitive(response.headers, ''))) + '</pre></div><div><div class="mb-1 text-[11px] font-bold uppercase tracking-wider text-slate-500">响应体</div><pre class="overflow-x-auto rounded bg-slate-900 p-3 text-xs leading-tight text-slate-300">' + esc(safeJson(sanitizeSensitive(response.body, ''))) + '</pre></div></div>';
    }

    function syncAdhocFormDisabled(disabled) {
        ['adhocNameInput', 'adhocMethodInput', 'adhocPathInput', 'adhocAddParamBtn', 'adhocHeadersInput', 'adhocBodyInput', 'adhocExecuteBtn'].forEach(function (id) {
            var el = document.getElementById(id);
            if (el) el.disabled = disabled;
        });
        var container = document.getElementById('adhocParamsContainer');
        if (container) {
            container.querySelectorAll('input, button').forEach(function (el) {
                el.disabled = disabled;
            });
        }
        var execBtn = document.getElementById('adhocExecuteBtn');
        if (execBtn) execBtn.textContent = disabled ? '执行中...' : '执行一次';
    }

    function renderAdhocParamsRows(paramsObj) {
        var container = document.getElementById('adhocParamsContainer');
        if (!container) return;
        container.innerHTML = '';
        var keys = paramsObj && isPlainObject(paramsObj) ? Object.keys(paramsObj) : [];
        if (keys.length === 0) {
            addAdhocParamRow('', '');
            return;
        }
        keys.forEach(function (k) {
            addAdhocParamRow(k, paramsObj[k]);
        });
    }

    function addAdhocParamRow(key, value) {
        var container = document.getElementById('adhocParamsContainer');
        if (!container) return;
        var row = document.createElement('div');
        row.className = 'flex items-center gap-2 adhoc-param-row';
        row.innerHTML = '<input type="checkbox" checked class="param-enable rounded border-slate-300 text-emerald-600 focus:ring-emerald-500" title="是否启用">' +
            '<input type="text" class="param-key w-1/3 rounded border border-slate-200 px-2 py-1 font-mono text-xs placeholder:text-slate-300" placeholder="参数名 (Key)" value="' + esc(key || '') + '">' +
            '<input type="text" class="param-value flex-1 rounded border border-slate-200 px-2 py-1 font-mono text-xs placeholder:text-slate-300" placeholder="参数值 (Value)" value="' + esc(value !== undefined && value !== null ? String(value) : '') + '">' +
            '<button type="button" class="param-remove text-slate-400 hover:text-rose-600 px-1 text-xs" title="删除行">✕</button>';
        
        row.querySelector('.param-remove').addEventListener('click', function () {
            row.remove();
            if (container.querySelectorAll('.adhoc-param-row').length === 0) {
                addAdhocParamRow('', '');
            }
        });
        container.appendChild(row);
    }

    function collectAdhocParams() {
        var container = document.getElementById('adhocParamsContainer');
        if (!container) return undefined;
        var result = {};
        var count = 0;
        container.querySelectorAll('.adhoc-param-row').forEach(function (row) {
            var enable = row.querySelector('.param-enable').checked;
            var key = row.querySelector('.param-key').value.trim();
            var val = row.querySelector('.param-value').value;
            if (enable && key) {
                result[key] = val;
                count++;
            }
        });
        return count > 0 ? result : undefined;
    }

    function openAdhocModal(step, activeRuntime, currentScenario) {
        if (!step) return;
        var request = buildAdhocRequest(step, activeRuntime, currentScenario);
        adhocState.request = request;
        adhocState.result = null;
        adhocState.running = false;

        document.getElementById('adhocNameInput').value = request.name;
        document.getElementById('adhocMethodInput').value = request.method;
        document.getElementById('adhocPathInput').value = request.path;
        renderAdhocParamsRows(request.params);
        document.getElementById('adhocHeadersInput').value = safeJson(request.headers);
        document.getElementById('adhocBodyInput').value = request.body === null ? '' : safeJson(request.body);
        showAdhocError('');
        renderAdhocResult(null);
        syncAdhocFormDisabled(false);
        var modal = document.getElementById('adhocModal');
        adhocReturnFocus = document.activeElement;
        modal.classList.remove('hidden');
        modal.setAttribute('aria-hidden', 'false');
        window.requestAnimationFrame(function () {
            document.getElementById('adhocNameInput').focus();
        });
    }

    function closeAdhocModal() {
        if (adhocState.running) return;
        adhocState.request = null;
        var modal = document.getElementById('adhocModal');
        if (!modal || modal.classList.contains('hidden')) return;
        modal.classList.add('hidden');
        modal.setAttribute('aria-hidden', 'true');
        if (adhocReturnFocus && adhocReturnFocus.focus) adhocReturnFocus.focus();
        adhocReturnFocus = null;
    }

    async function executeAdhocRequest(executeStepFn, getEnvFn, getBaseUrlFn, getAuthFn, getGlobalsFn, getVarsFn) {
        if (adhocState.running) return;
        try {
            var step = buildAdhocStep({
                name: document.getElementById('adhocNameInput').value,
                method: document.getElementById('adhocMethodInput').value,
                path: document.getElementById('adhocPathInput').value,
                params: collectAdhocParams(),
                headers: document.getElementById('adhocHeadersInput').value,
                body: document.getElementById('adhocBodyInput').value
            });
            var environment = getEnvFn ? getEnvFn() : null;
            var runtimeVars = getVarsFn ? getVarsFn() : {};
            var runtime = {
                vars: clone(runtimeVars),
                lastResponse: null,
                lastResponseBody: null,
                baseUrl: getBaseUrlFn ? getBaseUrlFn() : '',
                authorization: getAuthFn ? getAuthFn() : '',
                globals: getGlobalsFn ? getGlobalsFn() : [],
                environment: environment ? clone(environment) : null,
                startedAt: Date.now(),
                abortController: new AbortController(),
                cancelled: false
            };
            adhocState.running = true;
            showAdhocError('');
            syncAdhocFormDisabled(true);
            var result = await executeStepFn(step, runtime, appConfig);
            adhocState.result = result;
            renderAdhocResult(result);
        } catch (error) {
            showAdhocError(error && error.message ? error.message : '临时请求执行失败');
        } finally {
            adhocState.running = false;
            syncAdhocFormDisabled(false);
        }
    }

    function bindAdhocRequestEvents(getStepByIdxFn, getRuntimeByIdxFn, executeStepFn, getEnvFn, getBaseUrlFn, getAuthFn, getGlobalsFn, getVarsFn) {
        document.getElementById('stepsList').addEventListener('click', function (event) {
            var button = event.target.closest('[data-adhoc-step]');
            if (!button) return;
            event.preventDefault();
            event.stopPropagation();
            var index = Number(button.dataset.adhocStep);
            var step = getStepByIdxFn ? getStepByIdxFn(index) : null;
            var runtime = getRuntimeByIdxFn ? getRuntimeByIdxFn(index) : null;
            openAdhocModal(step, runtime);
        });
        document.getElementById('adhocCloseBtn').addEventListener('click', closeAdhocModal);
        document.getElementById('adhocCancelBtn').addEventListener('click', closeAdhocModal);

        var modal = document.getElementById('adhocModal');
        if (modal) {
            modal.addEventListener('click', function (event) {
                if (event.target === modal) closeAdhocModal();
            });
            modal.addEventListener('keydown', function (event) {
                if (event.key !== 'Tab') return;
                var focusable = Array.from(modal.querySelectorAll('button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'))
                    .filter(function (element) { return element.offsetParent !== null; });
                if (!focusable.length) return;
                var first = focusable[0];
                var last = focusable[focusable.length - 1];
                if (event.shiftKey && document.activeElement === first) {
                    event.preventDefault();
                    last.focus();
                } else if (!event.shiftKey && document.activeElement === last) {
                    event.preventDefault();
                    first.focus();
                }
            });
        }
        document.addEventListener('keydown', function (event) {
            if (event.key === 'Escape' && modal && !modal.classList.contains('hidden')) {
                closeAdhocModal();
            }
        });

        document.getElementById('adhocExecuteBtn').addEventListener('click', function () {
            executeAdhocRequest(executeStepFn, getEnvFn, getBaseUrlFn, getAuthFn, getGlobalsFn, getVarsFn);
        });
        var addBtn = document.getElementById('adhocAddParamBtn');
        if (addBtn) {
            addBtn.addEventListener('click', function () {
                addAdhocParamRow('', '');
            });
        }
    }

    return {
        setConfig: function (config) { appConfig = config || {}; },
        buildAdhocRequest: buildAdhocRequest,
        buildAdhocStep: buildAdhocStep,
        openAdhocModal: openAdhocModal,
        closeAdhocModal: closeAdhocModal,
        executeAdhocRequest: executeAdhocRequest,
        bindAdhocRequestEvents: bindAdhocRequestEvents
    };
})();

export default workbenchAdhoc;
