import { expect, test, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';


async function saved(page: Page) { await expect(page.getByTestId('save-status')).toHaveText('Saved on this device.'); }
async function start(page: Page) {
  await page.emulateMedia({ reducedMotion: 'reduce' }); await page.goto('/');
  await page.getByRole('button', { name: 'Try an example' }).click(); await saved(page);
}
async function nameSubject(page: Page, name: string) {
  await page.locator('.saved-details summary').filter({ hasText: 'Save as a subject' }).click();
  await page.getByLabel('Subject name', { exact: true }).fill(name);
  await page.getByRole('button', { name: 'Save subject', exact: true }).click(); await saved(page);
}
test('quick counts and exact Undo survive reload; what-if never becomes attendance', async ({ page }) => {
  await start(page);
  await page.getByRole('button', { name: /^Present/ }).click(); await saved(page);
  await page.getByRole('button', { name: 'If you miss next' }).click();
  await page.reload();
  await expect(page.getByLabel('Classes held', { exact: true })).toHaveValue('111');
  await expect(page.getByLabel('You attended', { exact: true })).toHaveValue('91');
  await expect(page.locator('#calculator')).toHaveAttribute('data-preview', 'current');
  await page.getByRole('button', { name: /^Undo/ }).click(); await saved(page);
  await page.reload();
  await expect(page.getByLabel('Classes held', { exact: true })).toHaveValue('110');
});
test('subjects retain separate targets, actions and remaining counts without Reset data loss', async ({ page }) => {
  await start(page); await nameSubject(page, 'Physics');
  await page.getByRole('button', { name: '85%', exact: true }).click();
  await page.getByText('Plan to the end of term', { exact: false }).click();
  await page.getByLabel('Classes remaining', { exact: true }).fill('20');
  await page.getByRole('button', { name: /^Absent/ }).click(); await saved(page);
  await page.getByRole('button', { name: 'New calculation' }).click();
  await page.getByRole('button', { name: 'Try an example' }).click();
  // The details stays open after naming the first subject.
  const summary = page.locator('.saved-details summary').filter({ hasText: 'Save as a subject' });
  if (!(await page.getByLabel('Subject name', { exact: true }).isVisible())) await summary.click();
  await page.getByLabel('Subject name', { exact: true }).fill('Maths');
  await page.getByRole('button', { name: 'Save subject', exact: true }).click(); await saved(page);
  await page.getByLabel('Choose subject').selectOption({ label: 'Physics' }); await saved(page);
  await page.reload();
  await expect(page.getByLabel('Required attendance', { exact: true })).toHaveValue('85');
  await expect(page.getByLabel('Classes held', { exact: true })).toHaveValue('111');
  await page.getByText('Plan to the end of term', { exact: false }).click();
  await expect(page.getByLabel('Classes remaining', { exact: true })).toHaveValue('19');
  await page.getByRole('button', { name: /^Undo/ }).click(); await saved(page);
  await expect(page.getByLabel('Classes remaining', { exact: true })).toHaveValue('20');
  await page.getByLabel('Choose subject').selectOption({ label: 'Maths' }); await saved(page);
  await expect(page.getByLabel('Required attendance', { exact: true })).toHaveValue('75');
});
test('remove and restore survive refresh; backup adds records without overwriting', async ({ page }) => {
  await start(page); await nameSubject(page, 'Physics');
  await page.getByRole('button', { name: 'Remove this subject' }).click();
  await page.getByRole('button', { name: 'Confirm removal' }).click(); await saved(page);
  await page.reload(); await page.getByRole('button', { name: 'Restore Physics' }).click(); await saved(page);
  await page.locator('.saved-details summary').filter({ hasText: 'Backup & transfer' }).click();
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export backup' }).click();
  const backup = await (await download).path(); expect(backup).toBeTruthy();
  await page.getByLabel('Import backup (adds subjects)').setInputFiles(backup!); await saved(page);
  await expect(page.getByLabel('Choose subject').locator('option')).toHaveCount(3);
  await page.getByLabel('Import backup (adds subjects)').setInputFiles(test.info().project.testDir + '/fixtures/unsupported-backup.json');
  await expect(page.locator('.saved-notice')).toContainText('not supported');
  await expect(page.getByLabel('Choose subject').locator('option')).toHaveCount(3);
});
test('another tab cannot overwrite a newer saved record', async ({ page, context }) => {
  await start(page);
  const other = await context.newPage(); await other.goto('/'); await saved(other);
  await page.getByRole('button', { name: /^Present/ }).click(); await saved(page);
  await other.getByRole('button', { name: /^Absent/ }).click();
  await expect(other.getByTestId('save-status')).toContainText('another tab changed');
  const observer = await context.newPage(); await observer.goto('/');
  await expect(observer.getByLabel('You attended', { exact: true })).toHaveValue('91');
  await expect(observer.getByLabel('Classes held', { exact: true })).toHaveValue('111');
});
test('unavailable storage stays usable and never claims to save', async ({ page }) => {
  await page.addInitScript(() => { Object.defineProperty(window, 'indexedDB', { get() { throw new Error('Storage blocked'); } }); });
  await page.goto('/');
  await expect(page.getByTestId('save-status')).toContainText('Saving unavailable');
  await page.getByRole('button', { name: 'Try an example' }).click();
  await expect(page.locator('.decision-number')).toHaveText('10');
  await page.getByRole('button', { name: /^Present/ }).click();
  await expect(page.getByLabel('Classes held', { exact: true })).toHaveValue('111');
  await expect(page.getByTestId('save-status')).toContainText('Saving unavailable');
});
test('an unsupported saved version is preserved instead of overwritten on startup', async ({ page }) => {
  await start(page);
  await page.evaluate(async () => {
    await new Promise<void>((resolve, reject) => {
      const request = indexedDB.open('bunkmeter-attendance', 1);
      request.onsuccess = () => {
        const tx = request.result.transaction('records', 'readwrite');
        tx.objectStore('records').put({ version: 999, precious: 'future record' }, 'workspace');
        tx.oncomplete = () => { request.result.close(); resolve(); }; tx.onabort = () => reject(tx.error);
      };
    });
  });
  await page.reload();
  await expect(page.getByTestId('save-status')).toContainText('Saving unavailable');
  await page.getByRole('button', { name: 'Try an example' }).click();
  const record = await page.evaluate(() => new Promise(resolve => {
    const request = indexedDB.open('bunkmeter-attendance', 1);
    request.onsuccess = () => { const read = request.result.transaction('records').objectStore('records').get('workspace'); read.onsuccess = () => { resolve(read.result); request.result.close(); }; };
  }));
  expect(record).toEqual({ version: 999, precious: 'future record' });
});
test('subject controls and text guide fit mobile and have no axe violations', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 800 });
  await start(page); await nameSubject(page, 'A subject with a long name that still fits');
  await page.locator('.saved-details summary').filter({ hasText: 'New here? A 30-second guide' }).click();
  const overflow = await page.evaluate(() => ({
    width: innerWidth, scrollWidth: document.documentElement.scrollWidth, scrollX,
    elements: [...document.querySelectorAll('body *')].filter(el => el.getBoundingClientRect().width > 0 && (el.getBoundingClientRect().right + scrollX > innerWidth || el.scrollWidth > el.clientWidth + 1)).map(el => ({ tag: el.tagName, id: el.id, class: el.className, left: el.getBoundingClientRect().left, right: el.getBoundingClientRect().right, client: el.clientWidth, scroll: el.scrollWidth, overflow: getComputedStyle(el).overflowX, text: el.textContent?.slice(0,70) })),
  }));
  expect(overflow.scrollWidth, JSON.stringify(overflow)).toBeLessThanOrEqual(overflow.width);
  const report = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze();
  expect(report.violations).toEqual([]);
});

test('opening shared links and exact-target presets never overwrites a saved subject or quick draft', async ({ page }) => {
  await start(page); await nameSubject(page, 'Physics');
  await page.goto('/?held=100&attended=72&req=75');
  await expect(page.locator('.decision-number')).toHaveText('12');
  await page.getByRole('button', { name: /^Present/ }).click();
  await page.goto('/');
  await expect(page.getByLabel('Choose subject')).toHaveValue(/.+/);
  await expect(page.getByLabel('Classes held', { exact: true })).toHaveValue('110');
  await expect(page.getByLabel('You attended', { exact: true })).toHaveValue('90');
  await page.goto('/?held=3&attended=2&req=2%2F3');
  await expect(page.getByLabel('Required attendance', { exact: true })).toHaveValue('2/3');
  await page.getByLabel('Classes held', { exact: true }).fill('3');
  await page.getByLabel('You attended', { exact: true }).fill('2');
  await expect(page.locator('.status-label')).toContainText('No skip buffer');
  await expect(page.locator('.decision-number')).toHaveText('0');
  await nameSubject(page, 'DU course');
  await page.goto('/');
  await expect(page.getByLabel('Required attendance', { exact: true })).toHaveValue('2/3');
  await page.getByLabel('Choose subject').selectOption({ label: 'Physics' });
  await expect(page.getByLabel('You attended', { exact: true })).toHaveValue('90');
});

test('class dates survive reopening and failed writes never show saved', async ({ page, context }) => {
  await start(page);
  await page.getByRole('button', { name: /^Present/ }).click(); await saved(page);
  await page.reload();
  await page.locator('.saved-details summary').filter({ hasText: 'Recent class history' }).click();
  await expect(page.locator('.attendance-history time')).toHaveCount(1);
  await expect(page.locator('.attendance-history')).toContainText('Present');
  await page.evaluate(() => {
    const transaction = IDBDatabase.prototype.transaction;
    Object.defineProperty(IDBDatabase.prototype, 'transaction', { configurable: true, value: function(this: IDBDatabase, ...args: Parameters<IDBDatabase['transaction']>) {
      if (args[1] === 'readwrite') throw new DOMException('Full', 'QuotaExceededError');
      return Reflect.apply(transaction, this, args);
    } });
  });
  await page.getByRole('button', { name: /^Absent/ }).click();
  await expect(page.getByTestId('save-status')).toContainText('Saving unavailable');
  await expect(page.getByLabel('Classes held', { exact: true })).toHaveValue('112');
  const other = await context.newPage(); await other.goto('/');
  await expect(other.getByLabel('Classes held', { exact: true })).toHaveValue('111');
});

