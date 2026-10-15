import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('calculate, calendar, holiday and persistence stay separate from real attendance', async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-10-15T12:00:00'));
  await page.goto('/');
  await expect(page.getByLabel('Classes held', { exact:true })).toBeEnabled();
  await page.getByLabel('Classes held', { exact:true }).fill('100');
  await page.getByLabel('You attended', { exact:true }).fill('72');
  await expect(page.locator('.decision-number')).toHaveText('12');
  await page.getByRole('button', { name:'Recovery', exact:true }).click();
  await expect(page.locator('.recovery-hero strong')).toHaveText('12');
  await page.getByLabel('Start from').fill('2027-01-04');
  await page.getByLabel('Classes per selected day').fill('2');
  await expect(page.locator('.finish-line')).toContainText('Jan 11');
  await page.getByRole('button', { name:/Jan 4, attend 2/ }).click();
  await expect(page.locator('.calendar-detail')).toContainText('74/102');
  await page.getByRole('button', { name:'No class on Jan 4' }).click();
  await expect(page.locator('.finish-line')).toContainText('Jan 12');
  await page.getByRole('button', { name:'Save calendar · no reminders' }).click();
  await expect(page.locator('.plan-message')).toContainText('Calendar saved');
  await page.reload();
  await page.getByRole('button', { name:'Recovery', exact:true }).click();
  await expect(page.getByLabel('Start from')).toHaveValue('2027-01-04');
  await expect(page.locator('.finish-line')).toContainText('Jan 12');
  await page.getByRole('button', { name:'Calculate', exact:true }).click();
  await expect(page.getByLabel('You attended', { exact:true })).toHaveValue('72');
  await page.getByLabel('You attended', { exact:true }).fill('73');
  await page.getByRole('button', { name:'Recovery', exact:true }).click();
  await expect(page.locator('.plan-notice')).toContainText('counts changed');
  await page.getByRole('button', { name:'Remove plan', exact:true }).click();
  await expect(page.locator('.plan-saved')).toHaveCount(0);
});

test('three focused screens fit phones and expose accessible controls', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByLabel('Classes held', { exact:true })).toBeEnabled();
  await page.getByLabel('Classes held', { exact:true }).fill('100');
  await page.getByLabel('You attended', { exact:true }).fill('72');
  for (const screen of ['Calculate','Recovery','Subjects']) {
    await page.getByRole('button', { name:screen, exact:true }).click();
    for (const width of [320,390,768]) {
      await page.setViewportSize({width,height:844});
      expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    }
    await page.setViewportSize({width:390,height:844});
    await page.screenshot({path:`${process.env.TEMP}/bunkmeter-app-${screen}.png`,fullPage:true});
    const audit=await new AxeBuilder({page}).analyze();
    expect(audit.violations).toEqual([]);
  }
});

