import { expect, test } from '@playwright/test';

test('save shortcut opens and focuses naming; returning to calculator keeps the record', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.getByRole('button', { name: 'Try an example' }).click();
  await page.getByRole('link', { name: 'Save subject', exact: true }).click();
  await expect(page.getByLabel('Subject name', { exact: true })).toBeFocused();
  await page.getByLabel('Subject name', { exact: true }).fill('Physics');
  await page.getByLabel('Subject name', { exact: true }).press('Enter');
  await expect(page.locator('.inline-save-status')).toContainText('Saved on this device');
  await page.getByRole('link', { name: 'Back to calculator', exact: true }).click();
  await expect(page.getByLabel('Choose subject')).toBeFocused();
  await page.getByRole('button', { name: /^Absent/ }).click();
  await expect(page.locator('.session-feedback')).toContainText('+1 held');
  await expect(page.getByLabel('Classes held', { exact: true })).toHaveValue('111');
  await expect(page.getByLabel('You attended', { exact: true })).toHaveValue('90');
  await expect(page.getByTestId('save-status')).toHaveText('Saved on this device.');
  await page.reload();
  await expect(page.getByLabel('Choose subject').locator('option:checked')).toHaveText('Physics');
  await expect(page.getByLabel('Classes held', { exact: true })).toHaveValue('111');
});

