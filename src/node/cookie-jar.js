// Node CLI 单场景内存 Cookie Jar（--cookie-jar）
//
// 仅在显式开启时由 CLI 注入 fetch 包装；默认关闭时请求路径与行为完全不变。
// 实现覆盖 RFC 6265 的核心子集：name/value、Domain、Path、Expires、Max-Age、Secure；
// 不落盘、不跨场景共享，浏览器工作台仍交给浏览器 Cookie 机制。

function isSecureProtocol(protocol) {
    return protocol === "https:" || protocol === "wss:";
}

function defaultCookiePath(pathname) {
    const value = String(pathname || "/");
    if (!value.startsWith("/")) return "/";
    const lastSlash = value.lastIndexOf("/");
    if (lastSlash <= 0) return "/";
    return value.slice(0, lastSlash);
}

function pathMatches(requestPath, cookiePath) {
    const path = requestPath || "/";
    const expected = cookiePath || "/";
    if (path === expected) return true;
    if (!path.startsWith(expected)) return false;
    // RFC 6265 5.1.4：cookie-path 以 "/" 结尾时前缀匹配即通过；
    // 否则要求 request-path 的下一个字符是 "/"（/api 不匹配 /apix）
    return expected.endsWith("/") || path.charAt(expected.length) === "/";
}

function domainMatches(hostname, domain) {
    const host = String(hostname || "").toLowerCase();
    const value = String(domain || "").toLowerCase().replace(/^\./, "");
    if (!host || !value) return false;
    return host === value || host.endsWith(`.${value}`);
}

function splitSetCookieHeader(value) {
    // 兜底：环境没有 Headers.getSetCookie 时只能拿到逗号合并后的头。
    // Expires 里的 "Wed, 21 Oct..." 逗号后不是 name=value，因此只在
    // 逗号后紧跟合法 cookie 名与 "=" 时切分。
    const parts = [];
    let start = 0;
    for (let index = 0; index < value.length; index += 1) {
        if (value[index] !== ",") continue;
        const rest = value.slice(index + 1);
        if (/^\s*[^;,=\s]+=/.test(rest)) {
            parts.push(value.slice(start, index));
            start = index + 1;
        }
    }
    parts.push(value.slice(start));
    return parts.map((item) => item.trim()).filter(Boolean);
}

function readSetCookieHeaders(headers) {
    if (!headers) return [];
    if (typeof headers.getSetCookie === "function") {
        const values = headers.getSetCookie();
        if (Array.isArray(values) && values.length) return values;
    }
    const combined = typeof headers.get === "function"
        ? headers.get("set-cookie")
        : (headers["set-cookie"] || headers["Set-Cookie"]);
    if (!combined) return [];
    if (Array.isArray(combined)) return combined;
    return splitSetCookieHeader(String(combined));
}

function parseCookieHeader(value) {
    const result = [];
    for (const part of String(value || "").split(";")) {
        const item = part.trim();
        if (!item) continue;
        const separator = item.indexOf("=");
        const name = (separator >= 0 ? item.slice(0, separator) : item).trim();
        if (!name) continue;
        result.push({ name, value: separator >= 0 ? item.slice(separator + 1).trim() : "" });
    }
    return result;
}

function parseSetCookie(value, requestUrl, nowMs) {
    const segments = String(value || "").split(";");
    const pair = segments.shift() || "";
    const separator = pair.indexOf("=");
    const name = (separator > 0 ? pair.slice(0, separator) : "").trim();
    if (!name) return null;
    const cookieValue = separator > 0 ? pair.slice(separator + 1).trim() : "";

    const hostname = requestUrl.hostname.toLowerCase();
    const attributes = { domain: null, path: null, expiresAt: null, secure: false };
    let maxAge = null;
    for (const segment of segments) {
        const index = segment.indexOf("=");
        const key = (index >= 0 ? segment.slice(0, index) : segment).trim().toLowerCase();
        const attrValue = index >= 0 ? segment.slice(index + 1).trim() : "";
        if (key === "domain" && attrValue) attributes.domain = attrValue.replace(/^\./, "").toLowerCase();
        else if (key === "path" && attrValue.startsWith("/")) attributes.path = attrValue;
        else if (key === "expires" && attrValue) {
            const parsed = Date.parse(attrValue);
            if (Number.isFinite(parsed)) attributes.expiresAt = parsed;
        } else if (key === "max-age" && /^-?\d+$/.test(attrValue)) {
            maxAge = Number(attrValue);
        } else if (key === "secure") attributes.secure = true;
    }

    // 服务端下发的 Domain 必须与当前 host domain-match，避免跨站 Set-Cookie 污染 jar
    if (attributes.domain && !domainMatches(hostname, attributes.domain)) return null;

    let expiresAt = attributes.expiresAt;
    if (maxAge !== null) expiresAt = nowMs + maxAge * 1000;

    return {
        name,
        value: cookieValue,
        domain: attributes.domain || hostname,
        hostOnly: !attributes.domain,
        path: attributes.path || defaultCookiePath(requestUrl.pathname),
        expiresAt,
        secure: attributes.secure,
        createdAt: nowMs
    };
}

function toUrl(input) {
    if (input instanceof URL) return input;
    if (typeof input === "string") return new URL(input);
    if (input && typeof input.url === "string") return new URL(input.url);
    return new URL(String(input));
}

export function createCookieJar(options = {}) {
    const now = typeof options.now === "function" ? options.now : () => Date.now();
    // key = hostOnly + domain + path + name：同 name 不同 Path/Domain 共存，同名同域同路径覆盖
    const cookies = new Map();
    const keyOf = (cookie) => `${cookie.hostOnly ? "H" : "D"}|${cookie.domain}|${cookie.path}|${cookie.name}`;

    function remove(cookie) {
        cookies.delete(keyOf(cookie));
    }

    function purgeExpired(nowMs = now()) {
        for (const cookie of [...cookies.values()]) {
            if (cookie.expiresAt !== null && cookie.expiresAt <= nowMs) cookies.delete(keyOf(cookie));
        }
    }

    function store(urlInput, setCookieValues) {
        const url = toUrl(urlInput);
        const nowMs = now();
        for (const value of setCookieValues || []) {
            const cookie = parseSetCookie(value, url, nowMs);
            if (!cookie) continue;
            if (cookie.expiresAt !== null && cookie.expiresAt <= nowMs) {
                remove(cookie);
                continue;
            }
            cookies.set(keyOf(cookie), cookie);
        }
    }

    function matchesUrl(cookie, url) {
        const hostname = url.hostname.toLowerCase();
        if (cookie.hostOnly ? hostname !== cookie.domain : !domainMatches(hostname, cookie.domain)) return false;
        if (!pathMatches(url.pathname || "/", cookie.path)) return false;
        if (cookie.secure && !isSecureProtocol(url.protocol)) return false;
        return true;
    }

    function getCookies(urlInput) {
        const url = toUrl(urlInput);
        const nowMs = now();
        purgeExpired(nowMs);
        const matched = [...cookies.values()].filter((cookie) => matchesUrl(cookie, url));
        // RFC 6265 5.4：路径更长者优先，其次创建时间更早者优先
        matched.sort((left, right) => right.path.length - left.path.length || left.createdAt - right.createdAt);
        return matched.map((cookie) => ({ name: cookie.name, value: cookie.value }));
    }

    function headerFor(urlInput) {
        return getCookies(urlInput).map((cookie) => `${cookie.name}=${cookie.value}`).join("; ");
    }

    return { store, getCookies, headerFor, clear: () => cookies.clear() };
}

function splitCookieHeaderValues(headerValue) {
    const explicit = new Set();
    for (const part of String(headerValue || "").split(";")) {
        const item = part.trim();
        if (!item) continue;
        const separator = item.indexOf("=");
        explicit.add((separator >= 0 ? item.slice(0, separator) : item).trim());
    }
    return explicit;
}

export function createCookieJarFetch(fetchImpl = globalThis.fetch, options = {}) {
    if (typeof fetchImpl !== "function") throw new Error("缺少 fetch 实现，无法启用 Cookie Jar");
    const jar = options.jar || createCookieJar(options);

    return async function cookieJarFetch(input, init = {}) {
        const url = toUrl(input);
        const headers = new Headers(init?.headers || (input && input.headers) || undefined);
        const jarCookies = jar.getCookies(url);
        if (jarCookies.length) {
            const explicitNames = splitCookieHeaderValues(headers.get("cookie"));
            const additions = jarCookies.filter((cookie) => !explicitNames.has(cookie.name));
            if (additions.length) {
                const existing = headers.get("cookie");
                const merged = additions.map((cookie) => `${cookie.name}=${cookie.value}`).join("; ");
                headers.set("cookie", existing ? `${existing}; ${merged}` : merged);
            }
        }

        const response = await fetchImpl(input, { ...init, headers });
        jar.store(url, readSetCookieHeaders(response?.headers));
        return response;
    };
}
