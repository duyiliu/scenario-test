import { copyText, esc, fmt, isSecretName, safeJson, sanitizeSensitive } from './ui-utils.js';
import { clone, isPlainObject, evalExpression } from '../../core.js';
import { safeDecodeComponent } from '../../utils/safe-decode.js';

const workbenchAdhoc = (function () {
    'use strict';

    var appConfig = {};

    var adhocReturnFocus = null;

    var adhocState = {
        request: null,
        result: null,
        lastExecution: null,
        draft: '',
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

    // ===== adhoc 请求 → 场景步骤草稿 =====

    // 请求头名转可读的 vars 名称：X-API-Key → xApiKey、Authorization → authorization。
    // 同名头归一化后可能碰撞（X-Token / Token），追加序号保证占位变量互不覆盖。
    function headerVariableName(name, used) {
        var parts = String(name || '').split(/[^A-Za-z0-9]+/).filter(Boolean);
        var base = parts.map(function (part, index) {
            var lower = part.toLowerCase();
            return index === 0 ? lower : lower.charAt(0).toUpperCase() + lower.slice(1);
        }).join('');
        if (!base) base = 'secret';
        if (/^[0-9]/.test(base)) base = 'secret' + base;
        var candidate = base;
        var suffix = 2;
        while (used[candidate]) {
            candidate = base + suffix;
            suffix += 1;
        }
        used[candidate] = true;
        return candidate;
    }

    // Cookie 不在 SECRET_VAR_PATTERN 的 auth/token 名单里，但同样是会话凭据：
    // adhoc 草稿一并转为 {{vars.cookie}}，避免 Authorization/Cookie 任一落明文。
    function isSensitiveHeaderName(name) {
        var text = String(name || '');
        return isSecretName(text) || /^(?:set-)?cookie$/i.test(text);
    }

    function sanitizeDraftHeaders(headers) {
        if (!isPlainObject(headers)) return {};
        var used = Object.create(null);
        return Object.keys(headers).reduce(function (result, key) {
            result[key] = isSensitiveHeaderName(key)
                ? '{{vars.' + headerVariableName(key, used) + '}}'
                : headers[key];
            return result;
        }, {});
    }

    // 生成可直接粘贴进 scenarios/*.js 的 step 对象字面量（JSON 是合法 JS）。
    // 只消费最后一次实际执行的请求与响应状态；status 必须是数值，网络错误/超时
    // 的 ERROR/TIMEOUT 字符串不能伪装成可运行的断言。
    function buildAdhocStepDraft(execution, result) {
        if (!execution) throw new Error('请先执行一次请求，再转为步骤');
        // 兼容两种调用方式：扁平的 { method, path, headers, body, status }，
        // 或接近 step 定义的 { method, path, request: { headers, body } } + result。
        var requestDef = isPlainObject(execution.request) ? execution.request : {};
        var status = typeof result === 'number'
            ? result
            : (result && result.status !== undefined
                ? result.status
                : (execution.status !== undefined ? execution.status : (execution.result && execution.result.status)));
        if (typeof status !== 'number' || !isFinite(status)) {
            throw new Error('请求未返回有效状态码，无法转为步骤');
        }
        var method = String(execution.method || requestDef.method || 'GET').toUpperCase();
        var path = String(execution.path || requestDef.path || '').trim();
        if (!path) throw new Error('请求路径不能为空，无法转为步骤');
        var params = execution.params !== undefined ? execution.params : requestDef.params;
        var headers = sanitizeDraftHeaders(execution.headers !== undefined ? execution.headers : requestDef.headers);
        var body = execution.body !== undefined ? execution.body : requestDef.body;
        var step = {
            name: String(execution.name || '').trim() || '待填写步骤名称',
            method: method,
            path: path
        };
        if (isPlainObject(params) && Object.keys(params).length) {
            step.params = clone(params);
        }
        step.status = status;
        var request = {};
        if (Object.keys(headers).length) request.headers = headers;
        // GET/HEAD 的 request.body 会被 DSL 定义期拒绝，也不会真正发出：草稿同步省略，
        // 保证片段可直接注册运行，而不是仅语法合法。
        if (body !== undefined && body !== null && method !== 'GET' && method !== 'HEAD') {
            request.body = clone(body);
        }
        if (Object.keys(request).length) step.request = request;
        return JSON.stringify(step, null, 4);
    }

    function resetAdhocDraft() {
        adhocState.lastExecution = null;
        adhocState.draft = '';
        var node = document.getElementById('adhocDraft');
        if (node) node.classList.add('hidden');
        var code = document.getElementById('adhocDraftCode');
        if (code) code.textContent = '';
        var hint = document.getElementById('adhocDraftHint');
        if (hint) hint.textContent = '生成后可复制到 scenarios/*.js 的 steps 数组。';
    }

    function setAdhocDraftHint(message) {
        var hint = document.getElementById('adhocDraftHint');
        if (hint) hint.textContent = message;
    }

    function showAdhocStepDraft() {
        try {
            var draft = buildAdhocStepDraft(adhocState.lastExecution);
            adhocState.draft = draft;
            var node = document.getElementById('adhocDraft');
            var code = document.getElementById('adhocDraftCode');
            if (node) node.classList.remove('hidden');
            if (code) code.textContent = draft;
            showAdhocError('');
            setAdhocDraftHint('已生成步骤草稿，正在复制到剪贴板…');
            syncAdhocFormDisabled(adhocState.running);
            copyText(draft).then(function (ok) {
                // 用户可能已关闭弹窗或再次执行：只更新仍属于当前草稿的提示
                if (adhocState.draft !== draft) return;
                setAdhocDraftHint(ok ? '已生成步骤草稿并复制到剪贴板。' : '已生成步骤草稿，可点击「复制草稿」手动复制。');
            }).catch(function () {
                if (adhocState.draft === draft) setAdhocDraftHint('已生成步骤草稿，可点击「复制草稿」手动复制。');
            });
        } catch (error) {
            showAdhocError(error && error.message ? error.message : '生成步骤草稿失败');
        }
    }

    function copyAdhocStepDraft() {
        if (!adhocState.draft) return;
        var draft = adhocState.draft;
        copyText(draft).then(function (ok) {
            if (adhocState.draft !== draft) return;
            setAdhocDraftHint(ok ? '已复制到剪贴板。' : '复制失败，请手动选择草稿文本复制。');
        }).catch(function () {
            if (adhocState.draft === draft) setAdhocDraftHint('复制失败，请手动选择草稿文本复制。');
        });
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
        var draftBtn = document.getElementById('adhocDraftBtn');
        if (draftBtn) {
            var hasStatus = adhocState.lastExecution && typeof adhocState.lastExecution.status === 'number' && isFinite(adhocState.lastExecution.status);
            draftBtn.disabled = disabled || !hasStatus;
        }
        var copyBtn = document.getElementById('adhocDraftCopyBtn');
        if (copyBtn) copyBtn.disabled = disabled || !adhocState.draft;
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
        resetAdhocDraft();

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
        resetAdhocDraft();
        var modal = document.getElementById('adhocModal');
        if (!modal || modal.classList.contains('hidden')) return;
        modal.classList.add('hidden');
        modal.setAttribute('aria-hidden', 'true');
        if (adhocReturnFocus && adhocReturnFocus.focus) adhocReturnFocus.focus();
        adhocReturnFocus = null;
    }

    async function executeAdhocRequest(executeStepFn, getEnvFn, getBaseUrlFn, getAuthFn, getGlobalsFn, getVarsFn) {
        if (adhocState.running) return;
        // 新一轮执行：先丢弃旧草稿，避免新请求失败后仍把上一次结果转成步骤
        resetAdhocDraft();
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
            adhocState.lastExecution = {
                name: step.name,
                method: step.method,
                path: step.path,
                params: clone(step.params),
                headers: clone(step.request.headers || {}),
                body: clone(step.request.body),
                status: result.status
            };
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
        var draftBtn = document.getElementById('adhocDraftBtn');
        if (draftBtn) draftBtn.addEventListener('click', showAdhocStepDraft);
        var draftCopyBtn = document.getElementById('adhocDraftCopyBtn');
        if (draftCopyBtn) draftCopyBtn.addEventListener('click', copyAdhocStepDraft);
    }

    return {
        setConfig: function (config) { appConfig = config || {}; },
        buildAdhocRequest: buildAdhocRequest,
        buildAdhocStep: buildAdhocStep,
        buildAdhocStepDraft: buildAdhocStepDraft,
        openAdhocModal: openAdhocModal,
        closeAdhocModal: closeAdhocModal,
        executeAdhocRequest: executeAdhocRequest,
        bindAdhocRequestEvents: bindAdhocRequestEvents
    };
})();

export default workbenchAdhoc;
