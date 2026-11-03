import { defineConfig, devices } from '@playwright/test';

const desktop = { ...devices['Desktop Chrome'], channel: 'chrome', viewport: { width: 1440, height: 1000 } };
export default defineConfig({
  testDir: './e2e',
  // Refuses a web bundle older than its code. Worker fixtures own the temporary servers.
  globalSetup: './e2e/global-setup.ts',
  // A test.only left behind would make CI run one test and pass.
  forbidOnly: Boolean(process.env.CI),
  fullyParallel: false,
  workers: 4,
  timeout: 45_000,
  expect: { timeout: 10_000 },
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chrome-desktop',
      testIgnore: '**/*.mobile.spec.ts',
      grepInvert: /@mobile|@timing/,
      use: desktop,
    },
    {
      name: 'chrome-mobile',
      testIgnore: '**/*.desktop.spec.ts',
      grepInvert: /@desktop|@timing/,
      use: { ...devices['Pixel 7'], channel: 'chrome' },
    },
    {
      name: 'chrome-desktop-timing',
      testIgnore: '**/*.mobile.spec.ts',
      grep: /@timing/,
      workers: 1,
      dependencies: ['chrome-desktop', 'chrome-mobile'],
      use: desktop,
    },
  ],
});
