import assert from "node:assert/strict";
import test from "node:test";
import { validateAdapterResponse } from "../src/adapter-types.js";

// Issue #26 小观察：validateAdapterResponse 的 headers 检查此前用
// `typeof !== "object"` 判型，typeof null === "object" 会把 null 放过。
test("validateAdapterResponse：headers 为 null 时拒绝而非当对象放过", () => {
    assert.throws(
        () => validateAdapterResponse({ status: 200, headers: null }, "demo"),
        /headers 必须是对象/
    );
    assert.equal(validateAdapterResponse({ status: 200, headers: {} }, "demo"), true);
    assert.equal(validateAdapterResponse({ status: 200 }, "demo"), true);
});
