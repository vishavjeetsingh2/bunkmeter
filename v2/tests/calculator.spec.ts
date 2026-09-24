import { expect, test, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

async function counts(page: Page, attended: string, total: string, target = '75') {
  await page.getByLabel('Classes held', { exact: true }).fill(total);
  await page.getByLabel('You attended', { exact: true }).fill(attended);
  await page.getByLabel('Required attendance', { exact: true }).fill(target);
}

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('astro-island[ssr]')).toHaveCount(0);
});

test('example, presets and reset leave no stale result', async ({ page }) => {
  await page.getByRole('button', { name: 'Try an example' }).click();
  await expect(page.getByTestId('result')).toContainText('10');
  await expect(page.getByTestId('result')).toContainText('consecutive classes');
  await page.getByRole('button', { name: '85%', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Attend the next', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Reset' }).click();
  await expect(page.getByLabel('Classes held', { exact: true })).toHaveValue('');
  await expect(page.getByLabel('Classes held', { exact: true })).toBeFocused();
  await expect(page.getByTestId('result')).toHaveCount(0);
});

test('audited boundaries render the exact result', async ({ page }) => {
  await counts(page, '405', '450', '81');
  await expect(page.locator('.decision-number')).toHaveText('50');
  await counts(page, '29', '50', '58');
  await expect(page.locator('.status-label')).toHaveText('Exactly at target');
  await expect(page.locator('.decision-number')).toHaveText('0');
  await counts(page, '0', '102', '99');
  await expect(page.locator('.decision-number')).toHaveText('10,098');
  await expect(page.getByTestId('result')).not.toContainText('out of reach');
  await counts(page, '7499', '10000');
  await expect(page.getByTestId('result')).toContainText('74.99');
  await expect(page.locator('.status-label')).toHaveText('Below target');
});

test('invalid values never leave a plausible old answer', async ({ page }) => {
  await counts(page, '80', '100');
  await page.getByLabel('You attended', { exact: true }).fill('8.9');
  await expect(page.getByTestId('result')).toHaveCount(0);
  await expect(page.getByLabel('You attended', { exact: true })).toHaveAttribute('aria-invalid', 'true');
  await counts(page, '8e2', '1e3');
  await expect(page.getByTestId('result')).toHaveCount(0);
  await counts(page, '101', '100');
  await expect(page.getByText('Attended classes cannot exceed classes held.')).toBeVisible();
  await counts(page, '0', '100', '111');
  await expect(page.getByText('The target cannot exceed 100%.')).toBeVisible();
  await counts(page, '0', '100', '');
  await page.getByLabel('Required attendance', { exact: true }).press('Tab');
  await expect(page.getByText('Enter your required percentage.')).toBeVisible();
});

test('remaining lectures distinguish final budget, impossible recovery and term completion', async ({ page }) => {
  await counts(page, '75', '100');
  await page.getByText('Plan to the end of term', { exact: false }).click();
  await page.getByLabel('Classes remaining', { exact: true }).fill('100');
  await expect(page.locator('.decision-number')).toHaveText('0');
  await expect(page.locator('.semester-note')).toContainText('you can miss 25 in total');
  await counts(page, '60', '100');
  await page.getByLabel('Classes remaining', { exact: true }).fill('20');
  await expect(page.getByRole('heading', { name: 'Not enough classes left', exact: true })).toBeVisible();
  await expect(page.locator('.decision-number')).toHaveText('66.66%');
  await page.getByLabel('Classes remaining', { exact: true }).fill('0');
  await expect(page.getByRole('heading', { name: 'No classes remaining', exact: true })).toBeVisible();
  await expect(page.getByLabel('Next class preview')).toHaveCount(0);
  await page.getByLabel('Classes remaining', { exact: true }).fill('-1');
  await expect(page.getByTestId('result')).toHaveCount(0);
});

test('zero and perfect targets have honest states', async ({ page }) => {
  await counts(page, '0', '0');
  await expect(page.getByTestId('result')).toContainText('no classes recorded');
  await counts(page, '9', '10', '100');
  await expect(page.getByTestId('result')).toContainText('A perfect record can’t be recovered');
  await expect(page.getByTestId('result')).not.toContainText('null');
  await counts(page, '0', '10', '0');
  await expect(page.getByRole('heading', { name: 'No minimum to meet' })).toBeVisible();
});

test('keyboard, visible focus, disclosure and reduced motion', async ({ page, browserName }) => {
  await expect(page.getByLabel('Classes held', { exact: true })).toBeVisible();
  // Native link tabbing varies across WebKit ports/preferences. The Windows
  // build skips anchors with Tab and Alt+Tab. Test activation in WebKit and
  // first-tab order in Chromium/Firefox; native Safari tab order is a manual gate.
  // Browser preference background: https://github.com/microsoft/playwright/issues/5609
  if (browserName === 'webkit') {
    await page.getByRole('link', { name: 'Skip to calculator' }).focus();
  } else {
    await page.keyboard.press('Tab');
  }
  await expect(page.getByRole('link', { name: 'Skip to calculator' })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('#main')).toBeFocused();
  const disclosure = page.locator('.remaining-details summary');
  await disclosure.focus();
  await page.keyboard.press('Enter');
  await expect(page.getByLabel('Classes remaining', { exact: true })).toBeVisible();
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await counts(page, '80', '100');
  await expect(page.locator('.instrument-stage')).toHaveAttribute('data-enhanced', 'false');
  await expect(page.locator('.instrument-webgl canvas')).toHaveCount(0);
  await expect(page.locator('.target-presets button').first()).toHaveCSS('transition-duration', '0s');
});

test('no automated accessibility violations across result states', async ({ page }) => {
  for (const state of ['empty', 'safe', 'recovery', 'unreachable', 'invalid']) {
    if (state === 'safe') await counts(page, '90', '110');
    if (state === 'recovery') await counts(page, '60', '100');
    if (state === 'unreachable') await counts(page, '9', '10', '100');
    if (state === 'invalid') await counts(page, '11', '10');
    const report = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze();
    expect(report.violations, `${state}: ${JSON.stringify(report.violations)}`).toEqual([]);
  }
  await page.setViewportSize({ width: 360, height: 800 });
  await counts(page, '60', '100');
  const mobileReport = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze();
  expect(mobileReport.violations).toEqual([]);
});

test('requested screen sizes do not overflow with ordinary or large counts', async ({ page }) => {
  for (const width of [320, 360, 390, 768, 1366, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await counts(page, '90', '110');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    if (width === 360 || width === 390) {
      await expect(page.locator('.mobile-answer')).toContainText('You can miss 10');
      expect(await page.locator('.mobile-answer').evaluate(element => element.getBoundingClientRect().bottom)).toBeLessThan(700);
    }
    await counts(page, '0', '1000000000', '99.99');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    const figure = page.locator('.decision-number');
    expect(await figure.evaluate(element => element.scrollWidth <= element.clientWidth)).toBe(true);
  }
});
