import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { chromium } from "playwright";

const root = path.resolve(import.meta.dirname, "..");
const port = 4399;
const artifacts = path.join(root, "test-results");
fs.mkdirSync(artifacts, { recursive: true });

const server = spawn(process.execPath, [
    path.join(root, "dist/scenario-test-cli.cjs"),
    "serve",
    "--config",
    path.join(root, "examples/basic/scenario.config.js"),
    "--port",
    String(port)
], { cwd: root, stdio: ["ignore", "pipe", "pipe"] });

async function waitForServer() {
    await new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error("浏览器测试服务启动超时")), 10000);
        server.stdout.on("data", (chunk) => {
            if (String(chunk).includes("场景测试工作台")) {
                clearTimeout(timer);
                resolve();
            }
        });
        server.on("exit", (code) => reject(new Error(`浏览器测试服务提前退出: ${code}`)));
    });
}

let browser;
try {
    await waitForServer();
    browser = await chromium.launch({ channel: "chrome", headless: true });
    // 仅桌面视口：工作台面向桌面浏览器，无移动端使用场景（2026-10-09 决策移除 mobile 视口）
    for (const viewport of [{ width: 1440, height: 900, name: "desktop" }]) {
        const page = await browser.newPage({ viewport });
        await page.route(`http://127.0.0.1:${port}/health?*`, (route) => route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({ status: "UP", padding: "x".repeat(70000) })
        }));
        await page.route(`http://127.0.0.1:${port}/slow?*`, async (route) => {
            await new Promise((resolve) => setTimeout(resolve, 5000));
            await route.fulfill({ status: 200, contentType: "application/json", body: "{}" }).catch(() => {});
        });
        const recordsRequests = [];
        await page.route(`http://127.0.0.1:${port}/records/**`, (route) => {
            recordsRequests.push(route.request().url());
            route.fulfill({ status: 204, body: "" });
        });
        const pageErrors = [];
        page.on("pageerror", (error) => pageErrors.push(error.message));
        const externalRequests = [];
        page.on("request", (request) => {
            const url = request.url();
            if (!url.startsWith(`http://127.0.0.1:${port}`) && !url.startsWith("https://mock.local")) externalRequests.push(url);
        });
        await page.goto(`http://127.0.0.1:${port}/`, { waitUntil: "networkidle" });
        await page.waitForFunction(() => document.querySelectorAll("[data-scenario-file]").length === 5);
        assert.equal(await page.locator("#stepsList li").count(), 1);
        assert.equal(await page.locator("[data-copy-step]").count(), 1, "待执行步骤应提供复制按钮");
        assert.equal(await page.locator("#scenarioVar_exampleToken").getAttribute("type"), "password", "token 命名的凭据变量应掩码显示");
        assert.equal(await page.locator("#scenarioVar_expectedStatus").getAttribute("type"), "text", "非凭据变量保持明文输入");
        assert.equal(await page.locator("#scenarioVar_expectedStatus").inputValue(), "UP");
        // 环境级变量：切换环境后页面变量立即回退/覆盖到该环境的 envs[].vars，切回默认环境恢复
        await page.locator("#configToggleBtn").click();
        await page.locator("#environmentInput").selectOption("mock-env-vars");
        assert.equal(await page.locator("#scenarioVar_expectedStatus").inputValue(), "UP-FROM-ENV", "切换环境后应使用该环境的 env.vars");
        await page.locator("#environmentInput").selectOption("mock");
        assert.equal(await page.locator("#scenarioVar_expectedStatus").inputValue(), "UP", "切回环境后应恢复配置 vars");
        await page.locator("#configCloseBtn").click();
        await page.locator("#themeSelect").selectOption("claude-code");
        assert.equal(await page.locator("#scenario-test-root").evaluate((node) => node.classList.contains("theme-claude-code")), true);
        assert.equal(await page.locator("#scenario-test-root").evaluate((node) => getComputedStyle(node).getPropertyValue("--workspace-bg").trim()), "#f5f0ea");
        assert.match(await page.locator(".scenario-header-actions").textContent(), /风格/);

        if (!await page.locator("#scenarioVar_expectedStatus").isVisible()) {
            await page.locator("#configToggleBtn").click();
            // 弹窗打开后经 rAF 异步聚焦第一个输入框，等待初始化完成再测快捷键，避免抢焦点竞态。
            await page.waitForFunction(() => document.activeElement && document.activeElement.id === "environmentInput");
        }
        // 弹窗内的工作台快捷键不得执行背景场景或把焦点带出编辑区。
        for (const key of ["Control+Enter", "Alt+Enter", "Alt+r", "Control+k"]) {
            await page.locator("#baseUrlInput").press(key);
            assert.equal(await page.locator("#execStartTime").textContent(), "-", `${key} 不应从配置弹窗执行场景`);
            assert.equal(await page.evaluate(() => document.activeElement.id), "baseUrlInput", `${key} 不应移走配置焦点`);
        }
        // 凭据变量显隐切换（面板已展开，按钮可点击）
        await page.locator('[data-toggle-var="exampleToken"]').click();
        assert.equal(await page.locator("#scenarioVar_exampleToken").getAttribute("type"), "text", "点击显示应切换为明文");
        await page.locator('[data-toggle-var="exampleToken"]').click();
        assert.equal(await page.locator("#scenarioVar_exampleToken").getAttribute("type"), "password", "再次点击应恢复掩码");
        await page.locator("#scenarioVar_expectedStatus").fill("DOWN");
        await page.locator("#saveSettingsBtn").click();
        assert.match(await page.locator("#settingsNotice").textContent(), /已保存并生效/);
        await page.locator("#configCloseBtn").click();
        // 搜索快捷键可从另一个输入框进入场景搜索，正常执行快捷键仍然可用。
        await page.locator("#stepSearchInput").press("Control+k");
        assert.equal(await page.evaluate(() => document.activeElement.id), "scenarioSearchInput");
        await page.locator("#scenarioSearchInput").press("Control+Enter");
        await page.waitForFunction(() => !document.querySelector("#runBtn").disabled && document.querySelector('#stepsList li[data-passed="false"]'));
        assert.equal(await page.locator('#stepsList li[data-passed="false"]').count(), 1);

        // 步骤筛选：失败态下按结果筛选计数正确，清除筛选按钮随筛选状态显隐
        assert.equal(await page.locator("#filterBar #resetStepFiltersBtn").isVisible(), false, "无筛选时应隐藏清除按钮");
        await page.locator('#filterBar [data-f="fail"]').click();
        assert.equal(await page.locator("#stepsList li:visible").count(), 1, "失败筛选应只显示失败步骤");
        assert.equal(await page.locator('#filterBar [data-f="fail"]').getAttribute("aria-pressed"), "true", "激活的筛选按钮应带 aria-pressed=true");
        assert.equal(await page.locator("#resetStepFiltersBtn").isVisible(), true, "筛选后应显示清除按钮");
        assert.match(await page.locator("#stepFilterSummary").textContent(), /显示 1 \/ 1 个步骤/);
        // 步骤搜索：无匹配时出现空态，一键清除恢复
        await page.locator("#stepSearchInput").fill("不存在的步骤xyz");
        await page.waitForFunction(() => document.querySelector("#stepsFilterEmpty").style.display !== "none");
        assert.equal(await page.locator("#stepsList li:visible").count(), 0, "无匹配搜索应隐藏全部步骤");
        assert.match(await page.locator("#stepsFilterEmpty").textContent(), /没有匹配的步骤/);
        await page.locator("#stepsFilterEmpty button").click();
        await page.waitForFunction(() => document.querySelector("#stepSearchInput").value === "");
        assert.equal(await page.locator("#stepsList li:visible").count(), 1, "清除筛选后应恢复显示步骤");

        // 失败报告「定位步骤」：失败运行后自动切到报告页，点击定位应展开并高亮对应步骤
        assert.match(await page.locator("#reportPanel").textContent(), /失败诊断/, "失败运行后报告面板应为失败诊断");
        const locateButton = page.locator("#reportPanel [data-locate-step-index]").first();
        assert.equal(await locateButton.count(), 1, "失败诊断应提供定位步骤按钮");
        assert.equal(await locateButton.getAttribute("data-locate-step-index"), "0", "单步场景失败应定位到零基索引 0");
        await locateButton.click();
        await page.waitForFunction(() => {
            const node = document.querySelector('#stepsList li[data-step-idx="0"]');
            return node && node.classList.contains("scenario-step--located") && node.querySelector(".details-panel").classList.contains("open");
        }, undefined, { timeout: 3000 });
        assert.match(await page.locator('#stepsList li[data-step-idx="0"] .details-panel').textContent(), /DOWN/, "定位展开的失败步骤详情应包含期望值");

        await page.locator("#configToggleBtn").click();
        await page.locator("#clearSettingsBtn").click();
        assert.match(await page.locator("#settingsNotice").textContent(), /已恢复配置值/);
        assert.equal(await page.locator("#scenarioVar_expectedStatus").inputValue(), "UP");
        await page.locator("#configCloseBtn").click();

        await page.locator("#runBtn").click();
        await page.waitForFunction(() => !document.querySelector("#runBtn").disabled && document.querySelector('#stepsList li[data-passed="true"]'));
        assert.equal(await page.locator('#stepsList li[data-passed="true"]').count(), 1);
        assert.match(await page.locator("#statsPanel").textContent(), /总步骤/);

        // 运行时变量面板：步骤详情含执行后变量全量（配置变量 + 保留变量）；本场景无 extract，不出现变更徽标
        const varsSection = await page.locator("#stepsList .details-panel details.report-step__response").first().textContent();
        assert.match(varsSection, /运行时变量/, "步骤详情应包含运行时变量面板");
        assert.match(varsSection, /expectedStatus/, "变量面板应展示配置变量");
        assert.match(varsSection, /runId/, "变量面板应展示保留变量");
        assert.doesNotMatch(varsSection, /本步变更/, "无 extract 的步骤不应出现变更徽标");

        // 复制功能：直接点击统计栏右侧复制按钮，mock 剪贴板验证报告 MD/JSON 与步骤复制的反馈
        await page.evaluate(() => {
            Object.defineProperty(navigator, "clipboard", {
                value: { writeText: async (text) => { window.__lastCopiedText = text; } },
                configurable: true
            });
        });
        await page.locator("#copyReportMarkdownBtn").click();
        await page.waitForFunction(() => document.querySelector("#copyReportMarkdownBtn").textContent.includes("已复制"));
        // 大响应体（>64K）：截断只影响展示层——复制 MD 保留完整内容，步骤详情带截断标记
        const copiedMd = await page.evaluate(() => window.__lastCopiedText);
        assert.ok(copiedMd && copiedMd.length > 65536, `复制 MD 应包含完整大响应体（实际 ${copiedMd && copiedMd.length} 字符）`);
        assert.ok(!copiedMd.includes("展示已截断"), "复制 MD 不应受展示截断影响");
        assert.match(await page.locator("#stepsList .details-panel").first().textContent(), /展示已截断/, "步骤详情的大响应体应有截断标记");
        await page.locator("#copyReportMarkdownBtn").click();
        await page.locator("#copyReportJsonBtn").click();
        await page.waitForFunction(() => document.querySelector("#copyReportJsonBtn").textContent.includes("已复制"));
        assert.equal(await page.locator("[data-copy-step]").count(), 1, "步骤应提供复制按钮");
        await page.locator("[data-copy-step='0']").click();
        await page.waitForFunction(() => document.querySelector("[data-copy-step='0']").textContent.includes("已复制"));
        await page.locator("[data-copy-step='0']").click();
        await page.waitForFunction(() => document.querySelector("[data-copy-step='0']").textContent === "复制");
        assert.match(await page.locator("#copyReportMarkdownBtn").textContent(), /复制为 Markdown/, "连续复制后报告按钮应恢复原文案");
        assert.equal(await page.locator("[data-copy-step='0']").textContent(), "复制", "连续复制后步骤按钮应恢复原文案");

        // Clipboard API 同步抛错时应执行 execCommand 回退
        await page.evaluate(() => {
            window.__copyFallbackCalls = 0;
            Object.defineProperty(document, "execCommand", {
                value: () => {
                    window.__copyFallbackCalls += 1;
                    return true;
                },
                configurable: true
            });
            Object.defineProperty(navigator, "clipboard", {
                value: { writeText: () => { throw new Error("同步剪贴板异常"); } },
                configurable: true
            });
        });
        await page.locator("#copyReportMarkdownBtn").click();
        await page.waitForFunction(() => document.querySelector("#copyReportMarkdownBtn").textContent.includes("已复制"));
        assert.equal(await page.evaluate(() => window.__copyFallbackCalls), 1, "同步异常后应调用 execCommand 回退");

        // Clipboard API 与回退均失败时，报告和步骤按钮均应显示失败反馈
        await page.evaluate(() => {
            Object.defineProperty(document, "execCommand", { value: () => false, configurable: true });
            Object.defineProperty(navigator, "clipboard", {
                value: { writeText: () => Promise.reject(new Error("剪贴板权限拒绝")) },
                configurable: true
            });
        });
        await page.locator("#copyReportMarkdownBtn").click();
        await page.waitForFunction(() => document.querySelector("#copyReportMarkdownBtn").textContent.includes("复制失败"));
        await page.locator("#copyReportJsonBtn").click();
        await page.waitForFunction(() => document.querySelector("#copyReportJsonBtn").textContent.includes("复制失败"));
        await page.locator("[data-copy-step='0']").click();
        await page.waitForFunction(() => document.querySelector("[data-copy-step='0']").textContent.includes("失败"));
        assert.deepEqual(pageErrors, [], `复制失败不应产生 pageerror: ${pageErrors.join(", ")}`);

        await page.locator("[data-adhoc-step='0']").click();
        // 弹窗打开后经 rAF 异步聚焦第一个输入框，等待初始化完成再测快捷键，避免抢焦点竞态。
        await page.waitForFunction(() => document.activeElement && document.activeElement.id === "adhocNameInput");
        const beforeAdhocShortcuts = await page.locator("#execStartTime").textContent();
        for (const key of ["Control+Enter", "Alt+Enter", "Alt+r", "Control+k"]) {
            await page.locator("#adhocHeadersInput").press(key);
            assert.equal(await page.locator("#execStartTime").textContent(), beforeAdhocShortcuts, `${key} 不应改动临时请求背后的场景`);
            assert.equal(await page.locator('#stepsList li[data-passed="true"]').count(), 1, `${key} 不应清除场景结果`);
            assert.equal(await page.evaluate(() => document.activeElement.id), "adhocHeadersInput", `${key} 不应移走临时请求焦点`);
        }
        await page.locator("#adhocExecuteBtn").click();
        await page.waitForFunction(() => !document.querySelector("#adhocResult").classList.contains("hidden"));
        assert.match(await page.locator("#adhocResult").textContent(), /状态：200/);
        await page.locator("#adhocCloseBtn").click();

        await page.locator("#resetBtn").click();
        await page.locator("#stepBtn").click();
        await page.waitForFunction(() => !document.querySelector("#stepBtn").disabled && document.querySelector('[data-step-action="rewind"]'));
        assert.equal(await page.locator('[data-step-action="rewind"]').count(), 1);
        assert.equal(await page.locator('[data-step-action="rerun"]').count(), 1);

        await page.locator('[data-scenario-file="scenarios/slow.js"]').click();
        await page.waitForFunction(() => document.querySelector("#scenarioTitle").textContent.includes("取消请求"));
        await page.locator("#runBtn").click();
        await page.waitForFunction(() => !document.querySelector("#cancelBtn").disabled);
        await page.locator("#cancelBtn").click();
        await page.waitForFunction(() => !document.querySelector("#runBtn").disabled);
        assert.equal(await page.locator('#stepsList li[data-passed="false"]').count(), 1);
        // 取消文案：结构化映射为中文提示，而非原始英文 DOMException
        assert.match(await page.locator("#stepsList").textContent(), /用户已取消执行/);
        assert.match(await page.locator("#stepsList").textContent(), /CANCELLED/);

        await page.locator('[data-scenario-file="scenarios/cleanup.js"]').click();
        await page.waitForFunction(() => document.querySelector("#scenarioTitle").textContent.includes("条件清理"));
        await page.locator("#runBtn").click();
        await page.waitForFunction(() => !document.querySelector("#runBtn").disabled);
        assert.equal(await page.locator('#stepsList li[data-passed="true"]').count(), 1);
        assert.match(await page.locator("#stepsList").textContent(), /SKIPPED/);
        assert.equal(recordsRequests.length, 0, `when 不满足时不应发出请求: ${recordsRequests.join(", ")}`);
        // SKIP 可观测性：全跳过显示"全部跳过"，跳过单独统计且不计入通过数
        assert.equal(await page.locator('#stepsList li[data-skipped="true"]').count(), 1);
        assert.equal(await page.locator("#stepsList li").count(), await page.locator("[data-copy-step]").count(), "跳过步骤也应提供复制按钮");
        await page.locator('#stepsList li[data-skipped="true"] [data-copy-step]').click();
        await page.waitForFunction(() => document.querySelector('#stepsList li[data-skipped="true"] [data-copy-step]').textContent.includes("失败"));
        assert.match(await page.locator("#statsPanel").textContent(), /跳过/);

        // 请求超时：engine 超时经适配层映射为 TIMEOUT，失败步骤保留请求详情供诊断
        await page.locator('[data-scenario-file="scenarios/timeout.js"]').click();
        await page.waitForFunction(() => document.querySelector("#scenarioTitle").textContent.includes("超时请求"));
        await page.locator("#runBtn").click();
        await page.waitForFunction(() => !document.querySelector("#runBtn").disabled);
        assert.equal(await page.locator('#stepsList li[data-passed="false"]').count(), 1);
        assert.match(await page.locator("#stepsList").textContent(), /TIMEOUT/, "超时步骤状态徽章应为 TIMEOUT");
        assert.match(await page.locator("#stepsList").textContent(), /请求超时/, "超时步骤应展示超时错误信息");
        assert.match(
            await page.locator('#stepsList li[data-passed="false"] .details-panel').textContent(),
            /X-Timeout-Check/,
            "失败步骤详情应保留步骤声明的请求头供诊断"
        );
        // 失败请求详情回填注入后的最终头：全局 header（X-Scenario-Env）应随失败步骤一并展示
        assert.match(
            await page.locator('#stepsList li[data-passed="false"] .details-panel').textContent(),
            /X-Scenario-Env/,
            "失败步骤详情应保留注入后的全局请求头供诊断"
        );

        // 单步模式超时：runNextStep 的 TIMEOUT 分支清空 stepRuntime。
        // 场景含第 3 步，若 stepRuntime 未清空，第 3 次点击会继续执行第 3 步（失败记录保留）；
        // 清空则从第 1 步重新执行（失败记录消失）——两条路径可精确区分。
        await page.locator("#resetBtn").click();
        await page.locator("#stepBtn").click();
        await page.waitForFunction(() => !document.querySelector("#stepBtn").disabled);
        assert.equal(await page.locator('#stepsList li[data-passed="true"]').count(), 1, "第 1 步应执行成功");
        await page.locator("#stepBtn").click();
        await page.waitForFunction(() => !document.querySelector("#stepBtn").disabled);
        assert.equal(await page.locator('#stepsList li[data-passed="false"]').count(), 1, "第 2 步应超时失败");
        assert.match(await page.locator("#stepsList").textContent(), /TIMEOUT/, "单步模式超时步骤状态徽章应为 TIMEOUT");
        assert.match(await page.locator("#stepsList").textContent(), /请求超时/, "单步模式超时步骤应展示超时错误信息");
        await page.locator("#stepBtn").click();
        await page.waitForFunction(() => !document.querySelector("#stepBtn").disabled);
        assert.equal(await page.locator('#stepsList li[data-passed="false"]').count(), 0, "单步超时后 stepRuntime 已清空，失败记录应消失（从第 1 步重来）");
        assert.equal(await page.locator('#stepsList li[data-passed="true"]').count(), 1, "再次执行应从第 1 步开始且成功");

        // 混合结果：全部执行完成的进度是 100%，通过率仍独立显示为 2/3。
        await page.locator('[data-scenario-file="scenarios/continue-after-failure.js"]').click();
        await page.locator("#runBtn").click();
        await page.waitForFunction(() => !document.querySelector("#runBtn").disabled && document.querySelectorAll('#stepsList li[data-passed="true"]').length === 2);
        assert.equal(await page.locator('#stepsList li[data-passed="false"]').count(), 1);
        assert.match(await page.locator("#reportPanel .report-progress__labels").first().textContent(), /执行进度 3 \/ 3.*100\.0%/);
        assert.match(await page.locator("#reportPanel .report-progress__outcome").textContent(), /通过率.*66\.7%/);
        const progressBar = page.getByRole("progressbar", { name: "步骤执行进度" });
        assert.equal(await progressBar.getAttribute("aria-valuenow"), "3");
        assert.equal(await progressBar.getAttribute("aria-valuemax"), "3");
        await page.screenshot({ path: path.join(artifacts, `${viewport.name}-failure-diagnosis.png`), fullPage: true });

        await page.locator('[data-scenario-file="scenarios/health.js"]').click();
        await page.locator("#runBtn").click();
        await page.waitForFunction(() => !document.querySelector("#runBtn").disabled);
        assert.equal(externalRequests.length, 0, `检测到外部 CDN 请求: ${externalRequests.join(", ")}`);
        const box = await page.locator("#scenario-test-root").boundingBox();
        assert.ok(box && box.width > 0 && box.height > 0, `${viewport.name} 布局尺寸异常`);
        await page.screenshot({ path: path.join(artifacts, `${viewport.name}.png`), fullPage: true });
        await page.close();
    }

    // ?scenario= 白名单：URL 参数指向未列入配置清单的文件时必须拒绝加载，
    // 不得把工作区内任意 JS 当场景脚本执行（registerScenario 校验在脚本执行之后，挡不住注入）
    const evilPath = path.join(root, "examples/basic/evil-unlisted-test.js");
    fs.writeFileSync(evilPath, "window.__PWNED__ = true;\n", "utf8");
    try {
        const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
        await page.goto(`http://127.0.0.1:${port}/?scenario=evil-unlisted-test.js`, { waitUntil: "networkidle" });
        await page.waitForFunction(() => document.querySelector("#statsPanel").textContent.includes("不在配置清单"));
        assert.equal(await page.evaluate(() => window.__PWNED__), undefined, "未列入清单的脚本不得被执行");
        // 清单内场景经 URL 参数加载不受影响
        await page.goto(`http://127.0.0.1:${port}/?scenario=scenarios/health.js`, { waitUntil: "networkidle" });
        await page.waitForFunction(() => document.querySelector("#scenarioTitle").textContent.length > 0);
        await page.close();
    } finally {
        fs.rmSync(evilPath, { force: true });
    }
} finally {
    await browser?.close();
    server.kill();
}
