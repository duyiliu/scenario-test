// 覆盖率探针：只加载 src/ 入口而不执行业务路径，用于验证
// `test:coverage` 的 include 范围与阈值确实生效（不作为普通单测用例运行）。
import assert from "node:assert/strict";
import "../../src/index.js";

assert.ok(true);
