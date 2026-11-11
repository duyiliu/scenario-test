import { test, expect } from '@playwright/test';
import { login } from '../auth-adapter.js';
test('候诊工作台结构：标题、账号、计数与表头', async ({ page, context }, info) => {
  await test.step('使用演示医生账号登录', async () => {
    await login({ context, account: { username: 'doctor', password: 'demo-only' } });
    await page.goto('./');
    await expect(page.getByTestId('account')).toHaveText('演示医生');
    await info.attach('使用演示医生账号登录', { body: await page.screenshot(), contentType: 'image/png' });
  });
  await test.step('检查页面结构', async () => {
    await expect(page.getByRole('heading', { name: '候诊工作台' })).toBeVisible();
    await expect(page.getByTestId('account')).toHaveText('演示医生');
    await expect(page.locator('#count')).toHaveText('12 人');
    await expect(page.locator('thead th')).toHaveCount(5);
    await expect(page.locator('thead')).toContainText('科室');
    await info.attach('检查页面结构', { body: await page.screenshot(), contentType: 'image/png' });
  });
});
