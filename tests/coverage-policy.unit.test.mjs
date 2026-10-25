import assert from "node:assert/strict";
import test from "node:test";
import { evaluateCoverageRun, supportsCoverageThresholds } from "../scripts/coverage-policy.mjs";

const thresholdError = "# Error: 51.82% line coverage does not meet threshold of 90%.";
const srcReport = [
    "# start of coverage report",
    "# ----------",
    "# src                      |        |          |        | ",
    "#  core.js                 |  99.00 |    90.00 |  99.00 | ",
    "# ----------",
    "# end of coverage report"
].join("\n");

function outputWith({ fail = 0, cancelled = 0, reportExtra = "" } = {}) {
    const report = reportExtra
        ? srcReport.replace("# end of coverage report", `${reportExtra}\n# end of coverage report`)
        : srcReport;
    return [
        `# fail ${fail}`,
        `# cancelled ${cancelled}`,
        thresholdError,
        report
    ].filter(Boolean).join("\n");
}

test("覆盖率阈值参数门槛：20.11 / 22.7 不支持，22.8+ 与更高主版本支持", () => {
    assert.equal(supportsCoverageThresholds("20.11.0"), false);
    assert.equal(supportsCoverageThresholds("22.7.0"), false);
    assert.equal(supportsCoverageThresholds("22.8.0"), true);
    assert.equal(supportsCoverageThresholds("22.22.0"), true);
    assert.equal(supportsCoverageThresholds("24.0.0"), true);
});

test("测试失败与阈值不足同时出现时，判定必须失败并指出测试失败", () => {
    const verdict = evaluateCoverageRun({ status: 1, output: outputWith({ fail: 1 }) });
    assert.equal(verdict.ok, false);
    assert.match(verdict.message, /1 个测试失败/);
});

test("仅阈值不足且测试全通过时，判定成功", () => {
    const verdict = evaluateCoverageRun({ status: 1, output: outputWith() });
    assert.equal(verdict.ok, true);
    assert.match(verdict.threshold, /line coverage does not meet threshold of 90%/);
});

test("缺少测试汇总或被取消的用例增多时，不得判定成功", () => {
    const missingSummary = evaluateCoverageRun({ status: 1, output: `${thresholdError}\n${srcReport}` });
    assert.equal(missingSummary.ok, false);
    assert.match(missingSummary.message, /未找到测试汇总/);

    const cancelled = evaluateCoverageRun({ status: 1, output: outputWith({ cancelled: 1 }) });
    assert.equal(cancelled.ok, false);
    assert.match(cancelled.message, /1 个测试被取消/);
});

test("覆盖率报告混入 dist/tests/scripts 时判定失败", () => {
    const verdict = evaluateCoverageRun({
        status: 1,
        output: outputWith({ reportExtra: "# tests\n#  cli.test.js | 100.00 | 100.00 | 100.00 | " })
    });
    assert.equal(verdict.ok, false);
    assert.match(verdict.message, /混入非 src 目录/);
});
