import { expect, test } from '@playwright/test';

test('Adsterra stays disabled on calculator and university pages', async ({ page }) => {
  const adRequests: string[] = [];
  page.on('request', request => { if (/bauval\.org|advertisement\.html/.test(request.url())) adRequests.push(request.url()); });
  for (const path of ['/', '/vtu', '/aktu', '/du']) {
    await page.goto(path + '?held=100&attended=72&req=75');
    await expect(page.locator('[data-ad-slot], iframe[src*="advertisement"]')).toHaveCount(0);
    await expect(page.locator('.decision-number')).toHaveText('12');
  }
  expect(adRequests).toEqual([]);
});
