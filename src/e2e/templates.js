export function createE2eProjectFiles(directory) {
    const prefix = `${directory}/e2e`;
    return {
        [`${prefix}/package.json`]: JSON.stringify({ private: true, type: 'module', scenarioTestE2e: true, scripts: { test: 'playwright test' }, devDependencies: { '@playwright/test': '1.55.1' } }, null, 2) + '\n',
        [`${prefix}/playwright.config.js`]: `import { defineConfig } from '@playwright/test';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.dirname(fileURLToPath(import.meta.url));
process.env.E2E_RUN_ID ||= randomUUID();
export default defineConfig({
  testDir: './tests', timeout: 60000, workers: 1,
  reporter: [['list'], ['html', { open: 'never', outputFolder: path.resolve(root, '../e2e-results', process.env.E2E_RUN_ID, 'report') }], ['../.scenario-test/e2e-reporter.cjs']],
  use: { baseURL: process.env.E2E_BASE_URL || 'http://127.0.0.1:3000', ...(process.env.E2E_BROWSER_CHANNEL ? { channel: process.env.E2E_BROWSER_CHANNEL } : {}), screenshot: 'only-on-failure', trace: 'retain-on-failure' }
});
`,
        [`${prefix}/auth-adapter.js`]: `// 按项目真实认证方式实现；凭据只从环境变量读取。无认证项目可保留空实现。
// 调用方必须在各自的 test.step 中调用；context 为独立的 Playwright BrowserContext。
export async function login({ context, account }) {
  void context;
  if (account) throw new Error('请先在 auth-adapter.js 实现项目认证');
}
`,
        [`${prefix}/tests/example.spec.js`]: `import { test, expect } from '@playwright/test';
import { login } from '../auth-adapter.js';
const scenario = { account: process.env.E2E_EXAMPLE_ACCOUNT || '' };
test('示例：页面可访问', async ({ page, context }, info) => {
  await test.step('使用场景账号登录', async () => login({ context, account: scenario.account }));
  await test.step('打开首页并检查标题', async () => {
    await page.goto('/');
    await expect(page).toHaveTitle(/.+/);
    await info.attach('首页', { body: await page.screenshot(), contentType: 'image/png' });
  });
});
`,
        [`${prefix}/.gitignore`]: `node_modules/\ntest-results/\nplaywright-report/\n.env\n`,
        [`${prefix}/README.md`]: `# 浏览器 E2E\n\n在本目录执行 npm install 和 npx playwright install chromium。按项目实际情况实现 auth-adapter.js；每个场景用独立 context 和 test.step 显式调用。设置 E2E_BASE_URL 和可选 E2E_BROWSER_CHANNEL，再运行 npm test。默认示例只检查首页，必须按业务证据替换。运行结果写入 ../e2e-results，不应提交。\n`
    };
}
