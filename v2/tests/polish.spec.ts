import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('subject context, cumulative milestones and class markers remain consistent', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/?held=48&attended=27&req=75');
  await expect(page.locator('.decision-number')).toHaveText('36');
  await expect(page.locator('.subject-context')).toContainText('56.25%');
  await expect(page.locator('.subject-context')).toContainText('Recovery needed');
  await expect(page.locator('.status-label')).toHaveText('Recovery needed');
  await expect(page.locator('.recovery-path li strong')).toHaveText(['56.25%', '+12', '+24', '+36']);
  await expect(page.locator('.recovery-path li small')).toHaveText(['Now', 'attend · 65.00%', 'attend · 70.83%', 'attend · 75.00%']);
  await expect(page.locator('.calculation-flow')).toContainText('63/84');
  await expect(page.locator('.ribbon-empty')).toHaveText('Mark a class to start your history.');
  await page.getByRole('button', { name: /^Present/ }).click();
  await expect(page.locator('.class-change')).toContainText('57.14%');
  await expect(page.locator('.class-track').getByRole('img', { name: 'present, class 49', exact: true })).toContainText('✓');
  await page.getByRole('button', { name: /^Absent/ }).click();
  await expect(page.locator('.class-track').getByRole('img', { name: 'absent, class 50', exact: true })).toContainText('×');
  await page.getByRole('button', { name: /^Undo/ }).click();
  await expect(page.locator('.subject-context')).toContainText('57.14%');
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
  await page.setViewportSize({ width: 390, height: 844 });
  expect((await new AxeBuilder({ page }).include('#calculator').withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze()).violations).toEqual([]);
});
