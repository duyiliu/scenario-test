import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { VERSION } from "../src/version.generated.js";

test("生成的运行时版本与 package.json 一致", () => {
    const packageInfo = JSON.parse(fs.readFileSync(path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../package.json"), "utf8"));
    assert.equal(VERSION, packageInfo.version);
});
