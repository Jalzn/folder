import { join } from 'node:path';
import { defineConfig, devices } from '@playwright/test';
import { runDataDirectory, serverEnv } from './e2e/support/server.js';

const port = Number(process.env.E2E_PORT ?? 5171);
const origin = `http://localhost:${port}`;
export default defineConfig({
  testDir: './e2e',
  // Refuses a web bundle older than its code; removes the run's database afterwards.
  globalSetup: './e2e/global-setup.ts',
  globalTeardown: './e2e/global-teardown.ts',
  // A test.only left behind would make CI run one test and pass.
  forbidOnly: Boolean(process.env.CI),
  fullyParallel: false,
  workers: 1,
  timeout: 45_000,
  expect: { timeout: 10_000 },
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: origin,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chrome-desktop',
      use: { ...devices['Desktop Chrome'], channel: 'chrome', viewport: { width: 1440, height: 1000 } },
    },
    { name: 'chrome-mobile', use: { ...devices['Pixel 7'], channel: 'chrome' } },
  ],
  webServer: {
    command: 'pnpm exec tsx src/server/main.ts',
    url: `${origin}/ready`,
    reuseExistingServer: false,
    env: serverEnv({ port, databasePath: join(runDataDirectory(), 'tinyfold.sqlite') }),
  },
});
