import assert from "node:assert/strict";
import test from "node:test";
import { BUILD_ID } from "../src/version.generated.js";

test("BUILD_ID 追加无人值守后缀", () => {
    assert.equal(BUILD_ID.endsWith("-uav"), true);
});
