import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('visible subject cards keep independent records, targets and Undo; Add does not erase a quick draft', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await page.getByRole('button', { name: 'Try an example' }).click();
  await page.getByRole('button', { name: 'Save this subject' }).click();
  await page.getByLabel('Subject name', { exact: true }).fill('Physics');
  await page.getByRole('button', { name: 'Save subject', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Open Physics', exact: true })).toContainText('81.81');
  await page.getByRole('button', { name: 'Open Physics', exact: true }).click();
  await expect(page.getByLabel('Choose subject')).toBeFocused();
  await page.getByRole('button', { name: /^Present/ }).click();
  await expect(page.locator('.class-change')).toContainText('81.81%');
  await expect(page.locator('.class-change')).toContainText('81.98%');
  await expect(page.getByTestId('save-status')).toHaveText('Saved on this device.');
  await page.reload();
  await expect(page.getByRole('button', { name: 'Open Physics', exact: true })).toContainText('91 attended / 111 held');
  await page.getByRole('button', { name: /^Undo/ }).click();
  await expect(page.getByRole('button', { name: 'Open Physics', exact: true })).toContainText('90 attended / 110 held');
  await page.getByLabel('Choose subject').selectOption('');
  await page.getByLabel('Classes held', { exact: true }).fill('40');
  await page.getByLabel('You attended', { exact: true }).fill('30');
  await expect(page.getByTestId('save-status')).toHaveText('Saved on this device.');
  await page.getByRole('button', { name: 'Add subject', exact: true }).click();
  await expect(page.getByLabel('Classes held', { exact: true })).toBeFocused();
  await page.getByLabel('Classes held', { exact: true }).fill('100');
  await page.getByLabel('You attended', { exact: true }).fill('60');
  await page.getByRole('button', { name: 'Save this subject' }).click();
  await page.getByLabel('Subject name', { exact: true }).fill('Maths');
  await page.getByRole('button', { name: 'Save subject', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Open Maths', exact: true })).toContainText('Attend the next 60');
  await page.getByLabel('Choose subject').selectOption('');
  await expect(page.getByLabel('Classes held', { exact: true })).toHaveValue('40');
  await expect(page.getByLabel('You attended', { exact: true })).toHaveValue('30');
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
  expect((await new AxeBuilder({ page }).include('.subject-dashboard').analyze()).violations).toEqual([]);
});
