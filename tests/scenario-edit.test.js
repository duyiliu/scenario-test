// YIL-199 工作台场景编辑：ui-editor 序列化 + serve 场景写接口（HTTP 层正/反例）
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import {
    buildScenarioFileSource,
    isSafeScenarioFile,
    isSafeScenarioId,
    slugifyScenarioId
} from "../src/browser/ui/ui-editor.js";
import {
    createServeServer,
    writeScenarioFile,
    insertConfigScenarioEntry
} from "../src/cli/serve-server.js";
import net from "node:net";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const distDir = path.join(root, "dist");

function makeWorkspace(configSource) {
    const workspace = fs.mkdtempSync(path.join(os.tmpdir(), "scenario-test-edit-"));
    fs.mkdirSync(path.join(workspace, "scenarios"), { recursive: true });
    const configFile = configSource || `ScenarioTest.registerConfig(ScenarioTest.defineConfig({
        envs: [],
        scenarios: [
            { id: "demo", name: "示例场景", url: "scenarios/demo.js" },
            { id: "nested", name: "嵌套目录场景", url: "scenarios/order/nested.js" }
        ]
    }));`;
    fs.writeFileSync(path.join(workspace, "scenario.config.js"), configSource ? configSource : configFile, "utf8");
    return workspace;
}

const demoSource = `ScenarioTest.registerScenario("demo", ScenarioTest.defineScenario({
    name: "示例场景",
    vars: { userId: "u-1" },
    steps: [
        { name: "一步", path: "/ping" },
        { name: "二步", path: "/pong" }
    ]
}));
`;

function makeConfig() {
    return {
        envs: [],
        scenarios: [
            { id: "demo", name: "示例场景", url: "scenarios/demo.js" },
            { id: "nested", name: "嵌套目录场景", url: "scenarios/order/nested.js" }
        ]
    };
}

// ===== ui-editor 序列化 =====

test("ui-editor：场景定义序列化为可求值源码，函数/嵌套/特殊键保留", () => {
    const scenario = {
        name: "排序场景",
        vars: { nested: { a: 1, list: ["x", "y"] }, "odd key": true, emptyObj: {}, emptyArr: [] },
        steps: [
            { name: "第一步", path: "/a", timeoutMs: 3000 },
            {
                name: "重试步骤",
                path: "/b",
                retryUntil: { maxAttempts: 3, intervalMs: 100 },
                onAttempt: function onAttempt(ctx) { return ctx.attempt; },
                headers: { "X-自定义头": "v" }
            }
        ],
        failurePolicy: "continue"
    };
    const source = buildScenarioFileSource("demo", scenario);
    assert.match(source, /^ScenarioTest\.registerScenario\("demo", ScenarioTest\.defineScenario\(\{[\s\S]*\}\)\);\n$/);
    // 回求值：源码必须是合法 JS 且结果与输入等价（函数字段比对源码文本归一后的行为）
    const captured = {};
    const runner = new Function("ScenarioTest", `"use strict";${source}`);
    runner({
        defineScenario(def) { return def; },
        registerScenario(id, def) { captured.id = id; captured.def = def; }
    });
    assert.equal(captured.id, "demo");
    assert.equal(captured.def.name, "排序场景");
    assert.equal(captured.def.vars["odd key"], true);
    assert.deepEqual(captured.def.vars.nested, { a: 1, list: ["x", "y"] });
    assert.deepEqual(captured.def.vars.emptyObj, {});
    assert.equal(captured.def.steps[1].timeoutMs, undefined);
    assert.equal(captured.def.steps[1].retryUntil.maxAttempts, 3);
    assert.equal(typeof captured.def.steps[1].onAttempt, "function");
    assert.equal(captured.def.steps[1].onAttempt({ attempt: 7 }), 7);
});

test("ui-editor：简写方法与 async 函数字段序列化为合法函数表达式", () => {
    const shorthand = {};
    shorthand.cb = function shorthandCb() { return "sync"; };
    // 简写方法源码不含 function 前缀
    const obj = { async m() { return "async-ok"; } };
    const scenario = {
        name: "f",
        steps: [
            { name: "s", path: "/p", onAttempt: obj.m },
            { name: "s2", path: "/p2", onAttempt: async function named(ctx) { return ctx; } },
            { name: "s3", path: "/p3", onAttempt: (ctx) => ctx.attempt + 1 }
        ]
    };
    const source = buildScenarioFileSource("demo", scenario);
    const captured = {};
    new Function("ScenarioTest", `"use strict";${source}`)({
        defineScenario(def) { return def; },
        registerScenario(id, def) { captured.def = def; }
    });
    assert.equal(typeof captured.def.steps[0].onAttempt, "function");
    return captured.def.steps[0].onAttempt().then((v) => {
        assert.equal(v, "async-ok");
        assert.equal(captured.def.steps[2].onAttempt({ attempt: 1 }), 2);
    });
});

test("ui-editor：原生函数与 id 空值拒绝序列化", () => {
    const bound = { cb: Array.prototype.push.bind([]) };
    assert.throws(() => buildScenarioFileSource("x", { name: "f", steps: [{ name: "s", path: "/p", onAttempt: bound.cb }] }), /原生\/绑定函数/);
    assert.throws(() => buildScenarioFileSource("", { name: "f", steps: [] }), /场景 id 不能为空/);
    assert.throws(() => buildScenarioFileSource("  ", { name: "f", steps: [] }), /场景 id 不能为空/);
});

test("ui-editor：路径/id 白名单与 slugify", () => {
    assert.equal(isSafeScenarioFile("scenarios/a.js"), true);
    assert.equal(isSafeScenarioFile("scenarios/dir/sub/a-b_2.js"), true);
    for (const bad of ["a.js", "../scenarios/a.js", "scenarios/../x.js", "scenarios/a.txt",
        "scenarios/.hidden/a.js", "scenarios/a b.js", "scenarios/", "scenarios\\a.js",
        "cases/a.js", "/abs/a.js", "C:\\scenarios\\a.js"]) {
        assert.equal(isSafeScenarioFile(bad), false, `应拒绝: ${bad}`);
    }
    assert.equal(isSafeScenarioId("a"), true);
    assert.equal(isSafeScenarioId("a-b-1"), true);
    for (const bad of ["", "-a", "A-b", "a b", "a_b", "a".repeat(81), "中"]) {
        assert.equal(isSafeScenarioId(bad), false, `应拒绝: ${bad}`);
    }
    assert.equal(slugifyScenarioId("My Scenario 测试 v2"), "my-scenario-v2");
    assert.equal(slugifyScenarioId("--"), "");
});

// ===== serve 场景写接口（函数级 + HTTP 层） =====

test("写场景文件：清单内覆盖、清单外拒绝、create 新建、越界/空内容拒绝", () => {
    const workspace = makeWorkspace();
    try {
        fs.writeFileSync(path.join(workspace, "scenarios/demo.js"), demoSource, "utf8");
        // 清单内覆盖
        const updated = writeScenarioFile(workspace, makeConfig(), { file: "scenarios/demo.js", content: "// 改写后\n" });
        assert.equal(updated.created, false);
        assert.equal(fs.readFileSync(path.join(workspace, "scenarios/demo.js"), "utf8"), "// 改写后\n");
        // 清单外文件 403
        assert.throws(
            () => writeScenarioFile(workspace, makeConfig(), { file: "scenarios/other.js", content: "// x" }),
            (error) => error.status === 403 && /不在配置清单中/.test(error.message)
        );
        // create 新建清单外文件（复制场景先写文件后注册）
        const created = writeScenarioFile(workspace, makeConfig(), { file: "scenarios/copy.js", content: "// 新场景\n", create: true });
        assert.equal(created.created, true);
        assert.ok(fs.existsSync(path.join(workspace, "scenarios/copy.js")));
        // create 已存在 → 409
        assert.throws(
            () => writeScenarioFile(workspace, makeConfig(), { file: "scenarios/copy.js", content: "// 再次", create: true }),
            (error) => error.status === 409
        );
        // 清单内但磁盘缺失 → 404
        assert.throws(
            () => writeScenarioFile(workspace, makeConfig(), { file: "scenarios/order/nested.js", content: "// x" }),
            (error) => error.status === 404
        );
        // 形态白名单：越界/绝对/非 scenarios 前缀 → 400（create 同样收紧）
        for (const bad of ["../escape.js", "scenarios/../escape.js", "cases/x.js", "scenarios/evil.txt"]) {
            assert.throws(
                () => writeScenarioFile(workspace, makeConfig(), { file: bad, content: "// x", create: true }),
                (error) => error.status === 400,
                `应拒绝: ${bad}`
            );
        }
        // 空内容 → 400
        assert.throws(
            () => writeScenarioFile(workspace, makeConfig(), { file: "scenarios/demo.js", content: "   " }),
            (error) => error.status === 400
        );
    } finally {
        fs.rmSync(workspace, { recursive: true, force: true });
    }
});

test("config 清单插入：追加条目、id/url 重复 409、非法输入 400", () => {
    const workspace = makeWorkspace();
    try {
        const result = insertConfigScenarioEntry(workspace, "scenario.config.js", makeConfig(), {
            id: "demo-copy", name: "示例 副本", file: "scenarios/demo-copy.js"
        });
        assert.deepEqual(result, { id: "demo-copy", name: "示例 副本", file: "scenarios/demo-copy.js" });
        const updated = fs.readFileSync(path.join(workspace, "scenario.config.js"), "utf8");
        assert.match(updated, /\{ id: "demo-copy", name: "示例 副本", url: "scenarios\/demo-copy\.js" \}/);
        // 插入位置在 scenarios 数组内、原有条目之后
        assert.ok(updated.indexOf('"demo-copy"') > updated.indexOf('"nested"'));
        // 重复 id / 重复 url → 409
        assert.throws(
            () => insertConfigScenarioEntry(workspace, "scenario.config.js", makeConfig(), { id: "demo", name: "x", file: "scenarios/new.js" }),
            (error) => error.status === 409 && /id 已存在/.test(error.message)
        );
        assert.throws(
            () => insertConfigScenarioEntry(workspace, "scenario.config.js", makeConfig(), { id: "ok-id", name: "x", file: "scenarios/demo.js" }),
            (error) => error.status === 409 && /文件已存在/.test(error.message)
        );
        // 非法 id/路径/空名 → 400
        assert.throws(
            () => insertConfigScenarioEntry(workspace, "scenario.config.js", makeConfig(), { id: "Bad-ID", name: "x", file: "scenarios/a.js" }),
            (error) => error.status === 400
        );
        assert.throws(
            () => insertConfigScenarioEntry(workspace, "scenario.config.js", makeConfig(), { id: "ok-id", name: "x", file: "cases/a.js" }),
            (error) => error.status === 400
        );
        assert.throws(
            () => insertConfigScenarioEntry(workspace, "scenario.config.js", makeConfig(), { id: "ok-id", name: " ", file: "scenarios/a.js" }),
            (error) => error.status === 400
        );
        // 第二次插入在前一次写入的文本上仍能定位数组
        insertConfigScenarioEntry(workspace, "scenario.config.js", makeConfig(), { id: "third", name: "三", file: "scenarios/third.js" });
        const finalSource = fs.readFileSync(path.join(workspace, "scenario.config.js"), "utf8");
        assert.ok(finalSource.indexOf('"third"') > finalSource.indexOf('"demo-copy"'));
    } finally {
        fs.rmSync(workspace, { recursive: true, force: true });
    }
});

test("config 清单插入：无 scenarios 数组时报错而不是猜测", () => {
    const workspace = makeWorkspace(`ScenarioTest.registerConfig(ScenarioTest.defineConfig({ envs: [] }));`);
    try {
        assert.throws(
            () => insertConfigScenarioEntry(workspace, "scenario.config.js", { envs: [], scenarios: [] }, { id: "a", name: "b", file: "scenarios/a.js" }),
            (error) => error.status === 500 && /无法定位/.test(error.message)
        );
    } finally {
        fs.rmSync(workspace, { recursive: true, force: true });
    }
});

function freePort() {
    return new Promise((resolve, reject) => {
        const probe = net.createServer();
        probe.once("error", reject);
        probe.listen(0, "127.0.0.1", () => {
            const { port } = probe.address();
            probe.close(() => resolve(port));
        });
    });
}

// serve 的 Host/Origin 校验按 options.port 判定，测试必须先占空闲端口再按同端口 listen

function rawRequest(port, pathname, { method = "GET", headers = {}, body } = {}) {
    return fetch(`http://127.0.0.1:${port}${pathname}`, {
        method,
        headers: { Origin: `http://127.0.0.1:${port}`, ...headers },
        body
    });
}

test("serve 场景编辑接口：本机来源校验、405/400、写文件与注册全链路", async () => {
    const workspace = makeWorkspace();
    try {
        fs.writeFileSync(path.join(workspace, "scenarios/demo.js"), demoSource, "utf8");
        const port = await freePort();
        const server = createServeServer({
            workspace,
            libraryDist: distDir,
            port,
            config: makeConfig(),
            configFile: "scenario.config.js",
            defaultTarget: { key: "default", envKey: "default", target: "" },
            extensions: []
        });
        await new Promise((resolve) => server.listen(port, "127.0.0.1", resolve));
        try {
            // 非 POST → 405
            const get = await rawRequest(port, "/__scenario-test__/scenario-file");
            assert.equal(get.status, 405);
            assert.match((await get.json()).error, /仅接受 POST/);

            // 跨站 Origin → 403，不落盘
            const cross = await fetch(`http://127.0.0.1:${port}/__scenario-test__/scenario-file`, {
                method: "POST",
                headers: { Origin: "https://evil.example", "Content-Type": "application/json" },
                body: JSON.stringify({ file: "scenarios/demo.js", content: "// hacked" })
            });
            assert.equal(cross.status, 403);
            assert.equal(fs.readFileSync(path.join(workspace, "scenarios/demo.js"), "utf8"), demoSource);

            // 非 JSON 体 → 400
            const badJson = await rawRequest(port, "/__scenario-test__/scenario-file", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: "{broken"
            });
            assert.equal(badJson.status, 400);

            // 清单外覆盖 → 403
            const unlisted = await rawRequest(port, "/__scenario-test__/scenario-file", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ file: "scenarios/other.js", content: "// x" })
            });
            assert.equal(unlisted.status, 403);
            assert.ok(!fs.existsSync(path.join(workspace, "scenarios/other.js")));

            // 清单内覆盖 → 200
            const overwrite = await rawRequest(port, "/__scenario-test__/scenario-file", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ file: "scenarios/demo.js", content: "// 覆盖后\n" })
            });
            assert.equal(overwrite.status, 200);
            assert.equal(fs.readFileSync(path.join(workspace, "scenarios/demo.js"), "utf8"), "// 覆盖后\n");

            // 复制场景全链路：create 新文件 → 注册清单
            const created = await rawRequest(port, "/__scenario-test__/scenario-file", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ file: "scenarios/demo-copy.js", content: demoSource.replace('"demo"', '"demo-copy"'), create: true })
            });
            assert.equal(created.status, 200);
            assert.equal((await created.json()).created, true);
            const registered = await rawRequest(port, "/__scenario-test__/config-scenarios", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id: "demo-copy", name: "示例场景 副本", file: "scenarios/demo-copy.js" })
            });
            assert.equal(registered.status, 200);
            const configSource = fs.readFileSync(path.join(workspace, "scenario.config.js"), "utf8");
            assert.match(configSource, /"demo-copy"/);

            // 注册后再覆盖新文件：已入清单 → 200
            const rewrite = await rawRequest(port, "/__scenario-test__/scenario-file", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ file: "scenarios/demo-copy.js", content: "// 再写\n" })
            });
            assert.equal(rewrite.status, 200);
        } finally {
            server.closeAllConnections?.();
            await new Promise((resolve) => server.close(resolve));
        }
    } finally {
        fs.rmSync(workspace, { recursive: true, force: true });
    }
});
