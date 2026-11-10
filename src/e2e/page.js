// 沿用接口场景工作台的三栏布局与设计令牌；项目业务数据只通过通用 API 加载。
export const E2E_PAGE = `<!doctype html>
<html lang="zh-CN">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>浏览器 E2E · 测试工作台</title>
<style>
:root {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif;
  --canvas:#f8fafc; --surface:#fff; --border:#e2e8f0; --line:#f1f5f9; --text:#0f172a;
  --muted:#64748b; --subtle:#94a3b8; --primary:#0f172a; --primary-hover:#1e293b;
  --hover:#f1f5f9; --selected:#e2e8f0; --selected-line:#cbd5e1; --accent:#10b981;
  --success:#059669; --success-bg:#ecfdf5; --success-line:#a7f3d0;
  --danger:#e11d48; --danger-bg:#fff1f2; --danger-line:#fecdd3;
  --info:#2563eb; --info-bg:#eff6ff; --info-line:#bfdbfe;
  color:var(--text); background:var(--canvas); font-synthesis:none;
}
* {box-sizing:border-box;}
body {margin:0;font-size:12px;line-height:1.5;-webkit-font-smoothing:antialiased;}
button,input,a { -webkit-tap-highlight-color:transparent; }
button,input {font:inherit;}
button,a,input,summary {transition:background .15s,border-color .15s,box-shadow .15s,color .15s,transform .1s;}
button:focus-visible,a:focus-visible,input:focus-visible,summary:focus-visible {outline:2px solid rgba(51,65,85,.35);outline-offset:2px;}
header {height:56px;display:flex;align-items:center;gap:32px;padding:0 20px;background:var(--surface);border-bottom:1px solid var(--border);box-shadow:0 1px 2px rgba(0,0,0,.02);}
header>strong {display:flex;align-items:center;gap:9px;font-size:13.5px;font-weight:700;letter-spacing:-.01em;white-space:nowrap;}
.brand-icon {display:grid;place-items:center;width:26px;height:26px;color:#fff;background:var(--primary);border-radius:7px;}
svg {width:15px;height:15px;flex-shrink:0;vertical-align:middle;}
header nav {display:flex;gap:24px;align-self:stretch;}
header nav a {display:flex;align-items:center;gap:8px;color:var(--muted);text-decoration:none;border-bottom:2px solid transparent;font-size:12.5px;}
header nav a:hover {color:var(--text);}
header nav a.current {color:var(--text);border-bottom-color:var(--accent);font-weight:600;}
body.embedded header {display:none;}
.toolbar {height:48px;display:flex;align-items:center;gap:10px;padding:0 20px;background:var(--surface);border-bottom:1px solid var(--border);}
.toolbar h1 {margin:0;font-size:13px;font-weight:700;letter-spacing:-.01em;white-space:nowrap;}
.env-badge {display:inline-flex;align-items:center;gap:6px;max-width:320px;padding:2px 8px;border-radius:6px;background:rgba(241,245,249,.8);border:1px solid rgba(226,232,240,.6);color:var(--muted);font-size:11px;font-weight:600;white-space:nowrap;}
.env-badge .dot {width:6px;height:6px;border-radius:50%;background:var(--accent);flex-shrink:0;}
.env-badge b {font-weight:600;overflow:hidden;text-overflow:ellipsis;}
.toolbar .sep {color:#cbd5e1;user-select:none;}
.toolbar .note {margin-right:auto;padding-left:14px;border-left:1px solid var(--border);font-size:11px;}
.note {margin:0;color:var(--subtle);font-size:11.5px;line-height:1.6;}
button,a.button {display:inline-flex;align-items:center;justify-content:center;gap:7px;min-height:32px;padding:0 12px;background:var(--surface);border:1px solid var(--border);border-radius:7px;color:var(--text);text-decoration:none;cursor:pointer;font-size:12px;font-weight:600;white-space:nowrap;box-shadow:0 1px 2px rgba(0,0,0,.02);}
button:hover:not(:disabled),a.button:hover {background:var(--hover);border-color:var(--selected-line);}
button:active:not(:disabled),a.button:active {transform:scale(.97);}
button.primary {background:var(--primary);border-color:var(--primary);color:#fff;box-shadow:0 1px 2px rgba(0,0,0,.1),inset 0 1px 0 rgba(255,255,255,.15);}
button.primary:hover:not(:disabled) {background:var(--primary-hover);border-color:var(--primary-hover);color:#fff;}
button.text-action {border-color:transparent;background:transparent;color:var(--muted);box-shadow:none;}
button.text-action:hover:not(:disabled) {background:var(--hover);border-color:transparent;color:var(--text);}
button.text-action.danger {color:var(--danger);}
button:disabled {opacity:.4;cursor:not-allowed;box-shadow:none;}
.workspace {position:relative;height:calc(100dvh - 104px);display:grid;grid-template-columns:var(--list-w,260px) minmax(0,1fr) minmax(250px,290px);gap:8px;padding:8px;min-height:0;}
.list-resizer {position:absolute;top:0;bottom:0;left:calc(var(--list-w,260px) + 8px - 4px);z-index:7;width:8px;cursor:col-resize;touch-action:none;}
.list-resizer::after {content:"";position:absolute;top:8px;left:3px;bottom:8px;width:2px;border-radius:999px;background:color-mix(in srgb,var(--line) 65%,transparent);transition:background-color .15s ease;}
.list-resizer:hover::after,.list-resizer:focus-visible::after,.list-resizer.is-dragging::after {background:color-mix(in srgb,var(--primary) 45%,transparent);}
body.list-resizing {cursor:col-resize;user-select:none;}
body.list-resizing * {cursor:col-resize !important;}
body.embedded .workspace {height:calc(100dvh - 48px);}
.pane {min-width:0;min-height:0;display:flex;flex-direction:column;border:1px solid var(--border);border-radius:8px;background:var(--surface);overflow:hidden;box-shadow:0 1px 2px rgba(0,0,0,.02);}
.pane-head {padding:12px 14px;border-bottom:1px solid var(--line);background:rgba(248,250,252,.5);flex-shrink:0;}
.pane-title {display:flex;align-items:center;gap:6px;font-size:12px;font-weight:700;color:var(--text);}
.pane-title .pane-icon {width:14px;height:14px;color:var(--muted);}
#file-count {margin-left:auto;border-radius:4px;padding:1px 7px;background:var(--line);color:var(--muted);font-size:10.5px;font-weight:500;}
.search {position:relative;margin-top:8px;}
.search .search-icon {position:absolute;left:10px;top:50%;transform:translateY(-50%);width:14px;height:14px;color:var(--subtle);pointer-events:none;}
.search input {width:100%;height:30px;border:1px solid var(--border);border-radius:6px;padding:0 30px 0 30px;background:var(--surface);color:var(--text);font-size:12px;outline:none;}
.search input::placeholder {color:var(--subtle);}
.search input:focus {border-color:var(--primary);box-shadow:0 0 0 1px var(--primary);}
button.search-clear {position:absolute;right:5px;top:50%;transform:translateY(-50%);display:flex;align-items:center;justify-content:center;width:22px;height:22px;padding:0;border:0;border-radius:5px;background:transparent;box-shadow:none;color:var(--subtle);cursor:pointer;}
button.search-clear:hover {background:var(--hover);color:var(--muted);}
button.search-clear svg {width:12px;height:12px;}
.spec-list {flex:1;min-height:0;overflow:auto;padding:8px;}
.spec-tree {display:flex;flex-direction:column;gap:4px;min-width:0;}
.spec-dir {display:flex;flex-direction:column;min-width:0;}
.spec-dir-toggle {display:flex;align-items:center;gap:4px;width:100%;min-height:32px;padding:4px 8px;border-radius:6px;color:var(--muted);font-size:12px;font-weight:600;line-height:20px;text-align:left;cursor:pointer;user-select:none;transition:background-color .15s,color .15s;}
.spec-dir-toggle:hover {background:var(--hover);color:var(--text);}
.spec-dir-toggle .chevron {width:12px;height:12px;flex:0 0 auto;transition:transform .15s ease;}
.spec-dir-toggle[aria-expanded="false"] .chevron {transform:rotate(-90deg);}
.spec-dir-toggle .folder {width:16px;height:16px;flex:0 0 auto;color:var(--muted);}
.spec-dir-toggle[aria-expanded="true"] .folder {color:var(--primary);}
.spec-dir-name {min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
.spec-dir-count {flex:0 0 auto;margin-left:auto;min-width:20px;padding:0 4px;border-radius:4px;background:color-mix(in srgb,var(--muted) 8%,transparent);color:var(--muted);font-size:10px;font-weight:500;line-height:20px;text-align:center;font-variant-numeric:tabular-nums;}
.spec-children {position:relative;display:flex;flex-direction:column;min-width:0;}
.spec-children::before {content:"";position:absolute;top:0;bottom:8px;left:var(--tree-guide,14px);width:1px;background:color-mix(in srgb,var(--line) 35%,transparent);pointer-events:none;transition:background-color .15s;}
.spec-children:has(> .spec-item.is-active)::before {background:color-mix(in srgb,var(--primary) 25%,transparent);}
.spec-dir:has(.spec-item.is-active) > .spec-dir-toggle .spec-dir-name {color:var(--text);}
.spec-children[hidden] {display:none;}
.spec-item {position:relative;min-width:0;border-radius:6px;transition:background-color .15s;}
.spec-item:hover {background:var(--hover);}
.spec-item.is-active {background:color-mix(in srgb,var(--primary) 10%,var(--surface));box-shadow:inset 2px 0 0 var(--primary);}
button.spec-item-main {display:flex;align-items:center;justify-content:flex-start;gap:6px;width:100%;min-width:0;min-height:32px;padding:6px 32px 6px 28px;border:0;border-radius:inherit;background:transparent;box-shadow:none;color:var(--text);font-weight:400;text-align:left;white-space:normal;cursor:pointer;}
.spec-item-icon {width:14px;height:14px;flex:0 0 auto;color:var(--muted);}
.spec-item.is-active .spec-item-icon {color:var(--primary);}
.spec-item-text {display:flex;flex:1;flex-direction:column;min-width:0;gap:2px;}
.spec-item-name {display:block;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:12px;line-height:18px;font-weight:500;color:var(--text);}
.spec-item.is-active .spec-item-name {font-weight:600;color:var(--primary);}
.spec-item-file {display:none;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-family:Consolas,monospace;font-size:10px;line-height:14px;color:var(--muted);}
.spec-item.is-active .spec-item-file {display:block;}
.spec-item.is-active button.spec-item-main {min-height:48px;}
.service {padding:12px 14px;border-top:1px solid var(--line);color:var(--muted);font-size:11.5px;flex-shrink:0;}
.service summary,.log-details summary {cursor:pointer;user-select:none;font-weight:600;}
.service p {overflow-wrap:anywhere;font-size:11px;line-height:1.8;font-family:Consolas,monospace;}
.headbar {display:flex;align-items:center;justify-content:space-between;gap:10px;padding:10px 16px;border-bottom:1px solid var(--line);flex-shrink:0;}
.headbar-main {min-width:0;}
.headbar-row {display:flex;align-items:center;gap:8px;min-width:0;}
.headbar h2 {margin:0;font-size:14px;line-height:1.4;font-weight:700;letter-spacing:-.01em;color:var(--text);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
#selected-path {margin-top:2px;font-family:Consolas,monospace;font-size:11px;color:var(--subtle);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
#report {min-height:26px;padding:2px 10px;font-size:11px;font-weight:600;flex-shrink:0;}
.headed {display:flex;align-items:center;gap:7px;color:var(--muted);font-size:11.5px;cursor:pointer;white-space:nowrap;}
.headed input {width:14px;height:14px;margin:0;accent-color:var(--success);}
.status {display:inline-flex;align-items:center;padding:2px 8px;border-radius:4px;background:var(--line);color:var(--muted);font-size:11px;font-weight:700;border:1px solid var(--border);flex-shrink:0;}
.status.ok {background:var(--success-bg);color:var(--success);border-color:var(--success-line);}
.status.fail {background:var(--danger-bg);color:var(--danger);border-color:var(--danger-line);}
.status.running {background:var(--info-bg);color:var(--info);border-color:var(--info-line);}
.filterbar {display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;padding:6px 12px;border-bottom:1px solid var(--line);background:rgba(248,250,252,.5);flex-shrink:0;}
.filter-options {display:inline-flex;flex:0 0 auto;align-items:center;gap:2px;padding:2px;border:1px solid var(--line);border-radius:8px;background:var(--hover);}
button.filter-option {display:inline-flex;align-items:center;gap:4px;min-height:24px;padding:0 8px;border:0;border-radius:6px;background:transparent;box-shadow:none;color:var(--muted);font-size:11px;font-weight:600;cursor:pointer;}
button.filter-option:hover:not(.is-active) {color:var(--text);background:var(--surface);}
button.filter-option.is-active {color:var(--text);background:var(--surface);box-shadow:0 1px 3px rgba(15,23,42,.08);}
button.filter-option .n {font-family:Consolas,monospace;font-size:10px;font-variant-numeric:tabular-nums;opacity:.75;}
.filter-tools {display:flex;min-width:0;flex:1 1 220px;align-items:center;justify-content:flex-end;gap:8px;}
.filter-summary {flex:0 1 auto;min-width:0;overflow:hidden;text-overflow:ellipsis;color:var(--muted);font-size:10px;font-variant-numeric:tabular-nums;white-space:nowrap;}
#step-search {width:150px;height:26px;padding:0 8px;border:1px solid var(--border);border-radius:6px;background:var(--surface);color:var(--text);font-size:11px;outline:none;}
#step-search::placeholder {color:var(--subtle);}
#step-search:focus {border-color:var(--primary);box-shadow:0 0 0 1px var(--primary);}
.mid-scroll {flex:1;min-height:0;overflow-y:auto;}
#steps {margin:0;padding:0;list-style:none;}
.step-row {border-bottom:1px solid var(--line);background:var(--surface);}
.step-head {display:flex;align-items:center;justify-content:space-between;gap:10px;padding:10px 16px;}
.step-lead {display:flex;align-items:center;gap:10px;min-width:0;flex:1;}
.seq {display:flex;align-items:center;justify-content:center;width:20px;height:20px;border-radius:50%;flex-shrink:0;font-size:10.5px;font-weight:700;font-family:Consolas,monospace;background:#94a3b8;color:#fff;}
.seq.ok {background:var(--accent);}
.seq.fail {background:var(--danger);}
.seq svg {width:12px;height:12px;}
.step-title {min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:12px;font-weight:500;color:var(--text);}
.step-row[data-status="failed"] .step-title {font-weight:700;}
.step-tail {display:flex;align-items:center;gap:8px;flex-shrink:0;}
.step-badge {padding:2px 8px;border-radius:6px;font-size:10.5px;font-weight:700;font-family:Consolas,monospace;border:1px solid transparent;}
.step-badge.ok {background:var(--success-bg);color:var(--success);border-color:var(--success-line);}
.step-badge.fail {background:var(--danger-bg);color:var(--danger);border-color:var(--danger-line);}
.step-dur {width:64px;text-align:right;color:var(--subtle);font-size:11px;font-family:Consolas,monospace;font-variant-numeric:tabular-nums;}
.step-error {margin:0 16px 10px;padding:10px 12px;border:1px solid var(--danger-line);border-radius:8px;background:var(--danger-bg);color:#9f1239;font-size:11px;font-family:Consolas,monospace;white-space:pre-wrap;overflow-wrap:anywhere;}
.steps-empty {display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;min-height:140px;margin:8px;padding:32px 24px;border:1px dashed var(--line);border-radius:8px;background:color-mix(in srgb,var(--hover) 40%,transparent);color:var(--muted);font-size:12px;text-align:center;}
.evidence {padding:12px 16px 16px;border-top:1px solid var(--line);}
.evidence h3 {margin:0;font-size:12px;font-weight:700;}
.evidence>.note {margin-top:2px;margin-bottom:10px;}
.evidence-list {display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:12px;}
.evidence-item {display:block;min-width:0;padding:6px 6px 10px;border:1px solid var(--border);border-radius:8px;color:var(--text);text-decoration:none;background:var(--surface);transition:box-shadow .15s,border-color .15s,transform .15s;}
.evidence-item:hover {border-color:var(--selected-line);box-shadow:0 4px 8px rgba(0,0,0,.06);transform:translateY(-1px);}
.evidence-item img {display:block;width:100%;aspect-ratio:16/10;object-fit:contain;background:var(--canvas);border:1px solid var(--line);border-radius:5px;}
.evidence-item strong,.evidence-item small {display:block;margin:8px 4px 0;overflow-wrap:anywhere;}
.evidence-item strong {font-size:12px;font-weight:600;}.evidence-item small {margin-top:3px;font-size:11px;color:var(--subtle);}
.log-details {border-top:1px solid var(--line);}
.log-details summary {padding:11px 16px;color:var(--muted);font-size:11.5px;}
.log-details summary:hover {background:var(--hover);}
.log-details[open] summary {border-bottom:1px solid var(--line);}
.log-details pre {max-height:280px;min-height:80px;margin:0;padding:12px 16px;overflow:auto;color:#cbd5e1;background:var(--primary);font:11px/1.7 Consolas,monospace;white-space:pre-wrap;overflow-wrap:anywhere;}
.exec-footer {display:flex;flex-wrap:wrap;align-items:center;gap:16px;padding:8px 16px;border-top:1px solid var(--line);background:rgba(248,250,252,.7);color:var(--muted);font-family:Consolas,monospace;font-size:11px;flex-shrink:0;}
.exec-footer b {color:var(--text);font-weight:600;}
.side-tabs {display:flex;align-items:center;gap:4px;padding:4px 10px;border-bottom:1px solid var(--line);background:color-mix(in srgb,var(--hover) 58%,transparent);flex-shrink:0;}
button.side-tab {flex:1;display:inline-flex;align-items:center;justify-content:center;gap:5px;min-height:28px;padding:0 8px;border:1px solid transparent;border-radius:6px;background:transparent;box-shadow:none;color:var(--muted);font-size:11.5px;font-weight:600;cursor:pointer;}
button.side-tab:hover:not(:disabled):not(.is-active) {color:var(--text);background:var(--surface);border-color:var(--line);}
button.side-tab.is-active {color:var(--text);background:var(--surface);border-color:var(--line);box-shadow:0 2px 4px rgba(15,23,42,.06);}
button.side-tab:disabled {opacity:.48;cursor:not-allowed;}
.side-tab .badge {display:inline-flex;min-width:17px;height:17px;align-items:center;justify-content:center;padding:0 4px;border-radius:999px;background:var(--selected);color:var(--muted);font-family:Consolas,monospace;font-size:10px;font-variant-numeric:tabular-nums;}
.side-tab .badge.alert {background:var(--danger-bg);color:var(--danger);}
.side-panel {flex:1;min-height:0;overflow-y:auto;padding:12px;}
.side-panel[hidden] {display:none;}
.stat-label {font-size:11px;font-weight:600;color:var(--muted);}
.stat-progress-row {display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;}
.stat-progress-val {font-family:Consolas,monospace;font-size:12px;font-weight:700;color:var(--text);}
.stat-progress-val em {font-style:normal;color:var(--success);font-weight:600;font-family:inherit;}
.seg-bar {display:flex;gap:3px;height:8px;}
.seg-bar i {flex:1;border-radius:999px;background:var(--selected);}
.seg-bar i.ok {background:var(--accent);}
.seg-bar i.fail {background:var(--danger);}
.stat-cards {display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:12px;}
.stat-card {padding:8px 10px;border:1px solid var(--border);border-radius:8px;background:var(--surface);}
.stat-card .num {font-size:18px;font-weight:700;font-family:Consolas,monospace;line-height:1.2;}
.stat-card.ok .num {color:var(--success);}
.stat-card.fail .num {color:var(--danger);}
.stat-card .lab {margin-top:2px;font-size:10px;font-weight:600;color:var(--subtle);}
.stat-meta {margin-top:12px;padding-top:10px;border-top:1px solid var(--line);display:flex;flex-direction:column;gap:6px;font-size:11px;color:var(--muted);}
.stat-meta .row {display:flex;justify-content:space-between;gap:8px;}
.stat-meta .v {font-family:Consolas,monospace;color:var(--text);overflow:hidden;text-overflow:ellipsis;}
.side-empty {padding:24px 8px;text-align:center;color:var(--subtle);font-size:12px;}
.report-case {margin-bottom:10px;padding:10px 12px;border:1px solid var(--danger-line);border-radius:8px;background:var(--danger-bg);}
.report-case .t {font-size:12px;font-weight:700;color:#9f1239;}
.report-case .err {margin-top:6px;color:var(--danger);font-size:10.5px;font-family:Consolas,monospace;white-space:pre-wrap;overflow-wrap:anywhere;}
#no-files {padding:16px;}[hidden] {display:none!important;}
@media(prefers-reduced-motion:reduce){*,*::before,*::after {animation:none!important;transition:none!important;}}
@media(max-width:1100px){.workspace,body.embedded .workspace {grid-template-columns:minmax(180px,220px) minmax(0,1fr);}.right {grid-column:1 / -1;}.list-resizer {display:none;}}
@media(max-width:800px){.toolbar .note {display:none;}.env-badge {max-width:180px;}.workspace,body.embedded .workspace {display:flex;flex-direction:column;height:auto;}.spec-list {max-height:240px;flex:none;}.mid-scroll {overflow:visible;}}
@media(max-width:560px){header {gap:20px;padding:0 16px;}header nav {gap:16px;}header>strong {font-size:12px;}.brand-icon {display:none;}.toolbar {height:auto;min-height:48px;flex-wrap:wrap;row-gap:6px;padding:8px 14px;}}
</style></head>
<body>
  <header data-scenario-test-e2e><strong><span class="brand-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><rect x="3" y="4" width="18" height="13" rx="2"/><path d="M8 21h8M12 17v4M7 9l3 2-3 2m6 0h4"/></svg></span>测试工作台</strong><nav aria-label="测试类型"><a href="/">接口场景</a><a class="current" aria-current="page" href="/e2e/">浏览器 E2E</a></nav></header>
  <div class="toolbar"><span class="env-badge" title="执行环境"><i class="dot"></i><b id="env">正在读取配置…</b></span><span class="sep" aria-hidden="true">›</span><h1>浏览器 E2E</h1><p class="note" id="active-run">每个场景使用自己的账号与独立登录状态</p><label class="headed"><input id="headed" type="checkbox">有头模式</label><button class="primary" id="run" aria-label="运行"><svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5.5a1 1 0 011.5-.86l10 6a1.6 1.6 0 010 2.72l-10 6A1 1 0 018 18.5z"/></svg>运行测试</button><button id="stop" class="text-action danger" disabled>停止运行</button></div>
  <main class="workspace">
    <aside class="pane left">
      <div class="pane-head"><div class="pane-title"><svg class="pane-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"/></svg>测试文件<span id="file-count" class="note">加载中…</span></div>
      <div class="search"><svg class="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="11" cy="11" r="8"/><path stroke-linecap="round" d="m21 21-4.3-4.3"/></svg><input id="search" type="text" aria-label="搜索测试文件" title="搜索测试文件（Ctrl+K / ⌘+K；非编辑状态也可按 /）" placeholder="搜索名称或路径…"><button id="search-clear" class="search-clear" type="button" aria-label="清除搜索" title="清除搜索" hidden><svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="m5 5 10 10M15 5 5 15" stroke-linecap="round"/></svg></button></div></div>
      <div id="list" class="spec-list" aria-label="测试文件列表"></div><p id="no-files" class="note" hidden>没有匹配的测试文件</p>
      <details class="service"><summary>服务信息</summary><p id="identity">正在读取…</p></details>
    </aside>
    <div class="list-resizer" id="list-resizer" role="separator" aria-orientation="vertical" aria-label="调整测试文件列表宽度" tabindex="0" title="拖动调整宽度，双击恢复默认"></div>
    <section class="pane middle">
      <div class="headbar"><div class="headbar-main"><div class="headbar-row"><h2 id="title">选择测试文件</h2><span id="status" class="status" role="status">待执行</span></div><p id="selected-path">从左侧选择测试文件，查看执行结果与证据</p></div><a class="button" id="report" target="_blank" rel="noopener" hidden>查看报告</a></div>
      <div class="filterbar"><div class="filter-options" role="group" aria-label="按执行结果筛选步骤"><button class="filter-option is-active" data-filter="all" type="button">全部 <span class="n">0</span></button><button class="filter-option" data-filter="passed" type="button">成功 <span class="n">0</span></button><button class="filter-option" data-filter="failed" type="button">失败 <span class="n">0</span></button></div><div class="filter-tools"><span class="filter-summary" id="filter-summary">未加载测试文件</span><input id="step-search" type="text" aria-label="搜索步骤" placeholder="搜索步骤…"></div></div>
      <div class="mid-scroll"><ul id="steps"></ul><div class="steps-empty" id="steps-empty"><div>点击「运行测试」开始执行</div><div class="note">执行后在此查看每个步骤的结果与耗时</div></div>
        <div class="evidence"><h3>截图证据</h3><p class="note" id="empty">选择测试文件后查看截图，点击可打开原图</p><div class="evidence-list" id="shots"></div></div>
        <details class="log-details"><summary>运行日志</summary><pre id="log">暂无日志</pre></details>
      </div>
      <div class="exec-footer"><span>开始时间: <b id="exec-start">-</b></span><span>结束时间: <b id="exec-end">-</b></span><span>总耗时: <b id="exec-duration">-</b></span></div>
    </section>
    <aside class="pane right">
      <div class="pane-head"><div class="pane-title"><svg class="pane-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg>执行结果</div></div>
      <div class="side-tabs" role="tablist" aria-label="执行结果视图"><button class="side-tab is-active" id="stats-tab" type="button" role="tab" aria-selected="true" aria-controls="stats-panel">执行摘要</button><button class="side-tab" id="report-tab" type="button" role="tab" aria-selected="false" aria-controls="report-panel" disabled>失败诊断 <span class="badge" id="report-badge" hidden>0</span></button></div>
      <div class="side-panel" id="stats-panel" role="tabpanel" aria-labelledby="stats-tab"><div class="side-empty">测试文件未加载或未执行</div></div>
      <div class="side-panel" id="report-panel" role="tabpanel" aria-labelledby="report-tab" hidden><div class="side-empty">执行后生成诊断<br><span class="note">失败步骤和错误详情将在这里展示</span></div></div>
    </aside>
  </main>
<script>const $=id=>document.getElementById(id);let specs=[],selected='',active=null,running=false,rev=0,stepFilter='all';
const CHECK='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg>';
const CROSS='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>';
function controls(){ $('run').disabled=running||!selected;$('headed').disabled=running;$('stop').disabled=!running;$('stop').textContent=running?'停止运行':'停止运行';$('active-run').textContent=running?'正在执行：'+(active||'未知'):'每个场景使用自己的账号与独立登录状态';$('status').className='status'+(running&&active===selected?' running':''); }
const FILE_ICON='<svg class="spec-item-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>';
const CHEVRON='<svg class="chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="m6 9 6 6 6-6" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const FOLDER='<svg class="folder" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const collapsed=new Set();
function specName(spec){return spec.split('/').pop().replace(/[.]spec[.](?:js|ts|mjs)$/,'')}
function specItem(spec,depth){
  const wrap=document.createElement('div');wrap.className='spec-item'+(selected===spec?' is-active':'');
  const b=document.createElement('button');b.type='button';b.className='spec-item-main';b.setAttribute('aria-label',spec);if(selected===spec)b.setAttribute('aria-current','true');
  b.title=spec;b.style.paddingLeft=(28+depth*12)+'px';b.innerHTML=FILE_ICON;
  const text=document.createElement('span');text.className='spec-item-text';
  const name=document.createElement('span');name.className='spec-item-name';name.textContent=specName(spec);
  const file=document.createElement('span');file.className='spec-item-file';file.textContent=spec.split('/').pop();
  text.append(name,file);b.append(text);b.onclick=()=>{selected=spec;listing();show()};wrap.append(b);return wrap;
}
function renderDir(dir,depth,parent){
  const off=collapsed.has(dir.path);
  const wrap=document.createElement('div');wrap.className='spec-dir';
  const toggle=document.createElement('div');toggle.className='spec-dir-toggle';toggle.setAttribute('role','button');toggle.tabIndex=0;toggle.setAttribute('aria-expanded',String(!off));toggle.title=dir.path;toggle.style.paddingLeft=(8+depth*12)+'px';toggle.innerHTML=CHEVRON+FOLDER;
  const name=document.createElement('span');name.className='spec-dir-name';name.textContent=dir.name;
  const count=document.createElement('span');count.className='spec-dir-count';count.textContent=dir.count;
  toggle.append(name,count);
  const children=document.createElement('div');children.className='spec-children';children.style.setProperty('--tree-guide',(14+depth*12)+'px');children.hidden=off;
  renderTree(dir,depth+1,children);
  const flip=()=>{off?collapsed.delete(dir.path):collapsed.add(dir.path);listing()};
  toggle.onclick=flip;toggle.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();flip()}};
  wrap.append(toggle,children);parent.append(wrap);
}
function renderTree(node,depth,parent){for(const dir of node.dirs.values())renderDir(dir,depth,parent);for(const spec of node.files)parent.append(specItem(spec,depth))}
function listing(){
  const query=$('search').value.trim().toLowerCase();$('list').replaceChildren();
  const visible=specs.filter(spec=>spec.toLowerCase().includes(query));
  $('file-count').textContent=visible.length+' 个文件';$('no-files').hidden=visible.length>0;
  const root={dirs:new Map(),files:[]};
  for(const spec of visible){
    const parts=spec.split('/');let node=root,dirPath='';
    for(let i=0;i<parts.length-1;i++){
      dirPath=dirPath?dirPath+'/'+parts[i]:parts[i];
      if(!node.dirs.has(dirPath))node.dirs.set(dirPath,{name:parts[i],path:dirPath,dirs:new Map(),files:[],count:0});
      node=node.dirs.get(dirPath);node.count++;
    }
    node.files.push(spec);
  }
  const wrap=document.createElement('div');wrap.className='spec-tree';
  if(query)for(const spec of visible)wrap.append(specItem(spec,0));
  else renderTree(root,0,wrap);
  $('list').append(wrap);
}
async function api(url,opt){const r=await fetch(url,opt);if(!r.ok)throw Error('HTTP '+r.status);return r.json()}
function cleanErr(text){return String(text).replace(/\\x1b\\[[0-9;]*m/g,'')}
const STATUS_CN={passed:'通过',failed:'失败',interrupted:'已停止',timedOut:'超时',skipped:'跳过',running:'运行中'};
function fmtTime(iso){if(!iso)return '-';const d=new Date(iso);return String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0')+':'+String(d.getSeconds()).padStart(2,'0')}
function fmtDur(ms){if(ms==null||isNaN(ms))return '-';return ms>=1000?(ms/1000).toFixed(2)+' s':Math.round(ms)+' ms'}
function applyFilter(){
  const q=$('step-search').value.trim().toLowerCase();let shown=0,total=0;
  for(const row of $('steps').children){total++;const ok=(stepFilter==='all'||row.dataset.status===stepFilter)&&(!q||row.dataset.search.includes(q));row.hidden=!ok;if(ok)shown++}
  $('filter-summary').textContent=total?'显示 '+shown+' / '+total+' 个步骤':'未加载测试文件';
  $('steps-empty').style.display=shown===0?'flex':'none';
}
function renderSteps(steps){
  $('steps').replaceChildren();let passed=0,failed=0;
  steps.forEach((step,i)=>{
    const ok=step.status==='passed';ok?passed++:failed++;
    const li=document.createElement('li');li.className='step-row';li.dataset.status=ok?'passed':'failed';li.dataset.search=step.title.toLowerCase();
    const head=document.createElement('div');head.className='step-head';
    const lead=document.createElement('div');lead.className='step-lead';
    const seq=document.createElement('span');seq.className='seq '+(ok?'ok':'fail');seq.innerHTML=ok?CHECK:CROSS;
    const title=document.createElement('span');title.className='step-title';title.textContent=step.title;title.title=step.title;
    lead.append(seq,title);
    const tail=document.createElement('div');tail.className='step-tail';
    const badge=document.createElement('span');badge.className='step-badge '+(ok?'ok':'fail');badge.textContent=ok?'成功':'失败';
    const dur=document.createElement('span');dur.className='step-dur';dur.textContent=step.duration!=null?fmtDur(step.duration):'';
    tail.append(badge,dur);head.append(lead,tail);li.append(head);
    if(step.error){const err=document.createElement('div');err.className='step-error';err.textContent=cleanErr(step.error);li.append(err)}
    $('steps').append(li);
  });
  const nums=document.querySelectorAll('.filter-option .n');
  nums[0].textContent=steps.length;nums[1].textContent=passed;nums[2].textContent=failed;
  applyFilter();
}
function renderStats(r,spec,steps){
  const cases=r?.results?.[spec]||[];
  const passed=steps.filter(s=>s.status==='passed').length,failed=steps.filter(s=>s.status!=='passed').length;
  const pct=steps.length?((passed/steps.length)*100).toFixed(1):'0.0';
  const panel=$('stats-panel');panel.replaceChildren();
  if(!r){panel.innerHTML='<div class="side-empty">测试文件未加载或未执行</div>';return}
  const label=document.createElement('div');label.className='stat-progress-row';
  label.innerHTML='<span class="stat-label">总步骤进度</span><span class="stat-progress-val">'+passed+' / '+steps.length+' <em>('+pct+'%)</em></span>';
  const bar=document.createElement('div');bar.className='seg-bar';
  for(const s of steps){const seg=document.createElement('i');seg.className=s.status==='passed'?'ok':'fail';seg.title=s.title+'：'+(s.status==='passed'?'成功':'失败');bar.append(seg)}
  if(!steps.length){const seg=document.createElement('i');bar.append(seg)}
  const cards=document.createElement('div');cards.className='stat-cards';
  cards.innerHTML='<div class="stat-card ok"><div class="num">'+passed+'</div><div class="lab">成功步骤</div></div><div class="stat-card fail"><div class="num">'+failed+'</div><div class="lab">失败步骤</div></div>';
  const meta=document.createElement('div');meta.className='stat-meta';
  const caseCount=cases.length;
  meta.innerHTML='<div class="row"><span>测试用例</span><span class="v">'+caseCount+' 个</span></div><div class="row"><span>运行批次</span><span class="v" title="'+(r.runId||'')+'">'+String(r.runId||'').slice(0,8)+'</span></div><div class="row"><span>运行状态</span><span class="v">'+(STATUS_CN[r.status]||r.status||'-')+'</span></div>';
  panel.append(label,bar,cards,meta);
}
function renderReport(r,spec){
  const cases=(r?.results?.[spec]||[]).filter(c=>c.status!=='passed');
  const globals=r?.globalErrors||[];
  const count=cases.length+globals.length;
  $('report-badge').hidden=!count;$('report-badge').textContent=count;$('report-badge').classList.toggle('alert',count>0);
  $('report-tab').disabled=!count;
  const panel=$('report-panel');panel.replaceChildren();
  if(!count){panel.innerHTML='<div class="side-empty">本次运行没有失败项<br><span class="note">失败用例和错误详情将在这里展示</span></div>';if($('report-tab').classList.contains('is-active'))switchTab('stats');return}
  for(const c of cases){const box=document.createElement('div');box.className='report-case';const t=document.createElement('div');t.className='t';t.textContent=c.title+'（'+(STATUS_CN[c.status]||c.status)+'）';box.append(t);for(const e of c.errors||[]){const err=document.createElement('div');err.className='err';err.textContent=cleanErr(e);box.append(err)}panel.append(box)}
  for(const e of globals){const box=document.createElement('div');box.className='report-case';const t=document.createElement('div');t.className='t';t.textContent='全局错误';const err=document.createElement('div');err.className='err';err.textContent=cleanErr(e);box.append(t,err);panel.append(box)}
}
function switchTab(name){
  const stats=name==='stats';
  $('stats-tab').classList.toggle('is-active',stats);$('stats-tab').setAttribute('aria-selected',String(stats));
  $('report-tab').classList.toggle('is-active',!stats);$('report-tab').setAttribute('aria-selected',String(!stats));
  $('stats-panel').hidden=!stats;$('report-panel').hidden=stats;
}
$('stats-tab').onclick=()=>switchTab('stats');
$('report-tab').onclick=()=>{if(!$('report-tab').disabled)switchTab('report')};
for(const b of document.querySelectorAll('.filter-option'))b.onclick=()=>{stepFilter=b.dataset.filter;for(const x of document.querySelectorAll('.filter-option'))x.classList.toggle('is-active',x===b);applyFilter()};
$('step-search').oninput=applyFilter;
async function show(){const spec=selected,n=++rev;$('title').textContent=spec?specName(spec):'选择测试文件';$('selected-path').textContent=spec||'从左侧选择测试文件，查看执行结果与证据';$('shots').replaceChildren();$('steps').replaceChildren();$('steps-empty').style.display='flex';$('report').hidden=true;$('log').textContent='暂无日志';$('filter-summary').textContent='未加载测试文件';for(const x of document.querySelectorAll('.filter-option .n'))x.textContent='0';$('exec-start').textContent='-';$('exec-end').textContent='-';$('exec-duration').textContent='-';controls();if(!spec){$('status').textContent='暂无测试文件';renderStats(null);renderReport(null);return}if(running&&active===spec){$('status').textContent='运行中';$('log').textContent=window.liveLog||'等待日志';const live=window.liveData;const pseudo={results:{[spec]:live?.results||[]},globalErrors:[],runId:window.liveRunId,status:'running',startedAt:live?.startedAt};renderSteps(live?.steps||[]);renderStats(pseudo,spec,live?.steps||[]);renderReport(pseudo,spec);$('exec-start').textContent=fmtTime(live?.startedAt);for(const s of (live?.screenshots||[])){const a=document.createElement('a');a.className='evidence-item';a.href='/e2e/api/artifacts/'+window.liveRunId+'/'+s.file;a.target='_blank';a.rel='noopener';const img=document.createElement('img');img.src=a.href;img.alt=s.name;const name=document.createElement('strong');name.textContent=s.name;const label=document.createElement('small');label.textContent=s.test;a.append(img,name,label);$('shots').append(a)}$('empty').textContent=$('shots').childElementCount?'点击截图查看原图':'等待截图生成';return}try{const r=await api('/e2e/api/result?spec='+encodeURIComponent(spec));if(n!==rev)return;if(!r){$('status').textContent='尚未运行';$('empty').textContent='该测试文件暂无截图';renderStats(null);renderReport(null,spec);return}const cases=r.results?.[spec]||[];if(!cases.length){$('status').textContent='尚未运行';renderStats(r,spec,[]);renderReport(r,spec);return}const status=cases.every(c=>c.status==='passed')?'通过':cases.map(c=>STATUS_CN[c.status]||c.status).join(', ');$('status').textContent=status;if(cases.length===1&&cases[0].title)$('title').textContent=cases[0].title;$('status').className='status '+(cases.every(c=>c.status==='passed')?'ok':'fail');const steps=r.steps?.[spec]||[];renderSteps(steps);renderStats(r,spec,steps);renderReport(r,spec);$('exec-start').textContent=fmtTime(r.startedAt);$('exec-end').textContent=fmtTime(r.finishedAt);$('exec-duration').textContent=r.startedAt&&r.finishedAt?fmtDur(new Date(r.finishedAt)-new Date(r.startedAt)):'-';$('log').textContent=(r.logs?.[spec]||[]).join('\\n')||'暂无日志';if(r.reportAvailable){$('report').href='/e2e/api/artifacts/'+r.runId+'/report/index.html';$('report').hidden=false}for(const s of (r.screenshots||[]).filter(x=>x.spec===spec)){const a=document.createElement('a');a.className='evidence-item';a.href='/e2e/api/artifacts/'+r.runId+'/'+s.file;a.target='_blank';a.rel='noopener';const img=document.createElement('img');img.src=a.href;img.alt=s.name;const name=document.createElement('strong');name.textContent=s.name;const label=document.createElement('small');label.textContent=s.test;a.append(img,name,label);$('shots').append(a)}$('empty').textContent=$('shots').childElementCount?'点击截图查看原图':'该次运行未生成截图'}catch(e){if(n===rev)$('status').textContent='结果读取失败：'+e.message}}
async function state(){try{const s=await api('/e2e/api/state');specs=s.specs;if(!selected)selected=specs[0]||'';running=s.running;active=s.spec||null;window.liveLog=s.log||'';window.liveData=s.live||null;window.liveRunId=s.runId||null;$('env').textContent=s.configSummary||'';listing();await show()}catch(e){$('status').textContent='连接失败：'+e.message}}
$('search').oninput=()=>{$('search-clear').hidden=!$('search').value;listing()};
$('search-clear').onclick=()=>{$('search').value='';$('search-clear').hidden=true;$('search').focus();listing()};
$('search').onkeydown=e=>{if(e.key==='Escape'){$('search').value='';$('search-clear').hidden=true;listing();$('search').blur()}};
document.addEventListener('keydown',e=>{
  const tag=(e.target&&e.target.tagName)||'';
  if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k'){e.preventDefault();$('search').focus();$('search').select()}
  else if(e.key==='/'&&tag!=='INPUT'&&tag!=='TEXTAREA'&&tag!=='SELECT'&&!e.ctrlKey&&!e.metaKey&&!e.altKey){e.preventDefault();$('search').focus()}
});
(()=>{
  const ws=document.querySelector('.workspace'),bar=$('list-resizer');
  const clamp=x=>Math.min(420,Math.max(180,x));
  const setW=v=>ws.style.setProperty('--list-w',clamp(v)+'px');
  const curW=()=>parseFloat(getComputedStyle(ws).getPropertyValue('--list-w'))||260;
  bar.addEventListener('pointerdown',e=>{e.preventDefault();bar.setPointerCapture(e.pointerId);bar.classList.add('is-dragging');document.body.classList.add('list-resizing')});
  bar.addEventListener('pointermove',e=>{if(bar.classList.contains('is-dragging'))setW(e.clientX-ws.getBoundingClientRect().left-8)});
  const end=e=>{bar.classList.remove('is-dragging');document.body.classList.remove('list-resizing')};
  bar.addEventListener('pointerup',end);bar.addEventListener('pointercancel',end);
  bar.addEventListener('dblclick',()=>ws.style.removeProperty('--list-w'));
  bar.addEventListener('keydown',e=>{if(e.key==='ArrowLeft'){e.preventDefault();setW(curW()-16)}else if(e.key==='ArrowRight'){e.preventDefault();setW(curW()+16)}});
})();
document.body.classList.toggle('embedded',new URLSearchParams(location.search).get('embedded')==='1');
$('run').onclick=async()=>{try{await api('/e2e/api/run',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({spec:selected,headed:$('headed').checked})});await state()}catch(e){$('status').textContent='启动失败：'+e.message}};
$('stop').onclick=async()=>{try{await api('/e2e/api/stop',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'});await state()}catch(e){$('status').textContent='停止失败：'+e.message}};
fetch('/__scenario-test__/status').then(r=>r.json()).then(s=>{$('identity').textContent='版本 '+s.version+' · 构建 '+String(s.buildId||'').slice(0,8)+' · PID '+s.pid+' · '+s.workspace}).catch(()=>{$('identity').textContent='身份读取失败'});setInterval(()=>{if(running)state()},2000);state();
</script></body></html>`;
