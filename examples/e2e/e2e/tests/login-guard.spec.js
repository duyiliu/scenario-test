import { test, expect } from '@playwright/test';
test('未登录访问展示访客身份且受保护接口返回 401', async ({ page, context }, info) => {
  await test.step('不登录直接访问页面', async () => {
    await page.goto('./');
    await expect(page.getByTestId('account')).toHaveText('访客');
    await expect(page.locator('tbody tr:visible')).toHaveCount(12);
    await info.attach('不登录直接访问页面', { body: await page.screenshot(), contentType: 'image/png' });
  });
  await test.step('受保护接口返回 401', async () => {
    const response = await context.request.get('/demo-api/me');
    expect(response.status()).toBe(401);
    await info.attach('受保护接口返回 401', { body: await page.screenshot(), contentType: 'image/png' });
  });
});
