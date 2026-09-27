import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  // Concurrent software WebGL renderers trigger the product's low-power fallback.
  // Measure the GPU lifecycle without competing browser workers.
  workers: 1,
  timeout: 30_000,
  retries: 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: { baseURL: 'http://127.0.0.1:4322', viewport: { width: 1366, height: 900 }, trace: 'retain-on-failure', launchOptions: { timeout: 15_000 } },
  projects: [
    { name: 'chromium', use: { browserName: 'chromium' } },
    { name: 'firefox', use: { browserName: 'firefox' } },
    { name: 'webkit', use: { browserName: 'webkit' } },
  ],
  webServer: { command: 'npm run preview -- --port 4322', url: 'http://127.0.0.1:4322', reuseExistingServer: false },
});
