// 浏览器工作台 UI 辅助工具（与执行语义无关；目录原名 legacy/，已更名 ui/）
//
// 迁移背景：旧 legacy/core.js 已统一到 src/core.js（纯执行语义），本模块仅承载
// 依赖 DOM/navigator 的展示与剪贴板辅助函数。顶层不触 DOM，保证 Node 可导入测试。

// ===== HTML 转义 =====

// 统一转义 & < > "（双端一致）：文本上下文中 &quot; 仍渲染为引号，属性上下文（value="${esc(x)}"）
// 中引号被转义后无法逃出属性边界。此前浏览器分支用 div.textContent→innerHTML 只转义 & < >、
// 不转义引号，与 Node 回退分支行为不一致，属性上下文存在注入面。
export function esc(s) {
    if (s == null) return '';
    return String(s)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

// ===== 耗时格式化（保留浏览器端历史语义：<1s 显示 "500.00ms"，勿改用 Node formatDuration）=====

export function fmt(ms) {
    if (!isFinite(ms)) return '-';
    return ms >= 1000 ? (ms / 1000).toFixed(2) + ' s' : ms.toFixed(2) + 'ms';
}

// ===== 安全 JSON 序列化（失败回退 String）=====

export function safeJson(value) {
    try {
        return JSON.stringify(value, null, 2);
    } catch (e) {
        return String(value);
    }
}

// ===== 敏感值清洗（场景测试用于项目内联调，保留原始值）=====

export function sanitizeSensitive(value) {
    return value;
}

// ===== 凭据类名称识别 =====
// 工作台变量掩码与 adhoc「转为步骤」共用同一份名单：Authorization / X-Auth-Token /
// apiKey 等请求头或变量名命中后按占位符输出，避免把凭据写成明文。
export const SECRET_VAR_PATTERN = /(token|secret|password|passwd|auth|credential|api[-_]?key|cookie)/i;

export function isSecretName(name) {
    return SECRET_VAR_PATTERN.test(String(name == null ? '' : name));
}

// ===== 剪贴板复制（可靠回退）=====
// Clipboard API 仅在安全上下文（HTTPS/localhost）可用且需要权限；
// 失败或不可用时回退 textarea + execCommand，保证工作台复制始终可用。

function copyTextFallback(text) {
    if (typeof document === 'undefined' || !document.body || typeof document.createElement !== 'function') return false;
    var textarea;
    var activeElement = document.activeElement;
    try {
        textarea = document.createElement('textarea');
        textarea.value = String(text);
        textarea.setAttribute('readonly', '');
        textarea.style.position = 'fixed';
        textarea.style.top = '-9999px';
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        return typeof document.execCommand === 'function' && document.execCommand('copy') === true;
    } catch (error) {
        return false;
    } finally {
        if (textarea && textarea.parentNode) textarea.parentNode.removeChild(textarea);
        if (activeElement && typeof activeElement.focus === 'function') {
            try {
                activeElement.focus();
            } catch (error) {
                // 原焦点可能已离开文档；复制结果不受影响。
            }
        }
    }
}

export function copyText(text) {
    var value = String(text == null ? '' : text);
    if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
        return Promise.resolve()
            .then(function () { return navigator.clipboard.writeText(value); })
            .then(function () { return true; })
            .catch(function () { return copyTextFallback(value); });
    }
    return Promise.resolve().then(function () { return copyTextFallback(value); });
}
