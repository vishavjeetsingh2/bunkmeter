import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await expect(page.locator('astro-island[ssr]')).toHaveCount(0);
  await page.getByRole('button', { name: 'Try an example' }).click();
});

test('Present, Absent and repeated Undo restore the exact session counts', async ({ page }) => {
  await page.getByRole('button', { name: /^Present/ }).click();
  await expect(page.getByLabel('You attended', { exact: true })).toHaveValue('91');
  await expect(page.getByLabel('Classes held', { exact: true })).toHaveValue('111');
  await page.getByRole('button', { name: /^Absent/ }).click();
  await expect(page.getByLabel('You attended', { exact: true })).toHaveValue('91');
  await expect(page.getByLabel('Classes held', { exact: true })).toHaveValue('112');
  await expect(page.locator('.decision-number')).toHaveText('9');
  await expect(page.locator('.ribbon-label')).toContainText('2 shown');
  await page.getByRole('button', { name: /^Undo/ }).click();
  await expect(page.getByLabel('Classes held', { exact: true })).toHaveValue('111');
  await page.getByRole('button', { name: /^Undo/ }).click();
  await expect(page.getByLabel('Classes held', { exact: true })).toHaveValue('110');
  await expect(page.getByLabel('You attended', { exact: true })).toHaveValue('90');
  await expect(page.getByRole('button', { name: /^Undo/ })).toBeDisabled();
  await expect(page.locator('.decision-number')).toHaveText('10');
});

test('actions honor remaining classes, count bounds and a manually revised baseline', async ({ page }) => {
  await page.getByText('Plan to the end of term', { exact: false }).click();
  await page.getByLabel('Classes remaining', { exact: true }).fill('1');
  await page.getByRole('button', { name: /^Present/ }).click();
  await expect(page.getByLabel('Classes remaining', { exact: true })).toHaveValue('0');
  await expect(page.getByRole('button', { name: /^Present/ })).toBeDisabled();
  await expect(page.getByRole('button', { name: /^Absent/ })).toBeDisabled();
  await page.getByRole('button', { name: /^Undo/ }).click();
  await expect(page.getByLabel('Classes remaining', { exact: true })).toHaveValue('1');
  await page.getByRole('button', { name: /^Present/ }).click();
  await page.getByLabel('You attended', { exact: true }).fill('80');
  await expect(page.getByRole('button', { name: /^Undo/ })).toBeDisabled();
  await page.getByLabel('Classes held', { exact: true }).fill('1000000000');
  await page.getByLabel('Classes remaining', { exact: true }).fill('');
  await expect(page.getByRole('button', { name: /^Present/ })).toBeDisabled();
  await page.getByLabel('Classes held', { exact: true }).fill('1.5');
  await expect(page.getByRole('button', { name: /^Absent/ })).toBeDisabled();
});

test('future run moves the visualization without mutating actual counts or the current answer', async ({ page }) => {
  const slider = page.getByRole('slider', { name: 'Explore a run of classes' });
  await slider.focus(); await slider.press('End');
  await expect(slider).toHaveValue('12');
  await expect(page.locator('.future-outcome')).toContainText('83.60%');
  await expect(page.locator('.instrument-still')).toContainText('12 CLASS PREVIEW');
  await page.getByRole('button', { name: 'If you miss next' }).click();
  await expect(page.locator('.future-outcome')).toContainText('73.77%');
  await expect(page.locator('.instrument-display')).toHaveAttribute('data-state', 'caution');
  await expect(page.getByLabel('Classes held', { exact: true })).toHaveValue('110');
  await expect(page.locator('.decision-number')).toHaveText('10');
  await page.getByRole('button', { name: /^Current/ }).click();
  await expect(slider).toHaveValue('1');
  await expect(page.locator('.instrument-still')).toContainText('81.81%');
  await page.getByText('Plan to the end of term', { exact: false }).click();
  await page.getByLabel('Classes remaining', { exact: true }).fill('3');
  await expect(slider).toHaveAttribute('max', '3');
});

test('new controls and session events remain accessible without motion', async ({ page }) => {
  await page.getByRole('button', { name: /^Present/ }).click();
  await page.getByRole('button', { name: 'If you miss next' }).click();
  const report = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze();
  expect(report.violations).toEqual([]);
  expect(await page.evaluate(() => document.getAnimations().filter(animation => animation.playState === 'running').length)).toBe(0);
  await expect(page.locator('.instrument-webgl canvas')).toHaveCount(0);
});
