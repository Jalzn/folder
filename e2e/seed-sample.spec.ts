import { type ChildProcess, execFileSync, spawn } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, type Page, test } from '@playwright/test';
import { serverEnv } from './support/server.js';

// The sample of `pnpm seed:sample`, opened in the real editors: neither the document editor nor
// Excalidraw changes what the seed wrote, so opening saves nothing (stage 11, decision 16). The
// suite's server has its own data, and the seed only writes to an empty database, so this spec seeds
// one and serves it on the next port.
const port = Number(process.env.E2E_PORT ?? 5171) + 1;
const base = `http://localhost:${port}`;
const password = 'tinyfold-e2e-sample';

let directory = '';
let server: ChildProcess | undefined;

test.describe.configure({ mode: 'serial' });
test.skip(({ isMobile }) => isMobile, 'The scenes and blocks the seed writes are the same on every device.');

test.beforeAll(async () => {
  directory = mkdtempSync(join(tmpdir(), 'tinyfold-e2e-sample-'));
  const env = { ...process.env, DATABASE_PATH: join(directory, 'tinyfold.sqlite') };
  execFileSync('pnpm', ['exec', 'tsx', 'scripts/seed-sample.ts'], { env, stdio: 'ignore' });
  server = spawn('pnpm', ['exec', 'tsx', 'src/server/main.ts'], {
    env: { ...env, ...serverEnv({ port, databasePath: env.DATABASE_PATH, password }) },
    stdio: 'ignore',
    detached: true,
  });
  await expect
    .poll(
      async () =>
        fetch(`${base}/ready`).then(
          (response) => response.status,
          () => 0,
        ),
      { timeout: 30_000 },
    )
    .toBe(200);
});

test.afterAll(() => {
  // The group's leader is pnpm; the server is its child.
  if (server?.pid) process.kill(-server.pid, 'SIGTERM');
  if (directory) rmSync(directory, { recursive: true, force: true });
});

async function signIn(page: Page) {
  await page.goto(`${base}/`);
  await page.getByLabel('Sua senha').fill(password);
  await page.getByRole('button', { name: 'Entrar no Tinyfold' }).click();
  await expect(page).toHaveURL(/\/projetos/);
}

const rpc = async <T>(page: Page, procedure: string, input: unknown): Promise<T> => {
  const response = await page.request.post(`${base}/rpc/workspace/${procedure}`, {
    data: { json: input },
    headers: { origin: base },
  });
  expect(response.ok(), procedure).toBe(true);
  return ((await response.json()) as { json: T }).json;
};

interface Item {
  id: string;
  title: string;
  version: number;
}

test('opening each document and drawing of the sample saves nothing, and each stays at version 1', async ({ page }) => {
  test.setTimeout(120_000);
  await signIn(page);
  const saves: string[] = [];
  page.on('request', (request) => {
    const procedure = new URL(request.url()).pathname;
    if (procedure === '/rpc/workspace/saveDocument' || procedure === '/rpc/workspace/saveCanvas') saves.push(procedure);
  });
  const projects = await rpc<{ id: string; name: string }[]>(page, 'listProjects', { includeArchived: true });
  const opened: string[] = [];
  for (const project of projects) {
    for (const document of await rpc<Item[]>(page, 'listDocuments', { projectId: project.id })) {
      await page.goto(`${base}/projetos/${project.id}/documentos/${document.id}`);
      await expect(page.getByRole('textbox', { name: 'Título do documento' })).toHaveValue(document.title);
      // Past the autosave's 650 ms, with the page settled.
      await page.waitForTimeout(1_500);
      expect(saves, document.title).toEqual([]);
      expect((await rpc<Item>(page, 'getDocument', { id: document.id })).version, document.title).toBe(1);
      opened.push(document.title);
    }
    for (const drawing of await rpc<Item[]>(page, 'listCanvases', { projectId: project.id })) {
      await page.goto(`${base}/projetos/${project.id}/desenhos/${drawing.id}`);
      await expect(page.locator('.excalidraw canvas.interactive')).toBeVisible();
      await page.waitForTimeout(1_500);
      expect(saves, drawing.title).toEqual([]);
      expect((await rpc<Item>(page, 'getCanvas', { id: drawing.id })).version, drawing.title).toBe(1);
      opened.push(drawing.title);
    }
  }
  expect(opened).toEqual(
    expect.arrayContaining([
      'Visão do produto',
      'MCP somente leitura',
      'Navegação com projeto no centro',
      'Fluxo do autosave',
      'Planta do escritório',
      'Rabisco de logo',
    ]),
  );
  expect(opened).toHaveLength(11);
});
