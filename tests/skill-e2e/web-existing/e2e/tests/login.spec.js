import { test, expect } from '@playwright/test';

test('登录成功显示订单列表', async ({ page }) => {
  await page.goto('/');
  await page.getByLabel('账号').fill('demo');
  await page.getByLabel('密码').fill('demo123');
  await page.getByRole('button', { name: '登录' }).click();
  await expect(page.locator('#identity')).toHaveText('账号 demo');
  await expect(page.locator('#order-table tbody tr')).toHaveCount(2);
});

test('错误凭据显示错误提示', async ({ page }) => {
  await page.goto('/');
  await page.getByLabel('账号').fill('demo');
  await page.getByLabel('密码').fill('wrong');
  await page.getByRole('button', { name: '登录' }).click();
  await expect(page.locator('#error')).toHaveText('账号或密码错误');
});
