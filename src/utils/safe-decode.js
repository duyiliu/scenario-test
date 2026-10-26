// decodeURIComponent 对畸形百分号编码（bad%zz、字面 % 等）会抛 URIError。
// URL query 解析场景里单个畸形 key/value 不应阻断请求或工作台渲染：失败时保留原串。
export function safeDecodeComponent(value) {
    try {
        return decodeURIComponent(value);
    } catch {
        return value;
    }
}
