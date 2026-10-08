import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { emptyWorkspace, appendClass, mergeBackup } from '../src/features/saved/model';

test('web has calculation and planning without tracking or persistence, even with blocked storage', async ({ page }) => {
  await page.addInitScript(() => Object.defineProperty(window, 'indexedDB', { get() { throw Error('Storage must not be needed'); } }));
  await page.goto('/');
  await page.getByLabel('Classes held', { exact: true }).fill('48');
  await page.getByLabel('You attended', { exact: true }).fill('27');
  await expect(page.locator('.decision-number')).toHaveText('36');
  await expect(page.getByRole('button', { name: /^Present/ })).toHaveCount(0);
  await expect(page.getByRole('button', { name: /^Absent/ })).toHaveCount(0);
  await expect(page.getByLabel('Choose subject')).toHaveCount(0);
  await expect(page.locator('#subjects, #subject-editor, #class-history')).toHaveCount(0);
  await expect(page.locator('.product-nav')).toHaveText('CalculatorHelp');
  await page.getByRole('button', { name: 'If you attend next' }).click();
  await expect(page.getByLabel('Classes held', { exact: true })).toHaveValue('48');
  await expect(page.locator('.decision-number')).toHaveText('36');
  await page.reload();
  await expect(page.getByLabel('Classes held', { exact: true })).toHaveValue('');
  await page.getByText('Previously saved attendance here?', { exact: true }).click();
  await page.getByRole('button', { name: 'Export previous attendance' }).click();
  await expect(page.locator('.legacy-backup')).toContainText('They have not been changed.');
});

test('old records survive web edits, reload and university presets, and export is app-compatible', async ({ page }) => {
  const session = appendClass({ fields: { total: '48', attended: '27', target: '75', remaining: '' }, events: [] }, 'present', '2026-10-08T08:00:00.000Z')!;
  const original = { ...emptyWorkspace(), revision: 'existing-record', activeId: 'maths', subjects: [{ id: 'maths', name: 'Mathematics', session }] };
  await page.goto('/');
  await page.evaluate(data => new Promise<void>((resolve, reject) => {
    const open = indexedDB.open('bunkmeter-attendance', 1);
    open.onupgradeneeded = () => open.result.createObjectStore('records');
    open.onerror = () => reject(open.error);
    open.onsuccess = () => { const db = open.result; const tx = db.transaction('records', 'readwrite'); tx.objectStore('records').put(data, 'workspace'); tx.oncomplete = () => { db.close(); resolve(); }; tx.onerror = () => reject(tx.error); };
  }), original);
  for (const path of ['/', '/vtu?held=100&attended=72&req=75', '/du']) {
    await page.goto(path);
    await page.getByLabel('Classes held', { exact: true }).fill('100');
    await page.getByLabel('You attended', { exact: true }).fill('72');
    await page.getByRole('button', { name: 'Reset', exact: false }).click();
  }
  await page.getByText('Previously saved attendance here?', { exact: true }).click();
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export previous attendance' }).click();
  const download = await downloadPromise;
  const text = await readFile((await download.path())!, 'utf8');
  expect(JSON.parse(text)).toEqual(original);
  expect(mergeBackup(emptyWorkspace(), text, () => 'restored').subjects[0]?.session).toEqual(session);
  const stored = await page.evaluate(() => new Promise((resolve, reject) => {
    const open = indexedDB.open('bunkmeter-attendance', 1);
    open.onerror = () => reject(open.error);
    open.onsuccess = () => { const db = open.result; const read = db.transaction('records').objectStore('records').get('workspace'); read.onsuccess = () => { db.close(); resolve(read.result); }; read.onerror = () => reject(read.error); };
  }));
  expect(stored).toEqual(original);
});
