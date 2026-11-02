import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { defineConfig, devices } from '@playwright/test';

const data = mkdtempSync(join(tmpdir(), 'tinyfold-e2e-'));
const port = Number(process.env.E2E_PORT ?? 5171);
const origin = `http://localhost:${port}`;
export default defineConfig({
  testDir: './e2e',
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
    env: {
      DATABASE_PATH: join(data, 'tinyfold.sqlite'),
      OWNER_PASSWORD: 'tinyfold-e2e-passphrase',
      OWNER_NAME: 'Você',
      APP_ORIGIN: origin,
      PORT: String(port),
      HOST: '127.0.0.1',
      WEB_DIR: 'src/web/dist',
      COOKIE_SECURE: 'false',
      NODE_ENV: 'test',
    },
  },
});
