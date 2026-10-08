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

test('card logging updates only that subject and honors remaining classes', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await page.getByRole('button', { name: 'Try an example' }).click();
  await page.getByRole('button', { name: 'Save this subject' }).click();
  await page.getByLabel('Subject name', { exact: true }).fill('Physics');
  await page.getByRole('button', { name: 'Save subject', exact: true }).click();
  await page.getByText('Plan to the end of term', { exact: false }).click();
  await page.getByLabel('Classes remaining', { exact: true }).fill('1');
  await page.getByLabel('Choose subject').selectOption('');
  await page.getByLabel('Classes held', { exact: true }).fill('20');
  await page.getByLabel('You attended', { exact: true }).fill('10');
  await page.getByRole('button', { name: 'Mark Physics present', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Open Physics', exact: true })).toContainText('91 attended / 111 held');
  await expect(page.getByRole('button', { name: 'Mark Physics absent', exact: true })).toBeDisabled();
  await expect(page.getByLabel('Classes held', { exact: true })).toHaveValue('20');
  await expect(page.getByTestId('save-status')).toHaveText('Saved on this device.');
  await page.reload();
  await expect(page.getByLabel('Classes held', { exact: true })).toHaveValue('20');
  await page.getByRole('button', { name: 'Physics: Undo last class', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Open Physics', exact: true })).toContainText('90 attended / 110 held');
  await expect(page.getByRole('button', { name: 'Mark Physics absent', exact: true })).toBeEnabled();
  await expect(page.getByLabel('Classes held', { exact: true })).toHaveValue('20');
});

test('steppers keep counts valid; edits reset only the current Undo run', async ({ page }) => {
  await page.goto('/?held=10&attended=10&req=75');
  await expect(page.getByRole('button', { name: 'Increase you attended', exact: true })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Decrease classes held', exact: true })).toBeDisabled();
  await page.getByRole('button', { name: /^Present/ }).click();
  await page.getByRole('button', { name: 'Increase classes held', exact: true }).click();
  await expect(page.getByLabel('Classes held', { exact: true })).toHaveValue('12');
  await expect(page.getByLabel('You attended', { exact: true })).toHaveValue('11');
  await expect(page.getByRole('button', { name: /^Undo/ })).toBeDisabled();
  await page.getByRole('button', { name: 'Own %', exact: true }).click();
  await expect(page.getByLabel('Required attendance', { exact: true })).toBeFocused();
  await page.getByLabel('Required attendance', { exact: true }).fill('90');
  await expect(page.locator('.decision-number')).toHaveText('0');
});
