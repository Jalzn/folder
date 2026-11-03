import { expect } from '@playwright/test';
import { test } from './fixtures.js';

import { rpc } from './support/rpc.js';

// The sample gets an empty database of its own and uses the same server lifecycle as every worker.
test.use({ sample: true });

test('opening each document and drawing of the sample saves nothing, and each stays at version 1', {
  tag: '@timing',
}, async ({ page, api }) => {
  test.setTimeout(120_000);
  const saves: string[] = [];
  page.on('request', (request) => {
    const procedure = new URL(request.url()).pathname;
    if (procedure === '/rpc/workspace/saveDocument' || procedure === '/rpc/workspace/saveCanvas') saves.push(procedure);
  });
  const projects = await api.workspace.listProjects({ includeArchived: true });
  const opened: string[] = [];
  for (const project of projects) {
    for (const document of await rpc(page, 'workspace/listDocuments', { projectId: project.id })) {
      await page.goto(`/projetos/${project.id}/documentos/${document.id}`);
      await expect(page.getByRole('textbox', { name: 'Título do documento' })).toHaveValue(document.title);
      // Past the autosave's 650 ms, with the page settled.
      await page.waitForTimeout(1_500);
      expect(saves, document.title).toEqual([]);
      expect((await rpc(page, 'workspace/getDocument', { id: document.id })).version, document.title).toBe(1);
      opened.push(document.title);
    }
    for (const drawing of await rpc(page, 'workspace/listCanvases', { projectId: project.id })) {
      await page.goto(`/projetos/${project.id}/desenhos/${drawing.id}`);
      await expect(page.locator('.excalidraw canvas.interactive')).toBeVisible();
      await page.waitForTimeout(1_500);
      expect(saves, drawing.title).toEqual([]);
      expect((await rpc(page, 'workspace/getCanvas', { id: drawing.id })).version, drawing.title).toBe(1);
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
