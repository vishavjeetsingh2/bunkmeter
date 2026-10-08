import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('visual milestones explain exact recovery without changing the calculator', async ({ page }) => {
  await page.goto('/?held=48&attended=27&req=75');
  await page.getByRole('button', { name: 'Attend 12 classes: 65.00%' }).click();
  await expect(page.locator('.journey-detail')).toContainText('39 / 60 classes');
  await expect(page.locator('.journey-detail')).toContainText('65.00%');
  await expect(page.getByLabel('Classes held', { exact: true })).toHaveValue('48');
  await expect(page.locator('.decision-number')).toHaveText('36');
  await page.getByRole('button', { name: 'Attend 36 classes: 75.00%' }).click();
  await expect(page.locator('.journey-detail')).toContainText('63 / 84 classes');
  await page.getByLabel('You attended', { exact: true }).fill('36');
  await expect(page.locator('.journey-detail')).toContainText('Current record');
  await expect(page.locator('.journey-stops button')).toHaveCount(1);
  await page.getByLabel('You attended', { exact: true }).fill('40');
  await page.getByRole('button', { name: 'Miss 5 classes: 75.47%' }).click();
  await expect(page.locator('.journey-detail')).toContainText('40 / 53 classes');
  await page.getByLabel('Required attendance', { exact: true }).fill('100');
  await expect(page.locator('.attendance-journey')).toHaveCount(0);
});

test('visual breakdown fits desktop and phone, with accessible reduced motion', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/?held=48&attended=27&req=75');
  await expect(page.locator('.journey-line')).toHaveCSS('animation-name', 'none');
  for (const width of [1440, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    await expect(page.locator('.journey-stops')).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    if (width === 1440 || width === 390) await page.screenshot({ path: `${process.env.TEMP}/bunkmeter-journey-${width}.png`, fullPage: true });
  }
  const audit = await new AxeBuilder({ page }).include('.calculator-workspace').analyze();
  expect(audit.violations).toEqual([]);
  await page.getByLabel('Classes held', { exact: true }).fill('1000000000');
  await page.getByLabel('You attended', { exact: true }).fill('1');
  await page.getByLabel('Required attendance', { exact: true }).fill('99.99');
  await expect(page.locator('.journey-stops button')).toHaveCount(4);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});
