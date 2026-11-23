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

    // 同场景并发（#191）摘要：每个 worker 一条 testcase，冲突按 skipped 落盘，
    // 使 CI 能同时看到「恰好一个成功 + 其余业务冲突」的竞争结论与失败明细。
    // --data 时同一场景有多轮竞争，suite 名带上数据行，避免同名 suite 在 CI 里互相覆盖。
    for (const summary of options.concurrency || []) {
        const suiteName = `${summary.scenarioId || "scenario"}${summary.dataRow ? `#row-${summary.dataRow}` : ""}#workers`;
        const cases = [];
        for (const worker of summary.workerResults || []) {
            const name = escapeXml(`W${worker.worker} ${worker.outcome}`);
            const classname = escapeXml(suiteName);
            const detail = (worker.assertions || [])
                .filter((item) => !item.passed)
                .map((item) => `${item.name}: expected=${safeJson(item.expected)} actual=${safeJson(item.actual)}`)
                .join("\n");
            if (worker.outcome === "conflict") {
                cases.push(`    <testcase name="${name}" classname="${classname}" time="0.000"><skipped message="业务冲突（幂等/并发预期）">${escapeXml(detail)}</skipped></testcase>`);
                totalTests += 1;
                totalSkipped += 1;
            } else if (worker.outcome === "success") {
                cases.push(`    <testcase name="${name}" classname="${classname}" time="0.000"/>`);
                totalTests += 1;
            } else {
                cases.push(`    <testcase name="${name}" classname="${classname}" time="0.000"><failure message="${escapeXml(worker.status || "FAILED")}">${escapeXml(detail || "请求执行失败")}</failure></testcase>`);
                totalTests += 1;
                totalFailures += 1;
            }
        }
        suites.push(
            `  <testsuite name="${escapeXml(suiteName)}" tests="${cases.length}" failures="${(summary.workerResults || []).filter((item) => item.outcome === "failed").length}" skipped="${(summary.workerResults || []).filter((item) => item.outcome === "conflict").length}" time="0.000">\n`
            + `${cases.join("\n")}${cases.length ? "\n" : ""}  </testsuite>`
        );
    }

    // 未执行场景（--bail / 并发中断）：以 skipped testcase 落盘，避免 CI 报告只看到
    // 已有用例而完全不知道有场景被跳过
    for (const skippedEntry of options.notRun || []) {
        const id = skippedEntry.id || skippedEntry.name || "scenario";
        const suiteName = skippedEntry.row ? `${id}#row-${skippedEntry.row}` : id;
        const reason = skippedEntry.reason === "bail" ? "--bail 后未执行" : "未执行";
        totalTests += 1;
        totalSkipped += 1;
        suites.push(
            `  <testsuite name="${escapeXml(suiteName)}" tests="1" failures="0" skipped="1" time="0.000">\n`
            + `    <testcase name="${escapeXml(skippedEntry.name || "未执行场景")}" classname="${escapeXml(suiteName)}" time="0.000"><skipped message="${escapeXml(reason)}"/></testcase>\n`
            + `  </testsuite>`
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
