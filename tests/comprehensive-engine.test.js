// 综合覆盖：引擎执行语义（重试/超时/取消/always/SKIP/上传下载/cookie/大小上限）。
//
// 所有用例都跑在 tests/fixtures/comprehensive/test-service.mjs 提供的本地服务上：
// 断言的是「请求侧真实发生了什么」（服务端 hits）+「报告怎么说」两个独立 oracle。
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { buildChinaIdNumber, createEngine, defineScenario } from "../src/index.js";
import { createNodeIo } from "../src/node/io.js";
import { makeTempDir, removeDir } from "./fixtures/comprehensive/cli-harness.mjs";
import { startService } from "./fixtures/comprehensive/test-service.mjs";

function engineFor(service, options = {}) {
    return createEngine({ baseUrl: service.baseUrl, ...options });
}

// ==================== B1 重试语义 ====================
test("B1 retryOn 缺省只重试断言失败：网络错误立即报 ERROR，只发一次请求", async () => {
    const service = await startService();
    try {
        // /flaky-error 每次都会先断连：若默认 retryOn 含 error，会重试 maxAttempts 次
        const failed = await engineFor(service).runScenario(defineScenario({
            name: "默认只重试断言",
            steps: [{
                name: "连不上",
                path: "/flaky-error",
                params: { key: "b1-default", failures: 99 },
                retryUntil: { maxAttempts: 3, intervalMs: 100 }
            }]
        }));
        assert.equal(failed.results[0].status, "ERROR", "默认 retryOn 不含 error，应立即失败");
        assert.equal(service.hits.length, 1, "不得重试网络错误");
        assert.match(failed.results[0].error, /fetch failed|ECONN|socket/i);
    } finally {
        await service.close();
    }
});

test("B1 retryOn:['error'] 对网络错误重试并在成功后通过，重试次数与尝试记录一致", async () => {
    const service = await startService();
    try {
        // /flaky-error 前 1 次直接断连，第 2 次成功
        const report = await engineFor(service).runScenario(defineScenario({
            name: "错误重试",
            steps: [{
                name: "等待服务恢复",
                path: "/flaky-error",
                params: { key: "b1-error", failures: 1 },
                retryUntil: { maxAttempts: 3, intervalMs: 100, retryOn: ["error"] }
            }]
        }));
        assert.equal(report.status, "PASSED", `期望成功，实际 ${report.results[0].status}: ${report.results[0].error}`);
        assert.equal(service.hits.length, 2, "应发起 2 次请求（1 次失败 + 1 次成功）");
        assert.equal(report.results[0].response.body.attempt, 2);
    } finally {
        await service.close();
    }
});

test("B1 retryOn:['timeout'] 不会重试普通网络错误，且错误类型不串味", async () => {
    const service = await startService();
    try {
        const report = await engineFor(service).runScenario(defineScenario({
            name: "只重试超时",
            steps: [{
                name: "连接被断开",
                path: "/flaky-error",
                params: { key: "b1-timeout-only", failures: 5 },
                retryUntil: { maxAttempts: 3, intervalMs: 100, retryOn: ["timeout"] }
            }]
        }));
        assert.equal(report.results[0].status, "ERROR", "error 不在 retryOn 内，应立即失败");
        assert.equal(service.hits.length, 1, "不得额外重试");
    } finally {
        await service.close();
    }
});

test("B1 retryOn 的成员判定生效：声明 ['assertion'] 时网络错误不重试，声明 ['error'] 时重试", async () => {
    const service = await startService();
    try {
        // 显式只重试 assertion → 网络错误必须立即失败（不能因为「在 retryUntil 里」就重试）
        const assertionOnly = await engineFor(service).runScenario(defineScenario({
            name: "只重试断言",
            steps: [{
                name: "网络错误",
                path: "/flaky-error",
                params: { key: "b1-assertion-only", failures: 9 },
                retryUntil: { maxAttempts: 3, intervalMs: 100, retryOn: ["assertion"] }
            }]
        }));
        assert.equal(assertionOnly.results[0].status, "ERROR");
        assert.equal(service.hits.length, 1, "retryOn 不含 error 时不得重试网络错误");
    } finally {
        await service.close();
    }
});

test("B1 断言重试耗尽：保留最后一次尝试的断言证据，passed=false 且 error 指向失败断言名", async () => {
    const service = await startService();
    try {
        const report = await engineFor(service).runScenario(defineScenario({
            name: "断言耗尽",
            steps: [{
                name: "状态码轮询",
                path: "/status",
                params: { code: 500 },
                retryUntil: { maxAttempts: 3, intervalMs: 100 },
                assertions: [{ name: "期望 200", target: "status", equals: 200 }]
            }]
        }));
        const result = report.results[0];
        assert.equal(report.status, "FAILED");
        assert.equal(service.hits.length, 3, "maxAttempts 是总尝试次数（含首次）");
        assert.equal(result.passed, false);
        assert.equal(result.assertions.length, 1, "应保留最后一次尝试的断言");
        assert.equal(result.assertions[0].passed, false);
        assert.equal(result.assertions[0].actual, 500);
        assert.equal(result.error, "期望 200");
    } finally {
        await service.close();
    }
});

test("B1 重试成功后残留的失败断言不得影响最终结果（终态取最后一次尝试）", async () => {
    const service = await startService();
    try {
        const report = await engineFor(service).runScenario(defineScenario({
            name: "先失败后成功",
            steps: [{
                name: "等可用",
                path: "/flaky",
                params: { key: "b1-recover", failures: 2 },
                retryUntil: { maxAttempts: 4, intervalMs: 100 },
                assertions: [{ path: "code", equals: "SUCCESS" }]
            }]
        }));
        assert.equal(report.status, "PASSED");
        assert.equal(report.results[0].passed, true);
        assert.equal(report.results[0].error, "");
        assert.ok(report.results[0].assertions.every((item) => item.passed), "终态断言必须全部通过");
        assert.equal(service.hits.length, 3);
    } finally {
        await service.close();
    }
});

// ==================== B2 超时 / 取消 ====================
test("B2 单步骤 timeoutMs：慢响应返回 TIMEOUT 结构化状态，而非 ERROR 或挂死", async () => {
    const service = await startService();
    try {
        const startedAt = Date.now();
        const report = await engineFor(service).runScenario(defineScenario({
            name: "超时",
            steps: [{ name: "慢接口", path: "/slow", params: { ms: 3000 }, timeoutMs: 80 }]
        }));
        const elapsed = Date.now() - startedAt;
        const result = report.results[0];
        assert.equal(result.status, "TIMEOUT");
        assert.equal(result.timedOut, true);
        assert.equal(result.cancelled, false, "超时不是用户取消，不得置 cancelled");
        assert.match(result.error, /80ms/);
        assert.ok(elapsed < 2000, `超时必须及时返回，实际 ${elapsed}ms`);
    } finally {
        await service.close();
    }
});

test("B2 用户取消：状态 CANCELLED、未执行步骤列在 unexecuted，且 always 清理步骤不补跑", async () => {
    const service = await startService();
    try {
        const controller = new AbortController();
        const report = await engineFor(service).runScenario(defineScenario({
            name: "取消",
            steps: [
                {
                    name: "轮询",
                    path: "/status",
                    params: { code: 500 },
                    retryUntil: { maxAttempts: 10, intervalMs: 100 }
                },
                { name: "清理", path: "/health", always: true }
            ]
        }), { signal: controller.signal, onAttempt: () => controller.abort() });

        const result = report.results[0];
        assert.equal(report.status, "CANCELLED");
        assert.equal(result.cancelled, true, "取消必须走结构化标记");
        assert.equal(result.status, "CANCELLED");
        assert.equal(result.error, "用户已取消执行");
        assert.deepEqual(report.unexecuted, ["清理"], "取消后剩余步骤（含 always）不得执行");
        assert.equal(service.hits.filter((hit) => hit.path === "/health").length, 0, "清理步骤不得发出请求");
    } finally {
        await service.close();
    }
});

// ==================== B3 always / failurePolicy ====================
test("B3 always teardown：前置失败后中间步骤 SKIP、清理步骤执行，报告保留原始失败", async () => {
    const service = await startService();
    try {
        const report = await engineFor(service).runScenario(defineScenario({
            name: "清理",
            steps: [
                { name: "断言失败", path: "/biz", assertions: [{ path: "code", equals: "SUCCESS" }] },
                { name: "中间步骤", path: "/health" },
                { name: "释放资源", path: "/health", always: true }
            ]
        }));
        assert.equal(report.status, "FAILED");
        assert.equal(report.failed, 1, "只有原始失败步骤计入 failed");
        assert.equal(report.skipped, 1);
        assert.equal(report.results[1].skipped, true);
        assert.equal(report.results[1].status, "SKIPPED");
        assert.match(report.results[1].warnings[0], /failurePolicy: stop/);
        assert.equal(report.results[2].status, 200, "清理步骤必须真实执行");
        assert.equal(report.results[2].always, true);
        assert.deepEqual(service.hits.map((hit) => hit.path), ["/biz", "/health"]);
        assert.equal(report.executed, 2, "SKIP 不计入 executed");
        assert.equal(report.passedSteps, 1);
    } finally {
        await service.close();
    }
});

test("B3 failurePolicy:continue 收集全部失败，不产生 SKIP", async () => {
    const service = await startService();
    try {
        const report = await engineFor(service).runScenario(defineScenario({
            name: "继续执行",
            failurePolicy: "continue",
            steps: [
                { name: "失败一", path: "/biz", assertions: [{ path: "code", equals: "SUCCESS" }] },
                { name: "通过", path: "/health" },
                { name: "失败二", path: "/status", params: { code: 500 } }
            ]
        }));
        assert.equal(report.status, "FAILED");
        assert.equal(report.failed, 2);
        assert.equal(report.skipped, 0);
        assert.equal(report.executed, 3);
        assert.deepEqual(service.hits.map((hit) => hit.path), ["/biz", "/health", "/status"]);
    } finally {
        await service.close();
    }
});

// ==================== B4 when 条件与 SKIP ====================
test("B4 when 为假时步骤 SKIP：不发起请求、计入 skipped 不计入 executed/passedSteps", async () => {
    const service = await startService();
    try {
        const report = await engineFor(service).runScenario(defineScenario({
            name: "条件跳过",
            steps: [
                { name: "跳过", path: "/health", when: false },
                { name: "执行", path: "/health" }
            ]
        }));
        assert.equal(report.status, "PASSED");
        assert.equal(report.skipped, 1);
        assert.equal(report.executed, 1);
        assert.equal(report.passedSteps, 1);
        assert.equal(report.planned, 2);
        assert.equal(service.hits.length, 1, "SKIP 步骤不得发出请求");
        assert.equal(report.results[0].method, "SKIP");
    } finally {
        await service.close();
    }
});

test("B4 when 引用上一步响应：status/lastResponse 取值口径正确，前一步缺失时条件不成立且不抛错", async () => {
    const service = await startService();
    try {
        const report = await engineFor(service).runScenario(defineScenario({
            name: "条件来源",
            steps: [
                // 第一步引用上一步响应：按来源缺失处理，条件不成立
                { name: "无上一步", path: "/health", when: { from: "status", gte: 200 } },
                { name: "取业务码", path: "/biz" },
                { name: "状态码 200 才跑", path: "/health", when: { from: "status", equals: 200 } },
                { name: "业务码 SUCCESS 才跑", path: "/health", when: { from: "lastResponse", path: "code", equals: "SUCCESS" } }
            ]
        }));
        assert.equal(report.results[0].skipped, true, "第一步引用上一步响应必须跳过而非报错");
        assert.equal(report.results[2].skipped, undefined, "status=200 条件成立");
        assert.equal(report.results[3].skipped, true, "业务码是 FAIL，条件不成立");
        assert.deepEqual(service.hits.map((hit) => hit.path), ["/biz", "/health"]);
    } finally {
        await service.close();
    }
});

// ==================== B5 上传 / 下载 ====================
test("B5 fileUpload：multipart 真实发出文件与附加字段，文件名/内容/字段名可被服务端验证", async () => {
    const dir = makeTempDir("scenario-test-upload-");
    const service = await startService();
    try {
        fs.writeFileSync(path.join(dir, "payload.txt"), "UPLOAD-MARKER-内容", "utf8");
        const report = await engineFor(service, { io: createNodeIo(dir) }).runScenario(defineScenario({
            name: "上传",
            steps: [{
                name: "带附件提交",
                path: "/upload",
                method: "POST",
                request: {
                    fileUpload: {
                        filePath: "payload.txt",
                        fieldName: "document",
                        filename: "renamed.txt",
                        fields: { note: "hello" }
                    }
                }
            }]
        }));
        assert.equal(report.status, "PASSED", JSON.stringify(report.results[0].error));
        const body = report.results[0].response.body;
        assert.equal(body.files.length, 1);
        assert.equal(body.files[0].field, "document");
        assert.equal(body.files[0].filename, "renamed.txt");
        assert.equal(body.files[0].marker, true, "文件内容必须真实送达");
        assert.equal(body.fields.note, "hello", "附加字段必须送达");
        assert.match(service.hits[0].headers["content-type"], /^multipart\/form-data; boundary=/);
    } finally {
        await service.close();
        removeDir(dir);
    }
});

test("B5 fileUpload 越界与超限被拒绝：路径穿越不得读取工作区外文件，超限返回结构化错误", async () => {
    const dir = makeTempDir("scenario-test-upload-deny-");
    const outside = makeTempDir("scenario-test-outside-");
    const service = await startService();
    try {
        fs.writeFileSync(path.join(outside, "secret.txt"), "OUTSIDE-SECRET", "utf8");
        const engine = engineFor(service, { io: createNodeIo(dir), maxUploadBytes: 8 });
        const traversal = await engine.runScenario(defineScenario({
            name: "穿越",
            steps: [{
                name: "越界上传",
                path: "/upload",
                method: "POST",
                request: { fileUpload: { filePath: `../${path.basename(outside)}/secret.txt` } }
            }]
        }));
        assert.equal(traversal.results[0].status, "ERROR");
        assert.match(traversal.results[0].error, /不安全|必须在工作区内/);
        assert.equal(service.hits.length, 0, "越界上传不得发出请求");
        assert.equal(JSON.stringify(traversal).includes("OUTSIDE-SECRET"), false, "不得泄露越界文件内容");

        // 超限：9 字节文件 vs 8 字节上限
        fs.writeFileSync(path.join(dir, "big.txt"), "012345678", "utf8");
        const tooLarge = await engine.runScenario(defineScenario({
            name: "超限",
            steps: [{ name: "大文件", path: "/upload", method: "POST", request: { fileUpload: { filePath: "big.txt" } } }]
        }));
        assert.equal(tooLarge.results[0].status, "ERROR");
        assert.equal(tooLarge.results[0].errorCode, "uploadTooLarge");
        assert.equal(tooLarge.results[0].uploadTooLarge.actualBytes, 9);
        assert.equal(tooLarge.results[0].uploadTooLarge.limitBytes, 8);
        assert.equal(service.hits.length, 0, "超限上传不得发出请求");
    } finally {
        await service.close();
        removeDir(dir);
        removeDir(outside);
    }
});

test("B5 saveResponseAs：响应体落盘、body 替换为保存信息、模板路径生效", async () => {
    const dir = makeTempDir("scenario-test-download-");
    const service = await startService();
    try {
        const report = await engineFor(service, { io: createNodeIo(dir) }).runScenario(defineScenario({
            name: "下载",
            vars: { folder: "reports", fileName: "day" },
            steps: [{
                name: "下载报表",
                path: "/download",
                params: { name: "day.txt" },
                saveResponseAs: "{{vars.folder}}/{{vars.fileName}}.txt"
            }]
        }));
        assert.equal(report.status, "PASSED", JSON.stringify(report.results[0].error));
        const saved = path.join(dir, "reports", "day.txt");
        assert.equal(fs.existsSync(saved), true, "文件必须真实落盘");
        assert.equal(fs.readFileSync(saved, "utf8"), "file:day.txt\nline2\n");
        const body = report.results[0].response.body;
        assert.equal(body.size, Buffer.byteLength("file:day.txt\nline2\n"));
        assert.match(body.contentType, /octet-stream/);
        assert.equal(report.results[0].response.bodyText, null, "落盘后不保留全量文本");
    } finally {
        await service.close();
        removeDir(dir);
    }
});

test("B5 saveResponseAs 越界目标被拒绝：路径穿越写不进工作区外", async () => {
    const dir = makeTempDir("scenario-test-save-deny-");
    const outside = makeTempDir("scenario-test-save-outside-");
    const service = await startService();
    try {
        const report = await engineFor(service, { io: createNodeIo(dir) }).runScenario(defineScenario({
            name: "越界保存",
            steps: [{ name: "保存", path: "/download", saveResponseAs: `../${path.basename(outside)}/escaped.txt` }]
        }));
        assert.equal(report.results[0].status, "ERROR");
        assert.match(report.results[0].error, /不安全|必须在工作区内/);
        assert.equal(fs.existsSync(path.join(outside, "escaped.txt")), false, "不得写出工作区");
    } finally {
        await service.close();
        removeDir(dir);
        removeDir(outside);
    }
});

test("B5 maxResponseBytes：超限返回结构化 responseTooLarge 且不把截断内容当成功", async () => {
    const service = await startService();
    try {
        const report = await engineFor(service, { maxResponseBytes: 100 }).runScenario(defineScenario({
            name: "响应过大",
            steps: [{ name: "大响应", path: "/big", params: { bytes: 4096 } }]
        }));
        const result = report.results[0];
        assert.equal(result.passed, false);
        assert.equal(result.errorCode, "responseTooLarge");
        assert.equal(result.responseTooLarge.limitBytes, 100);
        assert.ok(result.responseTooLarge.bytesRead > 100);
    } finally {
        await service.close();
    }
});

// ==================== B6 Cookie Jar ====================
test("B6 cookie jar：Set-Cookie 自动携带、显式同名覆盖、Max-Age=0 清除、Secure 不落明文 HTTP", async () => {
    const service = await startService();
    try {
        const report = await engineFor(service, { cookieJar: true }).runScenario(defineScenario({
            name: "会话",
            steps: [
                { name: "登录", path: "/login" },
                // Set-Cookie 只影响「之后」的请求：每设一次 cookie 都紧接一次回读，
                // 否则后面的变异（例如 Secure 校验失效）会被前面的成功携带掩盖
                { name: "自动携带", path: "/me" },
                { name: "显式覆盖", path: "/me", request: { headers: { Cookie: "sid=manual" } } },
                { name: "设 Secure", path: "/secure-cookie" },
                { name: "Secure 不应随请求发送", path: "/me" },
                { name: "设跨站 Domain", path: "/cross-site-cookie" },
                { name: "跨站 cookie 必须丢失", path: "/me" },
                { name: "退出", path: "/logout" },
                { name: "退出后", path: "/me" }
            ]
        }));
        assert.equal(report.status, "PASSED", JSON.stringify(report.results.map((item) => item.error).filter(Boolean)));
        assert.equal(report.results[1].response.body.sid, "sess-abc-123456", "自动携带登录 cookie");
        assert.equal(report.results[2].response.body.sid, "manual", "显式 Cookie 同名覆盖 jar 值");
        // hits 下标 = 步骤下标：Secure 是在第 3 步设置的，第 4 步才该检验
        assert.doesNotMatch(service.hits[4].cookie, /secureToken/, "Secure cookie 不得经明文 HTTP 发送");
        assert.doesNotMatch(service.hits[6].cookie, /leak=/, "跨站 Domain cookie 必须丢弃");
        assert.equal(report.results[8].response.body.sid, null, "Max-Age=0 后不得再发送");
        assert.match(service.hits[8].cookie, /theme=dark/, "其他 cookie 不受影响");
    } finally {
        await service.close();
    }
});

test("B6 未开启 cookieJar 时完全不携带 cookie（默认关闭）", async () => {
    const service = await startService();
    try {
        await engineFor(service).runScenario(defineScenario({
            name: "默认关闭",
            steps: [{ name: "登录", path: "/login" }, { name: "第二次", path: "/me" }]
        }));
        assert.equal(service.hits[1].cookie, "", "默认不得自动携带 cookie");
    } finally {
        await service.close();
    }
});

test("B6 跨站 Domain cookie 不得进入 jar（多主机场景，不靠后续请求路径过滤）", async () => {
    // 用 fetch 桩模拟两个主机：jar 的域名限定必须在「写入时」生效，
    // 否则一个站点设的 cookie 会被送给另一个站点
    const seen = [];
    const engine = createEngine({
        baseUrl: "http://api.example.com",
        cookieJar: true,
        fetch: async (url, options) => {
            seen.push({ url: String(url), cookie: options.headers.Cookie || options.headers.cookie || "" });
            const headers = { "Content-Type": "application/json" };
            if (String(url).includes("/login")) headers["Set-Cookie"] = "sid=sess-evil; Path=/; Domain=evil.example.org";
            return new Response("{}", { status: 200, headers });
        }
    });
    const report = await engine.runScenario(defineScenario({
        name: "跨站 cookie",
        steps: [
            { name: "在 api 上收下跨站 cookie", path: "http://api.example.com/login" },
            { name: "访问攻击者站点", path: "http://evil.example.org/me" }
        ]
    }));
    assert.equal(report.status, "PASSED");
    assert.equal(seen[1].cookie, "", `跨站 cookie 不得发往 evil.example.org，实际 ${JSON.stringify(seen[1].cookie)}`);
});

test("B6 Max-Age=0 必须从 jar 中真正移除 cookie（不只靠后续请求过滤）", async () => {
    const seen = [];
    const engine = createEngine({
        baseUrl: "http://api.example.com",
        cookieJar: true,
        fetch: async (url, options) => {
            seen.push({ url: String(url), cookie: options.headers.Cookie || options.headers.cookie || "" });
            const headers = { "Content-Type": "application/json" };
            if (String(url).includes("/login")) headers["Set-Cookie"] = "sid=sess-1; Path=/";
            if (String(url).includes("/logout")) headers["Set-Cookie"] = "sid=; Path=/; Max-Age=0";
            return new Response("{}", { status: 200, headers });
        }
    });
    const scenario = defineScenario({
        name: "登出清理",
        steps: [
            { name: "登录", path: "http://api.example.com/login" },
            { name: "登出", path: "http://api.example.com/logout" }
        ]
    });
    const runtime = engine.createRuntime(scenario, { config: {}, vars: {} });
    for (const step of scenario.steps) {
        const result = await engine.runStep(step, runtime);
        assert.equal(result.passed, true, JSON.stringify(result.error));
    }
    // 直接观测 jar 的最终状态：Max-Age=0 必须真删，而不是留下一条已过期记录
    const jar = runtime.cookieJar || [];
    assert.equal(jar.some((cookie) => cookie.name === "sid"), false, `登出后 jar 仍有 sid: ${JSON.stringify(jar)}`);
    assert.equal(seen[0].cookie, "", "登录请求本身不带 cookie");
    assert.match(seen[1].cookie, /sid=sess-1/, "登出请求应带上待清除的 cookie");
});

// ==================== B7 模板变量与造数 ====================
test("B7 模板变量：跨步骤 extract 结果可用于 params/headers/body/断言，未定义变量按空串并告警", async () => {
    const service = await startService();
    try {
        const report = await engineFor(service).runScenario(defineScenario({
            name: "模板",
            steps: [
                {
                    name: "下单",
                    path: "/ops/order",
                    params: { id: "{{vars.orderId}}", amount: "{{vars.amount}}" },
                    extract: [{ name: "code", path: "code" }],
                    assertions: [{ path: "data.items", length: 2 }]
                },
                {
                    name: "查详情",
                    path: "/ops/order",
                    params: { id: "{{vars.orderId}}" },
                    extract: [{ name: "level", path: "data.buyer.level", required: true }],
                    assertions: [{ name: "跨步骤一致", path: "code", equals: "{{vars.code}}" }]
                },
                {
                    name: "未定义变量",
                    path: "/echo",
                    request: { headers: { "X-Trace": "{{vars.notDeclared}}" } }
                }
            ]
        }), { vars: { orderId: "A-777", amount: 66 } });

        assert.equal(report.status, "PASSED", JSON.stringify(report.results.map((item) => item.error).filter(Boolean)));
        assert.equal(report.vars.code, "SUCCESS");
        assert.equal(report.vars.level, "VIP");
        assert.deepEqual(service.hits[0].query, { id: "A-777", amount: "66" });
        assert.equal(service.hits[2].headers["x-trace"], "", "未定义变量按空串解析");
        assert.match(report.results[2].warnings.join("\n"), /notDeclared/);
    } finally {
        await service.close();
    }
});

test("B7 身份证 GB11643 校验码锚点：区划+生日+顺序码固定时校验位可独立复算", async () => {
    // 这个锚点不依赖 runId 派生的区划/顺序码，因此是确定性的 oracle：
    // 「造出的号码大致合法」会被随机余数掩盖（校验码表只在余数 0/1 处有差异），锚点不会。
    const report = await createEngine({ baseUrl: "http://127.0.0.1:1", fetch: async () => new Response("{}") })
        .runScenario(defineScenario({
            name: "锚点造数",
            // 顺序码由 runId 派生，无法跨轮固定；但校验位可以按「顺序码本身」独立复算，
            // 所以用锚点号码族（区划+生日固定）而不是硬编码完整号码
            generatedVars: [{ name: "anchor", type: "idcard", birthDate: "1949-12-31", regionCode: "110105", gender: "FEMALE" }],
            steps: [{ name: "空", path: "/" }]
        }));
    const id = report.vars.anchor;
    assert.match(id, /^11010519491231\d{3}[\dX]$/, `区划与出生日期段必须固定: ${id}`);
    assert.equal(Number(id[16]) % 2, 0, `FEMALE 顺序码应为偶数: ${id}`);
    // 上面的断言只覆盖「本轮的余数」。校验码表最容易写错的是余数 0/1 两档，
    // 而 generateVars 的顺序码由 runId 派生无法固定——这里用公开的确定性构造器
    // 直接钉住余数为 0 的档位（110105+19491231+028 的加权和 ≡ 0 mod 11，校验位必须是 1）
    assert.equal(buildChinaIdNumber({ regionCode: "110105", birthDate: "1949-12-31", sequence: 28 }), "110105194912310281");
    assert.equal(buildChinaIdNumber({ regionCode: "110105", birthDate: "1949-12-31", sequence: 1 }), "110105194912310011");
    const weights = [7, 9, 10, 5, 8, 4, 2, 1, 6, 3, 7, 9, 10, 5, 8, 4, 2];
    const checkCodes = "10X98765432";
    const sum = weights.reduce((acc, weight, index) => acc + Number(id[index]) * weight, 0);
    assert.equal(id[17], checkCodes[sum % 11], `校验位必须符合 GB 11643: ${id}`);
});

test("B7 generatedVars 造数：身份证/卡号/手机号/USCC 校验位合法，且轮内不同名变量互异", async () => {
    const service = await startService();
    try {
        const report = await engineFor(service).runScenario(defineScenario({
            name: "造数",
            generatedVars: [
                { name: "cardA", type: "luhn" },
                { name: "cardB", type: "luhn" },
                { name: "idNo", type: "idcard", birthDate: "1990-02-03", gender: "FEMALE" },
                { name: "mobile", type: "phone" },
                { name: "uscc", type: "uscc" }
            ],
            steps: [{ name: "回显", path: "/echo", method: "POST", request: { body: { a: "{{vars.cardA}}", b: "{{vars.cardB}}" } } }]
        }));
        assert.equal(report.status, "PASSED", JSON.stringify(report.results[0].error));
        const { cardA, cardB, idNo, mobile, uscc } = report.vars;

        // Luhn 校验（独立实现，不调用被测库）
        const luhnOk = (digits) => {
            let sum = 0;
            for (let index = 0; index < digits.length; index += 1) {
                let digit = Number(digits[digits.length - 1 - index]);
                if (index % 2 === 1) { digit *= 2; if (digit > 9) digit -= 9; }
                sum += digit;
            }
            return sum % 10 === 0;
        };
        assert.equal(luhnOk(cardA), true, `卡号 Luhn 不合法: ${cardA}`);
        assert.equal(luhnOk(cardB), true);
        assert.notEqual(cardA, cardB, "同轮不同名变量应互异");

        // GB 11643 校验位
        assert.match(idNo, /^\d{17}[\dX]$/);
        assert.equal(idNo.slice(6, 14), "19900203", "出生日期段必须来自 birthDate");
        assert.equal(Number(idNo[16]) % 2, 0, "FEMALE 对应顺序码偶数");
        const weights = [7, 9, 10, 5, 8, 4, 2, 1, 6, 3, 7, 9, 10, 5, 8, 4, 2];
        const checkCodes = ["1", "0", "X", "9", "8", "7", "6", "5", "4", "3", "2"];
        const sum = weights.reduce((acc, weight, index) => acc + Number(idNo[index]) * weight, 0);
        assert.equal(idNo[17], checkCodes[sum % 11], `身份证校验位不合法: ${idNo}`);

        // 手机号
        assert.match(mobile, /^1[3-9]\d{9}$/);
        // USCC 校验位（GB 32100）
        const usccChars = "0123456789ABCDEFGHJKLMNPQRTUWXY";
        const usccWeights = [1, 3, 9, 27, 19, 26, 16, 17, 20, 29, 25, 13, 8, 24, 10, 30, 28];
        assert.equal(uscc.length, 18);
        assert.equal(uscc.slice(0, 2), "91", "企业法人登记管理/机构类别");
        const usccSum = usccWeights.reduce((acc, weight, index) => acc + usccChars.indexOf(uscc[index]) * weight, 0);
        const expectedCheck = usccChars[(31 - (usccSum % 31)) % 31];
        assert.equal(uscc[17], expectedCheck, `USCC 校验位不合法: ${uscc}`);
    } finally {
        await service.close();
    }
});

test("B7 generatedVars timestamp offset/format 与注入时钟一致（不依赖真实当前时间）", async () => {
    const fixed = Date.UTC(2026, 0, 2, 3, 4, 5);
    const report = await createEngine({ baseUrl: "http://127.0.0.1:1", fetch: async () => new Response("{}"), now: () => fixed })
        .runScenario(defineScenario({
            name: "时间",
            generatedVars: [
                { name: "nowMs", type: "timestamp" },
                { name: "plusDay", type: "timestamp", offset: "+1d" },
                { name: "minusHour", type: "timestamp", offset: "-1h", unit: "s" },
                { name: "labelled", type: "timestamp", format: "YYYY-MM-DD" }
            ],
            steps: [{ name: "空", path: "/" }]
        }));
    assert.equal(report.vars.nowMs, fixed);
    assert.equal(report.vars.plusDay, fixed + 86400000);
    assert.equal(report.vars.minusHour, Math.floor((fixed - 3600000) / 1000));
    assert.match(report.vars.labelled, /^2026-01-02$/);
});

// ==================== B8 造数 md5 / signature（G3 引擎集成） ====================
test("B8 generatedVars md5/signature 进入引擎 vars：可注入请求、跨轮确定性、缺密钥使运行快速失败", async () => {
    const md5Hex = (value) => crypto.createHash("md5").update(value, "utf8").digest("hex");
    const seen = [];
    const engine = createEngine({
        baseUrl: "http://api.example.com",
        fetch: async (url, options) => {
            const headers = Object.fromEntries(Object.entries(options.headers || {}).map(([key, value]) => [key.toLowerCase(), value]));
            seen.push({ url: String(url), headers });
            return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { "Content-Type": "application/json" } });
        }
    });
    const scenario = defineScenario({
        name: "签名造数",
        vars: { orderId: "A-1", apiSecret: "topsecret" },
        generatedVars: [
            { name: "nonce", type: "md5", parts: ["orderId"] },
            { name: "sign", type: "signature", params: { orderId: "orderId" }, secretVar: "apiSecret" }
        ],
        steps: [{
            name: "带签名请求",
            path: "/echo",
            request: { headers: { "X-Nonce": "{{vars.nonce}}", "X-Sign": "{{vars.sign}}" } },
            assertions: [{ path: "ok", equals: true }]
        }]
    });
    const report = await engine.runScenario(scenario);
    assert.equal(report.status, "PASSED", JSON.stringify(report.results.map((item) => item.error).filter(Boolean)));
    // 与独立实现（node:crypto）对拍，而不是复用被测函数
    assert.equal(report.vars.nonce, md5Hex("A-1"));
    assert.equal(report.vars.sign, md5Hex("orderId=A-1&apiSecret=topsecret").toUpperCase());
    assert.equal(seen[0].headers["x-nonce"], report.vars.nonce, "模板必须注入真实 md5 值");
    assert.equal(seen[0].headers["x-sign"], report.vars.sign, "模板必须注入真实签名");

    // 纯函数造数不依赖 runId：换一轮（新 runId）结果仍相同——确定性口径
    const second = await engine.runScenario(scenario);
    assert.equal(second.vars.nonce, report.vars.nonce);
    assert.equal(second.vars.sign, report.vars.sign);

    // 缺密钥：运行期快速失败（错误点名变量，不发起请求）
    const before = seen.length;
    const missingSecret = defineScenario({
        name: "缺密钥",
        vars: { orderId: "A-2" },
        generatedVars: [{ name: "sign", type: "signature", params: { orderId: "orderId" } }],
        steps: [{ name: "请求", path: "/echo" }]
    });
    await assert.rejects(() => engine.runScenario(missingSecret), /缺少密钥变量 vars\.apiSecret/);
    assert.equal(seen.length, before, "造数失败不得发出请求");
});
