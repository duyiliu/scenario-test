import { test, expect } from '@playwright/test';
import { login } from '../auth-adapter.js';
test('按状态筛选候诊队列', async ({ page, context }, info) => {
  await test.step('使用演示医生账号登录', async () => {
    await login({ context, account: { username: 'doctor', password: 'demo-only' } });
    await page.goto('./');
    await expect(page.getByTestId('account')).toHaveText('演示医生');
    await info.attach('使用演示医生账号登录', { body: await page.screenshot(), contentType: 'image/png' });
  });
  await test.step('选择候诊中状态', async () => {
    await page.getByRole('combobox', { name: '按状态筛选' }).selectOption('候诊中');
    await expect(page.locator('tbody tr:visible')).toHaveCount(6);
    await expect(page.locator('#count')).toHaveText('6 人');
    await expect(page.locator('tbody tr:visible td:nth-child(5)')).toHaveText(Array(6).fill('候诊中'));
    await info.attach('选择候诊中状态', { body: await page.screenshot(), contentType: 'image/png' });
  });
});
