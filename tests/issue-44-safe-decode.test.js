import assert from "node:assert/strict";
import test from "node:test";
import { createEngine, defineScenario } from "../src/index.js";
import { safeDecodeComponent } from "../src/utils/safe-decode.js";
import workbenchView from "../src/browser/ui/ui-view.js";
import workbenchAdhoc from "../src/browser/ui/ui-adhoc.js";

function jsonResponse(body = {}) {
    return new Response(JSON.stringify(body), { status: 200, headers: { "Content-Type": "application/json" } });
}

function runtime(vars = {}) {
    return { vars, lastResponse: null, lastResponseBody: null };
}

// Issue #44：decodeURIComponent 对畸形百分号编码会抛 URIError，单点容错保留原串
test("safeDecodeComponent 对畸形编码回退原串，合法编码保持解码", () => {
    assert.equal(safeDecodeComponent("bad%zz"), "bad%zz");
    assert.equal(safeDecodeComponent("100%"), "100%");
    assert.equal(safeDecodeComponent("%E4%B8%AD"), "中");
    assert.equal(safeDecodeComponent("a+b"), "a+b", "不得把 + 当空格，保持 query 既有语义");
});

test("globals query 注入：路径中畸形 % 编码不再使步骤 ERROR，请求正常发出", async () => {
    let captured;
    const engine = createEngine({
        baseUrl: "https://mock.local",
        globals: [{ type: "query", name: "source", value: "scenario-test" }],
        fetch: async (url) => {
            captured = String(url);
            return jsonResponse();
        }
    });
    const report = await engine.runScenario(defineScenario({
        name: "畸形 query key",
        steps: [{ name: "请求", path: "api?bad%zz=1" }]
    }));

    const result = report.results[0];
    assert.equal(result.status, 200, "请求必须实际发出，而不是被 URIError 变成 ERROR");
    assert.equal(result.passed, true);
    assert.equal(result.error, "");
    assert.equal(captured, "https://mock.local/api?bad%zz=1&source=scenario-test");
});

test("globals query 注入：合法编码 key 的去重行为保持不变", async () => {
    let captured;
    const engine = createEngine({
        baseUrl: "https://mock.local",
        globals: [
            { type: "query", name: "中", value: "global-value" },
            { type: "query", name: "source", value: "scenario-test" }
        ],
        fetch: async (url) => {
            captured = String(url);
            return jsonResponse();
        }
    });
    const report = await engine.runScenario(defineScenario({
        name: "合法编码 key 去重",
        steps: [{ name: "请求", path: "api?%E4%B8%AD=1" }]
    }));

    assert.equal(report.results[0].status, 200);
    const search = new URL(captured).searchParams;
    assert.deepEqual(search.getAll("中"), ["1"], "已存在的合法编码 key 不得被全局参数覆盖/重复注入");
    assert.deepEqual(search.getAll("source"), ["scenario-test"]);
    assert.ok(!captured.includes("global-value"));
});

test("无 globals 时不解析已有 query：畸形 % 路径原样发出", async () => {
    let captured;
    const engine = createEngine({
        baseUrl: "https://mock.local",
        fetch: async (url) => {
            captured = String(url);
            return jsonResponse();
        }
    });
    const report = await engine.runScenario(defineScenario({
        name: "无全局参数",
        steps: [{ name: "请求", path: "api?bad%zz=1" }]
    }));

    assert.equal(report.results[0].status, 200);
    assert.equal(captured, "https://mock.local/api?bad%zz=1");
});

test("工作台待执行步骤渲染：字面 % / 畸形 query 不再中断面板渲染", () => {
    const html = workbenchView.renderPendingSteps([{
        name: "畸形 query",
        method: "GET",
        path: "/search?bad%zz=1&q=100%"
    }], 0);

    assert.match(html, /畸形 query/);
    assert.match(html, /bad%zz/);
    assert.match(html, /q=100%/);
});

test("工作台临时请求解析：畸形 key/value 保留原串，合法多字节编码正常解码", () => {
    const request = workbenchAdhoc.buildAdhocRequest({
        name: "临时请求",
        method: "GET",
        path: "/search?bad%zz=1&cn=%E4%B8%AD&q=100%25&literal=100%"
    }, runtime());

    assert.equal(request.path, "/search");
    assert.deepEqual(request.params, {
        "bad%zz": "1",
        cn: "中",
        q: "100%",
        literal: "100%"
    });
});
