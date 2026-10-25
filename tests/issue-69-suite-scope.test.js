import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { createEngine, defineScenario } from "../src/index.js";

function jsonResponse(body, status = 200) {
    return new Response(JSON.stringify(body), {
        status,
        headers: { "Content-Type": "application/json" }
    });
}

test("extract scope:\"suite\" 写入 run 级共享命名空间，默认 scope 仍写当前场景 vars", async () => {
    const requests = [];
    const engine = createEngine({
        baseUrl: "https://mock.local",
        fetch: async (url, options) => {
            requests.push({ url, options });
            if (url.endsWith("/login")) return jsonResponse({ token: "suite-token" });
            return jsonResponse({ ok: true });
        }
    });
    const login = defineScenario({
        name: "登录",
        steps: [{
            name: "登录并共享 token",
            path: "login",
            extract: [
                { name: "token", path: "token", scope: "suite" },
                { name: "localToken", path: "token" }
            ]
        }]
    });
    const use = defineScenario({
        name: "复用登录产物",
        steps: [{
            name: "携带共享 token",
            path: "profile",
            request: { headers: { Authorization: "Bearer {{suite.token}}" } },
            assertions: [{ path: "ok", equals: true }]
        }]
    });

    const suite = {};
    const loginReport = await engine.runScenario(login, { suite });
    assert.deepEqual(loginReport.suite, { token: "suite-token" });
    assert.equal(loginReport.vars.token, undefined, "suite scope 不应写入当前场景 vars");
    assert.equal(loginReport.vars.localToken, "suite-token", "默认 scope 仍写入当前场景 vars");

    const useReport = await engine.runScenario(use, { suite });
    assert.equal(useReport.passed, true);
    assert.equal(requests[1].options.headers.Authorization, "Bearer suite-token");
    assert.deepEqual(useReport.suite, { token: "suite-token" }, "后续场景读取同一 suite 对象");
});

test("不同 run 的 suite 相互隔离；显式传入同一对象时跨引擎实例共享", async () => {
    let calls = 0;
    const engine = createEngine({
        baseUrl: "https://mock.local",
        fetch: async () => jsonResponse({ token: `run-${++calls}` })
    });
    const scenario = defineScenario({
        name: "提取",
        steps: [{ name: "提取 token", path: "login", extract: [{ name: "token", path: "token", scope: "suite" }] }]
    });

    const first = await engine.runScenario(scenario);
    const second = await engine.runScenario(scenario);
    assert.deepEqual(first.suite, { token: "run-1" });
    assert.deepEqual(second.suite, { token: "run-2" }, "未传 suite 时每次 run 使用新的空对象，不继承上一次的 suite");
    assert.notEqual(first.suite, second.suite, "报告中的 suite 是快照，不共享引用");

    const shared = {};
    await createEngine({ baseUrl: "https://mock.local", fetch: async () => jsonResponse({ token: "eng-1" }) })
        .runScenario(scenario, { suite: shared });
    const report = await createEngine({ baseUrl: "https://mock.local", fetch: async () => jsonResponse({ token: "eng-2" }) })
        .runScenario(defineScenario({
            name: "读取",
            steps: [{
                name: "读取共享 token",
                path: "profile",
                request: { headers: { "X-Token": "{{suite.token}}" } },
                assertions: [{ from: "suite", path: "token", equals: "eng-1" }]
            }]
        }), { suite: shared });
    assert.equal(report.passed, true);
    assert.deepEqual(report.suite, { token: "eng-1" });
});

test("when / assertions 可直接以 suite 为来源，缺省 scope 与 default 语义不变", async () => {
    const engine = createEngine({
        baseUrl: "https://mock.local",
        fetch: async () => jsonResponse({ fallback: "from-default" }),
        suite: { flag: true, token: "suite-token" }
    });
    const report = await engine.runScenario(defineScenario({
        name: "suite 条件与断言",
        steps: [
            {
                name: "条件成立才执行",
                path: "profile",
                when: { from: "suite", path: "flag", exists: true },
                assertions: [{ from: "suite", path: "token", equals: "suite-token" }]
            },
            {
                name: "suite default 兜底",
                path: "fallback",
                extract: [{ name: "missing", path: "nope", default: "{{suite.token}}-fallback", scope: "suite" }]
            }
        ]
    }));
    assert.equal(report.passed, true);
    assert.equal(report.results[0].skipped, undefined);
    assert.deepEqual(report.suite, { flag: true, token: "suite-token", missing: "suite-token-fallback" });
});

test("extract scope 定义期校验：只允许 step / suite", () => {
    assert.throws(() => defineScenario({
        name: "非法 scope",
        steps: [{ name: "s", path: "x", extract: [{ name: "token", path: "token", scope: "global" }] }]
    }), /scope 只支持 step\/suite/);
    assert.throws(() => defineScenario({
        name: "拼错 scope 键",
        steps: [{ name: "s", path: "x", extract: [{ name: "token", path: "token", scpoe: "suite" }] }]
    }), /未知键 "scpoe"/);
});

test("CLI run 在一次 run 内按场景清单顺序共享 extract scope:\"suite\" 产物", async () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), "scenario-test-cli-suite-"));
    const seen = [];
    const server = http.createServer((request, response) => {
        if (request.url === "/login") {
            response.writeHead(200, { "Content-Type": "application/json" });
            response.end(JSON.stringify({ data: { token: "token-from-login" } }));
            return;
        }
        seen.push(request.headers.authorization || "");
        const authorized = request.headers.authorization === "Bearer token-from-login";
        response.writeHead(authorized ? 200 : 401, { "Content-Type": "application/json" });
        response.end(JSON.stringify({ authorized }));
    });
    await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
    try {
        const port = server.address().port;
        fs.mkdirSync(path.join(directory, "scenarios"));
        fs.writeFileSync(path.join(directory, "scenario.config.js"), `ScenarioTest.registerConfig(ScenarioTest.defineConfig({envs:[{key:"mock",name:"Mock",baseUrl:"http://127.0.0.1:${port}"}],scenarios:[{id:"login",name:"Login",url:"scenarios/login.js"},{id:"profile",name:"Profile",url:"scenarios/profile.js"}]}));`, "utf8");
        fs.writeFileSync(path.join(directory, "scenarios/login.js"), `ScenarioTest.registerScenario("login",ScenarioTest.defineScenario({name:"Login",steps:[{name:"登录",method:"POST",path:"login",extract:[{name:"loginToken",path:"data.token",scope:"suite"}]}]}));`, "utf8");
        fs.writeFileSync(path.join(directory, "scenarios/profile.js"), `ScenarioTest.registerScenario("profile",ScenarioTest.defineScenario({name:"Profile",steps:[{name:"复用 token",path:"profile",request:{headers:{Authorization:"Bearer {{suite.loginToken}}"}},assertions:[{path:"authorized",equals:true}]}]}));`, "utf8");
        const cli = path.resolve(import.meta.dirname, "../src/cli.js");
        const result = await new Promise((resolve) => {
            const child = spawn(process.execPath, [cli, "--config", path.join(directory, "scenario.config.js"), "--all"], { stdio: ["ignore", "pipe", "pipe"] });
            let stdout = "";
            let stderr = "";
            child.stdout.setEncoding("utf8");
            child.stderr.setEncoding("utf8");
            child.stdout.on("data", (chunk) => { stdout += chunk; });
            child.stderr.on("data", (chunk) => { stderr += chunk; });
            child.on("close", (code) => resolve({ code, stdout, stderr }));
        });
        assert.equal(result.code, 0, `${result.stdout}\n${result.stderr}`);
        assert.deepEqual(seen, ["Bearer token-from-login"], "第二个场景应复用第一个场景写入 suite 的 token");
        assert.match(result.stdout, /\[PASS\] 复用 token/);
    } finally {
        server.close();
        fs.rmSync(directory, { recursive: true, force: true });
    }
});

test("CLI --concurrency > 1：每个场景使用启动时 suite 快照，避免读到其他场景的半写入状态", async () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), "scenario-test-cli-suite-concurrent-"));
    const checkHeaders = [];
    const server = http.createServer((request, response) => {
        const url = new URL(request.url, "http://127.0.0.1");
        if (url.pathname === "/login") {
            setTimeout(() => {
                response.writeHead(200, { "Content-Type": "application/json" });
                response.end(JSON.stringify({ token: "late-token" }));
            }, 60);
            return;
        }
        if (url.pathname === "/hold") {
            // 比登录慢：reader 的第二步骤在 writer 完成后才执行，若共享活动对象会读到 late-token
            setTimeout(() => {
                response.writeHead(200, { "Content-Type": "application/json" });
                response.end(JSON.stringify({ ok: true }));
            }, 140);
            return;
        }
        checkHeaders.push(request.headers["x-suite-token"]);
        response.writeHead(200, { "Content-Type": "application/json" });
        response.end(JSON.stringify({ token: request.headers["x-suite-token"] || null }));
    });
    await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
    try {
        const port = server.address().port;
        fs.mkdirSync(path.join(directory, "scenarios"));
        fs.writeFileSync(path.join(directory, "scenario.config.js"), `ScenarioTest.registerConfig(ScenarioTest.defineConfig({envs:[{key:"mock",name:"Mock",baseUrl:"http://127.0.0.1:${port}"}],scenarios:[{id:"login",name:"Login",url:"scenarios/login.js"},{id:"reader",name:"Reader",url:"scenarios/reader.js"}]}));`, "utf8");
        fs.writeFileSync(path.join(directory, "scenarios/login.js"), `ScenarioTest.registerScenario("login",ScenarioTest.defineScenario({name:"Login",steps:[{name:"登录",method:"POST",path:"login",extract:[{name:"loginToken",path:"token",scope:"suite"}]}]}));`, "utf8");
        fs.writeFileSync(path.join(directory, "scenarios/reader.js"), `ScenarioTest.registerScenario("reader",ScenarioTest.defineScenario({name:"Reader",steps:[{name:"等待登录完成",path:"hold",status:200},{name:"读取启动快照",path:"check",request:{headers:{"X-Suite-Token":"{{suite.loginToken}}"}},assertions:[{path:"token",equals:null}]}]}));`, "utf8");
        const cli = path.resolve(import.meta.dirname, "../src/cli.js");
        const result = await new Promise((resolve) => {
            const child = spawn(process.execPath, [cli, "--config", path.join(directory, "scenario.config.js"), "--all", "--concurrency", "2", "--json"], { stdio: ["ignore", "pipe", "pipe"] });
            let stdout = "";
            let stderr = "";
            child.stdout.setEncoding("utf8");
            child.stderr.setEncoding("utf8");
            child.stdout.on("data", (chunk) => { stdout += chunk; });
            child.stderr.on("data", (chunk) => { stderr += chunk; });
            child.on("close", (code) => resolve({ code, stdout, stderr }));
        });
        assert.equal(result.code, 0, `${result.stdout}\n${result.stderr}`);
        assert.deepEqual(checkHeaders, [""], "reader 应始终看到启动时的空 suite 快照（模板解析为空串，而非 writer 的 late-token）");
        const payload = JSON.parse(result.stdout);
        assert.deepEqual(payload.scenarios[0].suite, { loginToken: "late-token" });
        assert.deepEqual(payload.scenarios[1].suite, {}, "reader 的报告不得混入 writer 在 reader 执行期间写入的变量");
    } finally {
        server.close();
        fs.rmSync(directory, { recursive: true, force: true });
    }
});
