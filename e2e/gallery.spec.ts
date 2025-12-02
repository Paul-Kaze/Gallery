import { test, expect } from '@playwright/test';

test.describe('AI Gallery E2E', () => {
  test('瀑布流列表加载与详情弹窗', async ({ page }) => {
    await page.goto('http://localhost:5173/');
    await expect(page.locator('nav')).toBeVisible();

    // 等待瀑布流网格渲染
    const cards = page.locator('.group.relative');
    await expect(cards.first()).toBeVisible();

    // 打开详情弹窗
    await cards.first().click();
    const modal = page.locator('text=下载文件');
    await expect(modal).toBeVisible();
  });

  test('登录按钮存在', async ({ page }) => {
    await page.goto('http://localhost:5173/');
    await expect(page.getByRole('button', { name: /log in/i })).toBeVisible();
  });
});
