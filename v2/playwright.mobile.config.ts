import { defineConfig } from '@playwright/test';
import process from 'node:process';
export default defineConfig({
  testDir: './tests-mobile', workers: 1, timeout: 30000,
  use: { baseURL: 'http://127.0.0.1:4325', viewport: { width: 390, height: 844 }, reducedMotion: 'reduce', ...(process.env.PLAYWRIGHT_CHROME ? { channel: 'chrome' } : {}) },
  webServer: { command: 'node scripts/serve-mobile.mjs', url: 'http://127.0.0.1:4325', reuseExistingServer: !process.env.CI },
});
