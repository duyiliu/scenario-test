import fs from "node:fs";
import path from "node:path";
import { escapeXml as esc } from "./junit.js";
import { renderStructuralDiff } from "./structural-diff.js";

function value(v) {
    const text = typeof v === "string" ? v : JSON.stringify(v, null, 2);
    return esc(text && text.length > 4000 ? text.slice(0, 4000) + "…（已截断）" : text);
}

export function buildHtmlReport(reports, options = {}) {
    const sections = reports.map((report) => {
        const steps = (report.results || []).map((step) => {
            const state = step.cancelled ? "CANCELLED" : step.skipped ? "SKIP" : step.status === "TIMEOUT" ? "TIMEOUT" : step.status === "ERROR" ? "ERROR" : step.passed ? "PASS" : "FAIL";
            const assertions = (step.assertions || []).map((a) => `<details${a.passed ? "" : " open"}><summary>${a.passed ? "PASS" : "FAIL"} ${value(a.name)}</summary><pre>期望: ${value(a.expected)}\n实际: ${value(a.actual)}</pre>${renderStructuralDiff(a.diff)}${a.detail ? `<pre>${value(a.detail)}</pre>` : ""}</details>`).join("");
            return `<article><h3>${state} · ${value(step.name)}</h3><p>${value(step.method)} ${value(step.path)} · HTTP ${value(step.status)} · ${value(step.duration)} ms</p>${step.error ? `<pre>${value(step.error)}</pre>` : ""}${assertions}</article>`;
        }).join("");
        const pending = (report.unexecuted || []).map((step) => `<li>未执行：${value(step.name || step)}</li>`).join("");
        return `<section><h2>${value(report.scenarioId || report.name)} · ${value(report.status)}</h2>${steps}${pending ? `<ul>${pending}</ul>` : ""}</section>`;
    }).join("");
    const notRun = (options.notRun || []).map((item) => `<li>未执行场景：${value(item)}</li>`).join("");
    return `<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'"><title>场景测试报告</title><style>body{font:15px/1.6 system-ui;margin:32px auto;padding:0 20px;max-width:1100px;color:#172033;background:#f5f7fb}section,article{background:white;border:1px solid #dce2ec;border-radius:10px;padding:16px;margin:16px 0}pre{white-space:pre-wrap;overflow-wrap:anywhere;background:#f1f4f8;padding:12px}summary{cursor:pointer;overflow-wrap:anywhere}h2{font-size:20px}h3{font-size:16px}.structural-diff{border-left:3px solid #d94b4b;padding-left:12px}</style><h1>场景测试报告</h1><p>场景数：${reports.length} · 环境：${value(options.environment)}</p>${sections}${notRun ? `<ul>${notRun}</ul>` : ""}</html>`;
}

export function writeHtmlReport(file, reports, options) {
    const target = path.resolve(file);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, buildHtmlReport(reports, options), "utf8");
    return target;
}
