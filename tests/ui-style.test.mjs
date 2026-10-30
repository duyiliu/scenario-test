// 工作台 UI 样式回归测试：断言关键视觉改进的计算样式确实应用（悬停反馈、空态、
// 毛玻璃、滚动条、prefers-reduced-motion）。需要 dist 已构建，运行：npm run test:ui-style
import { spawn } from "node:child_process";
import { chromium } from "playwright";
import path from "node:path";
import net from "node:net";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

async function freePort() {
    return new Promise((resolve, reject) => {
        const probe = net.createServer();
        probe.once("error", reject);
        probe.listen(0, "127.0.0.1", () => {
            const { port: available } = probe.address();
            probe.close(() => resolve(available));
        });
    });
}

const port = Number(process.env.SCENARIO_TEST_UI_STYLE_PORT) || await freePort();

const server = spawn(process.execPath, [
    path.join(root, "dist/scenario-test-cli.cjs"),
    "serve",
    "--config",
    path.join(root, "examples/basic/scenario.config.js"),
    "--port",
    String(port)
], { cwd: root, stdio: ["ignore", "pipe", "pipe"] });

let browser;
try {
    await new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error("服务启动超时")), 10000);
        server.stdout.on("data", (chunk) => {
            if (String(chunk).includes("场景测试工作台")) { clearTimeout(timer); resolve(); }
        });
        server.on("exit", (code) => reject(new Error(`服务提前退出: ${code}`)));
    });

    const browserChannel = process.env.SCENARIO_TEST_BROWSER_CHANNEL || "";
    browser = await chromium.launch({ ...(browserChannel ? { channel: browserChannel } : {}), headless: true });
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await page.goto(`http://127.0.0.1:${port}/`, { waitUntil: "networkidle" });
    await page.waitForFunction(() => document.querySelectorAll("[data-scenario-file]").length === 6);

    // 暗转亮后应立即完成配色，不能让白底上的控件继续插值为灰色。
    await page.locator("#themeSelect").selectOption("zcode");
    await page.waitForTimeout(250);
    await page.locator("#themeSelect").selectOption("zcode-light");
    const lightInput = await page.locator("#scenarioSearchInput").evaluate((el) => ({
        background: getComputedStyle(el).backgroundColor,
        scheme: getComputedStyle(el).colorScheme
    }));
    assert.equal(lightInput.background, "rgb(255, 255, 255)", "皓白输入框不应残留暗色过渡");
    assert.equal(lightInput.scheme, "light", "皓白原生控件应使用浅色配色");
    await page.screenshot({ path: path.join(root, "test-results/light-theme-fixed.png") });
    await page.locator("#themeSelect").selectOption("default");

    // 1. 主按钮：悬停抬升过渡已声明
    const runBtnTransition = await page.locator("#runBtn").evaluate((el) => getComputedStyle(el).transition);
    assert.match(runBtnTransition, /transform/, "主按钮应声明 transform 过渡（悬停抬升）");

    // 2. 搜索空态：虚线边框 + 柔和背景
    await page.locator("#scenarioSearchInput").fill("不存在的场景xyz");
    await page.waitForTimeout(300);
    const emptyBorder = await page.locator(".scenario-search-empty").first().evaluate((el) => getComputedStyle(el).borderStyle);
    assert.equal(emptyBorder, "dashed", "搜索空态应为虚线边框");

    // 3. 模态框：毛玻璃模糊从 4px 提升到 6px
    await page.locator("#scenarioSearchInput").fill("");
    await page.locator("#configToggleBtn").click();
    await page.waitForTimeout(400);
    const modalBlur = await page.locator("#configModal").evaluate((el) => getComputedStyle(el).backdropFilter);
    assert.match(modalBlur, /blur\(6px\)/, "配置模态框应为 6px 毛玻璃背景");
    await page.locator("#configCloseBtn").click();

    // 4. 滚动条：透明轨道 + 圆角拇指（视觉平滑）
    const scrollWidth = await page.evaluate(() => {
        // 样式表层面验证：检索注入的 CSS 规则
        for (const sheet of document.styleSheets) {
            try {
                for (const rule of sheet.cssRules) {
                    if (rule.selectorText === "::-webkit-scrollbar" && rule.style.width === "8px") return "8px";
                }
            } catch { /* 跨域样式表忽略 */ }
        }
        return null;
    });
    assert.equal(scrollWidth, "8px", "滚动条应为 8px（原 6px，更易抓取）");

    // 5. 步骤搜索空态（中栏）
    await page.locator("#stepSearchInput").fill("不存在的步骤xyz");
    await page.waitForTimeout(300);
    const stepEmpty = page.locator("#stepsFilterEmpty");
    assert.equal(await stepEmpty.isVisible(), true, "无匹配步骤时应显示空态");
    const borderStyle = await stepEmpty.evaluate((el) => getComputedStyle(el).borderStyle);
    assert.equal(borderStyle, "dashed", "步骤筛选空态应为虚线边框");

    await page.emulateMedia({ reducedMotion: "reduce" });
    const animation = await page.locator(".scenario-step-loading__spinner").evaluate((el) => getComputedStyle(el).animationName);
    assert.equal(animation, "none", "减少动态效果模式不应播放加载动画");
    await page.locator("#runBtn").hover();
    const transform = await page.locator("#runBtn").evaluate((el) => getComputedStyle(el).transform);
    assert.equal(transform, "none", "减少动态效果模式不应抬升按钮");

    console.log("✓ UI 样式与减少动态效果验证通过");
} finally {
    if (browser) await browser.close();
    server.kill();
}
