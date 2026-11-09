import { test, expect } from '@playwright/test';

test('创建任务后可在任务列表中看到新任务', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: '任务管理（E2E 演示）' })).toBeVisible();

  await page.getByRole('textbox', { name: '任务名称' }).fill('检查订单列表');
  await page.getByRole('button', { name: '创建任务' }).click();

  await expect(page.getByRole('list', { name: '任务列表' }).getByRole('listitem')).toHaveText([
    '检查订单列表',
  ]);
  await expect(page.getByRole('textbox', { name: '任务名称' })).toBeEmpty();
});
