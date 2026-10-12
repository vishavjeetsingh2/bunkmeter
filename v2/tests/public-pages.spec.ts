import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
const routes = ['/', '/vtu', '/aktu', '/du', '/attendance-calculator-guide', '/about', '/contact', '/privacy-policy', '/terms', '/disclaimer'];

test('worked examples and FAQ are crawlable without JavaScript', async ({ request }) => {
  const html = await (await request.get('/')).text();
  expect(html).toContain('Attendance calculator.');
  expect(html).toContain('id="examples-title"');
  expect(html).toContain('72 / 100 → 84 / 112');
  expect(html).toContain('90 / 110 → 90 / 120');
  expect(html).toContain('80 / 100 → 114 / 134');
  expect(html).toContain('data-faq-schema');
});

test('worked example opens a correct editable recovery result', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('link', { name: /Recover to 85%/ }).click();
  await expect(page.locator('.decision-number')).toHaveText('34');
  await expect(page.getByLabel('Classes held', { exact: true })).toHaveValue('100');
  await expect(page.getByLabel('You attended', { exact: true })).toHaveValue('80');
});
test('public routes have unique metadata, canonical URLs and complete navigation', async ({ page, request }) => {
  const titles = new Set<string>();
  for (const path of routes) {
    const response = await page.goto(path);
    expect(response?.status(), path).toBe(200);
    await expect(page.locator('h1')).toHaveCount(1);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', `https://bunkmeter.online${path}`);
    await expect(page.locator('meta[name="description"]')).not.toHaveAttribute('content', '');
    await expect(page.locator('meta[property="og:image"]')).toHaveAttribute('content', 'https://bunkmeter.online/og-preview.png');
    const title = await page.title(); expect(titles.has(title)).toBe(false); titles.add(title);
    for (const link of await page.locator('footer a').all()) expect((await request.get((await link.getAttribute('href'))!)).status()).toBe(200);
    expect(await page.locator('body').innerText()).not.toContain('hello@bunkmeter.app');
  }
  const sitemap = await (await request.get('/sitemap.xml')).text();
  for (const path of routes) expect(sitemap).toContain(`<loc>https://bunkmeter.online${path}</loc>`);
  expect(sitemap).not.toContain('/404');
  expect((await request.get('/og-preview.png')).status()).toBe(200);
  expect((await request.get('/apple-touch-icon.png')).status()).toBe(200);
});
test('support pages are accessible and fit narrow screens', async ({ page }) => {
  test.setTimeout(60_000);
  await page.setViewportSize({ width: 320, height: 800 });
  for (const path of routes.slice(1)) {
    await page.goto(path);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), path).toBe(true);
    const report = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze();
    expect(report.violations, path).toEqual([]);
  }
});
test('preview is not indexable and schema describes only the real free calculator', async ({ page, request }) => {
  await page.goto('/');
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex, follow');
  expect(await (await request.get('/robots.txt')).text()).toContain('Disallow: /');
  const schema = JSON.parse((await page.locator('script[type="application/ld+json"]:not([data-faq-schema])').textContent())!);
  expect(schema['@type']).toBe('WebApplication'); expect(schema.offers.price).toBe('0');
  expect(schema).not.toHaveProperty('aggregateRating');
  await page.goto('/404');
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex, follow');
  await expect(page.getByRole('link', { name: 'Open the attendance calculator' })).toHaveAttribute('href', '/');
});
