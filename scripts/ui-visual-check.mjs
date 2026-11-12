// UI 视觉验证脚本：启动 serve 后截图对比关键界面状态
import { spawn } from "node:child_process";
import { chromium } from "playwright";
import path from "node:path";
import fs from "node:fs";

const root = path.resolve(import.meta.dirname, "..");
const port = 4398;
const shots = path.join(root, "test-results", "ui-screens");
fs.mkdirSync(shots, { recursive: true });

const server = spawn(process.execPath, [
    path.join(root, "dist/scenario-test-cli.cjs"),
    "serve",
    "--config",
    path.join(root, "examples/basic/scenario.config.js"),
    "--port",
    String(port)
], { cwd: root, stdio: ["ignore", "pipe", "pipe"] });

try {
    await new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error("服务启动超时")), 10000);
        server.stdout.on("data", (chunk) => {
            if (String(chunk).includes("场景测试工作台")) { clearTimeout(timer); resolve(); }
        });
        server.on("exit", (code) => reject(new Error(`服务提前退出: ${code}`)));
    });

    const browser = await chromium.launch({ channel: "chrome", headless: true });
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

    // 拦截后端请求，返回可预测的响应
    await page.route(`http://127.0.0.1:${port}/health?*`, (route) => route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ status: "UP", token: "mock-token" })
    }));

    await page.goto(`http://127.0.0.1:${port}/`, { waitUntil: "networkidle" });
    await page.waitForFunction(() => document.querySelectorAll("[data-scenario-file]").length === 5);

    // 1. 初始状态（默认主题）
    await page.screenshot({ path: path.join(shots, "01-initial-default.png") });

    // 2. 执行场景后（含失败步骤，看失败态视觉）
    await page.locator("#runBtn").click();
    await page.waitForFunction(() => !document.querySelector("#runBtn").disabled);
    await page.waitForTimeout(600);
    await page.screenshot({ path: path.join(shots, "02-after-run.png") });

    // 3. 失败筛选激活态
    const failBtn = page.locator('#filterBar [data-f="fail"]');
    if (await failBtn.count()) {
        await failBtn.click();
        await page.waitForTimeout(400);
        await page.screenshot({ path: path.join(shots, "03-filter-fail.png") });
    }

    // 4. 搜索无匹配空态（新虚线边框 + 渐变背景）
    await page.locator("#stepSearchInput").fill("不存在的步骤xyz");
    await page.waitForTimeout(400);
    await page.screenshot({ path: path.join(shots, "04-search-empty.png") });

    // 5. 配置模态框（新入场动画 + 毛玻璃）
    await page.locator("#stepSearchInput").fill("");
    await page.locator("#configToggleBtn").click();
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(shots, "05-config-modal.png") });
    await page.locator("#configCloseBtn").click();

    // 6. linear 深色主题
    await page.locator("#themeSelect").selectOption("linear");
    await page.waitForTimeout(400);
    await page.screenshot({ path: path.join(shots, "06-theme-linear.png") });

    await browser.close();
    console.log("截图完成:", shots);
} finally {
    server.kill();
}
