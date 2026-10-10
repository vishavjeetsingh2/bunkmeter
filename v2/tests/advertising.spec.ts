import { expect, test } from '@playwright/test';

test('automatic ad stays isolated and mobile calculator works', async ({ page }) => {
  let requests = 0;
  await page.route('https://bauval.org/**', route => {
    requests++;
    return route.fulfill({ contentType: 'application/javascript', body: 'document.body.textContent="Test advertisement";' });
  });
  await page.setViewportSize({ width: 320, height: 800 });
  await page.goto('/?held=100&attended=72&req=75');
  await expect(page.locator('.decision-number')).toHaveText('12');
  await expect(page.getByRole('button', { name: 'Allow ads' })).toHaveCount(0);
  const frame = page.locator('[data-ad-slot] iframe');
  await expect(frame).toHaveCount(1);
  await frame.scrollIntoViewIfNeeded();
  await expect(page.frameLocator('[data-ad-slot] iframe').locator('body')).toHaveText('Test advertisement');
  expect(requests).toBe(1);
  const sandbox = await frame.getAttribute('sandbox');
  expect(sandbox).not.toContain('allow-same-origin');
  expect(sandbox).not.toContain('allow-top-navigation');
  const adFrame = page.frames().find(f => f.url().endsWith('/advertisement.html'))!;
  expect(await adFrame.evaluate(() => { try { return Boolean(parent.document); } catch { return false; } })).toBe(false);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await expect(page.getByLabel('Classes held', { exact: true })).toHaveValue('100');
});
