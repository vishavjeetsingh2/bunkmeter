import { expect, test } from '@playwright/test';

test('ads require consent, stay isolated, and can be withdrawn', async ({ page }) => {
  let adRequests = 0;
  await page.route('https://bauval.org/**', route => {
    adRequests++;
    return route.fulfill({ contentType: 'application/javascript', body: 'document.getElementById("container-3f9dcbe5d919a4723c95d1c35c4557ad").textContent="Test advertisement";' });
  });
  await page.goto('/?held=100&attended=72&req=75');
  await expect(page.locator('.decision-number')).toHaveText('12');
  await expect(page.locator('[data-ad-allow]')).toBeVisible();
  expect(adRequests).toBe(0);
  await expect(page.locator('script[src*="googlesyndication"]')).toHaveCount(0);
  await page.getByRole('button', { name: 'Allow ads', exact: true }).click();
  const frame = page.locator('[data-ad-content] iframe');
  await frame.scrollIntoViewIfNeeded();
  await expect(page.frameLocator('[data-ad-content] iframe').locator('body')).toContainText('Test advertisement');
  expect(adRequests).toBe(1);
  await expect(frame).toHaveAttribute('src', '/advertisement.html');
  await expect(frame).toHaveAttribute('referrerpolicy', 'no-referrer');
  const sandbox = await frame.getAttribute('sandbox');
  expect(sandbox).not.toContain('allow-same-origin');
  expect(sandbox).not.toContain('allow-top-navigation');
  const adFrame = page.frames().find(f => f.url().endsWith('/advertisement.html'))!;
  expect(await adFrame.evaluate(() => { try { return Boolean(parent.document); } catch { return false; } })).toBe(false);
  await page.getByRole('button', { name: 'Ad settings' }).click();
  await expect(frame).toHaveCount(0);
  await page.getByRole('button', { name: 'No thanks' }).click();
  await page.reload();
  await expect(page.locator('[data-ad-status]')).toHaveText('Ads are off.');
  expect(adRequests).toBe(1);
  await expect(page.locator('.decision-number')).toHaveText('12');
});

test('blocked preference storage keeps ads opt-in and phone controls fit', async ({ page }) => {
  await page.addInitScript(() => Object.defineProperty(window, 'localStorage', { get() { throw Error('Blocked'); } }));
  await page.setViewportSize({ width: 320, height: 800 });
  await page.goto('/vtu');
  await page.getByRole('button', { name: 'No thanks' }).click();
  await expect(page.locator('[data-ad-content] iframe')).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
