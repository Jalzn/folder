import { test as base } from '@playwright/test';
import { type Api, apiFor } from './support/rpc.js';
import { signIn } from './support/session.js';
import { startTestServer, type TestServer } from './support/test-server.js';

type Fixtures = {
  controlledClock: boolean;
  api: Api;
  project: { id: string; name: string };
};

/** Files may run together; each worker owns its server, account and SQLite file. */
export const isolatedTest = base.extend<Fixtures, { testServer: TestServer; sample: boolean }>({
  controlledClock: [false, { option: true }],
  page: async ({ page, controlledClock }, use) => {
    if (controlledClock) await page.clock.install();
    await use(page);
  },
  sample: [false, { scope: 'worker', option: true }],
  testServer: [
    async ({ sample }, use) => {
      const server = await startTestServer({ sample });
      try {
        await use(server);
      } finally {
        await server.stop();
      }
    },
    { scope: 'worker' },
  ],
  baseURL: async ({ testServer }, use) => {
    await use(testServer.origin);
  },
  api: async ({ page }, use) => {
    await signIn(page);
    await use(apiFor(page));
  },
  project: async ({ api, page }, use, info) => {
    const name = `Teste ${info.testId}`;
    const project = await api.workspace.createProject({ requestId: crypto.randomUUID(), name });
    await page.goto(`/projetos/${project.id}`);
    await use(project);
  },
});

/** Ordinary scenarios always start in their own project; sample scenarios opt into isolatedTest. */
export const test = isolatedTest.extend<{ workspace: undefined }>({
  workspace: [
    async ({ project }, use) => {
      if (!project.id) throw new Error('The test project was not created.');
      await use(undefined);
    },
    { auto: true },
  ],
});
