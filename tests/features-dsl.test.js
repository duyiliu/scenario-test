import assert from "node:assert/strict";
import http from "node:http";
import test from "node:test";
import {
    applyGeneratedVar,
    createEngine,
    createRuntime,
    defineScenario,
    evaluateAssertion,
    maskSecret,
    redactSecrets
} from "../src/index.js";

function jsonResponse(body, status = 200, headers = {}) {
    return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json", ...headers } });
}

// ==================== #73 shape ====================
test("#73 shape：结构通过、缺失必填与类型错误定位到字段路径", () => {
    const schema = {
        type: "object",
        required: ["id", "items"],
        properties: {
            id: { type: "integer" },
            items: { type: "array", items: { type: "object", required: ["sku"], properties: { sku: { type: "string" } } } }
        }
    };
    const runtime = { vars: {} };
    const pass = evaluateAssertion({ name: "结构", shape: schema }, {
        status: 200, headers: {}, bodyText: "", body: { id: 1, items: [{ sku: "a" }] }
    }, runtime, {});
    assert.equal(pass.passed, true);

    const fail = evaluateAssertion({ name: "结构", shape: schema }, {
        status: 200, headers: {}, bodyText: "", body: { id: "1", items: [{ sku: "a" }, { name: "b" }] }
    }, runtime, {});
    assert.equal(fail.passed, false);
    assert.ok(Array.isArray(fail.detail));
    const paths = fail.detail.map((item) => item.path);
    assert.ok(paths.includes("id"), `应定位 id 类型错误: ${paths.join(",")}`);
    assert.ok(paths.includes("items[1].sku"), `应定位嵌套缺失字段: ${paths.join(",")}`);

    assert.throws(
        () => evaluateAssertion({ shape: { type: "object", unknownKey: true } }, { body: {} }, runtime, {}),
        /未知键/
    );
});

test("#73 shape：additionalProperties/enum 与 each 子断言可组合", () => {
    const runtime = { vars: {} };
    const result = evaluateAssertion({
        each: {
            shape: {
                type: "object",
                required: ["status"],
                additionalProperties: false,
                properties: { status: { enum: ["READY", "DONE"] } }
            }
        }
    }, {
        status: 200, headers: {}, bodyText: "", body: [{ status: "READY" }, { status: "BAD" }, { status: "DONE", extra: 1 }]
    }, runtime, {});
    assert.equal(result.passed, false);
    assert.equal(result.detail.length, 2);
    assert.equal(result.detail[0].assertions[0].passed, false);
});

// ==================== #56 always ====================
test("#56 always：普通步骤失败后跳过中间步骤但执行 teardown，报告保留原始失败", async () => {
    const calls = [];
    const engine = createEngine({
        baseUrl: "https://mock.local",
        fetch: async (_url, options) => {
            calls.push(`${options.method} ${_url}`);
            return _url.includes("fail") ? jsonResponse({ ok: false }, 500) : jsonResponse({ ok: true });
        }
    });
    const report = await engine.runScenario(defineScenario({
        name: "清理",
        steps: [
            { name: "失败", path: "fail", status: 200 },
            { name: "中间步骤", path: "middle", always: false },
            { name: "清理", path: "cleanup", method: "DELETE", status: 200, always: true }
        ]
    }));
    assert.equal(report.status, "FAILED");
    assert.equal(report.failed, 1);
    assert.equal(report.results[1].skipped, true);
    assert.match(report.results[1].warnings[0], /非 always 步骤未执行/);
    assert.equal(report.results[2].passed, true);
    assert.deepEqual(calls, ["GET https://mock.local/fail", "DELETE https://mock.local/cleanup"]);
});

test("#56 always：用户取消时不补跑清理步骤", async () => {
    const controller = new AbortController();
    controller.abort();
    const report = await createEngine({
        baseUrl: "https://mock.local",
        fetch: async () => jsonResponse({})
    }).runScenario(defineScenario({
        name: "取消不清理",
        steps: [
            { name: "正常", path: "a" },
            { name: "清理", path: "b", always: true }
        ]
    }), { signal: controller.signal });
    assert.equal(report.status, "CANCELLED");
    assert.equal(report.results.length, 1);
    assert.equal(report.results[0].cancelled, true);
});

// ==================== #8 retryUntil 退避 ====================
test("#8 retryUntil：指数退避按 intervalFactor 增长并封顶 maxIntervalMs", async () => {
    const intervals = [];
    const engine = createEngine({
        baseUrl: "https://mock.local",
        fetch: async () => jsonResponse({ ready: false }),
        onAttempt(info) { intervals.push(info.intervalMs); }
    });
    const report = await engine.runScenario(defineScenario({
        name: "退避",
        steps: [{
            name: "等待",
            path: "job",
            retryUntil: { maxAttempts: 4, intervalMs: 100, intervalFactor: 3, maxIntervalMs: 250 },
            assertions: [{ path: "ready", equals: true }]
        }]
    }));
    assert.deepEqual(intervals, [100, 250, 250]);
    assert.equal(report.failed, 1);
});

test("#8 retryUntil：非法 intervalFactor/maxIntervalMs 定义期拒绝", () => {
    assert.throws(() => defineScenario({
        name: "非法退避",
        steps: [{ name: "s", path: "x", retryUntil: { intervalFactor: 0.5 } }]
    }), /intervalFactor/);
    assert.throws(() => defineScenario({
        name: "非法封顶",
        steps: [{ name: "s", path: "x", retryUntil: { intervalMs: 2000, maxIntervalMs: 1000 } }]
    }), /maxIntervalMs/);
});

// ==================== #66 未定义模板变量告警 ====================
test("#66 未定义模板变量：请求头/路径/when 告警一次，声明空串与子路径缺失不告警", async () => {
    let calls = 0;
    const engine = createEngine({
        baseUrl: "https://mock.local",
        fetch: async () => { calls += 1; return jsonResponse({ ok: true }); }
    });
    const report = await engine.runScenario(defineScenario({
        name: "缺失变量",
        vars: { emptyValue: "", user: {} },
        steps: [
            {
                name: "引用缺失",
                path: "api/{{vars.tokn}}",
                request: { headers: { Authorization: "Bearer {{vars.tokn}}" } },
                status: 200
            },
            {
                name: "when 缺失",
                path: "api/skip",
                when: "{{vars.flag}}",
                status: 200
            },
            {
                name: "声明空串",
                path: "api/{{vars.emptyValue}}",
                status: 200
            },
            {
                name: "子路径缺失",
                path: "api/{{vars.user.name}}",
                status: 200
            }
        ]
    }));
    assert.equal(calls, 3, "when 缺失应跳过（不请求），其余三个步骤各请求一次");
    assert.equal(report.results[0].warnings.length, 1, "同一变量多处引用只告警一次");
    assert.match(report.results[0].warnings[0], /vars\.tokn/);
    assert.match(report.results[1].warnings[0], /vars\.flag/);
    assert.deepEqual(report.results[2].warnings, []);
    assert.deepEqual(report.results[3].warnings, []);
});

test("#66 retryUntil 多次尝试只告警一次", async () => {
    const engine = createEngine({
        baseUrl: "https://mock.local",
        fetch: async () => jsonResponse({ ready: false })
    });
    const report = await engine.runScenario(defineScenario({
        name: "重试告警",
        steps: [{
            name: "轮询",
            path: "job/{{vars.missingId}}",
            retryUntil: { maxAttempts: 3, intervalMs: 1 },
            assertions: [{ path: "ready", equals: true }]
        }]
    }));
    const warnings = report.results[0].warnings.filter((item) => item.includes("vars.missingId"));
    assert.equal(warnings.length, 1);
});

// ==================== #69 suite 作用域 ====================
test("#69 extract scope:suite：后续场景复用登录 token", async () => {
    const headersSeen = [];
    const engine = createEngine({
        baseUrl: "https://mock.local",
        fetch: async (_url, options) => {
            headersSeen.push(options.headers.Authorization || "");
            if (_url.endsWith("/login")) return jsonResponse({ token: "tok-123456789" });
            return jsonResponse({ ok: true });
        }
    });
    const suiteVars = {};
    const login = await engine.runScenario(defineScenario({
        name: "登录",
        steps: [{
            name: "获取 token",
            path: "login",
            extract: [{ name: "accessToken", path: "token", scope: "suite" }]
        }]
    }), { suiteVars });
    assert.equal(login.suiteVars.accessToken, "tok-123456789");

    const query = await engine.runScenario(defineScenario({
        name: "查询",
        steps: [{
            name: "带 token 查询",
            path: "query",
            request: { headers: { Authorization: "Bearer {{vars.accessToken}}" } }
        }]
    }), { suiteVars });
    assert.equal(query.results[0].passed, true);
    assert.equal(headersSeen[1], "Bearer tok-123456789");
});

test("#69 extract scope 非法值定义期拒绝", () => {
    assert.throws(() => defineScenario({
        name: "非法 scope",
        steps: [{ name: "s", path: "x", extract: [{ name: "a", scope: "global" }] }]
    }), /scope/);
});

// ==================== #12 注入时钟 ====================
test("#12 注入时钟：timestamp offset/unit/format 精确断言", () => {
    const fixed = Date.UTC(2026, 0, 1, 0, 0, 0); // 本地时区由 format 计算
    const runtime = createRuntime(defineScenario({
        name: "时钟",
        steps: [{ name: "s", path: "x" }],
        generatedVars: [
            { name: "later", type: "timestamp", offset: "1d" },
            { name: "seconds", type: "timestamp", offset: "30s", unit: "s" },
            { name: "text", type: "timestamp", format: "YYYY-MM-DD HH:mm:ss" }
        ]
    }), { now: () => fixed });
    assert.equal(runtime.vars.later, fixed + 86400000);
    assert.equal(runtime.vars.seconds, Math.floor((fixed + 30000) / 1000));
    const date = new Date(fixed);
    const pad = (value) => String(value).padStart(2, "0");
    assert.equal(
        runtime.vars.text,
        `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
    );
});

test("#12 applyGeneratedVar 直接注入 now（不依赖全局 Date.now）", () => {
    const vars = {};
    applyGeneratedVar({ name: "t", type: "timestamp", offset: "-1h" }, vars, { runId: "r" }, { now: () => 10_000_000 });
    assert.equal(vars.t, 10_000_000 - 3600000);
});

// ==================== #65 Cookie Jar ====================
test("#65 --cookie-jar：Set-Cookie 自动携带、显式同名覆盖、Max-Age=0 清除", async () => {
    const seen = [];
    const server = http.createServer((request, response) => {
        seen.push({ url: request.url, cookie: request.headers.cookie || "" });
        if (request.url === "/login") {
            response.writeHead(200, {
                "Content-Type": "application/json",
                "Set-Cookie": ["sid=abc123456; Path=/; HttpOnly", "theme=dark; Path=/"]
            });
            response.end(JSON.stringify({ ok: true }));
        } else if (request.url === "/logout") {
            response.writeHead(200, { "Content-Type": "application/json", "Set-Cookie": "sid=; Path=/; Max-Age=0" });
            response.end("{}");
        } else {
            response.writeHead(200, { "Content-Type": "application/json" });
            response.end(JSON.stringify({ ok: true }));
        }
    });
    await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
    const baseUrl = `http://127.0.0.1:${server.address().port}`;
    try {
        const engine = createEngine({ baseUrl, cookieJar: true });
        const report = await engine.runScenario(defineScenario({
            name: "会话",
            steps: [
                { name: "登录", path: "login" },
                { name: "带 cookie", path: "me" },
                { name: "显式覆盖", path: "me", request: { headers: { Cookie: "sid=override" } } },
                { name: "退出", path: "logout" },
                { name: "清除后", path: "me" }
            ]
        }));
        assert.equal(report.status, "PASSED");
        assert.match(seen[1].cookie, /sid=abc123456/, "第二个请求应自动携带 Set-Cookie");
        assert.match(seen[1].cookie, /theme=dark/);
        assert.equal(seen[2].cookie, "theme=dark; sid=override", "显式 Cookie 同名覆盖 Jar 值");
        assert.doesNotMatch(seen[4].cookie, /sid=/, "Max-Age=0 后不再发送 sid");
        assert.match(seen[4].cookie, /theme=dark/);

        // 未开启 cookieJar 时行为完全不变
        seen.length = 0;
        await createEngine({ baseUrl }).runScenario(defineScenario({
            name: "默认关闭",
            steps: [{ name: "登录", path: "login" }, { name: "无 cookie", path: "me" }]
        }));
        assert.equal(seen[1].cookie, "");
    } finally {
        await new Promise((resolve) => server.close(resolve));
    }
});

// ==================== #90 脱敏底座 ====================
test("#90 redactSecrets：变量名命中脱敏，非敏感值保持原样", () => {
    const secrets = ["super-secret-token-value"];
    const result = redactSecrets({
        clientSecret: "super-secret-token-value",
        apiToken: "short",
        normal: "super-secret-token-value in text",
        nested: { authorization: "Bearer super-secret-token-value" }
    }, secrets);
    assert.equal(result.clientSecret, maskSecret("super-secret-token-value"));
    assert.equal(result.apiToken, "***");
    assert.match(result.normal, /^supe\.\.\.alue|^\*\*\*/);
    assert.doesNotMatch(result.nested.authorization, /super-secret-token-value/);
    assert.doesNotMatch(JSON.stringify(result), /super-secret-token-value/);
});
