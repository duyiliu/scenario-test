import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import * as ScenarioTest from "../src/node.js";
import { createCurlDraft, createHarDraft, tokenizeCurl } from "../src/import.js";

const root = path.resolve(import.meta.dirname, "..");
const cli = path.join(root, "src/cli.js");

function runCli(args, options = {}) {
    return spawnSync(process.execPath, [cli, ...args], {
        encoding: "utf8",
        cwd: options.cwd || root,
        env: { ...process.env, ...(options.env || {}) }
    });
}

function runCliAsync(args, options = {}) {
    return new Promise((resolve) => {
        const child = spawn(process.execPath, [cli, ...args], {
            cwd: options.cwd || root,
            env: { ...process.env, ...(options.env || {}) },
            stdio: ["ignore", "pipe", "pipe"]
        });
        let stdout = "";
        let stderr = "";
        child.stdout.setEncoding("utf8");
        child.stderr.setEncoding("utf8");
        child.stdout.on("data", (chunk) => { stdout += chunk; });
        child.stderr.on("data", (chunk) => { stderr += chunk; });
        child.on("close", (code) => resolve({ code, stdout, stderr }));
    });
}

function harEntry({ method = "GET", url, status = 200, headers = [], body, mimeType = "application/json", responseMimeType = "application/json" }) {
    const request = { method, url, headers };
    if (body !== undefined) {
        request.postData = { mimeType, text: typeof body === "string" ? body : JSON.stringify(body) };
    }
    return {
        request,
        response: {
            status,
            content: { mimeType: responseMimeType }
        }
    };
}

function loadDraft(filePath) {
    const id = path.basename(filePath, path.extname(filePath));
    return ScenarioTest.loadScenarioFile(filePath, id, ScenarioTest);
}

test("HAR 导入：过滤静态资源/预检、敏感头脱敏、二进制降级，生成的草稿可直接 run", async () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), "scenario-test-import-har-"));
    const server = http.createServer((request, response) => {
        const pathname = new URL(request.url, "http://127.0.0.1").pathname;
        const status = pathname === "/api/orders" ? 201 : 200;
        response.writeHead(status, { "Content-Type": "application/json" });
        response.end(JSON.stringify({ ok: true, pathname }));
    });
    await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
    try {
        const origin = `http://127.0.0.1:${server.address().port}`;
        const entries = [
            harEntry({
                url: `${origin}/api/users?page=1&tag=a&tag=b`,
                status: 200,
                headers: [
                    { name: "Authorization", value: "Bearer har-top-secret" },
                    { name: "Cookie", value: "sid=har-cookie-secret" },
                    { name: "Accept", value: "application/json" }
                ]
            }),
            harEntry({
                method: "POST",
                url: `${origin}/api/orders`,
                status: 201,
                headers: [
                    { name: "Content-Type", value: "application/json" },
                    { name: "X-Api-Key", value: "har-api-key-secret" }
                ],
                body: { sku: "A1", quantity: 2 }
            }),
            harEntry({
                method: "PUT",
                url: `${origin}/api/orders/1/attachment`,
                status: 200,
                headers: [{ name: "Content-Type", value: "application/octet-stream" }],
                body: "binary\u0000payload",
                mimeType: "application/octet-stream"
            }),
            // 其余 API 请求补足 10 条，验证条数统计与逐个执行。
            ...Array.from({ length: 7 }, (_, index) => harEntry({
                url: `${origin}/api/items/${index + 1}`,
                status: 200
            })),
            // 静态资源与 OPTIONS 预检应被过滤。
            harEntry({ url: `${origin}/assets/app.js`, responseMimeType: "application/javascript" }),
            harEntry({ url: `${origin}/assets/app.css`, responseMimeType: "text/css" }),
            harEntry({ url: `${origin}/assets/logo.png`, responseMimeType: "image/png" }),
            harEntry({ method: "OPTIONS", url: `${origin}/api/users`, status: 204 })
        ];
        const harPath = path.join(directory, "session.har");
        fs.writeFileSync(harPath, JSON.stringify({ log: { version: "1.2", entries } }), "utf8");

        const result = runCli(["import", "--har", harPath], { cwd: directory });
        assert.equal(result.status, 0, result.stderr);
        const scenarioDir = path.join(directory, "scenarios");
        const files = fs.readdirSync(scenarioDir).filter((name) => /^imported-.*\.js$/.test(name));
        assert.equal(files.length, 1);
        const draftPath = path.join(scenarioDir, files[0]);
        const content = fs.readFileSync(draftPath, "utf8");
        assert.match(content, /ScenarioTest\.registerScenario/);
        assert.match(content, /Authorization 已替换为 \{\{vars\.authorization\}\}/);
        assert.match(content, /Cookie 已替换为 \{\{vars\.cookie\}\}/);
        assert.match(content, /二进制/);
        // 凭据不得以明文落入草稿；占位符可以出现。
        for (const secret of ["har-top-secret", "har-cookie-secret", "har-api-key-secret"]) {
            assert.ok(!content.includes(secret), `草稿不应包含明文凭据: ${secret}`);
        }
        assert.match(content, /"Authorization": "\{\{vars\.authorization\}\}"/);
        assert.match(content, /"Cookie": "\{\{vars\.cookie\}\}"/);

        const scenario = loadDraft(draftPath);
        assert.equal(scenario.steps.length, 10);
        assert.deepEqual(scenario.steps.map((step) => step.method), [
            "GET", "POST", "PUT", "GET", "GET", "GET", "GET", "GET", "GET", "GET"
        ]);
        assert.ok(scenario.steps.every((step) => step.method !== "OPTIONS"));
        assert.ok(scenario.steps.every((step) => !/\.(?:js|css|png)$/.test(step.path)));
        assert.equal(scenario.steps[0].path, "/api/users");
        assert.deepEqual(JSON.parse(JSON.stringify(scenario.steps[0].params)), { page: "1", tag: ["a", "b"] });
        assert.equal(scenario.steps[0].request.headers.Authorization, "{{vars.authorization}}");
        assert.equal(scenario.steps[1].path, "/api/orders");
        assert.equal(scenario.steps[1].status, 201);
        assert.deepEqual(JSON.parse(JSON.stringify(scenario.steps[1].request.body)), { sku: "A1", quantity: 2 });
        assert.equal(scenario.steps[2].request?.body, undefined, "二进制请求体应省略而不是写入乱码");

        // 生成的草稿通过 vm 加载后可直接交给 CLI run；HAR 观测状态与 mock 服务一致。
        const scenarioId = path.basename(draftPath, ".js");
        fs.writeFileSync(path.join(directory, "scenario.config.js"), `ScenarioTest.registerConfig(ScenarioTest.defineConfig({
            envs: [{ key: "mock", name: "Mock", baseUrl: ${JSON.stringify(origin)} }],
            defaultEnvKey: "mock",
            scenarios: [{ id: ${JSON.stringify(scenarioId)}, name: "Imported", url: ${JSON.stringify(`scenarios/${files[0]}`)} }]
        }));`, "utf8");
        const run = await runCliAsync(["run", "--config", path.join(directory, "scenario.config.js"), "--all"], { cwd: directory });
        assert.equal(run.code, 0, run.stdout + run.stderr);
        assert.match(run.stdout, /Overall: 10\/10 passed/);
    } finally {
        server.close();
        fs.rmSync(directory, { recursive: true, force: true });
    }
});

test("curl 导入：解析续行/Header/Body，敏感值只落 vars 占位，stdout 给出语法合法单步骤", () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), "scenario-test-import-curl-"));
    try {
        const output = path.join(directory, "curl-draft.js");
        const command = [
            "curl -X POST 'https://api.example.com/orders?page=1&access_token=curl-query-secret' \\",
            "  -H 'Content-Type: application/json' \\",
            "  -H 'Authorization: Bearer curl-header-secret' \\",
            "  -H 'Cookie: sid=curl-cookie-secret' \\",
            "  -H 'X-Api-Key: curl-api-key-secret' \\",
            "  -d '{\"sku\":\"A1\",\"quantity\":2}'"
        ].join("\n");
        const result = runCli(["import", "--curl", command, "--output", output], { cwd: directory });
        assert.equal(result.status, 0, result.stderr);
        assert.match(result.stdout, /已生成场景草稿/);
        assert.match(result.stdout, /单步骤片段/);
        assert.match(result.stdout, /"method": "POST"/);
        assert.match(result.stdout, /\{\{vars\.authorization\}\}/);
        const content = fs.readFileSync(output, "utf8");
        for (const secret of ["curl-header-secret", "curl-cookie-secret", "curl-api-key-secret", "curl-query-secret"]) {
            assert.ok(!content.includes(secret), `草稿不应包含明文凭据: ${secret}`);
        }
        const scenario = loadDraft(output);
        assert.equal(scenario.steps.length, 1);
        const [step] = scenario.steps;
        assert.equal(step.method, "POST");
        assert.equal(step.path, "/orders");
        assert.deepEqual(JSON.parse(JSON.stringify(step.params)), { page: "1", access_token: "{{vars.access_token}}" });
        assert.deepEqual(JSON.parse(JSON.stringify(step.request.body)), { sku: "A1", quantity: 2 });
        assert.equal(step.request.headers.Authorization, "{{vars.authorization}}");
        assert.equal(step.request.headers.Cookie, "{{vars.cookie}}");
        assert.equal(step.request.headers["X-Api-Key"], "{{vars.x_api_key}}");
        assert.equal(step.status, 200);
    } finally {
        fs.rmSync(directory, { recursive: true, force: true });
    }
});

test("import 支持 --host/--max-entries，并拒绝冲突/空输入", () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), "scenario-test-import-filter-"));
    try {
        const harPath = path.join(directory, "filter.har");
        fs.writeFileSync(harPath, JSON.stringify({ log: { entries: [
            harEntry({ url: "https://api.one.example/a" }),
            harEntry({ url: "https://api.one.example/b" }),
            harEntry({ url: "https://api.two.example/c" }),
            harEntry({ url: "https://api.one.example/app.js", responseMimeType: "application/javascript" })
        ] } }), "utf8");
        const output = path.join(directory, "filtered.js");
        const result = runCli(["import", "--har", harPath, "--host", "api.one.example", "--max-entries", "1", "--output", output], { cwd: directory });
        assert.equal(result.status, 0, result.stderr);
        assert.match(result.stdout, /主机过滤 1/);
        assert.match(result.stdout, /超出上限 1/);
        const scenario = loadDraft(output);
        assert.equal(scenario.steps.length, 1);
        assert.equal(scenario.steps[0].path, "/a");

        const conflict = runCli(["import", "--har", harPath, "--curl", "curl https://api.example.com/x"], { cwd: directory });
        assert.notEqual(conflict.status, 0);
        assert.match(conflict.stderr, /--har 与 --curl 不能同时使用/);
        const missing = runCli(["import"], { cwd: directory });
        assert.notEqual(missing.status, 0);
        assert.match(missing.stderr, /import 需要 --har 或 --curl/);

        const staticOnly = path.join(directory, "static.har");
        fs.writeFileSync(staticOnly, JSON.stringify({ log: { entries: [
            harEntry({ url: "https://api.example.com/app.js", responseMimeType: "application/javascript" }),
            harEntry({ method: "OPTIONS", url: "https://api.example.com/api/x", status: 204 })
        ] } }), "utf8");
        const empty = runCli(["import", "--har", staticOnly, "--output", path.join(directory, "empty.js")], { cwd: directory });
        assert.notEqual(empty.status, 0);
        assert.match(empty.stderr, /未从 HAR 中解析出可导入的 API 请求/);
        assert.equal(fs.existsSync(path.join(directory, "empty.js")), false);
    } finally {
        fs.rmSync(directory, { recursive: true, force: true });
    }
});

test("HAR/curl 解析器：无效输入报错，URL 敏感 query 与二进制 body 不落明文", () => {
    assert.throws(() => createHarDraft("not json"), /HAR 不是合法 JSON/);
    assert.throws(() => createHarDraft({ log: {} }), /HAR 缺少 log\.entries 数组/);
    assert.throws(() => createCurlDraft("curl -X POST"), /无法从 curl 命令中识别 URL/);

    const tokens = tokenizeCurl("curl.exe -X GET \\\n  'https://api.example.com/a b?x=1'");
    assert.deepEqual(tokens, ["-X", "GET", "https://api.example.com/a b?x=1"]);

    const draft = createHarDraft({ log: { entries: [harEntry({
        method: "POST",
        url: "https://api.example.com/upload?token=query-secret",
        headers: [{ name: "Authorization", value: "Bearer secret" }],
        body: "binary\u0000data",
        mimeType: "application/octet-stream"
    })] } }, { source: "fixture.har" });
    assert.equal(draft.scenario.steps.length, 1);
    assert.equal(draft.scenario.steps[0].request.body, undefined);
    assert.equal(draft.scenario.steps[0].params.token, "{{vars.token}}");
    const serialized = JSON.stringify(draft);
    assert.ok(!serialized.includes("query-secret"));
    assert.ok(!serialized.includes("Bearer secret"));
});
