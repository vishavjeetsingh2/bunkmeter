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
