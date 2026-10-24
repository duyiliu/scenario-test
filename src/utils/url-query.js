import { safeDecodeComponent } from "./safe-decode.js";

// 全局 query 只能拼在 URL fragment 之前：拼到 # 之后会成为 fragment 内容，
// 不会随 HTTP 请求发送。引擎实际请求与工作台 cURL 预览共用这两个函数，避免逻辑分叉。
function splitFragment(requestPath) {
    const text = String(requestPath || "");
    const hashIndex = text.indexOf("#");
    return hashIndex >= 0
        ? { path: text.slice(0, hashIndex), fragment: text.slice(hashIndex) }
        : { path: text, fragment: "" };
}

// 收集路径 query（不含 fragment）中已有的 key，用于全局参数去重
export function existingQueryKeys(requestPath) {
    const { path } = splitFragment(requestPath);
    const queryIndex = path.indexOf("?");
    const keys = new Set();
    if (queryIndex < 0) return keys;
    for (const pair of path.slice(queryIndex + 1).split("&")) {
        const key = pair.split("=")[0];
        if (key) keys.add(safeDecodeComponent(key));
    }
    return keys;
}

// 将 query 参数追加到 fragment 之前；已有 query 时用 & 连接
export function appendQueryParams(requestPath, queryParts) {
    if (!queryParts || !queryParts.length) return requestPath;
    const { path, fragment } = splitFragment(requestPath);
    return `${path}${path.includes("?") ? "&" : "?"}${queryParts.join("&")}${fragment}`;
}
