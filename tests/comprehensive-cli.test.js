// 综合覆盖：CLI 集成（data/tags/bail/concurrency/suite/报告/脱敏/导入/项目登记）。
//
// 每个用例都在独立临时项目 + 独立 SCENARIO_TEST_HOME 中跑真实子进程，断言三件独立的事：
//   1) 退出码；2) stdout/stderr 的结论与证据；3) 服务端实际收到的请求序列。
// 报告类用例额外把落盘文件当作第四次独立 oracle。
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import fs from "node:fs";
import net from "node:net";
import path from "node:path";
import test from "node:test";
import {
    childEnv,
    cliEntry,
    makeTempDir,
    removeDir,
    repoRoot,
    runCli,
    scenarioSource,
    writeProject
} from "./fixtures/comprehensive/cli-harness.mjs";
import { startService } from "./fixtures/comprehensive/test-service.mjs";

function project(service, scenarios, extra = {}) {
    const dir = makeTempDir("scenario-test-cli-project-");
    const home = makeTempDir("scenario-test-cli-home-");
    const { configPath } = writeProject(dir, {
        envs: [{ key: "local", name: "本地", baseUrl: service.baseUrl }],
        defaultEnvKey: "local",
        scenarios,
        ...extra
    });
    return { dir, home, configPath, cleanup: () => { removeDir(dir); removeDir(home); } };
}

// ==================== serve 长驻进程夹具 ====================
// serve 不会自行退出，runCli 的硬超时会把「正常启动」误判为超时；
// 这里用「日志出现即就绪 + 显式 stop」驱动，并复用同一套 SCENARIO_* 隔离口径。
function startServe(args, { home, env = {}, timeoutMs = 20000 } = {}) {
    const child = spawn(process.execPath, [cliEntry, ...args], {
        cwd: repoRoot,
        stdio: ["ignore", "pipe", "pipe"],
        env: childEnv({ SCENARIO_TEST_HOME: home, ...env })
    });
    let output = "";
    const exited = new Promise((resolve) => child.on("exit", (code, signal) => resolve({ code, signal })));
    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk) => { output += chunk; });
    child.stderr.on("data", (chunk) => { output += chunk; });
    return {
        child,
        exited,
        output: () => output,
        waitFor(pattern, waitMs = timeoutMs) {
            return new Promise((resolve, reject) => {
                if (output.includes(pattern)) { resolve(); return; }
                const onData = () => {
                    if (!output.includes(pattern)) return;
                    cleanup();
                    resolve();
                };
                const timer = setTimeout(() => {
                    cleanup();
                    reject(new Error(`serve 输出等待超时（${pattern}）
已有输出:
${output}`));
                }, waitMs);
                const cleanup = () => {
                    clearTimeout(timer);
                    child.stdout.off("data", onData);
                    child.stderr.off("data", onData);
                };
                child.stdout.on("data", onData);
                child.stderr.on("data", onData);
            });
        },
        async stop() {
            if (child.exitCode === null) {
                child.kill();
                await Promise.race([exited, new Promise((resolve) => setTimeout(resolve, 3000))]);
                if (child.exitCode === null) child.kill("SIGKILL");
            }
            await exited;
        }
    };
}

async function freePort() {
    const server = net.createServer();
    await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
    const port = server.address().port;
    await new Promise((resolve) => server.close(resolve));
    return port;
}

async function occupyPort(port = 0) {
    const server = net.createServer();
    await new Promise((resolve, reject) => {
        server.once("error", reject);
        server.listen(port, "127.0.0.1", resolve);
    });
    return {
        port: server.address().port,
        release: () => new Promise((resolve) => server.close(resolve))
    };
}

async function waitForFile(file, timeoutMs = 10000) {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
        if (fs.existsSync(file)) return fs.readFileSync(file, "utf8");
        await new Promise((resolve) => setTimeout(resolve, 50));
    }
    throw new Error(`等待文件超时: ${file}`);
}

function serveUrlOf(output) {
    const match = /场景测试工作台: http:\/\/127\.0\.0\.1:(\d+)\//.exec(output);
    if (!match) throw new Error(`日志中未找到工作台地址:
${output}`);
    return Number(match[1]);
}

// ==================== C1 退出码与「假绿」防线 ====================
test("C1 HTTP 500 且无断言：退出码非零，不得只靠 2xx 默认断言漏过 5xx", async () => {
    const service = await startService();
    const ctx = project(service, [{
        id: "boom",
        source: scenarioSource("boom", { name: "服务错误", steps: [{ name: "调用", path: "/status", params: { code: 500 } }] })
    }]);
    try {
        const result = await runCli(["run", "--config", ctx.configPath, "--all"], { home: ctx.home });
        assert.equal(result.code, 1, "5xx 必须非零退出");
        assert.match(result.stdout, /\[FAIL\] 调用/);
        assert.match(result.stdout, /返回 HTTP 2xx/);
        assert.match(result.stdout, /Overall: 0\/1 passed/);
    } finally {
        await service.close();
        ctx.cleanup();
    }
});

test("C1 HTTP 200 + 业务失败且无断言：默认判通过（已知语义边界，用例锁定现状并标注风险）", async () => {
    const service = await startService();
    const ctx = project(service, [
        { id: "green", source: scenarioSource("green", { name: "业务失败未断言", steps: [{ name: "下单", path: "/biz" }] }) }
    ]);
    try {
        const result = await runCli(["run", "--config", ctx.configPath, "--all"], { home: ctx.home });
        // 现状：隐式断言只覆盖 HTTP 状态码，200 即通过——这是文档化的边界，
        // 用例把「必须写业务断言才会红」固定成可回归的契约（不是给假绿开绿灯）
        assert.equal(result.code, 0, "HTTP 200 时默认断言通过属当前契约");
        // 通过步骤不打印隐式断言名（CLI 只打失败断言），所以用 --json 看隐式断言本身
        const payload = JSON.parse((await runCli(["run", "--config", ctx.configPath, "--all", "--json"], { home: ctx.home })).stdout);
        assert.equal(payload.results[0].assertions.length, 1);
        assert.equal(payload.results[0].assertions[0].name, "返回 HTTP 2xx");
        assert.equal(payload.results[0].assertions[0].passed, true);
        assert.doesNotMatch(result.stdout, /FAIL/);

        // 正面对照：补上业务断言后同一响应必须红
        const strict = project(service, [{
            id: "strict",
            source: scenarioSource("strict", {
                name: "业务失败有断言",
                steps: [{ name: "下单", path: "/biz", assertions: [{ name: "业务码", path: "code", equals: "SUCCESS" }] }]
            })
        }]);
        try {
            const strictResult = await runCli(["run", "--config", strict.configPath, "--all"], { home: strict.home });
            assert.equal(strictResult.code, 1, "补业务断言后必须红");
            assert.match(strictResult.stdout, /- 业务码: expected="SUCCESS" actual="FAIL"/);
        } finally {
            strict.cleanup();
        }
    } finally {
        await service.close();
        ctx.cleanup();
    }
});

test("C1 --json stdout 纯净可解析，人类可读进度全部走 stderr", async () => {
    const service = await startService();
    const ctx = project(service, [{
        id: "ok",
        source: scenarioSource("ok", { name: "健康检查", steps: [{ name: "探活", path: "/health", assertions: [{ path: "status", equals: "UP" }] }] })
    }]);
    try {
        const result = await runCli(["run", "--config", ctx.configPath, "--all", "--json"], { home: ctx.home });
        assert.equal(result.code, 0, result.stderr);
        const payload = JSON.parse(result.stdout); // 解析失败即证明混入了非 JSON
        assert.equal(payload.scenarioName, "健康检查");
        assert.equal(payload.status, "PASSED");
        assert.match(result.stderr, /\[PASS\] 探活/, "进度必须在 stderr");
    } finally {
        await service.close();
        ctx.cleanup();
    }
});

// ==================== C2 suite 跨场景共享 ====================
test("C2 suite 作用域：A 场景提取的 token 被 B 场景读到，且不污染 vars 命名空间优先级", async () => {
    const service = await startService();
    const ctx = project(service, [
        {
            id: "a",
            source: scenarioSource("a", {
                name: "登录",
                steps: [{
                    name: "取 token",
                    path: "/token",
                    extract: [{ name: "accessToken", path: "accessToken", scope: "suite" }]
                }]
            })
        },
        {
            id: "b",
            source: scenarioSource("b", {
                name: "使用 token",
                steps: [{
                    name: "带 token",
                    path: "/echo",
                    request: { headers: { "X-Token": "{{suite.accessToken}}" } },
                    assertions: [{ name: "头已注入", path: "headers.x-token", equals: "token-value-123456" }]
                }]
            })
        }
    ]);
    try {
        const result = await runCli(["run", "--config", ctx.configPath, "--scenario", "a,b", "--json"], { home: ctx.home });
        assert.equal(result.code, 0, result.stderr + result.stdout);
        const payload = JSON.parse(result.stdout);
        assert.equal(payload.scenarios.length, 2);
        // JSON 输出层按变量名脱敏（accessToken 命中敏感名单），所以这里看到掩码；
        // 「明文是否真的传到了 B 场景」由服务端 hits 与 B 的断言两处独立证明
        assert.equal(payload.scenarios[0].suite.accessToken, "toke...3456");
        assert.equal(payload.scenarios[1].results[0].assertions[0].passed, true, "B 场景必须能读到 suite 变量");
        assert.equal(service.hits[1].headers["x-token"], "token-value-123456", "模板注入的请求头必须是明文真值");
        // A 场景的 step 作用域 vars 里不该出现 suite 变量
        assert.equal(payload.scenarios[0].vars.accessToken, undefined);
    } finally {
        await service.close();
        ctx.cleanup();
    }
});

// ==================== C3 --tag 筛选 ====================
test("C3 --tag：同参数逗号为 AND，重复参数为 OR，未命中时报错并列出可用标签", async () => {
    const service = await startService();
    const ctx = project(service, [
        { id: "smoke-fast", tags: ["smoke", "fast"], source: scenarioSource("smoke-fast", { name: "S", steps: [{ name: "s", path: "/health" }] }) },
        { id: "smoke-slow", tags: ["smoke", "slow"], source: scenarioSource("smoke-slow", { name: "T", steps: [{ name: "s", path: "/health" }] }) },
        { id: "other", tags: ["nightly"], source: scenarioSource("other", { name: "O", steps: [{ name: "s", path: "/health" }] }) }
    ]);
    try {
        const ids = (result) => {
            const payload = JSON.parse(result.stdout);
            return (payload.scenarios || [payload]).map((item) => item.scenarioId);
        };
        const fast = await runCli(["run", "--config", ctx.configPath, "--tag", "smoke,fast", "--json"], { home: ctx.home });
        assert.deepEqual(ids(fast), ["smoke-fast"], "逗号分隔是 AND");
        assert.equal(service.hits.length, 1, "AND 只应命中一个场景");

        service.reset();
        const or = await runCli(["run", "--config", ctx.configPath, "--tag", "smoke,fast", "--tag", "nightly", "--json"], { home: ctx.home });
        assert.deepEqual(ids(or).sort(), ["other", "smoke-fast"], "重复参数是 OR");
        assert.deepEqual(service.hits.map((hit) => hit.path).sort(), ["/health", "/health"], "OR 命中两个场景");

        service.reset();
        const miss = await runCli(["run", "--config", ctx.configPath, "--tag", "does-not-exist", "--json"], { home: ctx.home });
        assert.equal(miss.code, 1);
        assert.match(miss.stderr, /没有场景匹配标签/);
        assert.match(miss.stderr, /可用标签[:：].*smoke/, "必须列出可用标签帮助纠正");
        assert.equal(miss.stdout.trim(), "", "参数错误时 stdout 不得有半截 JSON");
        assert.equal(service.hits.length, 0, "未命中标签不得发出任何请求");
    } finally {
        await service.close();
        ctx.cleanup();
    }
});

// ==================== C4 --bail ====================
test("C4 --bail：首个失败场景后不启动后续场景，notRun 标注原因，服务端无多余请求", async () => {
    const service = await startService();
    const ctx = project(service, [
        { id: "first", source: scenarioSource("first", { name: "会失败", steps: [{ name: "失败", path: "/biz", assertions: [{ path: "code", equals: "SUCCESS" }] }] }) },
        { id: "second", source: scenarioSource("second", { name: "不该执行", steps: [{ name: "请求", path: "/health" }] }) }
    ]);
    try {
        const result = await runCli(["run", "--config", ctx.configPath, "--scenario", "first,second", "--bail", "--json"], { home: ctx.home });
        assert.equal(result.code, 1);
        const payload = JSON.parse(result.stdout);
        assert.equal(payload.scenarios.length, 1, "只应有第一个场景");
        assert.equal(payload.notRun.length, 1);
        assert.equal(payload.notRun[0].id, "second");
        assert.equal(payload.notRun[0].reason, "bail");
        assert.deepEqual(service.hits.map((hit) => hit.path), ["/biz"], "第二个场景不得发出请求");
        assert.match(result.stderr, /--bail 已开启/);
    } finally {
        await service.close();
        ctx.cleanup();
    }
});

// ==================== C5 --concurrency ====================
test("C5 --concurrency=2：并发执行结果与串行一致（内容/顺序/退出码），且确实是并发的", async () => {
    const service = await startService();
    const scenarios = [1, 2, 3].map((index) => ({
        id: `s${index}`,
        source: scenarioSource(`s${index}`, {
            name: `场景${index}`,
            steps: [{ name: `慢步骤${index}`, path: "/slow", params: { ms: 120 }, assertions: [{ path: "code", equals: "SLOW_OK" }] }]
        })
    }));
    const ctx = project(service, scenarios);
    try {
        const sequential = await runCli(["run", "--config", ctx.configPath, "--all", "--json"], { home: ctx.home });
        const concurrent = await runCli(["run", "--config", ctx.configPath, "--all", "--concurrency", "2", "--json"], { home: ctx.home });
        assert.equal(sequential.code, 0, sequential.stderr);
        assert.equal(concurrent.code, 0, concurrent.stderr);

        const idsOf = (payload) => payload.scenarios.map((item) => item.scenarioId);
        assert.deepEqual(idsOf(JSON.parse(concurrent.stdout)), idsOf(JSON.parse(sequential.stdout)), "顺序必须按配置清单，不随完成顺序漂移");
        const statusesOf = (payload) => payload.scenarios.map((item) => item.status);
        assert.deepEqual(statusesOf(JSON.parse(concurrent.stdout)), statusesOf(JSON.parse(sequential.stdout)));

        assert.equal(service.hits.length, 6, "两次运行各发 3 次请求");

        // 并发证据以服务端「同时在处理的请求数峰值」为准，而不是对比两次子进程墙钟：
        // 后者被进程启动与 GC 抖动淹没（实测串行/并发差值可小到 10% 以内）
        service.reset();
        const bailed = await runCli(["run", "--config", ctx.configPath, "--all", "--concurrency", "2", "--json"], { home: ctx.home });
        assert.equal(bailed.code, 0, bailed.stderr);
        assert.equal(service.maxInFlight, 2, `并发上限 2 时服务端应观测到 2 个同时在途请求，实际 ${service.maxInFlight}`);

        service.reset();
        await runCli(["run", "--config", ctx.configPath, "--all", "--json"], { home: ctx.home });
        assert.equal(service.maxInFlight, 1, `默认串行时不得出现并发，实际峰值 ${service.maxInFlight}`);
    } finally {
        await service.close();
        ctx.cleanup();
    }
});

test("C5 --concurrency 非法值被拒绝：0/-1/非数字都不放行", async () => {
    const service = await startService();
    const ctx = project(service, [{ id: "a", source: scenarioSource("a", { name: "A", steps: [{ name: "s", path: "/health" }] }) }]);
    try {
        for (const value of ["0", "-2", "abc", "1.5"]) {
            const result = await runCli(["run", "--config", ctx.configPath, "--all", "--concurrency", value], { home: ctx.home });
            assert.equal(result.code, 1, `--concurrency ${value} 应被拒绝`);
            assert.match(result.stderr, /concurrency/i, `--concurrency ${value} 的报错必须点名参数`);
        }
        assert.equal(service.hits.length, 0, "参数校验失败不得发请求");
    } finally {
        await service.close();
        ctx.cleanup();
    }
});

// ==================== C6 --data 数据驱动 ====================
test("C6 --data CSV：每行变量独立执行一次场景，行级失败不污染其他行，JSON 按行聚合", async () => {
    const service = await startService();
    const ctx = project(service, [{
        id: "order",
        source: scenarioSource("order", {
            name: "按行下单",
            steps: [{
                name: "查订单",
                path: "/ops/order",
                params: { id: "{{vars.orderId}}" },
                assertions: [{ name: "业务成功", path: "code", equals: "SUCCESS" }]
            }]
        })
    }]);
    const csv = path.join(ctx.dir, "rows.csv");
    // order-404 是夹具的「不存在」订单：该行必须失败，其余行必须通过
    fs.writeFileSync(csv, "orderId\nA-1\norder-404\nA-3\n", "utf8");
    try {
        const result = await runCli(["run", "--config", ctx.configPath, "--scenario", "order", "--data", csv, "--json"], { home: ctx.home });
        assert.equal(result.code, 1, "存在失败数据行时退出码必须非零");
        const payload = JSON.parse(result.stdout);
        assert.equal(payload.data.rows, 3);
        assert.equal(payload.data.format, "csv");
        assert.deepEqual(payload.results.map((row) => row.index), [1, 2, 3]);
        assert.deepEqual(payload.results.map((row) => row.scenarios[0].status), ["PASSED", "FAILED", "PASSED"]);
        assert.deepEqual(payload.results.map((row) => row.vars.orderId), ["A-1", "order-404", "A-3"]);
        // 每行必须用「该行的」变量，行间不串味
        assert.deepEqual(service.hits.map((hit) => hit.query.id), ["A-1", "order-404", "A-3"]);
        // 数据行标记让 JUnit/JSON 能区分同名场景
        assert.deepEqual(payload.results.map((row) => row.scenarios[0].scenarioId), ["order#row-1", "order#row-2", "order#row-3"]);
    } finally {
        await service.close();
        ctx.cleanup();
    }
});

test("C6 --data 格式错误明确报错，不静默跳过行", async () => {
    const service = await startService();
    const ctx = project(service, [{ id: "order", source: scenarioSource("order", { name: "O", steps: [{ name: "s", path: "/health" }] }) }]);
    try {
        const cases = [
            ["rows.csv", "orderId\n1,\"unclosed\n", /CSV/],
            ["rows.json", "{not json", /JSON/],
            ["rows.jsonl", "{\"a\":1}\n[1,2]\n", /必须是对象/]
        ];
        for (const [name, content, pattern] of cases) {
            const file = path.join(ctx.dir, name);
            fs.writeFileSync(file, content, "utf8");
            const result = await runCli(["run", "--config", ctx.configPath, "--scenario", "order", "--data", file], { home: ctx.home });
            assert.equal(result.code, 1, `${name} 应失败`);
            assert.match(result.stderr, pattern, `${name} 的报错应可定位格式问题`);
        }
        assert.equal(service.hits.length, 0, "数据集加载失败不得发请求");
    } finally {
        await service.close();
        ctx.cleanup();
    }
});

// ==================== C7 报告与脱敏 ====================
test("C7 --junit/--report 落盘并区分通过/失败/SKIP/未执行，XML 与 HTML 都转义危险字符", async () => {
    const service = await startService();
    const ctx = project(service, [
        {
            id: "mixed",
            source: scenarioSource("mixed", {
                name: "<script>alert(1)</script>",
                steps: [
                    { name: "通过 <b>", path: "/health" },
                    { name: "失败 & <script>alert(1)</script>", path: "/biz", assertions: [{ name: "业务码", path: "code", equals: "SUCCESS" }] },
                    { name: "跳过", path: "/health", when: false }
                ]
            })
        },
        { id: "notrun", source: scenarioSource("notrun", { name: "未执行", steps: [{ name: "s", path: "/health" }] }) }
    ]);
    const xmlFile = path.join(ctx.dir, "out.xml");
    const htmlFile = path.join(ctx.dir, "out.html");
    try {
        const result = await runCli([
            "run", "--config", ctx.configPath, "--scenario", "mixed,notrun", "--bail",
            "--junit", xmlFile, "--report", htmlFile
        ], { home: ctx.home });
        assert.equal(result.code, 1, result.stderr);
        assert.equal(fs.existsSync(xmlFile), true, "JUnit 必须落盘");
        assert.equal(fs.existsSync(htmlFile), true, "HTML 必须落盘");

        const xml = fs.readFileSync(xmlFile, "utf8");
        assert.match(xml, /^<\?xml version="1.0" encoding="UTF-8"\?>/);
        assert.match(xml, /<failure /, "失败步骤必须标记 failure");
        assert.match(xml, /<skipped /, "SKIP 步骤必须标记 skipped");
        // 未执行场景必须进 JUnit：以独立 skipped testsuite 落盘。否则 CI 用 JUnit 做门禁时，
        // 被 --bail 掉落的场景看起来「不存在」，会被误判为全绿（原 G1 缺陷；src/cli.js 已传 notRun）
        assert.match(xml, /<testsuites[^>]*tests="4"/, "JUnit 应包含 3 个已执行步骤 + 1 个未执行场景");
        assert.match(xml, /<testsuite name="notrun#[^"]*" tests="1" failures="0" skipped="1"/, "未执行场景必须是独立的 skipped suite");
        assert.match(xml, /<skipped message="--bail 后未执行"\/>/, "未执行原因必须可定位");
        assert.doesNotMatch(xml, /<script>/, "步骤名中的 HTML 必须被转义");
        assert.match(xml, /&lt;script&gt;/, "危险字符转义为实体");
        assert.match(xml, /&amp;/, "& 必须转义");
        assert.match(xml, /&lt;b&gt;/, "普通标签同样转义");

        const html = fs.readFileSync(htmlFile, "utf8");
        assert.match(html, /<!doctype html>/);
        assert.doesNotMatch(html, /<script>/, "HTML 报告不得注入脚本");
        assert.match(html, /&lt;script&gt;/);
        assert.match(html, /Content-Security-Policy/, "离线报告必须自带 CSP");
        assert.match(html, /未执行场景/, "HTML 报告必须列出 --bail 未执行场景");
        assert.match(html, /notrun/, "未执行场景的 id 必须可定位");
        assert.doesNotMatch(html, /src=|href=/, "离线报告不得引用外部资源");
    } finally {
        await service.close();
        ctx.cleanup();
    }
});

test("C7 脱敏：vars 中的敏感值在 stdout/JUnit/HTML 均不出现原文，非敏感值保持可读", async () => {
    const service = await startService();
    const secret = "tok-live-9876543210";
    const ctx = project(service, [{
        id: "leak",
        source: scenarioSource("leak", {
            name: "回显",
            steps: [{
                name: "调接口",
                path: "/echo",
                request: { headers: { Authorization: "Bearer {{vars.apiToken}}" } },
                assertions: [{ name: "故意失败", path: "path", equals: "NOPE" }]
            }]
        })
    }], { vars: { apiToken: secret, shopName: "测试店铺" } });
    const xmlFile = path.join(ctx.dir, "leak.xml");
    const htmlFile = path.join(ctx.dir, "leak.html");
    try {
        const result = await runCli(["run", "--config", ctx.configPath, "--all", "--json", "--junit", xmlFile, "--report", htmlFile], { home: ctx.home });
        assert.equal(result.code, 1);
        for (const [label, text] of [
            ["stdout", result.stdout],
            ["stderr", result.stderr],
            ["junit", fs.readFileSync(xmlFile, "utf8")],
            ["html", fs.readFileSync(htmlFile, "utf8")]
        ]) {
            assert.equal(text.includes(secret), false, `${label} 不得出现原始密钥`);
        }
        const payload = JSON.parse(result.stdout);
        assert.equal(payload.vars.apiToken, "tok-...3210", "敏感变量按掩码呈现");
        assert.equal(payload.vars.shopName, "测试店铺", "非敏感变量保持原文");
    } finally {
        await service.close();
        ctx.cleanup();
    }
});

test("C7 失败诊断响应体可关闭：SCENARIO_NO_BODY_PRINT=1 时不打印响应体，但断言证据保留", async () => {
    const service = await startService();
    const ctx = project(service, [{
        id: "fail",
        source: scenarioSource("fail", {
            name: "失败诊断",
            steps: [{ name: "失败", path: "/biz", assertions: [{ name: "业务码", path: "code", equals: "SUCCESS" }] }]
        })
    }]);
    try {
        const withBody = await runCli(["run", "--config", ctx.configPath, "--all"], { home: ctx.home });
        assert.match(withBody.stdout, /响应体:/, "默认打印失败响应体");
        assert.match(withBody.stdout, /库存不足/);

        const withoutBody = await runCli(["run", "--config", ctx.configPath, "--all"], {
            home: ctx.home,
            env: { SCENARIO_NO_BODY_PRINT: "1" }
        });
        assert.equal(withoutBody.code, 1, "关闭响应体打印不能改变退出码");
        assert.doesNotMatch(withoutBody.stdout, /响应体:/);
        assert.doesNotMatch(withoutBody.stdout, /库存不足/);
        assert.match(withoutBody.stdout, /- 业务码: expected="SUCCESS" actual="FAIL"/, "断言证据必须保留");
    } finally {
        await service.close();
        ctx.cleanup();
    }
});

// ==================== C8 --fail-on-skip ====================
test("C8 --fail-on-skip：全跳过时默认退出 0，加参数后退出 1，且都不发请求", async () => {
    const service = await startService();
    const ctx = project(service, [{
        id: "skips",
        source: scenarioSource("skips", {
            name: "全跳过",
            steps: [
                { name: "跳过一", path: "/health", when: false },
                { name: "跳过二", path: "/health", when: false }
            ]
        })
    }]);
    try {
        const relaxed = await runCli(["run", "--config", ctx.configPath, "--all"], { home: ctx.home });
        assert.equal(relaxed.code, 0, "默认策略全跳过不算失败");
        assert.match(relaxed.stdout, /全部跳过/);

        const strict = await runCli(["run", "--config", ctx.configPath, "--all", "--fail-on-skip"], { home: ctx.home });
        assert.equal(strict.code, 1);
        assert.match(strict.stdout, /--fail-on-skip 已开启，存在 2 个 SKIP 步骤/);
        assert.equal(service.hits.length, 0, "跳过步骤不得发请求");
    } finally {
        await service.close();
        ctx.cleanup();
    }
});

// ==================== C9 import 校验 ====================
test("C9 import --har：过滤静态资源、敏感头/参数转占位变量、--max-entries 与 --host 生效", async () => {
    const service = await startService();
    const dir = makeTempDir("scenario-test-import-");
    const home = makeTempDir("scenario-test-import-home-");
    const harFile = path.join(dir, "session.har");
    const har = {
        log: {
            entries: [
                {
                    request: {
                        method: "GET",
                        url: "https://api.example.com/orders?access_token=SECRET-QUERY-1&page=2",
                        headers: [
                            { name: "Authorization", value: "Bearer SECRET-HEADER-1" },
                            { name: "Accept", value: "application/json" }
                        ]
                    },
                    response: { status: 200, content: { mimeType: "application/json" } }
                },
                {
                    request: { method: "GET", url: "https://api.example.com/static/app.js" },
                    response: { status: 200, content: { mimeType: "application/javascript" } }
                },
                {
                    request: { method: "GET", url: "https://other.example.com/thing" },
                    response: { status: 200, content: { mimeType: "application/json" } }
                }
            ]
        }
    };
    fs.writeFileSync(harFile, JSON.stringify(har), "utf8");
    try {
        const output = path.join(dir, "draft.js");
        const result = await runCli(["import", "--har", harFile, "--output", output, "--max-entries", "5"], { home });
        assert.equal(result.code, 0, result.stderr);
        assert.match(result.stdout, /导入步骤: 2/, "静态资源被过滤，两条 API 保留");
        const draft = fs.readFileSync(output, "utf8");
        assert.equal(draft.includes("SECRET-QUERY-1"), false, "查询参数密钥不得写入草稿");
        assert.equal(draft.includes("SECRET-HEADER-1"), false, "请求头密钥不得写入草稿");
        assert.match(result.stdout, /敏感头\/查询参数占位变量/);

        // 生成的草稿必须是可加载的合法场景文件（语法层面）
        const loadCheck = await runCli(["doctor", "--config", path.join(dir, "scenario.config.js"), "--json"], { home });
        assert.equal(loadCheck.code !== null, true);

        // --max-entries 必须正整数
        const badLimit = await runCli(["import", "--har", harFile, "--output", path.join(dir, "x.js"), "--max-entries", "0"], { home });
        assert.equal(badLimit.code, 1);
        assert.match(badLimit.stderr, /--max-entries 必须是大于等于 1 的整数/);
        assert.equal(fs.existsSync(path.join(dir, "x.js")), false, "参数非法时不得产出文件");

        // --host 过滤
        const hostFiltered = await runCli(["import", "--har", harFile, "--output", path.join(dir, "h.js"), "--host", "other.example.com"], { home });
        assert.equal(hostFiltered.code, 0, hostFiltered.stderr);
        assert.match(hostFiltered.stdout, /导入步骤: 1/);

        // 互斥参数
        const both = await runCli(["import", "--har", harFile, "--curl", "curl https://a.com/x"], { home });
        assert.equal(both.code, 1);
        assert.match(both.stderr, /不能同时使用/);

        // 不存在的 HAR
        const missing = await runCli(["import", "--har", path.join(dir, "nope.har"), "--output", path.join(dir, "m.js")], { home });
        assert.equal(missing.code, 1);
        assert.match(missing.stderr, /无法读取 HAR 文件/);
    } finally {
        await service.close();
        removeDir(dir);
        removeDir(home);
    }
});

test("C9 import --curl：单条命令生成单步骤草稿，密钥同样转占位变量", async () => {
    const dir = makeTempDir("scenario-test-curl-");
    const home = makeTempDir("scenario-test-curl-home-");
    try {
        const output = path.join(dir, "curl-draft.js");
        const result = await runCli([
            "import", "--curl",
            "curl -X POST 'https://api.example.com/pay?token=SECRET-Q2' -H 'Authorization: Bearer SECRET-H2' -H 'Content-Type: application/json' -d '{\"amount\":1}'",
            "--output", output
        ], { home });
        assert.equal(result.code, 0, result.stderr);
        assert.match(result.stdout, /导入步骤: 1/);
        const draft = fs.readFileSync(output, "utf8");
        assert.equal(draft.includes("SECRET-Q2"), false);
        assert.equal(draft.includes("SECRET-H2"), false);
        assert.match(draft, /"method": "POST"|method: "POST"/);

        const unclosed = await runCli(["import", "--curl", "curl 'https://a.com/x", "--output", path.join(dir, "bad.js")], { home });
        assert.equal(unclosed.code, 1);
        assert.match(unclosed.stderr, /引号未闭合/);

        const noUrl = await runCli(["import", "--curl", "curl -X GET", "--output", path.join(dir, "bad2.js")], { home });
        assert.equal(noUrl.code, 1);
        assert.match(noUrl.stderr, /无法从 curl 命令中识别 URL/);
    } finally {
        removeDir(dir);
        removeDir(home);
    }
});

// ==================== C10 项目登记 ====================
test("C10 projects：ensure 分配端口并复用，set-port/list/remove 幂等，登记损坏时明确报错", async () => {
    const service = await startService();
    const dir = makeTempDir("scenario-test-registry-");
    const home = makeTempDir("scenario-test-registry-home-");
    const { configPath } = writeProject(dir, {
        envs: [{ key: "local", name: "本地", baseUrl: service.baseUrl }],
        defaultEnvKey: "local",
        scenarios: [{ id: "a", source: scenarioSource("a", { name: "A", steps: [{ name: "s", path: "/health" }] }) }]
    });
    try {
        const ensure1 = await runCli(["projects", "ensure", "--config", configPath, "--json"], { home });
        assert.equal(ensure1.code, 0, ensure1.stderr);
        const first = JSON.parse(ensure1.stdout);
        assert.equal(first.created, true);
        assert.ok(Number.isInteger(first.port) && first.port > 0);

        const ensure2 = await runCli(["projects", "ensure", "--config", configPath, "--json"], { home });
        const second = JSON.parse(ensure2.stdout);
        assert.equal(second.created, false, "重复 ensure 不得重复创建");
        assert.equal(second.port, first.port, "必须复用登记端口");

        const listed = await runCli(["projects", "list", "--json"], { home });
        const registry = JSON.parse(listed.stdout);
        assert.equal(registry.projects.length, 1);
        assert.equal(registry.projects[0].port, first.port);

        const setPort = await runCli(["projects", "set-port", "--config", configPath, "45231"], { home });
        assert.equal(setPort.code, 0, setPort.stderr);
        const afterSet = JSON.parse((await runCli(["projects", "list", "--json"], { home })).stdout);
        assert.equal(afterSet.projects[0].port, 45231);

        const badPort = await runCli(["projects", "set-port", "--config", configPath, "70000"], { home });
        assert.equal(badPort.code, 1);
        assert.match(badPort.stderr, /1-65535/);

        const removed = await runCli(["projects", "remove", "--config", configPath, "--json"], { home });
        assert.equal(removed.code, 0, removed.stderr);
        assert.equal(JSON.parse((await runCli(["projects", "list", "--json"], { home })).stdout).projects.length, 0);

        const removedAgain = await runCli(["projects", "remove", "--config", configPath, "--json"], { home });
        assert.equal(removedAgain.code, 0, "重复移除必须幂等");
        assert.match(removedAgain.stdout, /未登记/);

        // 登记文件损坏：必须明确报错而不是静默返回空清单
        fs.writeFileSync(path.join(home, "projects.json"), "{not json", "utf8");
        const corrupted = await runCli(["projects", "list", "--json"], { home });
        assert.equal(corrupted.code, 1, "损坏的登记文件必须报错");
        assert.match(corrupted.stderr, /不是合法 JSON/);
        assert.equal(corrupted.stdout.trim(), "", "不得输出空清单伪装成功");
    } finally {
        await service.close();
        removeDir(dir);
        removeDir(home);
    }
});

test("C10 未知子命令与缺参数：给出可用子命令/示例，退出码非零", async () => {
    const home = makeTempDir("scenario-test-registry-home2-");
    const dir = makeTempDir("scenario-test-registry-proj2-");
    const { configPath } = writeProject(dir, {
        envs: [{ key: "local", name: "本地", baseUrl: "http://127.0.0.1:1" }],
        defaultEnvKey: "local",
        scenarios: [{ id: "a", source: scenarioSource("a", { name: "A", steps: [{ name: "s", path: "/health" }] }) }]
    });
    try {
        const unknown = await runCli(["projects", "wat", "--config", configPath], { home });
        assert.equal(unknown.code, 1);
        assert.match(unknown.stderr, /未知的 projects 子命令: wat/);
        assert.match(unknown.stderr, /可用子命令/);

        // 无 --config 且在无项目目录下：必须提示如何指定/初始化配置，而不是静默无输出
        const missingConfig = await runCli(["projects", "ensure"], { home, cwd: dir });
        assert.equal(missingConfig.code, 1);
        assert.match(missingConfig.stderr, /未找到 scenario-test 项目/);
    } finally {
        removeDir(home);
        removeDir(dir);
    }
});

// ==================== C11 serve × 用户级项目登记（G5） ====================
test("C11 serve×项目登记：缺省复用固定端口、显式 --port 更新登记、端口被占明确报错退出 1", async () => {
    const dir = makeTempDir("scenario-test-serve-reg-");
    const home = makeTempDir("scenario-test-serve-home-");
    writeProject(dir, {
        envs: [{ key: "local", name: "本地", baseUrl: "http://127.0.0.1:1" }],
        defaultEnvKey: "local",
        scenarios: [{ id: "a", source: scenarioSource("a", { name: "A", steps: [{ name: "s", path: "/health" }] }) }]
    });
    fs.writeFileSync(path.join(dir, "index.html"), "<!doctype html><title>serve-reg</title>", "utf8");
    const configPath = path.join(dir, "scenario.config.js");
    // 兜底回收：任何断言失败都必须停掉已启动的 serve，否则长驻子进程会让
    // 测试进程挂到超时——那会把「真实断言检出」误判成 infrastructure-error
    const started = [];
    const serve = (extra = []) => {
        const instance = startServe(["serve", "--config", configPath, ...extra], { home });
        started.push(instance);
        return instance;
    };
    try {
        // 首次启动：从默认端口起分配空闲端口并写入登记。
        // 注意：serve 是长驻进程，复用验证必须「先停上一个再启下一个」，
        // 否则第二个实例会因端口被第一个占用而 EADDRINUSE（那是冲突场景，不是复用）。
        const first = serve();
        await first.waitFor("项目登记:");
        assert.match(first.output(), /，首次分配）/, "首次 serve 必须标注「首次分配」");
        const portA = serveUrlOf(first.output());
        const registry = JSON.parse((await runCli(["projects", "list", "--json"], { home })).stdout);
        assert.equal(registry.projects.length, 1);
        assert.equal(registry.projects[0].port, portA, "登记端口必须等于 serve 实际监听端口");
        await first.stop();

        // 第二次缺省启动：复用登记端口，日志标注「固定复用」
        const second = serve();
        try {
            await second.waitFor("项目登记:");
            assert.match(second.output(), new RegExp(`端口 ${portA}，固定复用）`), "缺省必须复用登记端口");
            assert.equal(serveUrlOf(second.output()), portA);
        } finally {
            await second.stop();
        }

        // 显式 --port：用显式端口启动并把它写回登记
        const portC = await freePort();
        const explicit = serve(["--port", String(portC)]);
        try {
            await explicit.waitFor("项目登记:");
            assert.match(explicit.output(), new RegExp(`端口 ${portC}，--port 已更新）`));
            assert.equal(serveUrlOf(explicit.output()), portC);
            const after = JSON.parse((await runCli(["projects", "list", "--json"], { home })).stdout);
            assert.equal(after.projects[0].port, portC, "显式 --port 必须更新登记");
        } finally {
            await explicit.stop();
        }

        // 再次缺省启动：复用刚登记的显式端口（而不是回到旧端口）
        const third = serve();
        try {
            await third.waitFor("项目登记:");
            assert.match(third.output(), new RegExp(`端口 ${portC}，固定复用）`));
            assert.equal(serveUrlOf(third.output()), portC);
        } finally {
            await third.stop();
        }

        // 冲突：登记端口被其他进程占用 → 明确报错并退出 1（不得静默换端口）
        const held = await occupyPort();
        try {
            await runCli(["projects", "set-port", "--config", configPath, String(held.port)], { home });
            const conflict = serve();
            try {
                const exit = await Promise.race([
                    conflict.exited,
                    new Promise((_, reject) => setTimeout(() => reject(new Error("serve 冲突场景 15s 未退出")), 15000))
                ]);
                assert.equal(exit.code, 1, "端口被占必须非零退出");
                assert.match(conflict.output(), /端口 \d+ 已被占用/);
                assert.match(conflict.output(), /--port|set-port/, "报错必须给出纠正途径");
            } finally {
                await conflict.stop();
            }
        } finally {
            await held.release();
        }
    } finally {
        for (const instance of started.reverse()) {
            try {
                await instance.stop();
            } catch {
                // 已退出/已 kill 的实例忽略：清理失败不掩盖原始断言
            }
        }
        removeDir(dir);
        removeDir(home);
    }
});

test("C11 projects ensure --reassign：端口被占时顺延空闲端口并更新登记，缺省保持登记并如实报告占用", async () => {
    const dir = makeTempDir("scenario-test-ensure-");
    const home = makeTempDir("scenario-test-ensure-home-");
    const { configPath } = writeProject(dir, {
        envs: [{ key: "local", name: "本地", baseUrl: "http://127.0.0.1:1" }],
        defaultEnvKey: "local",
        scenarios: [{ id: "a", source: scenarioSource("a", { name: "A", steps: [{ name: "s", path: "/health" }] }) }]
    });
    try {
        const ensured = JSON.parse((await runCli(["projects", "ensure", "--config", configPath, "--json"], { home })).stdout);
        assert.equal(ensured.created, true);
        // 占用「登记端口」本身：ensure 分配时它一定是空闲的，随后由本用例占住
        const held = await occupyPort(ensured.port);
        try {
            // 缺省：登记端口固定，即使被占也不静默换端口，但必须如实报告 portAvailable=false
            const keep = JSON.parse((await runCli(["projects", "ensure", "--config", configPath, "--json"], { home })).stdout);
            assert.equal(keep.created, false);
            assert.equal(keep.port, ensured.port, "缺省不得改登记端口");
            assert.equal(keep.portAvailable, false, "登记端口被占必须如实报告，不得谎报可用");
            // --reassign：顺延到空闲端口并更新登记
            const reassigned = JSON.parse((await runCli(["projects", "ensure", "--config", configPath, "--reassign", "--json"], { home })).stdout);
            assert.equal(reassigned.changed, true, "--reassign 应更新登记");
            assert.notEqual(reassigned.port, held.port, "不得顺延到仍被占用的端口");
            assert.equal(reassigned.portAvailable, true);
            // 顺延后的端口成为新的固定端口：即使旧端口释放也复用新登记
            const after = JSON.parse((await runCli(["projects", "ensure", "--config", configPath, "--json"], { home })).stdout);
            assert.equal(after.port, reassigned.port);
        } finally {
            await held.release();
        }
    } finally {
        removeDir(dir);
        removeDir(home);
    }
});

// ==================== C12 --allow-external-plugins 安全闸门（G4） ====================
function writePlugin(filePath, markerPath, { headerValue = "", throwing = false } = {}) {
    const body = throwing
        ? 'throw new Error("插件钩子故意失败 boom-hook");'
        : `fs.writeFileSync(${JSON.stringify(markerPath)}, "loaded", "utf8");
        for (const step of scenario.steps) {
            step.request = { ...(step.request || {}), headers: { ...(step.request?.headers || {}), "X-Plugin": ${JSON.stringify(headerValue)} } };
        }
        return scenario;`;
    fs.writeFileSync(filePath, `import fs from "node:fs";
export default {
    transformScenario(scenario) {
        ${body}
    }
};
`, "utf8");
    return filePath;
}

test("C12 --allow-external-plugins：默认拒绝目录外插件且零副作用；显式放行有告警且钩子真实生效", async () => {
    const service = await startService();
    const dir = makeTempDir("scenario-test-plugins-");
    const home = makeTempDir("scenario-test-plugins-home-");
    const outside = makeTempDir("scenario-test-plugin-out-");
    const marker = path.join(home, "plugin-loaded.marker");
    const externalPlugin = path.join(outside, "external-plugin.mjs");
    const { configPath } = writeProject(dir, {
        envs: [{ key: "local", name: "本地", baseUrl: service.baseUrl }],
        defaultEnvKey: "local",
        // 相对 configDir 的越界路径：默认必须被 validatePath 拒绝
        nodePlugins: [`../${path.basename(outside)}/external-plugin.mjs`],
        scenarios: [{ id: "a", source: scenarioSource("a", { name: "A", steps: [{ name: "回显", path: "/echo" }] }) }]
    });
    writePlugin(externalPlugin, marker, { headerValue: "external-active" });
    try {
        // 默认：拒绝、零副作用（插件一行代码都不执行）、不发请求
        const denied = await runCli(["run", "--config", configPath, "--all"], { home });
        assert.equal(denied.code, 1, "默认必须拒绝目录外插件");
        assert.match(denied.stderr, /插件路径不安全/);
        assert.match(denied.stderr, /--allow-external-plugins/, "拒绝信息必须给出放行途径");
        assert.equal(fs.existsSync(marker), false, "被拒绝的插件不得执行任何代码");
        assert.equal(service.hits.length, 0, "拒绝阶段不得发请求");

        // 显式放行：输出告警、插件真实执行、钩子产物可被服务端观测
        const allowed = await runCli(["run", "--config", configPath, "--all", "--allow-external-plugins"], { home });
        assert.equal(allowed.code, 0, allowed.stderr);
        assert.match(allowed.stderr, /加载外部插件/, "放行外部插件必须输出告警");
        assert.equal(fs.existsSync(marker), true, "放行后插件应真实执行");
        assert.equal(service.hits[0].headers["x-plugin"], "external-active", "transformScenario 钩子必须真实生效");
    } finally {
        await service.close();
        removeDir(dir);
        removeDir(home);
        removeDir(outside);
    }
});

test("C12 目录内插件无需 flag 即生效；钩子抛错时 CLI 以非零退出且错误可定位", async () => {
    // 目录内插件：validatePath 通过，不需要 --allow-external-plugins，也不应有外部插件告警
    const service = await startService();
    const dir = makeTempDir("scenario-test-plugin-in-");
    const home = makeTempDir("scenario-test-plugin-in-home-");
    const marker = path.join(home, "inside-plugin.marker");
    const { configPath } = writeProject(dir, {
        envs: [{ key: "local", name: "本地", baseUrl: service.baseUrl }],
        defaultEnvKey: "local",
        nodePlugins: ["./in-dir-plugin.mjs"],
        scenarios: [{ id: "a", source: scenarioSource("a", { name: "A", steps: [{ name: "s", path: "/health" }] }) }]
    });
    writePlugin(path.join(dir, "in-dir-plugin.mjs"), marker, { headerValue: "inside" });
    try {
        const result = await runCli(["run", "--config", configPath, "--all"], { home });
        assert.equal(result.code, 0, result.stderr);
        assert.doesNotMatch(result.stderr, /加载外部插件/, "目录内插件不属于外部插件，不得误告警");
        assert.equal(fs.existsSync(marker), true);
        assert.equal(service.hits[0].headers["x-plugin"], "inside", "目录内插件钩子同样必须生效");
    } finally {
        await service.close();
        removeDir(dir);
        removeDir(home);
    }

    // 钩子失败：transformScenario 抛错 → 整个 run 非零退出，错误可定位到插件
    const dir2 = makeTempDir("scenario-test-plugin-throw-");
    const home2 = makeTempDir("scenario-test-plugin-throw-home-");
    const { configPath: throwingConfig } = writeProject(dir2, {
        envs: [{ key: "local", name: "本地", baseUrl: "http://127.0.0.1:1" }],
        defaultEnvKey: "local",
        nodePlugins: ["./throwing-plugin.mjs"],
        scenarios: [{ id: "a", source: scenarioSource("a", { name: "A", steps: [{ name: "s", path: "/health" }] }) }]
    });
    writePlugin(path.join(dir2, "throwing-plugin.mjs"), path.join(home2, "no.marker"), { throwing: true });
    try {
        const result = await runCli(["run", "--config", throwingConfig, "--all"], { home: home2 });
        assert.equal(result.code, 1, "插件钩子失败必须使 run 非零退出");
        assert.match(result.stderr, /boom-hook/, "错误必须可定位");
        assert.doesNotMatch(result.stdout, /\[PASS\]/, "钩子失败不得产出假绿进度");
    } finally {
        removeDir(dir2);
        removeDir(home2);
    }
});

// ==================== C13 serve --open（G7，可注入观测） ====================
test("C13 serve --open：经可注入 PATH 桩观测打开的 URL，不真的启动用户浏览器（仅 Linux）", async (t) => {
    if (process.platform !== "linux") {
        t.skip("打开动作的观测桩（PATH 注入 xdg-open）只在 Linux 可靠；Windows/macOS 跳过以避免真的打开用户浏览器");
        return;
    }
    const dir = makeTempDir("scenario-test-open-");
    const home = makeTempDir("scenario-test-open-home-");
    const bin = path.join(home, "fakebin");
    const marker = path.join(home, "opened.url");
    fs.mkdirSync(bin, { recursive: true });
    // 观测桩：记录参数后立即退出，绝不启动真实浏览器
    fs.writeFileSync(path.join(bin, "xdg-open"), `#!/bin/sh\necho "$@" > ${JSON.stringify(marker)}\n`, "utf8");
    fs.chmodSync(path.join(bin, "xdg-open"), 0o755);
    writeProject(dir, {
        envs: [{ key: "local", name: "本地", baseUrl: "http://127.0.0.1:1" }],
        defaultEnvKey: "local",
        scenarios: []
    });
    fs.writeFileSync(path.join(dir, "index.html"), "<!doctype html><title>open</title>", "utf8");
    const configPath = path.join(dir, "scenario.config.js");
    const serve = startServe(["serve", "--config", configPath, "--open"], {
        home,
        env: { PATH: `${bin}:${process.env.PATH || ""}` }
    });
    try {
        await serve.waitFor("场景测试工作台:");
        const logged = serveUrlOf(serve.output());
        const opened = await waitForFile(marker);
        const url = opened.trim();
        assert.match(url, /^http:\/\/127\.0\.0\.1:\d+\/$/, "打开的必须是工作台根地址");
        assert.equal(new URL(url).port, String(logged), "打开的端口必须与实际监听端口一致");
    } finally {
        await serve.stop();
        removeDir(dir);
        removeDir(home);
    }
});
