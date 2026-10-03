import { expect, test, type Page } from '@playwright/test';

async function example(page: Page) {
  await expect(page.locator('astro-island[ssr]')).toHaveCount(0);
  await page.getByRole('button', { name: 'Try an example' }).click();
  await expect(page.locator('.decision-number')).toHaveText('10');
}

test('next-class previews react without changing recorded counts or the main answer', async ({ page }) => {
  await page.goto('/'); await example(page);
  await page.getByRole('button', { name: 'If you miss next' }).click();
  await expect(page.locator('.instrument-legend')).toContainText('If you miss next');
  await expect(page.locator('.instrument-still')).toContainText('81.08%');
  await expect(page.getByLabel('Classes held', { exact: true })).toHaveValue('110');
  await expect(page.getByLabel('You attended', { exact: true })).toHaveValue('90');
  await expect(page.locator('.decision-number')).toHaveText('10');
  await page.getByRole('button', { name: 'If you attend next' }).click();
  await expect(page.locator('.instrument-still')).toContainText('81.98%');
  await page.getByLabel('You attended', { exact: true }).fill('91');
  await expect(page.getByRole('button', { name: /^Current/ })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('.instrument-legend')).toContainText('Your attendance');
});

test('reduced motion never downloads or initializes the renderer', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const graphicsRequests: string[] = [];
  page.on('request', request => { if (/\/scene\.[^/]+\.js/.test(request.url())) graphicsRequests.push(request.url()); });
  await page.goto('/'); await example(page);
  await page.getByRole('button', { name: 'If you miss next' }).click();
  await expect(page.locator('.instrument-stage')).toHaveAttribute('data-enhanced', 'false');
  await expect(page.locator('.instrument-still')).toHaveCSS('opacity', '1');
  await expect(page.locator('.instrument-webgl canvas')).toHaveCount(0);
  expect(graphicsRequests).toEqual([]);
});

test('a blocked 3D chunk leaves a complete functioning calculator', async ({ page }) => {
  await page.addInitScript(() => Object.defineProperty(navigator, 'hardwareConcurrency', { get: () => 8 }));
  await page.route('**/_astro/scene.*.js', route => route.abort());
  await page.goto('/'); await example(page);
  await expect(page.getByRole('button', { name: 'Interactive view' })).toBeVisible();
  await expect(page.locator('.instrument-stage')).toHaveAttribute('data-enhanced', 'false');
  await page.getByLabel('You attended', { exact: true }).fill('60');
  await expect(page.locator('.decision-number')).toHaveText('90');
  await expect(page.locator('.instrument-still')).toContainText('54.54%');
});

test('unavailable WebGL falls back without hiding the answer', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'hardwareConcurrency', { get: () => 8 });
    const getContext = HTMLCanvasElement.prototype.getContext;
    Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', { value: function(this: HTMLCanvasElement, kind: string, options?: unknown) {
      return kind.includes('webgl') ? null : Reflect.apply(getContext, this, [kind, options]);
    } });
  });
  await page.goto('/'); await example(page);
  await expect(page.getByRole('button', { name: 'Interactive view' })).toBeVisible();
  await expect(page.locator('.instrument-webgl canvas')).toHaveCount(0);
  await expect(page.locator('.decision-number')).toHaveText('10');
});

test('unavailable lighting leaves the calculator usable without creating a renderer', async ({ page }) => {
  await page.addInitScript(() => Object.defineProperty(navigator, 'hardwareConcurrency', { get: () => 8 }));
  await page.route('**/_astro/environment*.gz', route => route.abort());
  await page.goto('/'); await example(page);
  await expect(page.getByRole('button', { name: 'Interactive view' })).toBeVisible();
  await expect(page.locator('.instrument-webgl canvas')).toHaveCount(0);
  await page.getByRole('button', { name: /^Present/ }).click();
  await expect(page.getByLabel('Classes held', { exact: true })).toHaveValue('111');
  await expect(page.getByTestId('save-status')).toHaveText('Saved on this device.');
});

for (const reason of ['save-data', 'low-core', 'low-memory', 'slow-network'] as const) {
  test(`${reason} uses the lightweight still view`, async ({ page }) => {
    await page.addInitScript(mode => {
      if (mode === 'save-data') Object.defineProperty(navigator, 'connection', { value: { saveData: true } });
      else if (mode === 'low-memory') Object.defineProperty(navigator, 'deviceMemory', { value: 2 });
      else if (mode === 'slow-network') Object.defineProperty(navigator, 'connection', { value: { effectiveType: '2g' } });
      else Object.defineProperty(navigator, 'hardwareConcurrency', { get: () => 2 });
    }, reason);
    const graphicsRequests: string[] = [];
    page.on('request', request => { if (/\/scene\.[^/]+\.js/.test(request.url())) graphicsRequests.push(request.url()); });
    await page.goto('/'); await example(page);
    await expect(page.getByRole('button', { name: 'Still view' })).toHaveCount(0);
    expect(graphicsRequests).toEqual([]);
  });
}

test('enhanced rendering settles, responds, and disposes on still-view selection', async ({ page, browserName }) => {
  test.skip(browserName !== 'chromium', 'GPU lifecycle is exercised in Chromium; calculator and fallback journeys run in every engine.');
  await page.addInitScript(() => Object.defineProperty(navigator, 'hardwareConcurrency', { get: () => 8 }));
  await page.goto('/'); await example(page);
  const stage = page.locator('.instrument-stage');
  const host = page.locator('.instrument-webgl');
  await expect(stage).toHaveAttribute('data-enhanced', 'true', { timeout: 20_000 });
  await page.mouse.move(0, 0);
  // A bounded stability window checks actual inactivity, not merely a queued callback.
  await expect.poll(async () => (await host.getAttribute('data-settled')) === 'true'
    || (await stage.getAttribute('data-enhanced')) === 'false', { timeout: 10_000 }).toBe(true);
  if (await stage.getAttribute('data-enhanced') === 'false') {
    // Slow software GPUs must stop rendering by disposing, rather than be forced to animate.
    await expect(host.locator('canvas')).toHaveCount(0);
    await expect(page.locator('.instrument-still')).toHaveCSS('opacity', '1');
    const stoppedFrames = await host.getAttribute('data-frames');
    await page.waitForTimeout(350);
    expect(await host.getAttribute('data-frames')).toBe(stoppedFrames);
    await expect(page.locator('.decision-number')).toHaveText('10');
    await page.getByRole('button', { name: 'If you miss next' }).click();
    await expect(page.locator('.instrument-still')).toContainText('81.08%');
    await expect(page.getByLabel('Classes held', { exact: true })).toHaveValue('110');
    test.info().annotations.push({ type: 'graphics', description: 'Software GPU simplified before settling; disposal, inactivity and working preview verified.' });
    return;
  }
  const frames = await host.getAttribute('data-frames');
  await page.waitForTimeout(350);
  expect(await host.getAttribute('data-frames')).toBe(frames);
  await page.locator('.instrument-stage').hover();
  await expect.poll(() => host.getAttribute('data-frames')).not.toBe(frames);
  await page.locator('footer').scrollIntoViewIfNeeded();
  await page.waitForTimeout(250);
  const offscreenFrames = await host.getAttribute('data-frames');
  await page.waitForTimeout(350);
  expect(await host.getAttribute('data-frames')).toBe(offscreenFrames);
  await page.getByRole('button', { name: 'Still view' }).click();
  await expect(stage).toHaveAttribute('data-enhanced', 'false');
  await expect(host.locator('canvas')).toHaveCount(0);
  await expect(page.locator('.instrument-still')).toHaveCSS('opacity', '1');
  await page.getByRole('button', { name: 'If you miss next' }).click();
  await expect(page.locator('.instrument-still')).toContainText('81.08%');
});

test('mobile touch responds without capturing vertical scrolling', async ({ page, browserName }) => {
  test.skip(browserName !== 'chromium', 'Native touch injection uses Chromium DevTools; responsive layouts run in every engine.');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(() => Object.defineProperty(navigator, 'hardwareConcurrency', { get: () => 8 }));
  const client = await page.context().newCDPSession(page);
  await client.send('Emulation.setTouchEmulationEnabled', { enabled: true });
  await page.goto('/'); await example(page);
  const stage = page.locator('.instrument-stage');
  // The mobile product now puts attendance actions before the lazy Instrument.
  await stage.scrollIntoViewIfNeeded();
  await expect(stage).toHaveAttribute('data-enhanced', 'true', { timeout: 20_000 });
  const initialScroll = await page.evaluate(() => window.scrollY);
  const host = page.locator('.instrument-webgl');
  await expect.poll(async () => (await stage.getAttribute('data-enhanced')) === 'false'
    || (await host.getAttribute('data-settled')) === 'true', { timeout: 10_000 }).toBe(true);
  const box = (await stage.boundingBox())!;
  const x = box.x + box.width * .75, y = box.y + box.height * .75;
  const frames = await host.getAttribute('data-frames');
  await client.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
  await expect.poll(async () => (await host.getAttribute('data-frames')) !== frames
    || (await stage.getAttribute('data-enhanced')) === 'false').toBe(true);
  if (await stage.getAttribute('data-enhanced') === 'false') {
    // Software GPUs may legitimately simplify mid-gesture; scrolling must still work.
    await expect(host.locator('canvas')).toHaveCount(0);
    await expect(page.locator('.instrument-still')).toHaveCSS('opacity', '1');
    test.info().annotations.push({ type: 'graphics', description: 'Adaptive still view activated on the software GPU; touch scrolling remains required.' });
  }
  for (let step = 1; step <= 5; step++) {
    await client.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y: y - step * 25 }] });
    await page.waitForTimeout(25);
  }
  await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(initialScroll + 50);
  await expect(page.getByLabel('Classes held', { exact: true })).toHaveValue('110');
  await client.detach();
});

test('context loss and live reduced-motion changes release graphics resources', async ({ page, browserName }) => {
  test.skip(browserName !== 'chromium', 'GPU lifecycle is exercised in Chromium.');
  await page.addInitScript(() => Object.defineProperty(navigator, 'hardwareConcurrency', { get: () => 8 }));
  await page.goto('/'); await example(page);
  await expect(page.locator('.instrument-stage')).toHaveAttribute('data-enhanced', 'true', { timeout: 20_000 });
  await page.locator('.instrument-webgl canvas').evaluate(element => {
    const gl = (element as HTMLCanvasElement).getContext('webgl2');
    gl?.getExtension('WEBGL_lose_context')?.loseContext();
  });
  await expect(page.locator('.instrument-webgl canvas')).toHaveCount(0);
  await expect(page.locator('.decision-number')).toHaveText('10');
  await page.getByRole('button', { name: 'Interactive view' }).click();
  await expect(page.locator('.instrument-stage')).toHaveAttribute('data-enhanced', 'true', { timeout: 20_000 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(page.locator('.instrument-webgl canvas')).toHaveCount(0);
  await expect(page.locator('.instrument-stage')).toHaveAttribute('data-enhanced', 'false');
});
