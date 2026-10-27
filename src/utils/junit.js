// JUnit XML 报告（#57）：scenario → testsuite，step → testcase。
// 纯格式化无 I/O；stdout 人类输出与退出码由 CLI 保持原样。
import fs from "node:fs";
import path from "node:path";

const INVALID_XML_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\uFFFE\uFFFF]/g;

export function escapeXml(value) {
    return String(value == null ? "" : value)
        .replace(INVALID_XML_CHARS, "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&apos;");
}

function seconds(milliseconds) {
    const value = Number(milliseconds);
    return Number.isFinite(value) ? (value / 1000).toFixed(3) : "0.000";
}

function failureMessage(step) {
    const failedAssertions = (step.assertions || []).filter((item) => !item.passed);
    const names = failedAssertions.map((item) => item.name).filter(Boolean);
    if (step.error) return String(step.error);
    if (names.length) return names.join("; ");
    return "步骤失败";
}

function failureDetail(step) {
    const lines = [];
    for (const assertion of (step.assertions || []).filter((item) => !item.passed)) {
        lines.push(`${assertion.name}: expected=${safeJson(assertion.expected)} actual=${safeJson(assertion.actual)}`);
        if (assertion.reason) lines.push(`原因: ${assertion.reason}`);
        for (const detail of assertion.detail || []) {
            if (Array.isArray(detail.assertions)) {
                for (const sub of detail.assertions.filter((item) => !item.passed)) {
                    lines.push(`  第 ${detail.index + 1} 项 ${sub.name}: expected=${safeJson(sub.expected)} actual=${safeJson(sub.actual)}`);
                }
            } else if (detail.path) {
                lines.push(`  ${detail.path}: expected=${safeJson(detail.expected)} actual=${safeJson(detail.actual)}`);
            }
        }
    }
    return lines.join("\n");
}

function safeJson(value) {
    try {
        return JSON.stringify(value);
    } catch {
        return String(value);
    }
}

function stepCase(step, scenarioId) {
    const name = escapeXml(step.name || "未命名步骤");
    const classname = escapeXml(scenarioId || "scenario");
    const time = seconds(step.duration);
    if (step.skipped) {
        const message = (step.warnings || []).join("；") || "条件跳过";
        return `    <testcase name="${name}" classname="${classname}" time="${time}"><skipped message="${escapeXml(message)}"/></testcase>`;
    }
    if (!step.passed) {
        const message = failureMessage(step);
        const detail = failureDetail(step);
        return `    <testcase name="${name}" classname="${classname}" time="${time}"><failure message="${escapeXml(message)}">${escapeXml(detail)}</failure></testcase>`;
    }
    return `    <testcase name="${name}" classname="${classname}" time="${time}"/>`;
}

export function buildJUnitXml(reports, options = {}) {
    const suites = [];
    let totalTests = 0;
    let totalFailures = 0;
    let totalSkipped = 0;
    let totalTime = 0;

    for (const report of reports || []) {
        const results = report.results || [];
        const unexecuted = report.unexecuted || [];
        const failures = results.filter((step) => !step.skipped && !step.passed).length;
        const skipped = results.filter((step) => step.skipped).length + unexecuted.length;
        const suiteTime = results.reduce((sum, step) => sum + (Number(step.duration) || 0), 0);
        const tests = results.length + unexecuted.length;
        totalTests += tests;
        totalFailures += failures;
        totalSkipped += skipped;
        totalTime += suiteTime;
        const scenarioId = report.scenarioId || report.scenarioName || "scenario";
        const cases = results.map((step) => stepCase(step, scenarioId));
        for (const stepName of unexecuted) {
            cases.push(`    <testcase name="${escapeXml(stepName)}" classname="${escapeXml(scenarioId)}" time="0.000"><skipped message="failurePolicy: stop 未执行"/></testcase>`);
        }
        suites.push(
            `  <testsuite name="${escapeXml(scenarioId)}" tests="${tests}" failures="${failures}" skipped="${skipped}" time="${seconds(suiteTime)}">\n`
            + `${cases.join("\n")}${cases.length ? "\n" : ""}  </testsuite>`
        );
    }

    const name = options.name || "scenario-test";
    return `<?xml version="1.0" encoding="UTF-8"?>\n`
        + `<testsuites name="${escapeXml(name)}" tests="${totalTests}" failures="${totalFailures}" skipped="${totalSkipped}" time="${seconds(totalTime)}">\n`
        + `${suites.join("\n")}${suites.length ? "\n" : ""}`
        + `</testsuites>\n`;
}

export function writeJUnitReport(filePath, reports, options = {}) {
    const target = path.resolve(filePath);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, buildJUnitXml(reports, options), "utf8");
    return target;
}
