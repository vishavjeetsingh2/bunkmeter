import { test, expect } from '@playwright/test';
import { universities } from '../src/content/universities';

test('university pages and matching FAQ JSON-LD are present without JavaScript', async ({ browser, baseURL, request }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, ...(baseURL ? { baseURL } : {}) });
  const page = await context.newPage();
  try {
    const sitemap = await (await request.get('/sitemap.xml')).text();
    for (const university of universities) {
      const route = `/${university.slug}`;
      expect((await page.goto(route))?.status()).toBe(200);
      await expect(page.locator('h1')).toHaveText(university.heading);
      await expect(page).toHaveTitle(university.title);
      await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', university.description);
      await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', `https://bunkmeter.online${route}`);
      await expect(page.locator('meta[property="og:url"]')).toHaveAttribute('content', `https://bunkmeter.online${route}`);
      await expect(page.getByLabel('Required attendance', { exact: true })).toHaveValue(university.defaultTarget);
      await expect(page.locator('article.university-guide h3')).toHaveCount(university.sections.length);
      const json = JSON.parse((await page.locator('head script[data-faq-schema]').textContent())!);
      expect(json['@type']).toBe('FAQPage');
      const details = page.locator('.explanations details');
      expect(json.mainEntity).toHaveLength(await details.count());
      for (let i = 0; i < json.mainEntity.length; i++) {
        expect(await details.nth(i).locator('summary').evaluate(el => el.childNodes[0]?.textContent)).toBe(json.mainEntity[i].name);
        expect(await details.nth(i).locator('p').textContent()).toBe(json.mainEntity[i].acceptedAnswer.text);
      }
      expect(sitemap).toContain(`<loc>https://bunkmeter.online${route}</loc>`);
    }
    await page.goto('/');
    await expect(page.locator('head script[data-faq-schema]')).toHaveCount(1);
    for (const university of universities) await expect(page.getByRole('link', { name: university.shortName, exact: true })).toHaveAttribute('href', `/${university.slug}`);
  } finally { await context.close(); }
});

test('shared values override the university preset, remain editable and have a clean canonical', async ({ page }) => {
  await page.goto('/vtu?held=100&attended=72&req=75');
  await expect(page.locator('.decision-number')).toHaveText('12');
  await expect(page.getByLabel('Required attendance', { exact: true })).toHaveValue('75');
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', 'https://bunkmeter.online/vtu');
  await page.getByRole('button', { name: '85%', exact: true }).click();
  await expect(page.getByLabel('Required attendance', { exact: true })).toHaveValue('85');
  await page.getByRole('button', { name: 'Reset' }).click();
  await expect(page.getByLabel('Required attendance', { exact: true })).toHaveValue('85');
  await expect(page.getByTestId('result')).toHaveCount(0);
  await page.goto('/?held=100&attended=101&req=75');
  await expect(page.getByText('This link contains invalid attendance values. Enter your own counts below.')).toBeVisible();
  await expect(page.getByTestId('result')).toHaveCount(0);
});

test('native sharing uses current counts rather than a hypothetical preview', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'share', { configurable: true, value: async (value: ShareData) => { Object.defineProperty(window, 'lastShared', { configurable: true, value }); } });
  });
  await page.goto('/aktu?held=100&attended=72&req=75');
  await page.getByRole('button', { name: 'If you miss next' }).click();
  await page.getByRole('button', { name: 'Share Result', exact: false }).click();
  await expect(page.locator('.share-status')).toHaveText('Share sheet closed.');
  const shared = await page.evaluate(() => Object.getOwnPropertyDescriptor(window, 'lastShared')?.value as ShareData);
  expect(shared.url).toBe('https://bunkmeter.online/aktu?held=100&attended=72&req=75');
  expect(shared.text).toContain('12 consecutive classes');
});

test('copy fallback works without native share and a denied clipboard provides selectable text', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'share', { configurable: true, value: undefined });
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async (text: string) => { Object.defineProperty(window, 'lastCopy', { configurable: true, value: text }); } } });
  });
  await page.goto('/?held=100&attended=72&req=75&remaining=10');
  await page.getByRole('button', { name: 'Share Result', exact: false }).click();
  await expect(page.locator('.share-status')).toHaveText('Result and link copied.');
  const copied = await page.evaluate(() => Object.getOwnPropertyDescriptor(window, 'lastCopy')?.value as string);
  expect(copied).toContain('out of reach'); expect(copied).toContain('remaining=10');
  await page.evaluate(() => { Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async () => { throw new DOMException('Denied', 'NotAllowedError'); } } }); });
  await page.getByRole('button', { name: 'Copy result link' }).click();
  await expect(page.getByLabel('Result and link to copy')).toHaveValue(copied);
  await page.getByLabel('You attended', { exact: true }).fill('90');
  await expect(page.getByLabel('Result and link to copy')).toHaveCount(0);
});

test('cancelling native sharing does not silently copy a result', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'share', { configurable: true, value: async () => { throw new DOMException('Cancelled', 'AbortError'); } });
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async () => { throw Error('Should not copy'); } } });
  });
  await page.goto('/?held=100&attended=72&req=75');
  await page.getByRole('button', { name: 'Share Result', exact: false }).click();
  await expect(page.locator('.share-status')).toHaveText('Sharing cancelled.');
  await expect(page.getByLabel('Result and link to copy')).toHaveCount(0);
});
