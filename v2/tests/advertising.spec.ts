import { expect, test } from '@playwright/test';

test('advertising is paused on calculator and university pages', async ({ page }) => {
  const adRequests: string[] = [];
  page.on('request', request => { if (/bauval\.org|advertisement\.html/.test(request.url())) adRequests.push(request.url()); });
  for (const path of ['/', '/vtu', '/aktu', '/du']) {
    await page.goto(path);
    await expect(page.locator('[data-ad-slot], iframe[src*="advertisement"]')).toHaveCount(0);
    await page.getByLabel('Classes held', { exact: true }).fill('100');
    await page.getByLabel('You attended', { exact: true }).fill('72');
    await expect(page.locator('[data-testid="result"]')).toBeVisible();
  }
  expect(adRequests).toEqual([]);
});
