import * as core from "../../core.js";
import { createEngine } from "../../engine.js";
import { esc, safeJson, copyText } from "./ui-utils.js";
import { appendQueryParams, existingQueryKeys } from "../../utils/url-query.js";
import workbenchStyle from './ui-style.js';
import workbenchView from './ui-view.js';
import workbenchAdhoc from './ui-adhoc.js';

export function createWorkbenchRuntime(options) {
    'use strict';

    // ===== 模块注入依赖 =====
    var uiStyle = workbenchStyle;
    var uiView = workbenchView;
    var uiAdhoc = workbenchAdhoc;

    var clone = core.clone;
    var isPlainObject = core.isPlainObject;
    var assertNotReservedVar = core.assertNotReservedVar;
    var assertNoReservedVars = core.assertNoReservedVars;
    var mergeGlobals = core.mergeGlobals;
    var GLOBAL_TYPES = ['header', 'cookie', 'query'];

    // 常见 Header 的常用值建议（参考 Apifox 的取值选项）
    var HEADER_VALUE_OPTIONS = {
        'Authorization': ['Bearer {{vars.token}}', 'Token {{vars.token}}', 'Basic dXNlcjpwYXNz'],
        'Content-Type': ['application/json', 'application/x-www-form-urlencoded', 'multipart/form-data', 'text/plain', 'application/xml'],
        'Accept': ['application/json', 'text/plain', '*/*', 'application/xml'],
        'Accept-Language': ['zh-CN', 'zh-CN,zh;q=0.9', 'en-US', 'en'],
        'Cache-Control': ['no-cache', 'no-store', 'max-age=0'],
        'X-Request-Id': ['{{vars.runId}}', '{{vars.runNo}}']
    };

    // 动态 datalist 的全局唯一 id 计数器
    var globalValueListSeq = 0;
    var locatedStepHighlightTimer = null;

    var appConfig = options.config || {};
    var getRegisteredScenario = options.getScenario || function () { return null; };

    if (uiAdhoc.setConfig) uiAdhoc.setConfig(appConfig);

    // ===== 步骤复合筛选状态管理 =====
    var stepsFilterState = {
        type: 'all',
        keyword: ''
    };

    function applyStepsFilter() {
        var type = stepsFilterState.type || 'all';
        var keyword = String(stepsFilterState.keyword || '').trim().toLowerCase();

        // 保持过滤按钮的高亮激活状态
        document.querySelectorAll('.filter-btn').forEach(function (b) {
            var active = b.dataset.f === type;
            b.setAttribute('aria-pressed', active ? 'true' : 'false');
            if (active) {
                b.className = 'filter-btn px-2.5 py-1 text-xs font-bold text-slate-900 bg-white rounded-md shadow-2xs transition-all';
            } else {
                b.className = 'filter-btn px-2.5 py-1 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-white/60 rounded-md transition-all';
            }
        });

        // 复合过滤步骤列表项
        var stepItems = Array.from(document.querySelectorAll('#stepsList li[data-step-idx]'));
        var visibleCount = 0;
        stepItems.forEach(function (li) {
            var searchData = String(li.dataset.search || '').toLowerCase();
            var matchSearch = !keyword || searchData.indexOf(keyword) >= 0;

            var passedAttr = li.dataset.passed;
            var skipped = li.dataset.skipped === 'true';
            var matchFilter = false;

            if (type === 'all') {
                matchFilter = true;
            } else if (type === 'pass') {
                matchFilter = passedAttr === 'true' && !skipped;
            } else if (type === 'fail') {
                matchFilter = passedAttr === 'false' && !skipped;
            } else if (type === 'skip') {
                matchFilter = skipped;
            }

            var visible = matchSearch && matchFilter;
            li.style.display = visible ? '' : 'none';
            if (visible) visibleCount += 1;
        });

        var summary = document.getElementById('stepFilterSummary');
        if (summary) summary.textContent = '显示 ' + visibleCount + ' / ' + stepItems.length + ' 个步骤';
        var resetButton = document.getElementById('resetStepFiltersBtn');
        if (resetButton) resetButton.hidden = type === 'all' && !stepsFilterState.keyword;

        var stepsList = document.getElementById('stepsList');
        var emptyState = document.getElementById('stepsFilterEmpty');
        var hasNoMatches = stepItems.length > 0 && visibleCount === 0;
        if (stepsList) stepsList.style.display = hasNoMatches ? 'none' : '';
        if (emptyState) {
            emptyState.style.display = hasNoMatches ? 'flex' : 'none';
            emptyState.innerHTML = hasNoMatches
                ? '<span>没有匹配的步骤</span><button type="button" onclick="window.__R.resetFilters()">清除搜索和筛选</button>'
                : '';
        }
    }

    // ===== 全局交互桥接（挂载至 window.__R 供 DOM 内联 onclick 调用）=====
    window.__R = {
        toggle: function (el, event) {
            if (event && event.target.closest('button, input, textarea, select, a')) return;
            var selection = window.getSelection && window.getSelection();
            if (selection && !selection.isCollapsed && selection.toString().trim()) return;
            var panel = el.nextElementSibling;
            var chevron = el.querySelector('.chevron');
            if (panel.classList.contains('open')) {
                panel.classList.remove('open');
                el.setAttribute('aria-expanded', 'false');
                if (chevron) chevron.classList.remove('rotate-180');
            } else {
                panel.classList.add('open');
                el.setAttribute('aria-expanded', 'true');
                if (chevron) chevron.classList.add('rotate-180');
            }
        },
        toggleKey: function (el, event) {
            if (event.target !== el || (event.key !== 'Enter' && event.key !== ' ')) return;
            event.preventDefault();
            window.__R.toggle(el);
        },
        filter: function (type) {
            stepsFilterState.type = type;
            applyStepsFilter();
        },
        search: function (q) {
            stepsFilterState.keyword = q;
            applyStepsFilter();
        },
        resetFilters: function () {
            stepsFilterState.type = 'all';
            stepsFilterState.keyword = '';
            var searchInput = document.getElementById('stepSearchInput');
            if (searchInput) {
                searchInput.value = '';
            }
            applyStepsFilter();
            if (searchInput) searchInput.focus();
        },
        getFilterState: function () {
            return stepsFilterState;
        },
        applyFilter: applyStepsFilter
    };

    // ===== 应用状态管理 =====
    var state = {
        scenario: null,
        scenarioFile: '',
        scenarioScript: null,
        steps: [],
        running: false,
        activeRuntime: null,
        executionMode: 'idle',
        stepRuntime: null,
        stepCheckpoints: [],
        debugRuntimes: [],
        nextStepIndex: 0,
        scenarioSearch: '',
        discoveredFiles: [],
        lastReport: null,
        startTime: null,
        endTime: null,
        // varsTrail[i] = 第 i 步执行后的 runtime.vars 浅拷贝；与 debugRuntimes[i]（执行前快照）做差集
        // 供工作台「运行时变量」面板展示每步执行后的变量与 extract 变更项
        varsTrail: []
    };

    // ===== 存储与配置辅助 =====
    function getStorageKeys() {
        var cfg = appConfig;
        var keys = cfg.storageKeys || {};
        return {
            baseUrl: keys.baseUrl || 'scenario.testing.baseUrl',
            authorization: keys.authorization || 'scenario.testing.authorization',
            globals: keys.globals || 'scenario.testing.globals',
            environment: keys.environment || 'scenario.testing.environment',
            theme: keys.theme || 'scenario.testing.theme',
            scenarioVars: keys.scenarioVars || 'scenario.testing.scenarioVars',
            pinnedScenarios: keys.pinnedScenarios || 'scenario.testing.pinnedScenarios'
        };
    }

    function getEnvironments() {
        var cfg = appConfig;
        return (Array.isArray(cfg.envs) ? cfg.envs : []).filter(function (env) {
            return env && env.key;
        });
    }

    function getDefaultEnvironment() {
        var cfg = appConfig;
        var environments = getEnvironments();
        var defaultKey = cfg.defaultEnvKey;
        return environments.filter(function (env) { return env.key === defaultKey; })[0] || environments[0] || null;
    }

    function getSelectedEnvironment() {
        var keys = getStorageKeys();
        var environments = getEnvironments();
        var selectedKey = '';
        try {
            selectedKey = window.localStorage.getItem(keys.environment) || '';
        } catch (e) {
            selectedKey = '';
        }
        return environments.filter(function (env) { return env.key === selectedKey; })[0] || getDefaultEnvironment();
    }

    function getEnvironmentStorageKey(key, environment) {
        return key + '.' + (environment ? environment.key : 'default');
    }

    function getPinnedScenarioFiles() {
        try {
            var value = JSON.parse(window.localStorage.getItem(getStorageKeys().pinnedScenarios) || '[]');
            return Array.isArray(value) ? value.filter(function (file) { return typeof file === 'string'; }) : [];
        } catch (e) {
            return [];
        }
    }

    function toggleScenarioPin(file) {
        var pins = getPinnedScenarioFiles();
        var index = pins.indexOf(file);
        if (index >= 0) pins.splice(index, 1);
        else pins.unshift(file);
        persistSetting(getStorageKeys().pinnedScenarios, JSON.stringify(pins));
        renderScenarioSelect();
    }

    function getScenarioVariableDefinitions() {
        var definitions = {};
        (Array.isArray(appConfig.variables) ? appConfig.variables : []).forEach(function (definition) {
            if (!definition || !definition.name) return;
            definitions[definition.name] = {
                name: definition.name,
                label: definition.label || definition.name,
                required: Boolean(definition.required)
            };
        });
        if (state.scenario && isPlainObject(state.scenario.envVars)) {
            Object.keys(state.scenario.envVars).forEach(function (name) {
                definitions[name] = Object.assign({}, definitions[name] || {}, {
                    name: name,
                    label: state.scenario.envVars[name] || name,
                    required: true
                });
            });
        }
        return Object.keys(definitions).map(function (name) { return definitions[name]; });
    }

    function getScenarioVariableStorageKey(name, environment) {
        var keys = getStorageKeys();
        return getEnvironmentStorageKey(keys.scenarioVars + '.' + name, environment);
    }

    function getConfiguredScenarioVariables() {
        var config = appConfig;
        return isPlainObject(config.scenarioVars) ? config.scenarioVars : {};
    }

    function getStoredScenarioVariables() {
        var environment = getSelectedEnvironment();
        var configuredVariables = getConfiguredScenarioVariables();
        return getScenarioVariableDefinitions().reduce(function (vars, def) {
            try {
                vars[def.name] = window.localStorage.getItem(getScenarioVariableStorageKey(def.name, environment)) || configuredVariables[def.name] || '';
            } catch (e) {
                vars[def.name] = configuredVariables[def.name] || '';
            }
            return vars;
        }, {});
    }

    function persistScenarioVariables() {
        var environment = getSelectedEnvironment();
        getScenarioVariableDefinitions().forEach(function (def) {
            var input = document.getElementById('scenarioVar_' + def.name);
            persistSetting(getScenarioVariableStorageKey(def.name, environment), input ? String(input.value || '').trim() : '');
        });
    }

    function getScenarioVariableValues() {
        var stored = getStoredScenarioVariables();
        getScenarioVariableDefinitions().forEach(function (def) {
            var input = document.getElementById('scenarioVar_' + def.name);
            if (input) stored[def.name] = String(input.value || '').trim();
        });
        return stored;
    }

    function getEffectiveBaseUrl() {
        var cfg = appConfig;
        var keys = getStorageKeys();
        var environment = getSelectedEnvironment();
        var stored = '';
        try {
            stored = window.localStorage.getItem(getEnvironmentStorageKey(keys.baseUrl, environment)) || '';
        } catch (e) {
            stored = '';
        }
        return String(stored || (environment && environment.baseUrl) || cfg.baseUrl || window.location.origin || '').replace(/\/+$/, '');
    }

    function getRequestBaseUrl() {
        if (window.__SCENARIO_TEST_SERVE_PROXY__) {
            return String(window.location.origin || '').replace(/\/+$/, '');
        }
        return getEffectiveBaseUrl();
    }

    function getEffectiveAuthorization() {
        var cfg = appConfig;
        var keys = getStorageKeys();
        var environment = getSelectedEnvironment();
        try {
            return window.localStorage.getItem(getEnvironmentStorageKey(keys.authorization, environment)) || (environment && environment.authorization) || cfg.authorization || '';
        } catch (e) {
            return (environment && environment.authorization) || cfg.authorization || '';
        }
    }

    // 生效的全局参数：配置 globals < 环境 globals < 页面覆盖；旧 authorization 自动映射为 header 参数
    function getEffectiveGlobals() {
        var cfg = appConfig;
        var keys = getStorageKeys();
        var environment = getSelectedEnvironment();
        var stored = [];
        try {
            var raw = window.localStorage.getItem(getEnvironmentStorageKey(keys.globals, environment));
            if (raw) {
                var parsed = JSON.parse(raw);
                if (Array.isArray(parsed)) stored = parsed;
            }
        } catch (e) {
            stored = [];
        }
        var merged = mergeGlobals(cfg.globals, environment && environment.globals, stored);
        var authorization = getEffectiveAuthorization();
        if (authorization && !merged.some(function (g) { return g.type === 'header' && g.name.toLowerCase() === 'authorization'; })) {
            merged = merged.concat([{ type: 'header', name: 'Authorization', value: authorization }]);
        }
        return merged;
    }

    function persistSetting(key, value) {
        try {
            if (!value) {
                window.localStorage.removeItem(key);
            } else {
                window.localStorage.setItem(key, value);
            }
        } catch (e) {
            console.warn('保存配置失败', e);
        }
    }

    function getEffectiveTheme() {
        try {
            return window.localStorage.getItem(getStorageKeys().theme) || 'default';
        } catch (e) {
            return 'default';
        }
    }

    function createUuidHex() {
        if (window.crypto && window.crypto.randomUUID) return window.crypto.randomUUID().replace(/-/g, '');
        if (window.crypto && window.crypto.getRandomValues) {
            var values = new Uint32Array(4);
            window.crypto.getRandomValues(values);
            return Array.prototype.map.call(values, function (value) {
                return ('00000000' + value.toString(16)).slice(-8);
            }).join('');
        }
        return String(Date.now()) + String(Math.random()).slice(2);
    }

    function createRunIdentifiers() {
        var timestamp = String(Date.now());
        var random = window.crypto && window.crypto.randomUUID
            ? window.crypto.randomUUID().replace(/-/g, '').slice(0, 8)
            : Math.random().toString(16).slice(2, 10).padEnd(8, '0');
        return {
            runId: timestamp + '-' + random,
            runNo: timestamp.slice(-6) + '-' + random.slice(0, 4)
        };
    }


    function buildScenarioRuntimeVars() {
        var cfg = appConfig;
        var scenario = state.scenario || {};
        var scenarioVars = getScenarioVariableValues();
        var missing = getScenarioVariableDefinitions().filter(function (def) {
            return def.required && !scenarioVars[def.name];
        });
        if (missing.length) {
            throw new Error('缺少场景凭据：' + missing.map(function (def) { return def.label; }).join('、') + '。请在“配置参数 → 当前场景凭据”中填写并保存。');
        }
        var identifiers = createRunIdentifiers();
        // 保留变量 runId/runNo 由运行时自动生成，声明源冲突在使用前尽早报错
        assertNoReservedVars(scenario.vars, '场景 vars');
        assertNoReservedVars(cfg.vars, '配置 vars');
        assertNoReservedVars(scenarioVars, '页面场景变量');
        var vars = Object.assign({}, scenario.vars || {}, cfg.vars || {}, scenarioVars, identifiers);
        (scenario.generatedVars || []).forEach(function (def) {
            if (!def || !def.name) return;
            assertNotReservedVar(def.name, 'generatedVars');
            // 造数类型分支收敛于 core.applyGeneratedVar（与 Node engine 同一实现）；
            // createUuidHex 保留浏览器端降级链（crypto.randomUUID 缺失时退到 getRandomValues）
            core.applyGeneratedVar(def, vars, identifiers, { uuidHex: createUuidHex });
        });
        return vars;
    }

    // ===== 视图重绘桥接函数 =====
    function renderScenarioSelect() {
        uiView.renderScenarioSelect(state.discoveredFiles, state.scenarioFile, state.scenarioSearch, getPinnedScenarioFiles());
    }

    function clearScenarioSearch() {
        var input = document.getElementById('scenarioSearchInput');
        if (!input) return;
        input.value = '';
        state.scenarioSearch = '';
        renderScenarioSelect();
        input.focus();
    }

    function formatTime(date) {
        if (!date) return '-';
        var d = new Date(date);
        var pad = function (n) { return n < 10 ? '0' + n : n; };
        return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) + ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes()) + ':' + pad(d.getSeconds());
    }

    function updateExecutionFooter() {
        var startEl = document.getElementById('execStartTime');
        var endEl = document.getElementById('execEndTime');
        var durEl = document.getElementById('execTotalDuration');
        if (!startEl) return;
        var executed = (state.steps || []).length;
        var totalMs = (state.steps || []).reduce(function (sum, s) { return sum + (s.duration || 0); }, 0);
        // 空值写回「-」：清除结果/回退后不留上一轮的时间残留
        startEl.textContent = state.startTime ? formatTime(state.startTime) : '-';
        if (endEl) endEl.textContent = state.endTime ? formatTime(state.endTime) : '-';
        if (durEl) {
            durEl.textContent = totalMs.toFixed(2) + ' ms';
            // 未执行时保持中性色，避免绿色暗示"已完成/成功"
            durEl.classList.toggle('text-emerald-600', executed > 0);
            durEl.classList.toggle('text-slate-500', executed === 0);
        }
    }

    function renderStepsAll() {
        var varsViews = (state.steps || []).map(function (_, idx) { return buildVarsView(idx); });
        uiView.renderStepsAll(state.steps, state.scenario && state.scenario.steps ? state.scenario.steps : [], state.executionMode, varsViews);
        updateExecutionFooter();
    }

    function renderStatsAll() {
        // iterations 字段从未被引擎/工作台写入，也不在契约中（B1 未知键校验一并移除读取），
        // 统计口径完全由 state.steps 推导；此处保留占位参数形状供 uiView 渲染。
        uiView.renderStatsAll(state.steps, { run: 1, failed: 0 }, state.scenario, state.scenarioFile);
        updateExecutionFooter();
    }

    function renderFilterAll() {
        uiView.renderFilterAll(state.steps, state.scenario && state.scenario.steps ? state.scenario.steps : []);
    }

    function renderReportPanel() {
        state.lastReport = uiView.renderReportPanel(state.steps, state.scenario, state.scenarioFile, state.executionMode, getSelectedEnvironment());
    }

    function setSidePanelTab(tabName, options) {
        var showReport = tabName === 'report';
        var statsTab = document.getElementById('statsTab');
        var reportTab = document.getElementById('reportTab');
        var statsPanel = document.getElementById('statsPanel');
        var reportPanel = document.getElementById('reportPanel');
        if (showReport && reportTab && reportTab.disabled) showReport = false;
        if (statsPanel) statsPanel.classList.toggle('hidden', showReport);
        if (reportPanel) reportPanel.classList.toggle('hidden', !showReport);
        if (statsTab) {
            statsTab.classList.toggle('is-active', !showReport);
            statsTab.setAttribute('aria-selected', showReport ? 'false' : 'true');
        }
        if (reportTab) {
            reportTab.classList.toggle('is-active', showReport);
            reportTab.setAttribute('aria-selected', showReport ? 'true' : 'false');
        }
        // 报告面板由隐藏转可见时补一次全量渲染：面板隐藏期间 renderReportPanel 只更新
        // 徽标不重建 DOM（见 ui-view 同名函数注释），切回时需用最新 steps 重新填充；
        // preservePanel 用于调用方已自行写入面板内容的场景（showDiagnosticError），跳过重建
        if (showReport && !(options && options.preservePanel)) renderReportPanel();
    }

    function bindSidePanelTabs() {
        var statsTab = document.getElementById('statsTab');
        var reportTab = document.getElementById('reportTab');
        if (statsTab) statsTab.addEventListener('click', function () { setSidePanelTab('stats'); });
        if (reportTab) reportTab.addEventListener('click', function () { setSidePanelTab('report'); });
        setSidePanelTab('stats');
    }

    // ===== 执行调度引擎 =====
    // 执行层统一到 Node 引擎（engine.js runStep），本层只保留 UI 调度与结果语义映射
    var engine = createEngine({ config: appConfig });

    async function executeStep(step, runtime, cfg) {
        // 执行语义完全交由 engine.runStep（失败/取消/超时均已结构化返回：
        // cancelled/timedOut/status/error/method/request 直接可用，无需适配层再映射）
        var request = step.request || {};
        return await engine.runStep(step, runtime, {
            signal: runtime.abortController.signal,
            baseUrl: runtime.baseUrl,
            authorization: runtime.authorization,
            globals: runtime.globals,
            requestTimeoutMs: Number(step.timeoutMs || request.timeoutMs || cfg.requestTimeoutMs || 30000),
            // 轮询进度反馈：重试间隔内更新运行状态位（aria-live），避免长时间看似卡死
            onAttempt: function (info) {
                var detail = 'status ' + info.status + (info.failedAssertion ? '，' + info.failedAssertion : '');
                uiView.setRunState('running',
                    '轮询 ' + (info.step && info.step.name || '未命名步骤') + ' 第 ' + info.attempt + '/' + info.totalAttempts
                    + ' 次未通过（' + detail + '），' + info.intervalMs + 'ms 后重试');
            }
        });
    }

    function createExecutionRuntime() {
        var environment = getSelectedEnvironment();
        var runtime = {
            vars: buildScenarioRuntimeVars(),
            lastResponse: null,
            lastResponseBody: null,
            baseUrl: getRequestBaseUrl(),
            authorization: getEffectiveAuthorization(),
            globals: getEffectiveGlobals(),
            environment: environment ? clone(environment) : null,
            startedAt: Date.now(),
            abortController: new AbortController(),
            cancelled: false
        };
        persistScenarioVariables();
        return runtime;
    }

    function snapshotStepRuntime(runtime) {
        // 浅拷贝即可隔离：执行期 vars 唯一写入方是 extract（顶层赋值，见 engine.js 契约注释），
        // lastResponse/lastResponseBody 每步整体替换、从不原地修改，可共享引用。
        // 大响应场景下避免每步 JSON 深拷贝两份（快照 + 恢复）的内存/CPU 开销。
        return {
            vars: { ...runtime.vars },
            lastResponse: runtime.lastResponse,
            lastResponseBody: runtime.lastResponseBody
        };
    }

    function rememberDebugRuntime(stepIndex, runtime) {
        state.debugRuntimes[stepIndex] = snapshotStepRuntime(runtime);
    }

    function getDebugRuntime(stepIndex) {
        var snapshot = state.debugRuntimes[stepIndex];
        if (!snapshot) return null;
        return {
            vars: { ...snapshot.vars },
            lastResponse: snapshot.lastResponse,
            lastResponseBody: snapshot.lastResponseBody
        };
    }

    // 变量差集：新增键或值（JSON 序列化）变化的键视为本步变更（extract 只做顶层赋值，删除不存在）
    function diffVars(before, after) {
        var changed = [];
        Object.keys(after || {}).forEach(function (key) {
            var had = Object.prototype.hasOwnProperty.call(before || {}, key);
            if (!had || JSON.stringify(before[key]) !== JSON.stringify(after[key])) changed.push(key);
        });
        return changed;
    }

    // 运行时变量面板视图：执行后全量 vars + 本步变更键；快照缺失（如旧会话回退越界）时返回 null 不渲染
    function buildVarsView(stepIndex) {
        var before = state.debugRuntimes[stepIndex];
        if (!before) return null;
        var after = state.varsTrail[stepIndex] || before.vars;
        return { vars: after, changedKeys: diffVars(before.vars, after) };
    }

    function restoreStepRuntime(runtime, snapshot) {
        runtime.vars = { ...snapshot.vars };
        runtime.lastResponse = snapshot.lastResponse;
        runtime.lastResponseBody = snapshot.lastResponseBody;
        runtime.abortController = new AbortController();
        runtime.cancelled = false;
    }

    function refreshStepSessionView() {
        renderStatsAll();
        renderFilterAll();
        renderStepsAll();
        renderReportPanel();
    }

    function rewindToStep(stepIndex) {
        if (state.running || state.executionMode !== 'step' || !state.stepRuntime || !state.stepCheckpoints[stepIndex]) return false;
        restoreStepRuntime(state.stepRuntime, state.stepCheckpoints[stepIndex]);
        state.steps = state.steps.slice(0, stepIndex);
        state.stepCheckpoints = state.stepCheckpoints.slice(0, stepIndex + 1);
        state.debugRuntimes = state.debugRuntimes.slice(0, stepIndex);
        state.varsTrail = state.varsTrail.slice(0, stepIndex);
        state.nextStepIndex = stepIndex;
        state.lastReport = null;
        // 回退后会话继续：清掉上一轮结束时间，避免底部显示早已过期的完成时刻
        state.endTime = null;
        refreshStepSessionView();
        uiView.setRunState('idle', '已回退到第 ' + (stepIndex + 1) + ' 步');
        return true;
    }

    function rerunStep(stepIndex) {
        if (rewindToStep(stepIndex)) runNextStep();
    }

    function setExecutionButtonsDisabled(disabled) {
        var runBtn = document.getElementById('runBtn');
        var runBtnLabel = document.getElementById('runBtnLabel');
        var fullRunActive = disabled && state.executionMode === 'full';
        runBtn.disabled = disabled;
        if (runBtnLabel) runBtnLabel.textContent = fullRunActive ? '执行中…' : '执行全部';
        runBtn.classList.toggle('scenario-header-button--running', fullRunActive);
        runBtn.setAttribute('aria-busy', fullRunActive ? 'true' : 'false');
        document.getElementById('stepBtn').disabled = disabled;
        var resetBtn = document.getElementById('resetBtn');
        if (resetBtn) resetBtn.disabled = disabled;
        document.getElementById('cancelBtn').disabled = !disabled;
        ['environmentSelect', 'configToggleBtn', 'envDropdownTrigger', 'themeDropdownTrigger'].forEach(function (id) {
            var element = document.getElementById(id);
            if (element) {
                element.disabled = disabled;
                element.setAttribute('aria-disabled', disabled ? 'true' : 'false');
                element.classList.toggle('opacity-50', disabled);
                element.classList.toggle('pointer-events-none', disabled);
            }
        });
        document.querySelectorAll('#configModal input, #configModal select, #configModal button').forEach(function (element) {
            element.disabled = disabled;
        });
    }

    function cancelExecution() {
        var runtime = state.activeRuntime || state.stepRuntime;
        if (!state.running || !runtime || !runtime.abortController) return;
        runtime.cancelled = true;
        runtime.abortController.abort(new Error('用户已取消执行'));
        uiView.setRunState('cancelled', '正在取消');
    }

    // 单步/全量执行后的进度清零：不清场景定义，只回退执行态
    function resetExecution() {
        if (state.running) return;
        state.steps = [];
        state.stepRuntime = null;
        state.stepCheckpoints = [];
        state.debugRuntimes = [];
        state.varsTrail = [];
        state.activeRuntime = null;
        state.nextStepIndex = 0;
        state.lastReport = null;
        state.startTime = null;
        state.endTime = null;
        state.executionMode = 'full';
        stepsFilterState.type = 'all';
        stepsFilterState.keyword = '';
        renderStatsAll();
        renderFilterAll();
        renderStepsAll();
        renderReportPanel();
        setSidePanelTab('stats');
        uiView.setRunState('idle', '待执行');
    }

    function showDiagnosticError(error, customState) {
        var message = error && error.message ? String(error.message) : (error ? String(error) : '执行异常');
        var runState = customState || (/缺少场景凭据|配置/.test(message) ? '配置缺失' : '执行前失败');
        // 已开始的会话因异常终止：同样落结束时间，避免底部结束时间停留在「-」
        if (state.startTime) state.endTime = new Date();
        uiView.setRunState('failed', runState);
        var reportTab = document.getElementById('reportTab');
        var reportTabBadge = document.getElementById('reportTabBadge');
        if (reportTab) reportTab.disabled = false;
        if (reportTabBadge) {
            reportTabBadge.textContent = '!';
            reportTabBadge.classList.add('is-alert');
            reportTabBadge.style.display = '';
        }
        var reportPanel = document.getElementById('reportPanel');
        if (reportPanel) {
            reportPanel.innerHTML =
                '<div class="report-content">' +
                    '<div class="rounded-lg border border-rose-200 bg-rose-50 p-4 text-rose-800 space-y-2">' +
                        '<div class="font-bold text-xs flex items-center gap-1.5 text-rose-700">' +
                            '<svg class="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>' +
                            '<span>' + esc(runState) + '</span>' +
                        '</div>' +
                        '<div class="text-xs text-rose-700 leading-relaxed font-mono whitespace-pre-wrap break-all">' + esc(message) + '</div>' +
                        '<div class="text-[11px] text-rose-600/80 pt-1 border-t border-rose-200/60">可点击右上角「配置」按钮检查环境参数，或查看控制台日志。</div>' +
                    '</div>' +
                '</div>';
        }
        // 面板内容已按诊断形态手工写入：切页签时跳过常规重建，否则诊断被覆盖
        setSidePanelTab('report', { preservePanel: true });
    }

    function showExecutionConfigError(error) {
        showDiagnosticError(error, /缺少场景凭据|配置/.test(error && error.message ? error.message : '') ? '配置缺失' : '执行前失败');
    }

    function finishExecutionState(runtime) {
        // 会话结束（跑完/取消/异常终止统一走这里或 showDiagnosticError）：落结束时间供底部执行栏展示
        if (state.startTime) state.endTime = new Date();
        var cancelled = Boolean(runtime && runtime.cancelled) || state.steps.some(function (item) { return item.cancelled; });
        if (cancelled) {
            uiView.setRunState('cancelled', '已取消');
            renderReportPanel();
            updateExecutionFooter();
            return;
        }
        var skipped = state.steps.filter(function (item) { return item.skipped; }).length;
        var failed = state.steps.filter(function (item) { return !item.skipped && !item.passed && !item.cancelled; }).length;
        var executed = state.steps.length - skipped;
        uiView.setRunState(failed ? 'failed' : (executed === 0 ? 'skipped' : 'success'), failed ? '存在失败' : (executed === 0 ? '全部跳过' : '执行成功'));
        renderReportPanel();
        updateExecutionFooter();
        if (failed > 0) {
            setSidePanelTab('report');
        } else {
            setSidePanelTab('stats');
        }
    }
    function highlightActiveStep(stepIndex) {
        var ul = document.getElementById('stepsList');
        if (!ul) return;
        ul.querySelectorAll('.scenario-step--running').forEach(function (node) {
            node.classList.remove('scenario-step--running');
        });
        var stepNode = ul.querySelector('li[data-step-idx="' + stepIndex + '"]') || ul.children[stepIndex];
        if (stepNode) {
            stepNode.classList.add('scenario-step--running');
            if (typeof stepNode.scrollIntoView === 'function') {
                stepNode.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }
        }
    }

    function clearActiveStepHighlight() {
        var ul = document.getElementById('stepsList');
        if (!ul) return;
        ul.querySelectorAll('.scenario-step--running').forEach(function (node) {
            node.classList.remove('scenario-step--running');
        });
    }

    function expandStepDetails(stepIndex) {
        var ul = document.getElementById('stepsList');
        if (!ul) return;
        var stepNode = ul.querySelector('li[data-step-idx="' + stepIndex + '"]') || ul.children[stepIndex];
        if (!stepNode) return;
        var panel = stepNode.querySelector('.details-panel');
        var chevron = stepNode.querySelector('.chevron');
        if (panel) panel.classList.add('open');
        if (chevron) chevron.classList.add('rotate-180');
        var header = stepNode.querySelector('[role="button"][tabindex]');
        if (header) header.setAttribute('aria-expanded', 'true');
    }

    function locateScenarioStep(stepIndex) {
        if (!Number.isInteger(stepIndex) || stepIndex < 0) return;
        stepsFilterState.type = 'all';
        stepsFilterState.keyword = '';
        var searchInput = document.getElementById('stepSearchInput');
        if (searchInput) searchInput.value = '';
        applyStepsFilter();

        var ul = document.getElementById('stepsList');
        var stepNode = ul && ul.querySelector('li[data-step-idx="' + stepIndex + '"]');
        if (!ul || !stepNode) return;
        expandStepDetails(stepIndex);

        ul.querySelectorAll('.scenario-step--located').forEach(function (node) {
            node.classList.remove('scenario-step--located');
        });
        stepNode.classList.add('scenario-step--located');
        if (locatedStepHighlightTimer) window.clearTimeout(locatedStepHighlightTimer);
        locatedStepHighlightTimer = window.setTimeout(function () {
            stepNode.classList.remove('scenario-step--located');
            locatedStepHighlightTimer = null;
        }, 2400);

        var listRect = ul.getBoundingClientRect();
        var stepRect = stepNode.getBoundingClientRect();
        var top = ul.scrollTop + stepRect.top - listRect.top - Math.max(0, (ul.clientHeight - stepNode.offsetHeight) / 2);
        var reducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        if (typeof ul.scrollTo === 'function') {
            ul.scrollTo({ top: Math.max(0, top), behavior: reducedMotion ? 'auto' : 'smooth' });
        } else {
            ul.scrollTop = Math.max(0, top);
        }
        var stepHeader = stepNode.querySelector('[role="button"][tabindex]');
        if (stepHeader) stepHeader.focus({ preventScroll: true });
    }

    async function runScenario() {
        if (!state.scenario || state.running) return;
        var cfg = appConfig;
        var runtime;
        try {
            runtime = createExecutionRuntime();
        } catch (error) {
            showExecutionConfigError(error);
            return;
        }
        var list = Array.isArray(state.scenario.steps) ? state.scenario.steps : [];
        var failurePolicy = state.scenario.failurePolicy || 'stop';
        state.running = true;
        state.activeRuntime = runtime;
        state.executionMode = 'full';
        state.stepRuntime = null;
        state.stepCheckpoints = [];
        state.debugRuntimes = [];
        state.nextStepIndex = 0;
        state.steps = [];
        state.lastReport = null;
        state.startTime = new Date();
        state.endTime = null;
        state.varsTrail = [];
        setExecutionButtonsDisabled(true);
        uiView.setRunState('running', '执行中');
        // 新一轮开始先全量渲染一次待执行占位（同时清掉上一轮遗留的已渲染步骤）；
        // 循环内改用 appendStepResult 增量追加，避免长场景每步全量重建
        renderStepsAll();
        setSidePanelTab('stats');

        try {
            for (var i = 0; i < list.length; i += 1) {
                highlightActiveStep(i);
                rememberDebugRuntime(i, runtime);
                var result = await executeStep(list[i], runtime, cfg);
                result.stepNo = i + 1;
                state.steps.push(result);
                state.varsTrail[i] = { ...runtime.vars };
                renderStatsAll();
                renderFilterAll();
                uiView.appendStepResult(result, i, list, state.executionMode, buildVarsView(i));
                renderReportPanel();
                // 与 engine.runScenario 对齐：stop 策略失败即停；取消信号中止时不论本步成败都停。
                // 此前条件把「信号已中止但本步通过」漏进下一轮，会多产生一条引擎不会有的 CANCELLED 步骤
                if ((!result.passed && failurePolicy !== 'continue') || runtime.abortController.signal.aborted) break;
            }
            clearActiveStepHighlight();
            finishExecutionState(runtime);
        } catch (error) {
            clearActiveStepHighlight();
            showDiagnosticError(error, '执行异常');
        } finally {
            clearActiveStepHighlight();
            state.running = false;
            state.activeRuntime = null;
            setExecutionButtonsDisabled(false);
        }
    }

    async function runNextStep() {
        if (!state.scenario || state.running) return;
        var cfg = appConfig;
        var list = Array.isArray(state.scenario.steps) ? state.scenario.steps : [];
        if (!list.length) return;
        if (!state.stepRuntime || state.nextStepIndex >= list.length) {
            try {
                state.stepRuntime = createExecutionRuntime();
            } catch (error) {
                showExecutionConfigError(error);
                return;
            }
            state.nextStepIndex = 0;
            state.steps = [];
            state.stepCheckpoints = [snapshotStepRuntime(state.stepRuntime)];
            state.debugRuntimes = [];
            state.lastReport = null;
            state.startTime = new Date();
            state.endTime = null;
            state.varsTrail = [];
            // 从头开始单步执行：全量渲染待执行占位，清掉上一轮遗留（循环内为增量追加）
            renderStepsAll();
            setSidePanelTab('stats');
        }

        var runtime = state.stepRuntime;
        var stepIndex = state.nextStepIndex;
        state.running = true;
        state.activeRuntime = runtime;
        state.executionMode = 'step';
        setExecutionButtonsDisabled(true);
        highlightActiveStep(stepIndex);
        uiView.setRunState('running', '执行第 ' + (stepIndex + 1) + ' 步');
        uiView.setStepLoading(true, '正在执行第 ' + (stepIndex + 1) + ' 步：' + (list[stepIndex].name || '未命名步骤'));

        try {
            rememberDebugRuntime(stepIndex, runtime);
            var result = await executeStep(list[stepIndex], runtime, cfg);
            result.stepNo = stepIndex + 1;
            state.steps.push(result);
            state.varsTrail[stepIndex] = { ...runtime.vars };
            state.nextStepIndex += 1;
            state.stepCheckpoints[state.nextStepIndex] = snapshotStepRuntime(runtime);
            renderStatsAll();
            renderFilterAll();
            uiView.appendStepResult(result, stepIndex, list, state.executionMode, buildVarsView(stepIndex));
            expandStepDetails(stepIndex);
            renderReportPanel();

            if (runtime.cancelled || result.cancelled || result.timedOut) {
                // 取消/超时终止单步会话（有意设计并有浏览器测试钉住：超时后从第 1 步重来，
                // 与「失败可继续下一步」刻意区分——超时通常意味着服务不可用，继续执行意义不大）
                state.stepRuntime = null;
                finishExecutionState(runtime);
            } else if (state.nextStepIndex >= list.length) {
                finishExecutionState(runtime);
            } else {
                uiView.setRunState(result.passed ? 'idle' : 'failed', (result.passed ? '待执行第 ' : '第 ' + (stepIndex + 1) + ' 步失败，下一步为第 ') + (state.nextStepIndex + 1) + ' 步');
            }
        } catch (error) {
            state.stepRuntime = null;
            showDiagnosticError(error, '执行异常');
        } finally {
            clearActiveStepHighlight();
            uiView.setStepLoading(false);
            state.running = false;
            state.activeRuntime = null;
            setExecutionButtonsDisabled(false);
        }
    }

    // ===== 设置与头部 UI =====
    function renderEnvironmentSelects() {
        var environments = getEnvironments();
        var selectedEnv = getSelectedEnvironment();
        var selectedKey = selectedEnv ? selectedEnv.key : '';
        ['environmentSelect', 'environmentInput'].forEach(function (id) {
            var select = document.getElementById(id);
            if (!select) return;
            select.innerHTML = environments.map(function (env) {
                var selectedAttr = env.key === selectedKey ? ' selected' : '';
                return '<option value="' + esc(env.key) + '"' + selectedAttr + '>' + esc(env.name || env.key) + '</option>';
            }).join('');
        });
    }

    // 凭据类变量名启发式：命中则输入框掩码（type=password）并提供明文切换
    var SECRET_VAR_PATTERN = /(token|secret|password|passwd|auth|credential|api[-_]?key)/i;

    function renderScenarioVariableInputs() {
        var container = document.getElementById('scenarioVarsInput');
        if (!container) return;
        var defs = getScenarioVariableDefinitions();
        if (!defs.length) {
            container.innerHTML = '<div class="text-xs text-slate-400 col-span-2">未声明可配置变量</div>';
            return;
        }
        var stored = getStoredScenarioVariables();
        container.innerHTML = defs.map(function (def) {
            var value = stored[def.name] || '';
            // 凭据类变量掩码显示（可切换明文），避免联调时 Token 在屏幕侧显
            var isSecret = SECRET_VAR_PATTERN.test(def.name);
            return '<label class="flex flex-col gap-1.5">' +
                '<span class="text-[11px] font-bold uppercase tracking-wider text-slate-400">' + esc(def.label) + ' (' + esc(def.name) + ')' +
                    (isSecret ? ' <button type="button" data-toggle-var="' + esc(def.name) + '" class="font-normal normal-case tracking-normal text-emerald-500 hover:text-emerald-400">显示</button>' : '') +
                '</span>' +
                '<input id="scenarioVar_' + esc(def.name) + '" type="' + (isSecret ? 'password' : 'text') + '" value="' + esc(value) + '" placeholder="请输入 ' + esc(def.label) + '" autocomplete="off" class="px-3 py-2 bg-slate-900 border border-slate-600 rounded-md text-sm text-white placeholder-slate-500 outline-hidden focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500">' +
                '</label>';
        }).join('');
    }

    // 构建 header 类型的参数名/参数值 datalist 片段（type 不为 header 时返回空）
    function buildGlobalInputAttrs(g, index) {
        if (g.type !== 'header') return { nameList: '', valueList: '', valueDatalist: '' };
        var valueOptions = HEADER_VALUE_OPTIONS[g.name];
        var nameList = ' list="globalHeaderNameList"';
        if (!valueOptions || !valueOptions.length) return { nameList: nameList, valueList: '', valueDatalist: '' };
        var listId = 'globalValueList_' + (++globalValueListSeq);
        var valueDatalist = '<datalist id="' + listId + '">' +
            valueOptions.map(function (value) { return '<option value="' + esc(value) + '"></option>'; }).join('') +
            '</datalist>';
        return { nameList: nameList, valueList: ' list="' + listId + '"', valueDatalist: valueDatalist };
    }

    // 刷新单行 header 参数值的常用值建议（参数名变化时调用）
    function refreshHeaderValueDatalist(row, name) {
        var valueInput = row.querySelector('.global-value');
        var existing = row.querySelector('.global-value-datalist');
        var options = HEADER_VALUE_OPTIONS[name] || [];
        if (!options.length) {
            if (existing) existing.remove();
            if (valueInput) valueInput.removeAttribute('list');
            return;
        }
        var listId = 'globalValueList_' + (++globalValueListSeq);
        if (!existing) {
            existing = document.createElement('datalist');
            existing.className = 'global-value-datalist';
            row.appendChild(existing);
        }
        existing.id = listId;
        existing.innerHTML = options.map(function (value) { return '<option value="' + esc(value) + '"></option>'; }).join('');
        if (valueInput) valueInput.setAttribute('list', listId);
    }

    function renderGlobalsInput() {
        var container = document.getElementById('globalsInput');
        if (!container) return;
        var globals = getEffectiveGlobals();
        container.innerHTML = globals.map(function (g, index) {
            var typeOptions = GLOBAL_TYPES.map(function (type) {
                return '<option value="' + type + '"' + (g.type === type ? ' selected' : '') + '>' + type + '</option>';
            }).join('');
            var attrs = buildGlobalInputAttrs(g, index);
            return '<div class="global-param-row flex items-center gap-2" data-index="' + index + '">' +
                '<select class="global-type flex-shrink-0 px-2 py-2 bg-slate-900 border border-slate-600 rounded-md text-sm text-white outline-hidden focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500">' + typeOptions + '</select>' +
                '<input class="global-name flex-1 min-w-0 px-2 py-2 bg-slate-900 border border-slate-600 rounded-md text-sm text-white placeholder-slate-500 outline-hidden focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"' + attrs.nameList + ' placeholder="参数名" value="' + esc(g.name) + '" />' +
                '<input class="global-value flex-1 min-w-0 px-2 py-2 bg-slate-900 border border-slate-600 rounded-md text-sm text-white placeholder-slate-500 outline-hidden focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"' + attrs.valueList + ' placeholder="参数值，支持 {{vars.xxx}}" value="' + esc(g.value) + '" />' +
                '<button type="button" class="global-remove flex-shrink-0 px-2.5 py-2 rounded-md bg-slate-700 text-slate-300 text-xs font-bold hover:bg-slate-600 transition-colors" title="删除该参数">✕</button>' +
                attrs.valueDatalist +
                '</div>';
        }).join('');
    }

    function collectGlobalsFromInput() {
        var list = [];
        var rows = document.querySelectorAll('#globalsInput .global-param-row');
        rows.forEach(function (row) {
            var type = row.querySelector('.global-type').value;
            var name = String(row.querySelector('.global-name').value || '').trim();
            if (!name) return;
            list.push({ type: type, name: name, value: row.querySelector('.global-value').value });
        });
        return list;
    }

    function bindGlobalsEvents() {
        var addBtn = document.getElementById('addGlobalBtn');
        if (!addBtn) return;
        addBtn.addEventListener('click', function () {
            var container = document.getElementById('globalsInput');
            if (!container) return;
            var row = document.createElement('div');
            row.className = 'global-param-row flex items-center gap-2';
            row.innerHTML = '<select class="global-type flex-shrink-0 px-2 py-2 bg-slate-900 border border-slate-600 rounded-md text-sm text-white outline-hidden focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500">' +
                GLOBAL_TYPES.map(function (type) { return '<option value="' + type + '">' + type + '</option>'; }).join('') +
                '</select>' +
                '<input class="global-name flex-1 min-w-0 px-2 py-2 bg-slate-900 border border-slate-600 rounded-md text-sm text-white placeholder-slate-500 outline-hidden focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500" list="globalHeaderNameList" placeholder="参数名" />' +
                '<input class="global-value flex-1 min-w-0 px-2 py-2 bg-slate-900 border border-slate-600 rounded-md text-sm text-white placeholder-slate-500 outline-hidden focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500" placeholder="参数值，支持 {{vars.xxx}}" />' +
                '<button type="button" class="global-remove flex-shrink-0 px-2.5 py-2 rounded-md bg-slate-700 text-slate-300 text-xs font-bold hover:bg-slate-600 transition-colors" title="删除该参数">✕</button>';
            container.appendChild(row);
        });
        document.addEventListener('click', function (event) {
            var target = event.target;
            if (!target || !target.classList || !target.classList.contains('global-remove')) return;
            var row = target.closest('.global-param-row');
            if (row) row.parentNode.removeChild(row);
        });
        // 参数名变化时刷新该行 header 值的常用值建议
        document.addEventListener('input', function (event) {
            var target = event.target;
            if (!target || !target.classList || !target.classList.contains('global-name')) return;
            var row = target.closest('.global-param-row');
            if (!row || row.querySelector('.global-type').value !== 'header') return;
            refreshHeaderValueDatalist(row, String(target.value || '').trim());
        });
        // 类型切换时同步 name 的 Header 下拉与 value 建议
        document.addEventListener('change', function (event) {
            var target = event.target;
            if (!target || !target.classList || !target.classList.contains('global-type')) return;
            var row = target.closest('.global-param-row');
            if (!row) return;
            var nameInput = row.querySelector('.global-name');
            var valueInput = row.querySelector('.global-value');
            var existing = row.querySelector('.global-value-datalist');
            if (target.value === 'header') {
                if (nameInput) nameInput.setAttribute('list', 'globalHeaderNameList');
                if (valueInput) refreshHeaderValueDatalist(row, String(nameInput ? nameInput.value : '').trim());
            } else {
                if (nameInput) nameInput.removeAttribute('list');
                if (existing) existing.remove();
                if (valueInput) valueInput.removeAttribute('list');
            }
        });
    }

    function syncSettingsInputs() {
        var keys = getStorageKeys();
        var environment = getSelectedEnvironment();
        renderEnvironmentSelects();
        renderScenarioVariableInputs();
        renderGlobalsInput();
        var baseUrlInput = document.getElementById('baseUrlInput');
        try {
            if (baseUrlInput) baseUrlInput.value = window.localStorage.getItem(getEnvironmentStorageKey(keys.baseUrl, environment)) || '';
        } catch (e) {
            if (baseUrlInput) baseUrlInput.value = '';
        }
    }

    function updateHeader() {
        var titleNode = document.getElementById('scenarioTitle');
        var envNode = document.getElementById('envNameLabel');
        var baseLabel = document.getElementById('baseUrlLabel');
        var authLabel = document.getElementById('authLabel');
        var authValue = document.getElementById('authValue');
        var environment = getSelectedEnvironment();
        var title = state.scenario ? (state.scenario.name || state.scenarioFile) : '未加载场景';
        if (titleNode) titleNode.textContent = title;
        if (envNode) envNode.textContent = environment ? (environment.name || environment.key) : '默认环境';
        var effectiveBaseUrl = getEffectiveBaseUrl();
        var globals = getEffectiveGlobals();
        if (baseLabel) baseLabel.textContent = effectiveBaseUrl || '(未配置)';
        if (authLabel && authValue) {
            if (globals.length) {
                authLabel.style.display = 'inline';
                var summary = globals.slice(0, 3).map(function (g) { return g.type + ':' + g.name; }).join(', ');
                authValue.textContent = summary + (globals.length > 3 ? ' 等 ' + globals.length + ' 项' : '');
                authLabel.title = safeJson(globals);
            } else {
                authLabel.style.display = 'none';
                authValue.textContent = '';
                authLabel.title = '';
            }
        }
    }

    function bindThemeEvents() {
        var select = document.getElementById('themeSelect');
        if (!select) return;
        select.addEventListener('change', function (event) {
            persistSetting(getStorageKeys().theme, event.target.value);
            uiStyle.applyTheme(event.target.value);
            renderScenarioSelect();
        });
    }

    function bindSettingsEvents() {
        var envSelectHeader = document.getElementById('environmentSelect');
        var envSelectPanel = document.getElementById('environmentInput');
        var saveBtn = document.getElementById('saveSettingsBtn');
        var clearBtn = document.getElementById('clearSettingsBtn');
        var configToggleBtn = document.getElementById('configToggleBtn');
        var configCloseBtn = document.getElementById('configCloseBtn');
        var keys = getStorageKeys();
        var noticeTimer = null;
        var configReturnFocus = null;

        function showSettingsNotice(message) {
            var notice = document.getElementById('settingsNotice');
            if (!notice) return;
            if (noticeTimer) window.clearTimeout(noticeTimer);
            notice.textContent = message;
            notice.classList.remove('hidden');
            noticeTimer = window.setTimeout(function () {
                notice.textContent = '';
                notice.classList.add('hidden');
            }, 2500);
        }

        function openConfigModal() {
            var modal = document.getElementById('configModal');
            if (!modal) return;
            configReturnFocus = document.activeElement;
            syncSettingsInputs();
            modal.classList.remove('hidden');
            modal.setAttribute('aria-hidden', 'false');
            window.requestAnimationFrame(function () {
                var firstInput = document.getElementById('environmentInput');
                if (firstInput) firstInput.focus();
            });
        }

        function closeConfigModal() {
            var modal = document.getElementById('configModal');
            if (!modal || modal.classList.contains('hidden')) return;
            modal.classList.add('hidden');
            modal.setAttribute('aria-hidden', 'true');
            if (configReturnFocus && configReturnFocus.focus) configReturnFocus.focus();
            configReturnFocus = null;
        }

        if (configToggleBtn) {
            configToggleBtn.addEventListener('click', openConfigModal);
        }
        if (configCloseBtn) {
            configCloseBtn.addEventListener('click', closeConfigModal);
        }
        var configModal = document.getElementById('configModal');
        configModal.addEventListener('keydown', function (event) {
            if (event.key !== 'Tab') return;
            var focusable = Array.from(configModal.querySelectorAll('button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'))
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
        document.addEventListener('keydown', function (event) {
            if (event.key === 'Escape') closeConfigModal();
        });
        configModal.addEventListener('click', function (event) {
            if (event.target === configModal) closeConfigModal();
        });

        function selectEnvironment(envKey) {
            persistSetting(keys.environment, envKey);
            syncSettingsInputs();
            updateHeader();
            renderStatsAll();
            renderFilterAll();
            renderStepsAll();
        }

        if (envSelectHeader) {
            envSelectHeader.addEventListener('change', function (e) { selectEnvironment(e.target.value); });
        }
        if (envSelectPanel) {
            envSelectPanel.addEventListener('change', function (e) { selectEnvironment(e.target.value); });
        }
        if (saveBtn) {
            saveBtn.addEventListener('click', function () {
                var environment = getSelectedEnvironment();
                var baseUrlInput = document.getElementById('baseUrlInput');
                var baseUrl = String(baseUrlInput.value || '').trim().replace(/\/+$/, '');
                var globals = collectGlobalsFromInput();
                persistSetting(getEnvironmentStorageKey(keys.baseUrl, environment), baseUrl);
                persistSetting(getEnvironmentStorageKey(keys.globals, environment), globals.length ? JSON.stringify(globals) : '');
                persistScenarioVariables();
                updateHeader();
                showSettingsNotice('当前环境设置已保存并生效');
            });
        }
        if (clearBtn) {
            clearBtn.addEventListener('click', function () {
                var environment = getSelectedEnvironment();
                persistSetting(getEnvironmentStorageKey(keys.baseUrl, environment), '');
                persistSetting(getEnvironmentStorageKey(keys.globals, environment), '');
                getScenarioVariableDefinitions().forEach(function (def) {
                    persistSetting(getScenarioVariableStorageKey(def.name, environment), '');
                });
                syncSettingsInputs();
                updateHeader();
                showSettingsNotice('当前环境覆盖已清除，已恢复配置值');
            });
        }
    }

    function bindReportActions() {
        function flashCopyFeedback(btn, ok) {
            if (!btn) return;
            if (btn.__copyFeedbackTimer) window.clearTimeout(btn.__copyFeedbackTimer);
            if (btn.__copyOriginalHtml == null) btn.__copyOriginalHtml = btn.innerHTML;
            var label = ok ? '已复制' : '复制失败';
            btn.innerHTML = '<span style="color:' + (ok ? '#059669' : '#dc2626') + ';font-weight:700">' + label + '</span>';
            btn.__copyFeedbackTimer = window.setTimeout(function () {
                btn.innerHTML = btn.__copyOriginalHtml;
                btn.__copyFeedbackTimer = null;
            }, 1500);
        }
        function handleCopy(btn, getText) {
            var report = state.lastReport || uiView.buildOverallReport(state.steps, state.scenario, state.scenarioFile, state.executionMode, getSelectedEnvironment());
            if (!report) return;
            Promise.resolve()
                .then(function () { return getText(report); })
                .then(copyText)
                .then(function (ok) { flashCopyFeedback(btn, ok); })
                .catch(function () { flashCopyFeedback(btn, false); });
        }

        document.addEventListener('click', function (event) {
            var target = event.target;
            if (!target || !target.closest) return;
            var mdBtn = target.closest('#copyReportMarkdownBtn') || target.closest('#copyDiagnosisMarkdownBtn');
            if (mdBtn) {
                event.preventDefault();
                handleCopy(mdBtn, function (report) { return uiView.buildMarkdownReport(report); });
                return;
            }
            var jsonBtn = target.closest('#copyReportJsonBtn') || target.closest('#copyDiagnosisJsonBtn');
            if (jsonBtn) {
                event.preventDefault();
                handleCopy(jsonBtn, function (report) { return safeJson(report); });
                return;
            }
        });
    }

    // 步骤级复制：标题 + METHOD path（复制按钮在步骤项上，事件委托）
    function bindStepCopyActions() {
        var ul = document.getElementById('stepsList');
        if (!ul) return;
        ul.addEventListener('click', function (event) {
            var button = event.target && event.target.closest ? event.target.closest('[data-copy-step]') : null;
            if (!button) return;
            var index = Number(button.getAttribute('data-copy-step'));
            if (!Number.isInteger(index)) return;
            var step = state.scenario && Array.isArray(state.scenario.steps) ? state.scenario.steps[index] : null;
            if (!step) return;
            var text = (step.name ? step.name : '步骤 ' + (index + 1)) + '\n' + String(step.method || 'GET').toUpperCase() + ' ' + (step.path || '');
            Promise.resolve()
                .then(function () { return copyText(text); })
                .then(function (ok) { showStepCopyFeedback(button, ok); })
                .catch(function () { showStepCopyFeedback(button, false); });
        });

        function showStepCopyFeedback(button, ok) {
            if (button.__copyFeedbackTimer) window.clearTimeout(button.__copyFeedbackTimer);
            if (button.__copyOriginalText == null) button.__copyOriginalText = button.textContent;
            button.textContent = ok ? '已复制' : '失败';
            button.__copyFeedbackTimer = window.setTimeout(function () {
                button.textContent = button.__copyOriginalText;
                button.__copyFeedbackTimer = null;
            }, 1500);
        }
    }

    // POSIX shell 单引号转义：单引号内不做 $VAR/$(...)/反引号展开，值中的 ' 用 '\'' 收尾再续开。
    // 复制出的命令与工作台实际发送值一致，也避免变量值借复制粘贴注入命令。
    function shellSingleQuote(value) {
        return "'" + String(value).replace(/'/g, "'\\''") + "'";
    }

    function generateStepCurl(step, stepIndex) {
        if (!step) return '';
        var method = String(step.method || (step.request && step.request.method) || 'GET').toUpperCase();
        var baseUrl = getRequestBaseUrl();
        var rawVars = Object.assign({}, getConfiguredScenarioVariables(), getStoredScenarioVariables());
        var resolvedVars = clone(rawVars);
        if (state.activeRuntime && state.activeRuntime.vars) {
            Object.assign(resolvedVars, state.activeRuntime.vars);
        } else if (state.stepRuntime && state.stepRuntime.vars) {
            Object.assign(resolvedVars, state.stepRuntime.vars);
        }
        var runtime = { vars: resolvedVars };
        var stepPath = step.path || (step.request && step.request.path) || '';
        var stepParams = step.params || (step.request && step.request.params);
        var requestPath = core.buildUrl(stepPath, stepParams, runtime);

        var globals = getEffectiveGlobals();
        var headers = {};

        // 拼接 globals 的 query（追加到 fragment 之前，避免参数落入 fragment）
        var existingKeys = existingQueryKeys(requestPath);
        var queryParts = [];
        globals.forEach(function (global) {
            if (global.type !== 'query' || existingKeys.has(global.name)) return;
            queryParts.push.apply(queryParts, core.queryPairs(global.name, core.resolve(global.value, runtime)));
        });
        requestPath = appendQueryParams(requestPath, queryParts);

        // 拼接 globals 的 cookie
        var cookieParts = globals
            .filter(function (global) { return global.type === 'cookie'; })
            .map(function (global) { return global.name + '=' + core.resolveString(global.value, runtime); });

        // headers
        globals.forEach(function (g) {
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

        var fullUrl = core.joinUrl(baseUrl, requestPath);
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

    function bindStepCurlActions() {
        var ul = document.getElementById('stepsList');
        if (!ul) return;
        ul.addEventListener('click', function (event) {
            var button = event.target && event.target.closest ? event.target.closest('[data-curl-step]') : null;
            if (!button) return;
            var index = Number(button.getAttribute('data-curl-step'));
            if (!Number.isInteger(index)) return;
            var step = state.scenario && Array.isArray(state.scenario.steps) ? state.scenario.steps[index] : null;
            if (!step) return;
            var curlCmd = generateStepCurl(step, index);
            Promise.resolve()
                .then(function () { return copyText(curlCmd); })
                .then(function (ok) {
                    if (button.__copyFeedbackTimer) window.clearTimeout(button.__copyFeedbackTimer);
                    if (button.__copyOriginalText == null) button.__copyOriginalText = button.textContent;
                    button.textContent = ok ? '已复制' : '失败';
                    button.__copyFeedbackTimer = window.setTimeout(function () {
                        button.textContent = button.__copyOriginalText;
                        button.__copyFeedbackTimer = null;
                    }, 1500);
                })
                .catch(function () {
                    button.textContent = '失败';
                });
        });
    }

    function bindCodeCopyActions() {
        document.addEventListener('click', function (event) {
            var button = event.target && event.target.closest ? event.target.closest('[data-code-copy]') : null;
            if (!button) return;
            var targetId = button.getAttribute('data-code-copy');
            var targetEl = document.getElementById(targetId);
            if (!targetEl) return;
            var text = targetEl.textContent || '';
            Promise.resolve()
                .then(function () { return copyText(text); })
                .then(function (ok) {
                    if (button.__copyFeedbackTimer) window.clearTimeout(button.__copyFeedbackTimer);
                    if (button.__copyOriginalText == null) button.__copyOriginalText = button.textContent;
                    button.textContent = ok ? '已复制' : '复制失败';
                    button.classList.toggle('code-copy-btn--success', ok);
                    button.__copyFeedbackTimer = window.setTimeout(function () {
                        button.textContent = button.__copyOriginalText;
                        button.classList.remove('code-copy-btn--success');
                        button.__copyFeedbackTimer = null;
                    }, 1500);
                })
                .catch(function () {
                    button.textContent = '复制失败';
                });
        });
    }

    function bindGlobalShortcuts() {
        document.addEventListener('keydown', function (event) {
            // 弹窗编辑与下拉选择拥有当前键盘操作，避免快捷键执行背后的场景。
            if (event.defaultPrevented || event.isComposing) return;
            if (document.querySelector('#scenario-test-root [role="dialog"][aria-hidden="false"], #scenario-test-root .custom-dropdown.open')) return;

            var activeEl = document.activeElement;
            var isEditing = activeEl && (
                activeEl.tagName === 'INPUT' ||
                activeEl.tagName === 'TEXTAREA' ||
                activeEl.tagName === 'SELECT' ||
                activeEl.tagName === 'BUTTON' ||
                activeEl.isContentEditable
            );

            // Ctrl + Enter / Meta + Enter -> 执行全部
            if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
                event.preventDefault();
                var runBtn = document.getElementById('runBtn');
                if (runBtn && !runBtn.disabled) runBtn.click();
                return;
            }

            // Alt + Enter -> 执行下一步
            if (event.key === 'Enter' && event.altKey) {
                event.preventDefault();
                var stepBtn = document.getElementById('stepBtn');
                if (stepBtn && !stepBtn.disabled) stepBtn.click();
                return;
            }

            // Alt + R -> 清除结果
            if ((event.key === 'r' || event.key === 'R') && event.altKey) {
                event.preventDefault();
                var resetBtn = document.getElementById('resetBtn');
                if (resetBtn && !resetBtn.disabled) resetBtn.click();
                return;
            }

            // Ctrl+K / Meta+K 在输入框中也可切换到场景搜索；/ 只在非编辑状态触发。
            if (((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') || (!isEditing && event.key === '/')) {
                event.preventDefault();
                var searchInput = document.getElementById('scenarioSearchInput');
                if (searchInput) {
                    searchInput.focus();
                    searchInput.select();
                }
                return;
            }

            if (!isEditing) {
                // Space -> 执行下一步
                if (event.key === ' ' || event.code === 'Space') {
                    event.preventDefault();
                    var stepBtn2 = document.getElementById('stepBtn');
                    if (stepBtn2 && !stepBtn2.disabled) stepBtn2.click();
                    return;
                }
            }
        });
    }

    function extractScenarioDisplayName(sourceText) {
        var text = String(sourceText || '');
        var head = text;
        var stepsAt = text.search(/\n\s*steps\s*:/);
        if (stepsAt >= 0) head = text.slice(0, stepsAt);
        var m = head.match(/\bname\s*:\s*"((?:[^"\\]|\\.)*)"/);
        if (m) return m[1].replace(/\\"/g, '"');
        m = head.match(/\bname\s*:\s*'((?:[^'\\]|\\.)*)'/);
        if (m) return m[1].replace(/\\'/g, "'");
        return null;
    }

    async function enrichDiscoveredScenarioNames() {
        var list = state.discoveredFiles;
        if (!list || !list.length) return;
        // Browsers reject fetch(file://...) even though classic script loading is
        // allowed. Config entries already carry their display names in this mode.
        if (window.location.protocol === 'file:') return;
        var results = await Promise.all(
            list.map(async function (item, i) {
                var path = String(item.file || '').replace(/^\.\//, '');
                if (!path) return { i: i, displayName: null };
                var url = './' + path + (path.indexOf('?') >= 0 ? '&' : '?') + 'ts=' + Date.now();
                try {
                    var response = await fetch(url);
                    if (!response.ok) throw new Error('fetch ' + path);
                    var text = await response.text();
                    return { i: i, displayName: extractScenarioDisplayName(text) };
                } catch (error) {
                    return { i: i, displayName: null };
                }
            })
        );
        results.forEach(function (r) {
            var row = list[r.i];
            if (!row) return;
            if (r.displayName) {
                row.name = r.displayName;
            } else if (!row.name) {
                row.name = row.file;
            }
        });
    }

    async function fetchDiscoveredScenarios() {
        var cfg = appConfig;
        if (!Array.isArray(cfg.scenarios) || cfg.scenarios.length === 0) {
            return;
        }
        state.discoveredFiles = cfg.scenarios.map(function (entry) {
            if (typeof entry === 'string') {
                return { name: entry, file: entry };
            }
            return {
                name: entry.name || entry.file || '',
                file: entry.file || entry.path || entry.url || ''
            };
        });
        await enrichDiscoveredScenarioNames();
        renderScenarioSelect();
    }

    function setScenarioQuery(file) {
        var url = new URL(window.location.href);
        url.searchParams.set('scenario', file);
        window.history.replaceState({}, '', url.toString());
    }

    function loadScenario(file) {
        return new Promise(function (resolveLoad, rejectLoad) {
            if (!file) {
                rejectLoad(new Error('未指定文件'));
                return;
            }
            // 场景文件加载白名单：?scenario= 等 URL 输入必须命中配置场景清单才允许加载。
            // registerScenario 校验发生在脚本执行之后（onload），先行校验避免诱导链接
            // 让工作台执行工作区内任意 JS（如 node_modules 中的脚本）并读取页面凭据
            var known = (appConfig.scenarios || []).some(function (entry) {
                return entry && ['url', 'file', 'path'].some(function (key) { return entry[key] === file; });
            });
            if (!known) {
                rejectLoad(new Error('场景文件不在配置清单中，已拒绝加载: ' + file));
                return;
            }
            if (state.scenarioScript) {
                state.scenarioScript.remove();
                state.scenarioScript = null;
            }
            var script = document.createElement('script');
            script.src = './' + file + '?ts=' + Date.now();
            script.onload = function () {
                state.scenarioScript = script;
                state.scenarioFile = file;
                var entry = (appConfig.scenarios || []).filter(function (item) {
                    return (item.url || item.file || item.path) === file;
                })[0];
                var scenario = getRegisteredScenario(entry && entry.id);
                if (!scenario) {
                    rejectLoad(new Error('场景文件必须通过 ScenarioTest.registerScenario 注册: ' + file));
                    return;
                }
                state.scenario = clone(scenario);
                state.steps = [];
                state.stepRuntime = null;
                state.stepCheckpoints = [];
                state.debugRuntimes = [];
                state.nextStepIndex = 0;
                state.lastReport = null;

                syncSettingsInputs();
                updateHeader();
                renderScenarioSelect();
                renderStatsAll();
                renderFilterAll();
                renderStepsAll();
                renderReportPanel();
                setSidePanelTab('stats');
                uiView.setRunState('idle', '待执行');
                setScenarioQuery(file);
                resolveLoad(state.scenario);
            };
            script.onerror = function () {
                rejectLoad(new Error('场景文件加载失败，请检查路径是否正确: ' + file));
            };
            document.head.appendChild(script);
        });
    }

    function init() {
        uiStyle.injectStyles();
        uiView.buildSkeleton(options.mount);
        uiStyle.applyTheme(getEffectiveTheme());
        bindThemeEvents();
        syncSettingsInputs();
        bindSettingsEvents();
        bindGlobalsEvents();
        bindReportActions();
        bindSidePanelTabs();
        bindStepCopyActions();
        bindStepCurlActions();
        bindCodeCopyActions();
        bindGlobalShortcuts();

        uiAdhoc.bindAdhocRequestEvents(
            function (idx) {
                return state.scenario && Array.isArray(state.scenario.steps) ? state.scenario.steps[idx] : null;
            },
            function (idx) {
                var debugRt = getDebugRuntime(idx);
                if (debugRt) return debugRt;
                var rawVars = Object.assign({}, getConfiguredScenarioVariables(), getStoredScenarioVariables(), (state.scenario && state.scenario.vars) || {});
                return { vars: rawVars, lastResponse: null, lastResponseBody: null };
            },
            executeStep,
            getSelectedEnvironment,
            getRequestBaseUrl,
            getEffectiveAuthorization,
            getEffectiveGlobals,
            function () {
                var rawVars = Object.assign({}, getConfiguredScenarioVariables(), getStoredScenarioVariables(), (state.scenario && state.scenario.vars) || {});
                if (state.activeRuntime && state.activeRuntime.vars) {
                    Object.assign(rawVars, state.activeRuntime.vars);
                } else if (state.stepRuntime && state.stepRuntime.vars) {
                    Object.assign(rawVars, state.stepRuntime.vars);
                }
                return rawVars;
            }
        );

        updateHeader();
        renderScenarioSelect();

        var reportPanel = document.getElementById('reportPanel');
        if (reportPanel) {
            reportPanel.addEventListener('click', function (event) {
                var target = event.target.closest('[data-locate-step-index]');
                if (!target) return;
                var stepIndex = Number(target.dataset.locateStepIndex);
                if (!Number.isInteger(stepIndex) || stepIndex < 0) return;
                locateScenarioStep(stepIndex);
            });
        }

        var stepsList = document.getElementById('stepsList');
        stepsList.addEventListener('click', function (event) {
            var target = event.target.closest('[data-step-action]');
            if (!target) return;
            var stepIndex = Number(target.dataset.stepIndex);
            if (!isFinite(stepIndex) || stepIndex < 0) return;
            if (target.dataset.stepAction === 'rewind') rewindToStep(stepIndex);
            if (target.dataset.stepAction === 'rerun') rerunStep(stepIndex);
        });

        var scenarioList = document.getElementById('scenarioList');
        scenarioList.addEventListener('click', function (event) {
            if (event.target.closest('[data-clear-scenario-search]')) {
                clearScenarioSearch();
                return;
            }
            var pinTarget = event.target.closest('[data-pin-file]');
            if (pinTarget) {
                toggleScenarioPin(pinTarget.dataset.pinFile);
                return;
            }
            var target = event.target.closest('[data-scenario-file]');
            var file = target && target.dataset.scenarioFile;
            if (!file || state.running || file === state.scenarioFile) return;
            loadScenario(file).catch(function (error) {
                uiView.setRunState('failed', '加载失败');
                document.getElementById('statsPanel').innerHTML = '<div class="text-sm text-rose-500 p-4">' + esc(error.message) + '</div>';
            });
        });

        var scenarioSearchInput = document.getElementById('scenarioSearchInput');
        scenarioSearchInput.addEventListener('input', function (event) {
            state.scenarioSearch = event.target.value;
            renderScenarioSelect();
        });
        scenarioSearchInput.addEventListener('keydown', function (event) {
            if (event.key === 'Escape' && scenarioSearchInput.value) {
                event.preventDefault();
                clearScenarioSearch();
            }
        });
        var scenarioSearchClearButton = document.getElementById('scenarioSearchClearBtn');
        if (scenarioSearchClearButton) scenarioSearchClearButton.addEventListener('click', clearScenarioSearch);

        // 凭据变量明文/掩码切换（容器 innerHTML 会被重绘，监听挂在容器自身）
        var varsInputContainer = document.getElementById('scenarioVarsInput');
        if (varsInputContainer) {
            varsInputContainer.addEventListener('click', function (event) {
                var toggleButton = event.target.closest('[data-toggle-var]');
                if (!toggleButton) return;
                var input = document.getElementById('scenarioVar_' + toggleButton.dataset.toggleVar);
                if (!input) return;
                var reveal = input.type === 'password';
                input.type = reveal ? 'text' : 'password';
                toggleButton.textContent = reveal ? '隐藏' : '显示';
            });
        }

        document.getElementById('runBtn').addEventListener('click', runScenario);
        document.getElementById('stepBtn').addEventListener('click', runNextStep);
        document.getElementById('resetBtn').addEventListener('click', resetExecution);
        document.getElementById('cancelBtn').addEventListener('click', cancelExecution);

        function tryLoadInitial() {
            var initial = new URLSearchParams(window.location.search).get('scenario');
            if (!initial && state.discoveredFiles && state.discoveredFiles.length > 0) {
                initial = state.discoveredFiles[0].file;
            }

            if (!initial) {
                document.getElementById('statsPanel').innerHTML =
                    '<div class="text-sm text-slate-500 p-4">请在 URL 中提供 ?scenario=scenarios/xxx.js 访问，或者在上方选择加载。</div>';
                return;
            }

            loadScenario(initial).catch(function (error) {
                uiView.setRunState('failed', '加载失败');
                document.getElementById('statsPanel').innerHTML = '<div class="text-sm text-rose-500 p-4">' + esc(error.message) + '</div>';
            });
        }

        fetchDiscoveredScenarios().then(tryLoadInitial).catch(function (e) {
            console.warn(e);
            tryLoadInitial();
        });
    }

    init();

    return {
        loadScenario: loadScenario,
        runAll: runScenario,
        runNext: runNextStep,
        reset: resetExecution,
        cancel: cancelExecution,
        rewindToStep: rewindToStep,
        rerunStep: rerunStep,
        getState: function () { return state; }
    };
}
