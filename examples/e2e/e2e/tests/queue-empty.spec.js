import { test, expect } from '@playwright/test';
import { login } from '../auth-adapter.js';
test('搜索无匹配患者时展示空状态', async ({ page, context }, info) => {
  await test.step('使用演示医生账号登录', async () => {
    await login({ context, account: { username: 'doctor', password: 'demo-only' } });
    await page.goto('./');
    await expect(page.getByTestId('account')).toHaveText('演示医生');
    await info.attach('使用演示医生账号登录', { body: await page.screenshot(), contentType: 'image/png' });
  });
  await test.step('输入不存在的姓名', async () => {
    await page.getByRole('textbox', { name: '搜索患者' }).fill('不存在的患者');
    await expect(page.locator('tbody tr:visible')).toHaveCount(0);
    await expect(page.locator('#count')).toHaveText('0 人');
    await expect(page.locator('#empty')).toBeVisible();
    await info.attach('输入不存在的姓名', { body: await page.screenshot(), contentType: 'image/png' });
  });
});
