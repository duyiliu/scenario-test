import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { createCookieJar, createCookieJarFetch } from "../src/node/cookie-jar.js";

// 隔离宿主 SCENARIO_* 变量，避免外部授权/全局参数影响 CLI 子进程
for (const key of Object.keys(process.env)) {
    if (key.toUpperCase().startsWith("SCENARIO_")) delete process.env[key];
}

const cli = path.resolve(import.meta.dirname, "../src/cli.js");

function cookieNames(cookies) {
    return cookies.map((cookie) => cookie.name);
}

function runCli(args) {
    return new Promise((resolve, reject) => {
        const child = spawn(process.execPath, [cli, ...args], { stdio: ["ignore", "pipe", "pipe"] });
        let stdout = "";
        let stderr = "";
        child.stdout.setEncoding("utf8");
        child.stderr.setEncoding("utf8");
        child.stdout.on("data", (chunk) => { stdout += chunk; });
        child.stderr.on("data", (chunk) => { stderr += chunk; });
        child.on("error", reject);
        child.on("close", (code) => resolve({ code, stdout, stderr }));
    });
}

async function withServer(handler, run) {
    const server = http.createServer(handler);
    await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
    try {
        return await run(server.address().port);
    } finally {
        await new Promise((resolve) => server.close(resolve));
    }
}

test("Cookie Jar：解析 Set-Cookie 的 Domain/Path/Expires/Max-Age/Secure，并按 host/path/协议匹配", () => {
    let current = Date.UTC(2026, 0, 1, 0, 0, 0);
    const jar = createCookieJar({ now: () => current });
    jar.store("http://api.example.com/login", [
        "sid=abc; Path=/; HttpOnly",
        "scoped=api; Path=/api",
        "ttl=short; Path=/; Max-Age=60",
        "gone=1; Path=/; Max-Age=0",
        "old=1; Path=/; Expires=Wed, 21 Oct 2015 07:28:00 GMT",
        "secure=1; Path=/; Secure",
        "wide=domain; Domain=example.com; Path=/",
        "bad=1; Domain=other.com; Path=/"
    ]);

    // 普通路径：会话 cookie、Max-Age 未过期 cookie、Domain cookie；Max-Age=0 / 已过期 / Domain 不匹配不进入 jar
    assert.deepEqual(cookieNames(jar.getCookies("http://api.example.com/orders")), ["sid", "ttl", "wide"]);
    // Path=/api 只匹配 /api 前缀，且路径更长者优先
    assert.deepEqual(cookieNames(jar.getCookies("http://api.example.com/api/items")), ["scoped", "sid", "ttl", "wide"]);
    // host-only cookie 不向子域泄漏；Domain cookie 可跨子域
    assert.deepEqual(cookieNames(jar.getCookies("http://sub.example.com/")), ["wide"]);
    assert.deepEqual(cookieNames(jar.getCookies("http://other.com/")), []);
    // Secure 只随 HTTPS 发送
    assert.deepEqual(cookieNames(jar.getCookies("https://api.example.com/")), ["sid", "ttl", "secure", "wide"]);

    // Max-Age 到期后自动清理
    current += 61 * 1000;
    assert.deepEqual(cookieNames(jar.getCookies("http://api.example.com/orders")), ["sid", "wide"]);
});

test("Cookie Jar fetch 包装：自动携带 jar cookie，步骤显式同名 Cookie 优先", async () => {
    const seen = [];
    const responses = [
        new Response("{}", {
            status: 200,
            headers: [
                ["set-cookie", "sid=abc; Path=/"],
                ["set-cookie", "theme=dark; Path=/"],
                ["set-cookie", "stale=1; Path=/; Max-Age=0"]
            ]
        }),
        new Response("{}", { status: 200 }),
        new Response("{}", { status: 200 })
    ];
    const fetchWithJar = createCookieJarFetch(async (url, init) => {
        seen.push({ url, cookie: new Headers(init.headers).get("cookie") || "" });
        return responses.shift();
    });

    await fetchWithJar("http://api.example.com/login", { headers: { Cookie: "lang=zh" } });
    await fetchWithJar("http://api.example.com/order", { headers: { Cookie: "sid=override" } });
    await fetchWithJar("http://api.example.com/order", {});

    // 首次请求无 jar cookie，保留步骤显式 Cookie
    assert.equal(seen[0].cookie, "lang=zh");
    // 显式 sid 覆盖 jar 同名值；其余 jar cookie 仍需携带；Max-Age=0 的 cookie 不进入后续请求
    assert.equal(seen[1].cookie, "sid=override; theme=dark");
    // 未显式声明 Cookie 时按 jar 自动携带
    assert.equal(seen[2].cookie, "sid=abc; theme=dark");
});

test("CLI --cookie-jar：登录 Set-Cookie 在后续请求自动携带、显式 Cookie 覆盖、场景间隔离、默认关闭", async () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), "scenario-test-issue65-cookie-"));
    try {
        await withServer((request, response) => {
            if (request.url === "/login") {
                response.writeHead(200, {
                    "Content-Type": "application/json",
                    "Set-Cookie": ["sid=abc; Path=/", "stale=1; Path=/; Max-Age=0"]
                });
                response.end(JSON.stringify({ incoming: request.headers.cookie || "" }));
                return;
            }
            response.writeHead(200, { "Content-Type": "application/json" });
            response.end(JSON.stringify({ cookie: request.headers.cookie || "" }));
        }, async (port) => {
            fs.mkdirSync(path.join(directory, "scenarios"));
            fs.writeFileSync(path.join(directory, "scenario.config.js"), `ScenarioTest.registerConfig(ScenarioTest.defineConfig({
                envs: [{ key: "mock", name: "Mock", baseUrl: "http://127.0.0.1:${port}" }],
                scenarios: [
                    { id: "session", name: "Session", url: "scenarios/session.js" },
                    { id: "override", name: "Override", url: "scenarios/override.js" },
                    { id: "isolation", name: "Isolation", url: "scenarios/isolation.js" },
                    { id: "disabled", name: "Disabled", url: "scenarios/disabled.js" }
                ]
            }));`, "utf8");
            fs.writeFileSync(path.join(directory, "scenarios/session.js"), `ScenarioTest.registerScenario("session", ScenarioTest.defineScenario({
                name: "登录会话",
                steps: [
                    { name: "登录", path: "login", status: 200 },
                    { name: "后续请求自动携带 Cookie", path: "check", status: 200, assertions: [{ name: "携带 sid 且不含已过期 stale", path: "cookie", equals: "sid=abc" }] }
                ]
            }));`, "utf8");
            fs.writeFileSync(path.join(directory, "scenarios/override.js"), `ScenarioTest.registerScenario("override", ScenarioTest.defineScenario({
                name: "显式 Cookie 覆盖",
                steps: [
                    { name: "登录", path: "login", status: 200 },
                    { name: "步骤显式 Cookie 同名优先", path: "check", status: 200, request: { headers: { Cookie: "sid=override" } }, assertions: [{ name: "使用显式值", path: "cookie", equals: "sid=override" }] }
                ]
            }));`, "utf8");
            fs.writeFileSync(path.join(directory, "scenarios/isolation.js"), `ScenarioTest.registerScenario("isolation", ScenarioTest.defineScenario({
                name: "场景隔离",
                steps: [
                    { name: "登录前不应携带其他场景 Cookie", path: "login", status: 200, assertions: [{ name: "jar 不跨场景共享", path: "incoming", equals: "" }] }
                ]
            }));`, "utf8");
            fs.writeFileSync(path.join(directory, "scenarios/disabled.js"), `ScenarioTest.registerScenario("disabled", ScenarioTest.defineScenario({
                name: "默认关闭",
                steps: [
                    { name: "登录", path: "login", status: 200 },
                    { name: "未开启 jar 时不携带 Cookie", path: "check", status: 200, assertions: [{ name: "请求行为不变", path: "cookie", equals: "" }] }
                ]
            }));`, "utf8");

            const config = path.join(directory, "scenario.config.js");
            const enabled = await runCli(["run", "--config", config, "--scenario", "session,override,isolation", "--cookie-jar"]);
            assert.equal(enabled.code, 0, `${enabled.stdout}\n${enabled.stderr}`);
            assert.match(enabled.stdout, /\[PASS\] 后续请求自动携带 Cookie/);
            assert.match(enabled.stdout, /\[PASS\] 步骤显式 Cookie 同名优先/);
            assert.match(enabled.stdout, /\[PASS\] 登录前不应携带其他场景 Cookie/);

            const disabled = await runCli(["run", "--config", config, "--scenario", "disabled"]);
            assert.equal(disabled.code, 0, `${disabled.stdout}\n${disabled.stderr}`);
            assert.match(disabled.stdout, /\[PASS\] 未开启 jar 时不携带 Cookie/);
        });
    } finally {
        fs.rmSync(directory, { recursive: true, force: true });
    }
});
