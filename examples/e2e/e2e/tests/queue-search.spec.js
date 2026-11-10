import { test, expect } from '@playwright/test';
import { login } from '../auth-adapter.js';
const account = { username: 'doctor', password: 'demo-only' }; // 仅本地虚构演示账号。
test('医生查询候诊队列并按姓名筛选', async ({ page, context }, info) => {
  await test.step('使用演示医生账号登录', () => login({ context, account }));
  await test.step('检查候诊列表与当前账号', async () => {
    await page.goto('./');
    await expect(page.getByTestId('account')).toHaveText('演示医生');
    await expect(page.locator('tbody tr:visible')).toHaveCount(3);
    await info.attach('医生 · 完整候诊队列', { body: await page.screenshot(), contentType: 'image/png' });
  });
  await test.step('筛选患者并验证唯一结果', async () => {
    await page.getByRole('textbox', { name: '搜索患者' }).fill('林');
    await expect(page.locator('tbody tr:visible')).toHaveCount(1);
    await expect(page.locator('tbody tr:visible')).toContainText('DEMO-001');
    await info.attach('医生 · 姓名筛选结果', { body: await page.screenshot(), contentType: 'image/png' });
  });
});
