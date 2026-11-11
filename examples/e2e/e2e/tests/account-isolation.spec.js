import { test, expect } from '@playwright/test';
import { login } from '../auth-adapter.js';
const account = { username: 'nurse', password: 'demo-only' }; // 仅本地虚构演示账号。
test('护士场景使用独立账号与登录状态', async ({ page, context }, info) => {
  await test.step('使用演示护士账号登录', async () => {
    await login({ context, account });
    await page.goto('./');
    await expect(page.getByTestId('account')).toHaveText('演示护士');
    await info.attach('使用演示护士账号登录', { body: await page.screenshot(), contentType: 'image/png' });
  });
  await test.step('验证页面角色并保留证据', async () => {
    await page.getByRole('textbox', { name: '搜索患者' }).fill('周');
    await expect(page.locator('tbody tr:visible')).toContainText('DEMO-002');
    await info.attach('验证页面角色并保留证据', { body: await page.screenshot(), contentType: 'image/png' });
  });
});
