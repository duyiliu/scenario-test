// JUnit XML 报告投影 —— 把 engine.runScenario 的结构化 report 转成 CI 可直接消费的 XML。
//
// 口径：
//   - 一个场景（report）对应一个 <testsuite>，一个步骤对应一个 <testcase>；
//   - 失败步骤写 <failure>（含失败断言 message/expected/actual 与 each 明细）；
//   - 条件跳过（when 不成立）与 failurePolicy:stop / 取消后未执行的步骤写 <skipped>；
//   - 时间统一换算为 JUnit 约定的秒（源数据 duration 为毫秒）；
//   - 所有用户/服务端可控文本都做 XML 转义，并剔除 XML 1.0 非法字符，避免生成坏文档。
//
// 本模块为纯函数（无 I/O），CLI 负责决定写入路径。

const XML_INVALID_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\uFFFE\uFFFF]|[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/g;

function sanitizeXml(value) {
    return String(value ?? "").replace(XML_INVALID_CHARS, "\uFFFD");
}

// 文本节点转义：& < > 必须转义；CR 用字符引用保留（否则 XML 解析器会把 CR/CRLF 归一为 LF）
export function escapeXmlText(value) {
    return sanitizeXml(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/\r/g, "&#13;");
}

// 属性值转义：在文本规则上补引号/单引号；换行与制表符用字符引用保留（属性值会被归一化）
export function escapeXmlAttribute(value) {
    return escapeXmlText(value)
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&apos;")
        .replace(/\n/g, "&#10;")
        .replace(/\t/g, "&#9;");
}

function formatSeconds(durationMs) {
    const value = Number(durationMs);
    return (Number.isFinite(value) && value > 0 ? value / 1000 : 0).toFixed(3);
}

function describeValue(value) {
    try {
        const serialized = JSON.stringify(value);
        return serialized === undefined ? String(value) : serialized;
    } catch {
        return String(value);
    }
}

function appendEachDetails(lines, details, prefix) {
    for (const item of details || []) {
        const label = `${prefix}第 ${Number(item?.index) + 1} 项`;
        for (const assertion of item?.assertions || []) {
            if (assertion.passed) continue;
            const name = assertion.name || "断言";
            lines.push(`${label} ${name}: expected=${describeValue(assertion.expected)} actual=${describeValue(assertion.actual)}`);
            if (assertion.reason) lines.push(`${label} 原因: ${assertion.reason}`);
            appendEachDetails(lines, assertion.detail, `${label} › `);
        }
    }
}

function failureBody(result) {
    const lines = [];
    if (result.error && !(result.assertions || []).some((item) => !item.passed && item.name === result.error)) {
        lines.push(result.error);
    }
    for (const assertion of result.assertions || []) {
        if (assertion.passed) continue;
        const name = assertion.name || "断言";
        lines.push(`${name}: expected=${describeValue(assertion.expected)} actual=${describeValue(assertion.actual)}`);
        if (assertion.reason) lines.push(`原因: ${assertion.reason}`);
        appendEachDetails(lines, assertion.detail, "");
    }
    for (const warning of result.warnings || []) lines.push(`警告: ${warning}`);
    return lines.length ? lines : [result.error || "步骤失败"];
}

function indentedXmlLines(lines, indent) {
    const output = [];
    for (const raw of lines) {
        for (const line of String(raw).split(/\r\n|\n|\r/)) {
            output.push(`${indent}${escapeXmlText(line)}`);
        }
    }
    return output;
}

function unexecutedReason(report, scenario) {
    if (report.status === "CANCELLED") return "执行已取消，步骤未执行";
    if (scenario?.failurePolicy === "continue") return "执行中断，步骤未执行";
    return "因 failurePolicy: stop，上一步失败后步骤未执行";
}

function testcaseXml(suite, index, report) {
    const scenario = suite.scenario || {};
    const steps = scenario.steps || [];
    const result = report.results?.[index];
    const testcaseName = result?.name || steps[index]?.name || `步骤 ${index + 1}`;
    const attrs = [
        `name="${escapeXmlAttribute(testcaseName)}"`,
        `classname="${escapeXmlAttribute(suite.name || report.scenarioName || "scenario-test")}"`,
        `time="${formatSeconds(result?.duration)}"`
    ];
    const lines = [`      <testcase ${attrs.join(" ")}>`];
    if (!result) {
        lines.push(`        <skipped message="${escapeXmlAttribute(unexecutedReason(report, scenario))}"/>`);
    } else if (result.skipped) {
        lines.push('        <skipped message="when 条件不成立，步骤未执行"/>');
    } else if (!result.passed) {
        const message = result.error || "步骤失败";
        lines.push(`        <failure message="${escapeXmlAttribute(message)}" type="AssertionError">`);
        lines.push(...indentedXmlLines(failureBody(result), "          "));
        lines.push("        </failure>");
    }
    lines.push("      </testcase>");
    return lines;
}

function suiteXml(suite) {
    const report = suite.report;
    const scenario = suite.scenario || {};
    const planned = Math.max(Number(report.planned) || 0, report.results?.length || 0, scenario.steps?.length || 0);
    const executedResults = report.results || [];
    const unexecuted = Math.max(0, planned - executedResults.length);
    const failures = executedResults.filter((item) => !item.skipped && !item.passed).length;
    const skipped = executedResults.filter((item) => item.skipped).length + unexecuted;
    const time = executedResults.reduce((total, item) => total + (Number(item.duration) || 0), 0);
    const suiteName = report.scenarioName || scenario.name || suite.name || "scenario-test";
    const attrs = [
        `name="${escapeXmlAttribute(suiteName)}"`,
        `tests="${planned}"`,
        `failures="${failures}"`,
        `errors="0"`,
        `skipped="${skipped}"`,
        `time="${formatSeconds(time)}"`
    ];
    const lines = [`  <testsuite ${attrs.join(" ")}>`];
    for (let index = 0; index < planned; index += 1) lines.push(...testcaseXml({ ...suite, name: suiteName }, index, report));
    lines.push("  </testsuite>");
    return { xml: lines, planned, failures, skipped, time };
}

// suites: [{ report, scenario, name? }]
export function buildJUnitXml(suites) {
    const rendered = [];
    let tests = 0;
    let failures = 0;
    let skipped = 0;
    let time = 0;
    for (const suite of suites || []) {
        const item = suiteXml(suite);
        rendered.push(...item.xml);
        tests += item.planned;
        failures += item.failures;
        skipped += item.skipped;
        time += item.time;
    }
    const rootAttrs = [
        'name="scenario-test"',
        `tests="${tests}"`,
        `failures="${failures}"`,
        'errors="0"',
        `skipped="${skipped}"`,
        `time="${formatSeconds(time)}"`
    ];
    return [
        '<?xml version="1.0" encoding="UTF-8"?>',
        `<testsuites ${rootAttrs.join(" ")}>`,
        ...rendered,
        "</testsuites>",
        ""
    ].join("\n");
}
