import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('packaged app has no external requests and persists subjects across a new page', async ({ page, context }) => {
  const external: string[] = [], errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  await page.route('**/*', route => {
    if (new URL(route.request().url()).origin !== 'http://127.0.0.1:4325') { external.push(route.request().url()); return route.abort(); }
    return route.continue();
  });
  await page.goto('/');
  await page.getByRole('button', { name: 'Add your first subject' }).click();
  await expect(page.getByLabel('Classes held', { exact: true })).toBeFocused();
  await page.getByLabel('Classes held', { exact: true }).fill('100');
  await page.getByLabel('You attended', { exact: true }).fill('72');
  await expect(page.locator('.decision-number')).toHaveText('12');
  await page.getByRole('button', { name: 'Save this subject' }).click();
  await page.getByLabel('Subject name', { exact: true }).fill('Physics');
  await page.getByRole('button', { name: 'Save subject', exact: true }).click();
  await page.getByRole('button', { name: 'Open Physics', exact: true }).click();
  await page.getByRole('button', { name: /^Present/ }).click();
  await expect(page.locator('.class-change')).toContainText('72.00%');
  await expect(page.locator('.class-change')).toContainText('72.27%');
  await expect(page.getByTestId('save-status')).toHaveText('Saved on this device.');
  for (const width of [320, 390, 768, 1366]) {
    await page.setViewportSize({ width, height: 844 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
  const violations = (await new AxeBuilder({ page }).analyze()).violations;
  expect(violations).toEqual([]);
  expect(external).toEqual([]); expect(errors).toEqual([]);
  const reopened = await context.newPage(); await page.close(); await reopened.goto('/');
  await expect(reopened.getByRole('button', { name: 'Open Physics', exact: true })).toContainText('73 attended / 101 held');
  await reopened.getByRole('button', { name: /^Undo/ }).click();
  await expect(reopened.getByLabel('You attended', { exact: true })).toHaveValue('72');
  await expect(reopened.getByTestId('save-status')).toHaveText('Saved on this device.');
});
