const workbenchStyle = (function () {
    'use strict';

    function getWorkspaceStyleBlock() {
        return `
            :root {
                --workspace-bg: #f8fafc;
                --workspace-surface: #ffffff;
                --workspace-text: #0f172a;
                --workspace-muted: #64748b;
                --workspace-line: #e2e8f0;
                --workspace-hover: #f1f5f9;
                --workspace-selected: #e2e8f0;
                --workspace-selected-line: #cbd5e1;
                --workspace-primary: #0f172a;
                --workspace-primary-hover: #1e293b;
                --workspace-danger: #e11d48;
                --workspace-success: #10b981;
                --workspace-warning: #d97706;
                --workspace-focus: rgba(15, 23, 42, 0.18);
                --workspace-overlay: rgba(15, 23, 42, 0.38);
                --workspace-code: #0f172a;
                --workspace-radius: 8px;
            }

            #scenario-test-root { height: 100%; }

            #scenario-test-root {
                min-width: 0;
                overflow: hidden;
                background: var(--workspace-bg) !important;
                color: var(--workspace-text) !important;
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif;
                -webkit-font-smoothing: antialiased;
                -moz-osx-font-smoothing: grayscale;
            }

            #scenario-test-root > header {
                min-height: 48px;
                padding: 6px 16px !important;
                background: var(--workspace-surface) !important;
                border-bottom: 1px solid var(--workspace-line) !important;
                box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.02) !important;
            }

            #scenario-test-root > header #envNameLabel { color: var(--workspace-muted) !important; font-size: 11px !important; font-weight: 600; }
            #scenario-test-root > header #scenarioTitle { color: var(--workspace-text) !important; font-size: 13px !important; font-weight: 700; }

            #scenario-test-root.theme-claude-code {
                --workspace-bg: #f5f0ea;
                --workspace-surface: #fbf8f4;
                --workspace-text: #2c2520;
                --workspace-muted: #7c7066;
                --workspace-line: #e8dacf;
                --workspace-hover: #efe5dc;
                --workspace-selected: #e5d5c6;
                --workspace-selected-line: #d4bfad;
                --workspace-primary: #245244;
                --workspace-primary-hover: #1b3e33;
                --workspace-danger: #b94c4a;
                --workspace-success: #245244;
                --workspace-warning: #a65f2d;
                --workspace-focus: rgba(36, 82, 68, 0.2);
                --workspace-overlay: rgba(44, 37, 32, 0.34);
                --workspace-code: #2c2520;
                --workspace-radius: 8px;
            }

            #scenario-test-root.theme-claude-code > header {
                background: #fdfaf6 !important;
                box-shadow: 0 1px 3px rgba(91, 67, 49, .06) !important;
                border-bottom-color: var(--workspace-line) !important;
            }

            /* ZCode 皓白：浅色版，冷调白底 + 同款电蓝紫强调 */
            #scenario-test-root.theme-zcode-light {
                --workspace-bg: #f5f6fa;
                --workspace-surface: #ffffff;
                --workspace-text: #1a2233;
                --workspace-text-soft: #4a5568;
                --workspace-muted: #6b7280;
                --workspace-line: #e3e6f0;
                --workspace-hover: #eef1f8;
                --workspace-selected: #e4e9fb;
                --workspace-selected-line: #c7d3f5;
                --workspace-primary: #4f7cff;
                --workspace-primary-hover: #3d6bef;
                --workspace-danger: #e11d48;
                --workspace-success: #10b981;
                --workspace-warning: #d97706;
                --workspace-focus: rgba(79, 124, 255, 0.25);
                --workspace-overlay: rgba(26, 34, 51, 0.4);
                --workspace-code: #1a2233;
                --workspace-radius: 8px;
            }

            #scenario-test-root.theme-zcode-light > header {
                background: #ffffff !important;
                box-shadow: 0 1px 3px rgba(79, 124, 255, 0.08) !important;
                border-bottom-color: var(--workspace-line) !important;
            }

            /* ZCode 暗夜：深色编辑器风（电蓝紫强调），浅色工具类按语义重映射 */
            #scenario-test-root.theme-zcode {
                color-scheme: dark;
                --workspace-bg: #0a0d13;
                --workspace-surface: #131722;
                --workspace-text: #e6e9f2;
                --workspace-text-soft: #b7bfd0;
                --workspace-muted: #8a92a6;
                --workspace-line: #252c3d;
                --workspace-hover: #1b2130;
                --workspace-selected: #222b42;
                --workspace-selected-line: #35446b;
                --workspace-primary: #4f7cff;
                --workspace-primary-hover: #648cff;
                --workspace-danger: #f2555a;
                --workspace-success: #2fbf8f;
                --workspace-warning: #e8b339;
                --workspace-focus: rgba(79, 124, 255, 0.32);
                --workspace-overlay: rgba(4, 6, 11, 0.62);
                --workspace-code: #dbe2f0;
                --workspace-radius: 8px;
            }

            #scenario-test-root.theme-zcode > header {
                background: var(--workspace-surface) !important;
                box-shadow: 0 1px 4px rgba(0, 0, 0, 0.35) !important;
            }

            .theme-zcode .bg-white,
            .theme-zcode .bg-slate-50,
            .theme-zcode .bg-slate-50\\/50,
            .theme-zcode .bg-slate-50\\/60,
            .theme-zcode .bg-slate-50\\/70 { background-color: var(--workspace-surface) !important; }
            .theme-zcode .bg-slate-100,
            .theme-zcode .bg-slate-100\\/80 { background-color: var(--workspace-hover) !important; }
            .theme-zcode .bg-slate-200\\/80,
            .theme-zcode .bg-slate-300 { background-color: var(--workspace-selected) !important; }
            .theme-zcode .bg-slate-400 { background-color: var(--workspace-selected-line) !important; }
            .theme-zcode .bg-slate-950\\/30,
            .theme-zcode .bg-slate-950\\/40 { background-color: var(--workspace-overlay) !important; }

            .theme-zcode .text-slate-700,
            .theme-zcode .text-slate-800,
            .theme-zcode .text-slate-900 { color: var(--workspace-text) !important; }
            .theme-zcode .text-slate-600 { color: var(--workspace-text-soft) !important; }
            .theme-zcode .text-slate-400,
            .theme-zcode .text-slate-500 { color: var(--workspace-muted) !important; }
            .theme-zcode .placeholder-slate-400::placeholder,
            .theme-zcode .placeholder-slate-500::placeholder { color: var(--workspace-muted) !important; }
            .theme-zcode .hover\\:text-slate-600:hover { color: var(--workspace-text-soft) !important; }
            .theme-zcode .hover\\:text-slate-700:hover,
            .theme-zcode .hover\\:text-slate-900:hover { color: var(--workspace-text) !important; }
            .theme-zcode .group:hover .group-hover\\:text-slate-600 { color: var(--workspace-text-soft) !important; }

            .theme-zcode .border-slate-100,
            .theme-zcode .border-slate-200,
            .theme-zcode .border-slate-200\\/60,
            .theme-zcode .border-slate-200\\/70,
            .theme-zcode .border-slate-200\\/80,
            .theme-zcode .border-slate-300 { border-color: var(--workspace-line) !important; }
            .theme-zcode .border-slate-700,
            .theme-zcode .border-slate-800 { border-color: var(--workspace-selected-line) !important; }
            .theme-zcode .hover\\:border-slate-300:hover { border-color: var(--workspace-selected-line) !important; }
            .theme-zcode .divide-slate-100 > :not([hidden]) ~ :not([hidden]) { border-color: var(--workspace-line) !important; }

            .theme-zcode .hover\\:bg-slate-50:hover,
            .theme-zcode .hover\\:bg-slate-100:hover,
            .theme-zcode .hover\\:bg-slate-700:hover,
            .theme-zcode .hover\\:bg-slate-800:hover { background-color: var(--workspace-hover) !important; }
            .theme-zcode .focus\\:ring-slate-800:focus { --tw-ring-color: var(--workspace-primary) !important; }
            .theme-zcode .focus\\:border-slate-800:focus { border-color: var(--workspace-primary) !important; }

            .theme-zcode .bg-emerald-50,
            .theme-zcode .bg-emerald-50\\/60,
            .theme-zcode .bg-emerald-100 { background-color: rgba(47, 191, 143, 0.12) !important; }
            .theme-zcode .text-emerald-600,
            .theme-zcode .text-emerald-600\\/70,
            .theme-zcode .text-emerald-700,
            .theme-zcode .text-emerald-800 { color: #34d399 !important; }
            .theme-zcode .border-emerald-200,
            .theme-zcode .border-emerald-200\\/80 { border-color: rgba(47, 191, 143, 0.35) !important; }
            .theme-zcode .bg-rose-50,
            .theme-zcode .bg-rose-50\\/40,
            .theme-zcode .bg-rose-50\\/60,
            .theme-zcode .bg-rose-50\\/80 { background-color: rgba(242, 85, 90, 0.12) !important; }
            .theme-zcode .text-rose-500,
            .theme-zcode .text-rose-600,
            .theme-zcode .text-rose-600\\/70,
            .theme-zcode .text-rose-700,
            .theme-zcode .text-rose-800,
            .theme-zcode .text-rose-900 { color: #fb7185 !important; }
            .theme-zcode .border-rose-100,
            .theme-zcode .border-rose-200,
            .theme-zcode .border-rose-200\\/80 { border-color: rgba(242, 85, 90, 0.35) !important; }
            .theme-zcode .bg-amber-50,
            .theme-zcode .bg-yellow-50 { background-color: rgba(232, 179, 57, 0.10) !important; }
            .theme-zcode .text-amber-600,
            .theme-zcode .text-yellow-600 { color: #e8b339 !important; }
            .theme-zcode .border-amber-200\\/80,
            .theme-zcode .border-yellow-200\\/80 { border-color: rgba(232, 179, 57, 0.35) !important; }
            .theme-zcode .bg-blue-50,
            .theme-zcode .bg-blue-50\\/80 { background-color: rgba(79, 124, 255, 0.10) !important; }
            .theme-zcode .text-blue-500,
            .theme-zcode .text-blue-500\\/80,
            .theme-zcode .text-blue-600,
            .theme-zcode .text-blue-900 { color: #7aa2ff !important; }
            .theme-zcode .bg-indigo-50 { background-color: rgba(129, 140, 248, 0.10) !important; }
            .theme-zcode .text-indigo-600 { color: #818cf8 !important; }
            .theme-zcode .border-indigo-200\\/80 { border-color: rgba(129, 140, 248, 0.35) !important; }

            .scenario-workspace { height: calc(100vh - 48px); padding: 8px !important; }
            .scenario-grid { height: 100%; gap: 8px !important; margin: 0 !important; }
            .scenario-pane {
                min-height: 0;
                background: var(--workspace-surface) !important;
                border: 1px solid var(--workspace-line) !important;
                border-radius: var(--workspace-radius) !important;
                box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.03), 0 1px 2px -1px rgba(0, 0, 0, 0.03) !important;
                transition: border-color 0.15s ease, box-shadow 0.15s ease;
            }
            .scenario-pane > div:first-child,
            #scenarioList,
            #stepsList,
            #reportPanel { background: var(--workspace-surface) !important; }

            .scenario-header-actions { display: flex; align-items: center; gap: 6px !important; flex-wrap: nowrap !important; }
            .scenario-header-context-actions,
            .scenario-header-run-actions,
            .scenario-header-secondary-actions {
                display: inline-flex;
                align-items: center;
                gap: 4px;
            }
            .scenario-header-run-actions {
                padding-left: 4px;
                border-left: 1px solid var(--workspace-line);
            }
            .scenario-header-secondary-actions {
                padding-left: 2px;
            }
            .scenario-header-select,
            .scenario-header-step,
            .scenario-header-button {
                height: 32px;
                border: 1px solid var(--workspace-line);
                border-radius: 7px;
                background: var(--workspace-surface);
                box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.02) !important;
                transition: all 0.15s cubic-bezier(0.4, 0, 0.2, 1);
            }
            .scenario-header-select {
                position: relative;
                display: inline-flex;
                align-items: center;
                gap: 4px;
                padding: 0 8px 0 10px;
                background: var(--workspace-hover) !important;
                border: 1px solid var(--workspace-line) !important;
                color: var(--workspace-muted);
                cursor: pointer;
            }
            .scenario-header-select:hover {
                background: var(--workspace-selected) !important;
                border-color: var(--workspace-selected-line) !important;
            }
            .scenario-header-select__icon {
                display: inline-flex;
                align-items: center;
                justify-content: center;
                flex-shrink: 0;
                color: var(--workspace-muted);
            }
            .scenario-header-select__label {
                font-size: 11px;
                font-weight: 700;
                color: var(--workspace-muted);
                white-space: nowrap;
                user-select: none;
            }
            .scenario-header-select select {
                -webkit-appearance: none !important;
                -moz-appearance: none !important;
                appearance: none !important;
                background: transparent !important;
                border: 0 !important;
                outline: none !important;
                box-shadow: none !important;
                min-width: 60px;
                height: 100% !important;
                padding: 0 16px 0 2px !important;
                color: var(--workspace-text) !important;
                font-size: 11.5px !important;
                font-weight: 700 !important;
                cursor: pointer !important;
            }
            .scenario-header-select select option {
                background: var(--workspace-surface) !important;
                color: var(--workspace-text) !important;
                padding: 6px 10px !important;
                font-size: 12px !important;
                font-weight: 500 !important;
            }
            .scenario-header-select:focus-within {
                border-color: var(--workspace-primary) !important;
                box-shadow: 0 0 0 2px rgba(15, 23, 42, 0.12) !important;
                background: var(--workspace-surface) !important;
            }
            .scenario-header-select__arrow {
                position: absolute;
                top: 50%;
                right: 7px;
                transform: translateY(-50%);
                width: 12px;
                height: 12px;
                color: var(--workspace-muted);
                pointer-events: none;
                transition: transform 0.15s ease;
            }
            .scenario-header-select:focus-within .scenario-header-select__arrow {
                color: var(--workspace-text);
                transform: translateY(-50%) rotate(180deg);
            }
            
            /* 自定义 Shadcn 风格 Dropdown Menu */
            .custom-dropdown {
                position: relative;
                display: inline-flex;
            }
            .custom-dropdown__trigger {
                display: inline-flex;
                align-items: center;
                gap: 5px;
                height: 32px;
                padding: 0 10px 0 8px;
                border: 1px solid var(--workspace-line);
                border-radius: 7px;
                background: var(--workspace-hover);
                color: var(--workspace-text);
                font-size: 11.5px;
                font-weight: 600;
                cursor: pointer;
                box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.02);
                transition: all 0.15s cubic-bezier(0.4, 0, 0.2, 1);
                user-select: none;
            }
            .custom-dropdown__trigger:hover {
                background: var(--workspace-selected);
                border-color: var(--workspace-selected-line);
            }
            .custom-dropdown__trigger:active {
                transform: scale(0.98);
            }
            .custom-dropdown.open .custom-dropdown__trigger {
                border-color: var(--workspace-primary);
                box-shadow: 0 0 0 2px rgba(15, 23, 42, 0.12);
                background: var(--workspace-surface);
            }
            .custom-dropdown.open .custom-dropdown__arrow {
                transform: rotate(180deg);
                color: var(--workspace-text);
            }
            .custom-dropdown__arrow {
                width: 12px;
                height: 12px;
                color: var(--workspace-muted);
                transition: transform 0.15s ease, color 0.15s ease;
                margin-left: 2px;
            }
            .custom-dropdown__menu {
                display: none;
                position: absolute;
                top: calc(100% + 5px);
                left: 0;
                min-width: 130px;
                z-index: 50;
                padding: 4px;
                background: var(--workspace-surface);
                border: 1px solid var(--workspace-line);
                border-radius: 8px;
                box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.12), 0 8px 10px -6px rgba(0, 0, 0, 0.08);
                backdrop-filter: blur(8px);
                animation: custom-dropdown-in 0.15s cubic-bezier(0.16, 1, 0.3, 1);
            }
            .custom-dropdown.open .custom-dropdown__menu {
                display: block;
            }
            .custom-dropdown__item {
                display: flex;
                align-items: center;
                justify-content: space-between;
                gap: 8px;
                width: 100%;
                padding: 6px 9px;
                border-radius: 6px;
                font-size: 11.5px;
                font-weight: 500;
                color: var(--workspace-text);
                cursor: pointer;
                transition: background-color 0.15s ease, color 0.15s ease, transform 0.1s ease;
                text-align: left;
                border: 0;
                background: transparent;
                white-space: nowrap;
            }
            .custom-dropdown__item:hover {
                background: var(--workspace-hover);
                color: var(--workspace-text);
                transform: translateX(2px);
            }
            .custom-dropdown__item:active {
                transform: translateX(2px) scale(0.98);
            }
            .custom-dropdown__item.active {
                font-weight: 700;
                background: var(--workspace-selected);
            }
            .custom-dropdown__check {
                width: 13px;
                height: 13px;
                color: var(--workspace-primary);
                flex-shrink: 0;
            }
            @keyframes custom-dropdown-in {
                from { opacity: 0; transform: translateY(-4px) scale(0.97); }
                to { opacity: 1; transform: translateY(0) scale(1); }
            }
            
            #scenario-test-root.theme-claude-code .custom-dropdown__trigger {
                background: #f1e4d8 !important;
                border-color: #dfcebf !important;
            }
            #scenario-test-root.theme-claude-code .custom-dropdown__trigger:hover {
                background: #ebdbce !important;
            }
            #scenario-test-root.theme-claude-code .custom-dropdown.open .custom-dropdown__trigger {
                background: #fcf8f3 !important;
                border-color: var(--workspace-primary) !important;
                box-shadow: 0 0 0 2px rgba(36, 82, 68, 0.15) !important;
            }
            
            .scenario-header-step { display: flex; align-items: stretch; overflow: hidden; }
            .scenario-header-button {
                display: inline-flex;
                align-items: center;
                justify-content: center;
                gap: 5px;
                padding: 0 12px;
                font-size: 12px !important;
                font-weight: 600;
                color: var(--workspace-text);
                cursor: pointer;
                transition: transform 0.15s ease, box-shadow 0.15s ease;
            }
            .scenario-header-button:hover:not(:disabled) {
                transform: translateY(-1px);
                box-shadow: 0 4px 8px rgba(0, 0, 0, 0.08), 0 2px 4px rgba(0, 0, 0, 0.06);
            }
            .scenario-header-button:active:not(:disabled) {
                transform: scale(0.97) translateY(0);
                transition-duration: 0.1s;
            }
            .scenario-header-button:disabled { cursor: not-allowed; opacity: 0.6; }
            .scenario-header-button--secondary { border: 0; border-radius: 0; }
            .scenario-header-step__arrow { display: inline-flex; align-items: center; justify-content: center; width: 24px; border-left: 1px solid var(--workspace-line); color: var(--workspace-muted); }
            .scenario-header-button--primary {
                border-color: var(--workspace-primary) !important;
                background: var(--workspace-primary) !important;
                color: #ffffff !important;
                box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.1), inset 0 1px 0 0 rgba(255, 255, 255, 0.15) !important;
            }
            .scenario-header-button--primary:hover:not(:disabled) {
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15), 0 2px 6px rgba(0, 0, 0, 0.1), inset 0 1px 0 0 rgba(255, 255, 255, 0.2) !important;
                filter: brightness(1.05);
            }
            .scenario-header-button--primary:active:not(:disabled) {
                box-shadow: 0 2px 4px rgba(0, 0, 0, 0.12), inset 0 1px 0 0 rgba(255, 255, 255, 0.1) !important;
                filter: brightness(0.98);
            }
            .scenario-header-button--primary:disabled { cursor: wait; opacity: .78; }
            .scenario-header-button--running { background: #334155 !important; border-color: #334155 !important; }
            .scenario-header-button--config, .scenario-header-button--report { padding: 0 10px; }
            .scenario-header-text-action {
                height: 32px;
                padding: 0 6px;
                border: 0;
                background: transparent;
                color: var(--workspace-muted);
                font-size: 12px !important;
                font-weight: 600;
                cursor: pointer;
                border-radius: 4px;
                transition: all 0.15s ease;
            }
            .scenario-header-text-action:active:not(:disabled) { transform: scale(0.96); }
            .scenario-header-text-action--danger { color: var(--workspace-danger); }
            .scenario-header-text-action:disabled { opacity: .4; cursor: not-allowed; }
            .scenario-header-actions button:hover:not(:disabled), .scenario-header-select:hover { background: var(--workspace-hover); }
            .scenario-header-button--primary:hover:not(:disabled) { background: var(--workspace-primary-hover) !important; border-color: var(--workspace-primary-hover) !important; }
            
            #scenario-test-root.theme-claude-code .scenario-header-select { background: #fdfaf6; }
            #scenario-test-root.theme-claude-code .scenario-header-button--config,
            #scenario-test-root.theme-claude-code .scenario-header-button--report { background: #fdfaf6; border-color: var(--workspace-line); }

            .scenario-pane--scenarios > div:first-child { padding: 12px 14px !important; border-bottom: 1px solid var(--workspace-line) !important; }
            .scenario-pane--scenarios > div:first-child > div:first-child { font-size: 14px !important; font-weight: 700; }
            .scenario-pane--scenarios > div:first-child > div:nth-child(2) { font-size: 11px !important; color: var(--workspace-muted); }
            #scenarioSearchInput {
                padding: 6px 10px 6px 32px !important;
                border: 1px solid var(--workspace-line) !important;
                border-radius: 6px !important;
                font-size: 12px !important;
                transition: all 0.2s ease;
                background: var(--workspace-surface);
            }
            #scenarioSearchInput:hover {
                border-color: var(--workspace-selected-line) !important;
            }
            #scenarioSearchInput:focus {
                border-color: var(--workspace-primary) !important;
                box-shadow: 0 0 0 3px rgba(15, 23, 42, 0.08), 0 1px 2px rgba(0, 0, 0, 0.05) !important;
                background: var(--workspace-bg);
            }
            .scenario-search-clear {
                position: absolute;
                top: 50%;
                right: 6px;
                display: inline-flex;
                width: 24px;
                height: 24px;
                align-items: center;
                justify-content: center;
                transform: translateY(-50%);
                border: 0;
                border-radius: 5px;
                background: transparent;
                color: var(--workspace-muted);
                transition: all 0.15s ease;
                cursor: pointer;
            }
            .scenario-search-clear svg { width: 13px; height: 13px; }
            .scenario-search-clear:hover { background: var(--workspace-hover); color: var(--workspace-text); }
            .scenario-search-clear[hidden],
            .step-filter-reset[hidden] { display: none; }
            #scenarioList > .scenario-search-empty {
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 8px;
                padding: 16px 12px;
                color: var(--workspace-muted);
                font-size: 11px;
                text-align: center;
                border-radius: 8px !important;
                background: color-mix(in srgb, var(--workspace-hover) 50%, transparent) !important;
                border: 1px dashed var(--workspace-line) !important;
                margin: 8px 0;
            }
            .scenario-search-empty button {
                padding: 4px 8px;
                border: 1px solid var(--workspace-line);
                border-radius: 5px;
                background: var(--workspace-surface);
                color: var(--workspace-primary);
                font-size: 10px;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.2s ease;
                box-shadow: 0 1px 2px rgba(0, 0, 0, 0.02);
            }
            .scenario-search-empty button:hover {
                background: var(--workspace-hover);
                border-color: var(--workspace-selected-line);
                transform: translateY(-1px);
                box-shadow: 0 2px 4px rgba(0, 0, 0, 0.04);
            }
            .scenario-search-empty button:active {
                transform: translateY(0) scale(0.98);
            }

            #filterBar { gap: 12px; flex-wrap: wrap; }
            .step-filter-options {
                display: inline-flex;
                flex: 0 0 auto;
                align-items: center;
                gap: 2px;
                padding: 2px;
                border: 1px solid var(--workspace-line);
                border-radius: 8px;
                background: var(--workspace-hover);
            }
            .step-filter-tools { display: flex; min-width: 0; flex: 1 1 220px; align-items: center; justify-content: flex-end; gap: 8px; }
            .step-filter-summary { flex: 0 1 auto; min-width: 0; overflow: hidden; text-overflow: ellipsis; color: var(--workspace-muted); font-size: 10px; font-variant-numeric: tabular-nums; white-space: nowrap; }
            #stepSearchInput { width: 160px; }
            .step-filter-reset {
                flex: 0 0 auto;
                padding: 5px 7px;
                border: 1px solid var(--workspace-line);
                border-radius: 6px;
                background: var(--workspace-surface);
                color: var(--workspace-muted);
                font-size: 10px;
                font-weight: 600;
                white-space: nowrap;
                cursor: pointer;
                transition: background-color .15s ease, color .15s ease, border-color .15s ease;
            }
            .step-filter-reset:hover { border-color: var(--workspace-selected-line); background: var(--workspace-hover); color: var(--workspace-text); }
            .steps-filter-empty {
                display: flex;
                flex: 1;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                gap: 10px;
                min-height: 140px;
                padding: 32px 24px;
                color: var(--workspace-muted);
                font-size: 12px;
                text-align: center;
                border-radius: 8px !important;
                background: color-mix(in srgb, var(--workspace-hover) 40%, transparent) !important;
                border: 1px dashed var(--workspace-line) !important;
                margin: 8px;
            }
            .steps-filter-empty button {
                padding: 6px 12px;
                border: 1px solid var(--workspace-line);
                border-radius: 6px;
                background: var(--workspace-surface);
                color: var(--workspace-primary);
                font-size: 11px;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.2s ease;
                box-shadow: 0 1px 2px rgba(0, 0, 0, 0.02);
            }
            .steps-filter-empty button:hover {
                background: var(--workspace-hover);
                border-color: var(--workspace-selected-line);
                transform: translateY(-1px);
                box-shadow: 0 2px 4px rgba(0, 0, 0, 0.04);
            }
            .steps-filter-empty button:active {
                transform: translateY(0) scale(0.98);
            }
            #scenarioList { padding: 6px !important; gap: 4px !important; }
            #scenarioList > div {
                border-radius: 7px !important;
                border: 1px solid transparent !important;
                box-shadow: none !important;
                transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
            }
            #scenarioList > div:hover {
                background: var(--workspace-hover) !important;
                border-color: color-mix(in srgb, var(--workspace-line) 80%, transparent) !important;
                transform: translateY(-2px);
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.06), 0 2px 4px rgba(0, 0, 0, 0.04) !important;
            }
            #scenarioList > div:active {
                transform: translateY(0);
                box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04) !important;
                transition-duration: 0.1s;
            }
            #scenarioList > div.bg-slate-100 {
                background: var(--workspace-selected) !important;
                border-color: var(--workspace-selected-line) !important;
                box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.05), 0 0 0 1px color-mix(in srgb, var(--workspace-primary) 20%, transparent) !important;
            }
            #scenarioList > div:has([data-scenario-file]) { min-height: 56px; }
            #scenarioList [data-scenario-file] { padding: 8px 10px !important; }
            #scenarioList [data-scenario-file] > div:first-child { font-size: 12.5px !important; font-weight: 600 !important; line-height: 1.35 !important; color: var(--workspace-text); }
            #scenarioList [data-scenario-file] > div:last-child { margin-top: 3px !important; font-size: 10.5px !important; line-height: 1.3 !important; }
            #scenarioList .scenario-pin-control {
                display: inline-flex;
                flex: 0 0 auto;
                align-items: center;
                justify-content: center;
                align-self: center;
                width: 24px;
                height: 24px;
                margin-right: 6px;
                border: 0;
                border-radius: 4px;
                background: transparent;
                color: #94a3b8;
                opacity: 0;
                cursor: pointer;
                transition: all 0.15s ease;
            }
            #scenarioList .scenario-pin-control svg { width: 13px; height: 13px; }
            #scenarioList > div:hover .scenario-pin-control, #scenarioList .scenario-pin-control--active { opacity: 1; }
            #scenarioList .scenario-pin-control:hover { background: var(--workspace-hover); color: var(--workspace-text); }
            #scenarioList .scenario-pin-control--active { color: #0d9488; }
            #scenarioList .scenario-pin-control--active:hover { background: rgba(13, 148, 136, 0.1); color: #0f766e; }

            .stats-action-btn {
                display: inline-flex;
                align-items: center;
                gap: 5px;
                padding: 4px 10px;
                border: 1px solid var(--workspace-line);
                border-radius: 6px;
                background: var(--workspace-surface);
                color: var(--workspace-muted);
                font-size: 11.5px;
                font-weight: 600;
                line-height: 1.35;
                cursor: pointer;
                transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
                user-select: none;
                box-shadow: 0 1px 2px rgba(0, 0, 0, 0.02);
            }
            .stats-action-btn:hover:not(:disabled) {
                background: var(--workspace-hover);
                color: var(--workspace-text);
                border-color: var(--workspace-selected-line);
                transform: translateY(-1px);
                box-shadow: 0 2px 4px rgba(0, 0, 0, 0.04);
            }
            .stats-action-btn:active:not(:disabled) {
                transform: scale(0.97) translateY(0);
            }
            .stats-action-btn:disabled {
                opacity: 0.45;
                cursor: not-allowed;
            }
            .stats-action-btn--primary {
                border-color: rgba(99, 102, 241, 0.25);
                background: rgba(99, 102, 241, 0.06);
                color: #4f46e5;
            }
            .stats-action-btn--primary:hover:not(:disabled) {
                background: rgba(99, 102, 241, 0.14);
                border-color: rgba(99, 102, 241, 0.4);
                color: #4338ca;
                box-shadow: 0 2px 6px rgba(99, 102, 241, 0.15);
            }
            #scenario-test-root.theme-claude-code .stats-action-btn {
                background: #fdfaf6;
                border-color: var(--workspace-line);
                color: var(--workspace-text);
            }
            #scenario-test-root.theme-claude-code .stats-action-btn--primary {
                background: #f3eae0;
                border-color: #dfcebf;
                color: #245244;
            }

            .scenario-side-tabs {
                display: flex;
                align-items: center;
                gap: 4px;
                padding: 4px 10px;
                border-bottom: 1px solid var(--workspace-line);
                background: color-mix(in srgb, var(--workspace-hover) 58%, transparent);
            }
            .scenario-side-tab {
                display: inline-flex;
                align-items: center;
                justify-content: center;
                gap: 5px;
                min-height: 28px;
                flex: 1;
                padding: 0 8px;
                border: 1px solid transparent;
                border-radius: 6px;
                background: transparent;
                color: var(--workspace-muted);
                font-size: 11.5px;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
            }
            .scenario-side-tab:hover:not(:disabled):not(.is-active) {
                color: var(--workspace-text);
                background: var(--workspace-surface);
                border-color: var(--workspace-line);
                transform: translateY(-1px);
            }
            .scenario-side-tab:active:not(:disabled) {
                transform: translateY(0) scale(0.98);
            }
            .scenario-side-tab.is-active {
                color: var(--workspace-text);
                background: var(--workspace-surface);
                border-color: var(--workspace-line);
                box-shadow: 0 2px 4px rgba(15, 23, 42, 0.06), inset 0 1px 0 rgba(255, 255, 255, 0.1);
            }
            .scenario-side-tab:disabled {
                opacity: 0.48;
                cursor: not-allowed;
            }
            .scenario-side-tab__badge {
                display: inline-flex;
                min-width: 17px;
                height: 17px;
                align-items: center;
                justify-content: center;
                padding: 0 4px;
                border-radius: 999px;
                background: var(--workspace-selected);
                color: var(--workspace-muted);
                font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
                font-size: 10px;
                font-variant-numeric: tabular-nums;
                line-height: 1;
            }
            .scenario-side-tab__badge.is-alert {
                background: #fff1f2;
                color: #e11d48;
            }
            .scenario-side-panel.hidden,
            .scenario-side-panel[hidden] { display: none !important; }
            #scenario-test-root.theme-claude-code .scenario-side-tab__badge.is-alert {
                background: #f8e2df;
                color: #a9403d;
            }
            .scenario-pane--steps #filterBar {
                min-height: 36px;
                padding: 5px 12px !important;
                background: var(--workspace-surface) !important;
                border-bottom: 1px solid var(--workspace-line) !important;
            }
            #stepsList > li {
                border-bottom: 1px solid var(--workspace-line) !important;
                transition: background-color 0.2s ease, box-shadow 0.2s ease;
            }
            #stepsList > li:hover {
                background: var(--workspace-hover) !important;
                box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.05);
            }
            #stepsList > li[data-passed="false"][data-skipped="false"] {
                box-shadow: inset 3px 0 0 var(--workspace-danger);
                background: rgba(225, 29, 72, 0.025) !important;
            }
            #stepsList > li[data-passed="false"][data-skipped="false"]:hover {
                background: rgba(225, 29, 72, 0.055) !important;
                box-shadow: inset 3px 0 0 var(--workspace-danger), inset 0 1px 0 rgba(255, 255, 255, 0.03);
            }
            #stepsList > li[data-passed="true"] {
                transition: background-color 0.3s ease;
            }
            .step-row-action {
                opacity: 0.65;
                transition: opacity 0.2s ease, background-color 0.15s ease, border-color 0.15s ease, transform 0.15s ease, box-shadow 0.15s ease;
            }
            .step-row-action:hover {
                transform: scale(1.08);
                box-shadow: 0 2px 4px rgba(0, 0, 0, 0.08);
            }
            .step-row-action:active {
                transform: scale(1.02);
                box-shadow: 0 1px 2px rgba(0, 0, 0, 0.06);
            }
            #stepsList > li:hover .step-row-action,
            #stepsList > li:focus-within .step-row-action,
            .step-row-action:focus-visible {
                opacity: 1;
            }
            #stepsList > li > div:first-child { min-height: 40px; padding: 7px 14px !important; }
            #stepsList .w-5.h-5 { width: 20px !important; height: 20px !important; font-size: 11px !important; }
            #stepsList .text-sm { font-size: 13px !important; }
            #stepsList .text-\\[10px\\], #stepsList .text-\\[11px\\], #stepsList .text-\\[12px\\] { font-size: 11px !important; }
            #stepsList [data-adhoc-step] { border-radius: 4px !important; padding: 3px 7px !important; font-size: 11px !important; box-shadow: none !important; }
            .step-run-actions {
                display: inline-flex;
                align-items: center;
                overflow: hidden;
                border: 1px solid var(--workspace-line);
                border-radius: 4px;
                background: var(--workspace-surface);
                box-shadow: 0 1px 2px rgba(0,0,0,0.02);
            }
            .step-run-actions button {
                padding: 3px 7px;
                border: 0;
                border-right: 1px solid var(--workspace-line);
                background: transparent;
                color: var(--workspace-muted);
                font-size: 11px;
                font-weight: 700;
                line-height: 1;
                cursor: pointer;
                transition: color 0.15s ease, background-color 0.15s ease;
            }
            .step-run-actions button:last-child { border-right: 0; color: #0d9488; }
            .step-run-actions button:hover { background: var(--workspace-hover); color: var(--workspace-text); }
            
            .details-panel {
                display: none;
                opacity: 0;
            }
            .details-panel.open {
                display: block;
                opacity: 1;
                padding-top: 0.75rem;
                padding-bottom: 0.75rem;
            }
            #stepsList .details-panel { background: var(--workspace-hover) !important; border-color: var(--workspace-line) !important; }

            pre {
                background: var(--workspace-code) !important;
                border: 1px solid #1e293b !important;
                border-radius: 6px !important;
                color: #e2e8f0 !important;
                font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
            }
            .font-mono {
                font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
                font-variant-numeric: tabular-nums;
            }

            .code-editor-block {
                background: #090d16 !important;
                border: 1px solid #1e293b !important;
                border-radius: 8px !important;
                max-height: 260px;
                overflow-y: auto;
            }
            .code-gutter {
                display: flex;
                flex-direction: column;
                color: #475569;
                font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
                font-size: 10.5px;
                line-height: 1.45;
                user-select: none;
                position: sticky;
                left: 0;
            }
            .code-content {
                background: transparent !important;
                border: none !important;
                border-radius: 0 !important;
                color: #cbd5e1 !important;
                font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
                font-size: 11px;
                line-height: 1.45;
            }
            #scenario-test-root.theme-claude-code .code-editor-block {
                background: #1c1815 !important;
                border-color: #3b312b !important;
            }
            #scenario-test-root.theme-claude-code .code-gutter {
                color: #78695d !important;
                background: #151210 !important;
                border-color: #3b312b !important;
            }
            #scenario-test-root.theme-claude-code .code-content {
                color: #e6dfd8 !important;
            }

            .scenario-header-button--report {
                border-color: rgba(99, 102, 241, 0.22) !important;
                background: rgba(99, 102, 241, 0.06) !important;
                color: #4f46e5 !important;
            }
            .scenario-header-button--report:hover:not(:disabled) {
                background: rgba(99, 102, 241, 0.12) !important;
                border-color: rgba(99, 102, 241, 0.35) !important;
            }
            #scenario-test-root.theme-claude-code .scenario-header-button--report {
                background: #fdfaf6 !important;
                border-color: var(--workspace-line) !important;
                color: var(--workspace-text) !important;
            }
            
            .report-content { display: flex; flex-direction: column; gap: 10px; padding: 12px; }
            .report-overview {
                padding: 12px;
                border: 1px solid var(--workspace-line);
                border-radius: 8px;
                background: linear-gradient(145deg, var(--workspace-surface), var(--workspace-hover));
            }
            .report-overview__top { display: flex; min-width: 0; align-items: center; justify-content: space-between; gap: 8px; }
            .report-overview__title { min-width: 0; overflow: hidden; color: var(--workspace-text); font-size: 12px; font-weight: 700; text-overflow: ellipsis; white-space: nowrap; }
            .report-status {
                display: inline-flex;
                flex: 0 0 auto;
                align-items: center;
                min-height: 22px;
                padding: 0 8px;
                border: 1px solid transparent;
                border-radius: 999px;
                font-size: 10px;
                font-weight: 700;
                box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
            }
            .report-status--passed {
                background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%);
                border-color: #bbf7d0;
                color: #047857;
                box-shadow: 0 1px 3px rgba(16, 185, 129, 0.15);
            }
            .report-status--failed {
                background: linear-gradient(135deg, #fff1f2 0%, #ffe4e6 100%);
                border-color: #fecdd3;
                color: #be123c;
                box-shadow: 0 1px 3px rgba(225, 29, 72, 0.15);
            }
            .report-status--cancelled {
                background: linear-gradient(135deg, #fff7ed 0%, #ffedd5 100%);
                border-color: #fed7aa;
                color: #c2410c;
                box-shadow: 0 1px 3px rgba(234, 88, 12, 0.15);
            }
            .report-status--skipped,
            .report-status--running {
                background: var(--workspace-selected);
                border-color: var(--workspace-selected-line);
                color: var(--workspace-muted);
            }
            .report-overview__meta { display: flex; flex-wrap: wrap; gap: 5px 10px; margin-top: 8px; color: var(--workspace-muted); font-size: 10px; line-height: 1.4; }
            .report-overview__meta span { position: relative; }
            .report-overview__meta span + span::before { content: '·'; position: absolute; left: -7px; color: var(--workspace-selected-line); }
            .report-progress { margin-top: 11px; }
            .report-progress__labels { display: flex; align-items: center; justify-content: space-between; gap: 8px; color: var(--workspace-muted); font-size: 10px; }
            .report-progress__labels strong { color: var(--workspace-text); font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-variant-numeric: tabular-nums; }
            .report-progress__outcome { margin-top: 8px; }
            .report-progress__track {
                height: 6px;
                margin-top: 5px;
                overflow: hidden;
                border-radius: 999px;
                background: var(--workspace-selected);
                box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.05);
            }
            .report-progress__track span {
                display: block;
                height: 100%;
                border-radius: inherit;
                background: linear-gradient(90deg, var(--workspace-success) 0%, color-mix(in srgb, var(--workspace-success) 85%, white) 100%);
                transition: width 0.35s cubic-bezier(0.4, 0, 0.2, 1);
                box-shadow: 0 0 8px rgba(16, 185, 129, 0.25);
            }
            .report-progress__track--failed span {
                background: linear-gradient(90deg, var(--workspace-danger) 0%, color-mix(in srgb, var(--workspace-danger) 85%, white) 100%);
                box-shadow: 0 0 8px rgba(225, 29, 72, 0.25);
            }
            .report-diagnosis { overflow: hidden; border: 1px solid var(--workspace-line); border-radius: 8px; background: var(--workspace-surface); }
            .report-diagnosis > summary { display: flex; align-items: center; justify-content: space-between; min-height: 34px; padding: 0 10px; cursor: pointer; color: var(--workspace-text); font-size: 11px; font-weight: 700; list-style: none; }
            .report-diagnosis > summary::-webkit-details-marker { display: none; }
            .report-diagnosis > summary::after { content: '⌄'; color: var(--workspace-muted); font-size: 14px; transition: transform 0.15s ease; }
            .report-diagnosis[open] > summary::after { transform: rotate(180deg); }
            .report-diagnosis__body { padding: 0 10px 10px; border-top: 1px solid var(--workspace-line); }
            .report-steps__title { padding: 9px 0 2px; color: var(--workspace-muted); font-size: 10px; font-weight: 700; letter-spacing: .04em; text-transform: uppercase; }
            .report-healthy { margin-top: 8px; padding: 10px; border: 1px solid #bbf7d0; border-radius: 7px; background: #f0fdf4; }
            .report-healthy__title { color: #047857; font-size: 11px; font-weight: 700; }
            .report-healthy__hint { margin-top: 3px; color: #4b7a68; font-size: 10px; line-height: 1.45; }
            .report-step { position: relative; display: flex; gap: 8px; padding: 8px 0; border-bottom: 1px solid var(--workspace-line); }
            .report-step:last-child { border-bottom: 0; }
            .report-step__marker { display: flex; flex: 0 0 16px; align-items: center; justify-content: center; width: 16px; height: 16px; margin-top: 1px; border-radius: 999px; font-size: 10px; font-weight: 800; }
            .report-step--passed .report-step__marker { background: #ecfdf5; color: #059669; }
            .report-step--failed .report-step__marker { background: #fff1f2; color: #e11d48; }
            .report-step__content { min-width: 0; flex: 1; }
            .report-step__heading { display: flex; min-width: 0; align-items: baseline; gap: 5px; }
            .report-step__number { flex: 0 0 auto; color: var(--workspace-muted); font-size: 10px; font-weight: 600; }
            .report-step__name { overflow: hidden; color: var(--workspace-text); font-size: 11.5px; font-weight: 700; text-overflow: ellipsis; white-space: nowrap; }
            .report-step__request { display: flex; min-width: 0; align-items: center; gap: 5px; margin-top: 3px; }
            .report-method { flex: 0 0 auto; font-family: ui-monospace, SFMono-Regular, Consolas, monospace; font-size: 9px; font-weight: 800; }
            .report-method--get { color: #059669; }
            .report-method--post { color: #d97706; }
            .report-method--put { color: #a16207; }
            .report-method--delete { color: #e11d48; }
            .report-method--patch { color: #7c3aed; }
            .report-step__path { overflow: hidden; color: var(--workspace-muted); font-family: ui-monospace, SFMono-Regular, Consolas, monospace; font-size: 10px; text-overflow: ellipsis; white-space: nowrap; }
            .report-step__issue { margin-top: 4px; color: #e11d48; font-size: 10.5px; line-height: 1.4; }
            .report-step__locate {
                display: inline-flex;
                align-items: center;
                margin-top: 4px;
                padding: 2px 0;
                border: 0;
                background: transparent;
                color: var(--workspace-primary);
                font-size: 10px;
                font-weight: 700;
                cursor: pointer;
            }
            .report-step__locate:hover { text-decoration: underline; }
            .report-step__locate:focus-visible { outline: 2px solid var(--workspace-primary); outline-offset: 2px; }
            .report-step__response { margin-top: 6px; }
            .report-step__response summary { cursor: pointer; color: #0d9488; font-size: 10px; font-weight: 700; }
            .report-step__response-section { margin-top: 6px; color: var(--workspace-muted); font-size: 10px; font-weight: 600; }
            .report-step__response pre { max-height: 260px; margin-top: 4px; overflow: auto; padding: 8px; background: #0f172a; border: 0; border-radius: 6px; color: #e2e8f0; font-size: 10px; line-height: 1.45; white-space: pre-wrap; word-break: break-word; }
            .report-step__result { display: flex; flex: 0 0 auto; flex-direction: column; align-items: flex-end; gap: 3px; padding-top: 1px; }
            .report-step__code { color: var(--workspace-muted); font-family: ui-monospace, SFMono-Regular, Consolas, monospace; font-size: 10px; font-weight: 700; }
            .report-step__duration { color: var(--workspace-muted); font-family: ui-monospace, SFMono-Regular, Consolas, monospace; font-size: 10px; }
            .scenario-step--located { background: var(--workspace-hover) !important; box-shadow: inset 3px 0 0 var(--workspace-primary); }
            
            .report-empty {
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                min-height: 120px;
                padding: 24px 16px;
                text-align: center;
                color: var(--workspace-muted);
                border-radius: 8px !important;
                background: color-mix(in srgb, var(--workspace-hover) 35%, transparent) !important;
                border: 1px dashed var(--workspace-line) !important;
                margin: 12px;
            }
            .report-empty__title {
                color: var(--workspace-text);
                font-size: 13px;
                font-weight: 700;
                margin-bottom: 4px;
            }
            .report-empty__hint {
                margin-top: 4px;
                font-size: 11px;
                line-height: 1.5;
            }

            #configModal {
                backdrop-filter: blur(6px);
                animation: modal-fade-in 0.2s ease-out;
            }
            @keyframes modal-fade-in {
                from { opacity: 0; }
                to { opacity: 1; }
            }
            #configModal > div {
                background: #0f172a !important;
                border: 1px solid #1e293b !important;
                border-radius: 12px !important;
                box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.4), 0 8px 10px -6px rgba(0, 0, 0, 0.3) !important;
                animation: modal-slide-in 0.25s cubic-bezier(0.16, 1, 0.3, 1);
            }
            @keyframes modal-slide-in {
                from { opacity: 0; transform: scale(0.96) translateY(-8px); }
                to { opacity: 1; transform: scale(1) translateY(0); }
            }
            #configModal input, #configModal select {
                border-radius: 6px !important;
                transition: all 0.2s ease;
            }
            #configModal input:focus, #configModal select:focus {
                box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.25) !important;
                transform: translateY(-1px);
            }

            #adhocModal {
                backdrop-filter: blur(6px);
                animation: modal-fade-in 0.2s ease-out;
            }
            #adhocModal > div {
                background: var(--workspace-surface) !important;
                border: 1px solid var(--workspace-line) !important;
                border-radius: 12px !important;
                box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.2), 0 8px 10px -6px rgba(0, 0, 0, 0.15) !important;
                animation: modal-slide-in 0.25s cubic-bezier(0.16, 1, 0.3, 1);
            }
            #adhocModal input, #adhocModal select, #adhocModal textarea {
                border-radius: 6px !important;
                transition: all 0.2s ease;
            }
            #adhocModal input:focus, #adhocModal select:focus, #adhocModal textarea:focus {
                border-color: var(--workspace-primary) !important;
                box-shadow: 0 0 0 3px color-mix(in srgb, var(--workspace-primary) 20%, transparent) !important;
                transform: translateY(-1px);
            }

            .scenario-step-loading { display: none; position: fixed; z-index: 40; top: 54px; right: 16px; pointer-events: none; }
            .scenario-step-loading--visible { display: block; animation: scenario-step-loading-fade-in 0.2s ease-out; }
            .scenario-step-loading__content {
                display: flex;
                align-items: center;
                gap: 10px;
                min-width: 240px;
                max-width: 420px;
                padding: 10px 14px;
                border: 1px solid var(--workspace-line);
                border-radius: 9px;
                background: var(--workspace-surface);
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08), 0 2px 6px rgba(0, 0, 0, 0.04);
                backdrop-filter: blur(8px);
            }
            @keyframes scenario-step-loading-fade-in {
                from { opacity: 0; transform: translateY(-4px); }
                to { opacity: 1; transform: translateY(0); }
            }
            .scenario-step-loading__spinner {
                width: 16px;
                height: 16px;
                border: 2px solid var(--workspace-line);
                border-top-color: var(--workspace-primary);
                border-radius: 50%;
                animation: scenario-step-loading-spin 0.8s cubic-bezier(0.4, 0.15, 0.6, 0.85) infinite,
                           scenario-step-loading-pulse 2s ease-in-out infinite;
            }
            @keyframes scenario-step-loading-pulse {
                0%, 100% { opacity: 1; }
                50% { opacity: 0.7; }
            }
            .scenario-step-loading__title { color: var(--workspace-text); font-size: 12px; font-weight: 700; }
            .scenario-step-loading__text { margin-top: 1px; overflow: hidden; color: var(--workspace-muted); font-size: 11px; text-overflow: ellipsis; white-space: nowrap; }
            @keyframes scenario-step-loading-spin { to { transform: rotate(360deg); } }

            .code-copy-btn {
                border: 1px solid #334155;
                background: #1e293b;
                color: #94a3b8;
                border-radius: 4px;
                padding: 2px 7px;
                font-size: 10px;
                font-weight: 600;
                cursor: pointer;
                transition: all .15s ease;
            }
            .code-copy-btn:hover { color: #ffffff; background: #334155; }
            .code-copy-btn--success { color: #34d399 !important; border-color: #059669 !important; }

            .custom-dropdown__trigger,
            .scenario-header-button,
            .scenario-header-text-action { height: 36px; }
            .scenario-header-button { font-size: 12.5px !important; }
            #scenarioSearchInput { min-height: 34px; font-size: 12.5px !important; }
            #scenarioList [data-scenario-file] > div:first-child { font-size: 13px !important; }
            #scenarioList [data-scenario-file] > div:last-child { font-size: 11px !important; }
            #stepsList > li > div:first-child { min-height: 44px; padding-top: 8px !important; padding-bottom: 8px !important; }
            .report-metric__label, .report-progress__labels { font-size: 11px; }
            .report-metric__value { font-size: 16px; }

            #scenario-test-root :where(button, input, select, textarea, summary, [data-scenario-file]):focus-visible {
                outline: 2px solid var(--workspace-primary) !important;
                outline-offset: 2px;
                box-shadow: 0 0 0 4px color-mix(in srgb, var(--workspace-primary) 15%, transparent);
                transition: box-shadow 0.2s ease;
            }
            #stepsList [role="button"][tabindex]:focus-visible {
                outline: 2px solid var(--workspace-primary) !important;
                outline-offset: -3px;
                border-radius: 3px;
                box-shadow: 0 0 0 4px color-mix(in srgb, var(--workspace-primary) 12%, transparent);
            }
            .custom-dropdown__item:focus-visible {
                background: var(--workspace-hover);
                outline-offset: -1px !important;
                box-shadow: inset 0 0 0 1px var(--workspace-primary);
            }
            #scenarioList .scenario-pin-control:focus-visible { opacity: 1; }
            #cancelBtn:disabled { display: none; }
            #configModal, #adhocModal { background: var(--workspace-overlay) !important; }

            .scenario-grid {
                display: grid;
                grid-template-columns: minmax(200px, 260px) 1fr minmax(250px, 290px);
                gap: 8px;
                height: 100%;
                min-height: 0;
            }
            .scenario-pane {
                height: 100%;
                min-height: 0;
                display: flex;
                flex-direction: column;
                overflow: hidden;
            }

            @media (min-width: 1440px) {
                .scenario-grid {
                    grid-template-columns: minmax(220px, 270px) 1fr minmax(260px, 300px) !important;
                }
            }

            @media (max-width: 1439px) and (min-width: 1080px) {
                .scenario-grid {
                    grid-template-columns: minmax(190px, 230px) 1fr minmax(240px, 270px) !important;
                }
            }

            @media (max-width: 1079px) {
                #scenario-test-root { overflow: auto; }
                .scenario-workspace { height: auto; min-height: calc(100vh - 48px); overflow: visible; }
                .scenario-grid {
                    height: auto;
                    min-height: calc(100vh - 64px);
                    display: flex !important;
                    flex-direction: column;
                }
                .scenario-pane { max-height: none !important; }
                .scenario-pane--scenarios { height: min(30vh, 260px); }
                .scenario-pane--steps { height: max(500px, 60vh); }
                .scenario-pane--stats { height: auto; }
            }

            @media (max-width: 820px) {
                #scenario-test-root > header {
                    min-height: auto;
                    align-items: stretch;
                    flex-direction: column;
                    gap: 6px;
                    padding: 8px 12px !important;
                }
                .scenario-header-context { width: 100%; }
                .scenario-header-theme .custom-dropdown__prefix,
                .scenario-header-environment .custom-dropdown__prefix,
                .scenario-header-config-label,
                .scenario-environment-badge { display: none; }
                .scenario-header-actions { width: 100%; max-width: none; align-items: center; justify-content: flex-end; gap: 4px !important; overflow: visible; padding-bottom: 1px; }
                .scenario-header-context-actions { margin-right: auto; }
                .scenario-header-run-actions { margin-left: 0; }
                .scenario-header-secondary-actions { margin-left: 0; }
                .scenario-header-reset { padding: 0 6px !important; font-size: 11px !important; }
                .scenario-header-environment .custom-dropdown__trigger { max-width: 132px; }
                .scenario-header-environment .custom-dropdown__label { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
                .scenario-header-theme .custom-dropdown__trigger { max-width: 108px; }
                .scenario-header-theme .custom-dropdown__label { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
                .custom-dropdown__trigger,
                .scenario-header-button,
                .scenario-header-text-action { height: 36px; }
                #filterBar { gap: 8px; overflow-x: auto; }
                #filterBar > div:last-child { min-width: 150px; }
                #stepsList > li > div:first-child { padding-left: 12px !important; padding-right: 12px !important; }
                #stepsList > li > div:first-child > div:last-child { gap: 4px !important; }
                .step-row-action { padding: 1px 5px !important; font-size: 10px !important; }
            }

            @media (pointer: coarse) {
                #scenarioList .scenario-pin-control { opacity: .72; }
                .scenario-header-button,
                .scenario-header-text-action,
                .custom-dropdown__trigger { min-height: 40px; }
                #stepsList > li > div:first-child { min-height: 48px; }
                .step-row-action { opacity: .85; pointer-events: auto; transform: none; }
            }

            @media (prefers-reduced-motion: reduce) {
                #scenario-test-root *,
                #scenario-test-root *::before,
                #scenario-test-root *::after {
                    scroll-behavior: auto !important;
                    animation: none !important;
                    transition-duration: 0.01ms !important;
                }
                .scenario-header-button:hover,
                .scenario-header-button:active,
                #scenarioList > div:hover,
                #scenarioList > div:active,
                .stats-action-btn:hover,
                .stats-action-btn:active,
                .scenario-side-tab:hover,
                .scenario-side-tab:active,
                .step-row-action:hover,
                .step-row-action:active,
                .custom-dropdown__item:hover,
                .custom-dropdown__item:active,
                .scenario-search-empty button:hover,
                .scenario-search-empty button:active,
                .steps-filter-empty button:hover,
                .steps-filter-empty button:active,
                #configModal input:focus,
                #configModal select:focus,
                #adhocModal input:focus,
                #adhocModal select:focus,
                #adhocModal textarea:focus {
                    transform: none !important;
                }
            }

            ::-webkit-scrollbar { width: 8px; height: 8px; }
            ::-webkit-scrollbar-track {
                background: transparent;
                margin: 2px;
            }
            ::-webkit-scrollbar-thumb {
                background: color-mix(in srgb, #cbd5e1 70%, transparent);
                border-radius: 999px;
                border: 2px solid transparent;
                background-clip: padding-box;
                transition: background-color 0.2s ease;
            }
            ::-webkit-scrollbar-thumb:hover {
                background: color-mix(in srgb, #94a3b8 85%, transparent);
                background-clip: padding-box;
            }
            ::-webkit-scrollbar-thumb:active {
                background: #94a3b8;
                background-clip: padding-box;
            }
            #scenario-test-root.theme-claude-code ::-webkit-scrollbar-thumb {
                background: color-mix(in srgb, #d9af8d 70%, transparent);
                background-clip: padding-box;
            }
            #scenario-test-root.theme-claude-code ::-webkit-scrollbar-thumb:hover {
                background: color-mix(in srgb, #d9af8d 85%, transparent);
                background-clip: padding-box;
            }
            #scenario-test-root.theme-zcode ::-webkit-scrollbar-thumb {
                background: color-mix(in srgb, #35446b 70%, transparent);
                background-clip: padding-box;
            }
            #scenario-test-root.theme-zcode ::-webkit-scrollbar-thumb:hover {
                background: color-mix(in srgb, #4f7cff 70%, transparent);
                background-clip: padding-box;
            }
            #scenario-test-root:is(.theme-zcode, .theme-zcode-light) { --workspace-radius: 10px; }
            #scenario-test-root:is(.theme-zcode, .theme-zcode-light) > header { min-height: 52px; padding-inline: 20px !important; }
            #scenario-test-root:is(.theme-zcode, .theme-zcode-light) .scenario-workspace { height: calc(100vh - 52px); padding: 12px !important; }
            #scenario-test-root:is(.theme-zcode, .theme-zcode-light) .scenario-grid { gap: 12px !important; }
            #scenario-test-root:is(.theme-zcode, .theme-zcode-light) .scenario-pane { box-shadow: 0 4px 18px rgba(25, 40, 75, 0.05) !important; }
            #scenario-test-root.theme-zcode .scenario-pane { box-shadow: 0 4px 18px rgba(0, 0, 0, 0.18) !important; }
            #scenario-test-root:is(.theme-zcode, .theme-zcode-light) #scenarioList { padding: 8px !important; }
            #scenario-test-root:is(.theme-zcode, .theme-zcode-light) #scenarioList > div:hover { transform: none; box-shadow: none !important; }
            #scenario-test-root:is(.theme-zcode, .theme-zcode-light) #scenarioList > div.bg-slate-100 { box-shadow: inset 3px 0 0 var(--workspace-primary) !important; }
            #scenario-test-root:is(.theme-zcode, .theme-zcode-light) #stepsList > li > div:first-child { min-height: 48px; }
            #scenario-test-root:is(.theme-zcode, .theme-zcode-light) .scenario-header-select:focus-within { box-shadow: 0 0 0 3px var(--workspace-focus) !important; }
            #scenario-test-root:is(.theme-zcode, .theme-zcode-light) :is(button, input, select, textarea, [role="button"]):focus-visible { outline: 2px solid var(--workspace-primary) !important; outline-offset: 2px; }
            @media (prefers-reduced-motion: reduce) {
                #scenario-test-root:is(.theme-zcode, .theme-zcode-light) #scenarioList > div,
                #scenario-test-root:is(.theme-zcode, .theme-zcode-light) .scenario-pane { transition: none !important; }
            }
        `;
    }

    function getClaudeStyleBlock() {
        return '';
    }

    function injectStyles() {
        var existing = document.getElementById('scenarioDynamicStyles');
        if (existing) return;

        var style = document.createElement('style');
        style.id = 'scenarioDynamicStyles';
        style.textContent = getWorkspaceStyleBlock();
        document.head.appendChild(style);
    }

    function applyTheme(theme) {
        var selectedTheme = (theme === 'claude-code' || theme === 'zcode' || theme === 'zcode-light') ? theme : 'default';
        var root = document.getElementById('scenario-test-root');
        if (root) {
            root.classList.toggle('theme-claude-code', selectedTheme === 'claude-code');
            root.classList.toggle('theme-zcode', selectedTheme === 'zcode');
            root.classList.toggle('theme-zcode-light', selectedTheme === 'zcode-light');
        }
        document.body.classList.toggle('theme-claude-code', selectedTheme === 'claude-code');
        document.body.classList.toggle('theme-zcode', selectedTheme === 'zcode');
        document.body.classList.toggle('theme-zcode-light', selectedTheme === 'zcode-light');
        var select = document.getElementById('themeSelect');
        if (select) {
            select.value = selectedTheme;
            var selectedOption = select.options[select.selectedIndex];
            var themeLabel = document.getElementById('themeDropdownLabel');
            if (themeLabel) themeLabel.textContent = selectedOption ? selectedOption.textContent : '-';
        }
        injectStyles();
    }

    return {
        getClaudeStyleBlock: getClaudeStyleBlock,
        injectStyles: injectStyles,
        applyTheme: applyTheme
    };
})();

export default workbenchStyle;
