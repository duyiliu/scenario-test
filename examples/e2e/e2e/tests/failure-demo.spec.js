import { test, expect } from '@playwright/test';
import { login } from '../auth-adapter.js';
test('失败演示：检查截图、断言详情与报告', async ({ page, context }, info) => {
  await test.step('使用演示医生账号登录', () => login({ context, account: { username: 'doctor', password: 'demo-only' } }));
  await page.goto('./');
  await info.attach('失败前页面', { body: await page.screenshot(), contentType: 'image/png' });
  await test.step('故意使用错误人数，演示失败证据', async () => {
    await expect(page.locator('tbody tr')).toHaveCount(99, { timeout: 1500 });
  });
});
