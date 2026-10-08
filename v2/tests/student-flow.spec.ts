import { expect, test } from '@playwright/test';

test('preview exit restores current view and term budget stays tied to actual counts', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/?held=100&attended=75&req=75');
  await page.getByText('Plan to the end of term', { exact: false }).click();
  await page.getByLabel('Classes remaining', { exact: true }).fill('100');
  await expect(page.locator('.term-budget dd')).toHaveText(['75', '25']);
  await page.getByRole('button', { name: 'If you miss next' }).click();
  await expect(page.locator('#calculator')).toHaveAttribute('data-preview', 'absent');
  await page.getByRole('button', { name: 'Back to current attendance' }).click();
  await expect(page.locator('#calculator')).toHaveAttribute('data-preview', 'current');
  await expect(page.getByLabel('Classes held', { exact: true })).toHaveValue('100');
  await expect(page.getByLabel('You attended', { exact: true })).toHaveValue('75');
  await expect(page.locator('.term-budget dd')).toHaveText(['75', '25']);
});
