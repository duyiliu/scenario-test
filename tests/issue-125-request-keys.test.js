import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { contract } from "../src/contract.js";
import { defineScenario } from "../src/registry.js";
import { buildCapabilities } from "../src/capabilities.js";

// Issue #125：request 对象没有键白名单（request.heders 被运行期静默忽略）；
// retryUntilKeys 与 retryUntil.keys 是两份相同列表，容易只改一处。

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

test("#125：request 字段拼写错误在定义期报错并给出近似字段建议", () => {
    const withRequest = (request) => () => defineScenario({
        name: "场景",
        steps: [{ name: "步骤", path: "/x", method: "POST", request }]
    });
    assert.throws(withRequest({ heders: { "X-Token": "v" } }), /request.*未知键.*"heders".*headers/);
    assert.throws(withRequest({ bodyy: { a: 1 } }), /request.*未知键.*"bodyy".*body/);
    assert.throws(withRequest({ param: { a: 1 } }), /request.*未知键.*"param".*params/);
    // 合法字段不受影响
    assert.doesNotThrow(withRequest({
        method: "POST",
        path: "/x",
        params: { a: 1 },
        headers: { "Content-Type": "application/json" },
        body: { a: 1 },
        timeoutMs: 1000,
        credentials: "include",
        redirect: "follow",
        useEnvironmentAuthorization: true
    }));
    // fileUpload 需要 io 支持才执行，但定义期应接受
    assert.doesNotThrow(withRequest({ fileUpload: { path: "a.txt" } }));
});

test("#125：requestKeys 进入 contract 与 capabilities，d.ts RequestDefinition 同步", () => {
    assert.deepEqual([...contract.scenario.requestKeys], [
        "method", "path", "params", "headers", "body", "fileUpload",
        "timeoutMs", "credentials", "redirect", "useEnvironmentAuthorization"
    ]);
    const caps = buildCapabilities();
    assert.deepEqual(caps.scenario.requestKeys, [...contract.scenario.requestKeys]);
    const dts = fs.readFileSync(path.join(root, "dist", "scenario-test.d.ts"), "utf8");
    const start = dts.indexOf("export interface RequestDefinition {");
    const body = dts.slice(start, dts.indexOf("\n}", start));
    for (const key of contract.scenario.requestKeys) {
        assert.match(body, new RegExp(`\\b${key}\\??:`), `d.ts RequestDefinition 缺少 ${key}`);
    }
});

test("#125：retryUntil 键列表只有一份（scenario.retryUntilKeys 复用 retryUntil.keys）", () => {
    assert.equal(contract.scenario.retryUntilKeys, contract.retryUntil.keys, "两份名单应是同一个冻结数组");
    assert.ok(Object.isFrozen(contract.scenario.retryUntilKeys));
    assert.deepEqual([...contract.retryUntil.keys], ["maxAttempts", "intervalMs", "maxElapsedMs", "retryOn", "intervalFactor", "maxIntervalMs"]);
    // contract 源码中不应再手写第二份同内容字面量
    const source = fs.readFileSync(path.join(root, "src", "contract.js"), "utf8");
    const literal = '"maxAttempts", "intervalMs", "maxElapsedMs", "retryOn", "intervalFactor", "maxIntervalMs"';
    assert.equal(source.split(literal).length - 1, 1, "contract.js 中 retryUntil 键字面量只能出现一次");
});
