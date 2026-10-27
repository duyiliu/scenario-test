import assert from "node:assert/strict";
import test from "node:test";
import { defineScenario } from "../src/index.js";
import workbenchAdhoc from "../src/browser/ui/ui-adhoc.js";

function parseDraft(draft) {
    return new Function("return (" + draft + ");")();
}

test("adhoc 转为步骤：生成可解析、可注册的 step 对象并携带实际状态码", () => {
    const draft = workbenchAdhoc.buildAdhocStepDraft({
        name: "创建订单",
        method: "post",
        path: "/orders",
        params: { dryRun: "true" },
        headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer top-secret-token",
            "X-API-Key": "key-123456",
            Cookie: "sid=session-secret",
            "X-Trace": "trace-1"
        },
        body: { sku: "A-1", quantity: 2 },
        status: 201
    });

    const step = parseDraft(draft);
    assert.equal(step.name, "创建订单");
    assert.equal(step.method, "POST");
    assert.equal(step.path, "/orders");
    assert.deepEqual(step.params, { dryRun: "true" });
    assert.equal(step.status, 201);
    assert.deepEqual(step.request.body, { sku: "A-1", quantity: 2 });
    assert.equal(step.request.headers["Content-Type"], "application/json");
    assert.equal(step.request.headers["X-Trace"], "trace-1");
    assert.equal(step.request.headers.Authorization, "{{vars.authorization}}");
    assert.equal(step.request.headers["X-API-Key"], "{{vars.xApiKey}}");
    assert.equal(step.request.headers.Cookie, "{{vars.cookie}}");
    assert.doesNotMatch(draft, /top-secret-token|key-123456|session-secret/, "敏感请求头不得落明文");

    // 生成物必须能通过定义期校验，可直接放进 scenario.steps
    const scenario = defineScenario({ name: "adhoc 草稿", steps: [step] });
    assert.equal(scenario.steps[0].status, 201);
});

test("adhoc 转为步骤：GET/HEAD 省略不可运行的请求体，空 name 使用占位", () => {
    const step = parseDraft(workbenchAdhoc.buildAdhocStepDraft({
        name: "",
        method: "GET",
        path: "/health",
        headers: {},
        body: { ignored: true },
        status: 200
    }));

    assert.equal(step.name, "待填写步骤名称");
    assert.equal(step.status, 200);
    assert.equal(step.request, undefined, "无请求头且 GET 带体被省略时不应保留空 request");
    assert.doesNotThrow(() => defineScenario({ name: "GET 草稿", steps: [step] }));
});

test("adhoc 转为步骤：没有实际响应状态码时拒绝生成", () => {
    assert.throws(() => workbenchAdhoc.buildAdhocStepDraft(null), /请先执行一次请求/);
    assert.throws(() => workbenchAdhoc.buildAdhocStepDraft({
        method: "GET",
        path: "/health",
        status: "ERROR"
    }), /有效状态码/);
});
