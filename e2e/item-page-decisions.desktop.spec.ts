import { expect, type Page } from '@playwright/test';
import { test } from './fixtures.js';
import { seedCanvas, seedProject } from './support/builders.js';
import { createSavedDocument } from './support/document.js';
import { appShortcut } from './support/keyboard.js';
import { abortRpc } from './support/network.js';
import { rpc } from './support/rpc.js';
import { login } from './support/session.js';

// The decided fixes of the open item's page (docs/etapas/12-refatoracao.md, "Correções decididas").

const editor = (page: Page) => page.getByTestId('document-content');
const idOf = (page: Page) => new URL(page.url()).pathname.split('/').at(-1) ?? '';

/** A new document with one line saved; the caret stays at its end. */
async function savedDocument(page: Page, title: string, line: string) {
  await createSavedDocument(page, title, line);
  return idOf(page);
}

async function trashDocument(page: Page, id: string) {
  const document = await rpc(page, 'workspace/getDocument', { id });
  await rpc(page, 'workspace/deleteDocument', {
    id,
    expectedVersion: document.version,
    requestId: crypto.randomUUID(),
  });
}

test('W5.7a: a document trashed elsewhere keeps its editor while it holds unsaved text, and shows the trash notice without it', async ({
  page,
}) => {
  await login(page);
  const kept = await savedDocument(page, `Excluído com rascunho ${Date.now()}`, 'Primeira versão salva.');
  // Text that never reaches the server, then the document goes to the trash from elsewhere.
  const restoreSaves = await abortRpc(page, 'workspace/saveDocument');
  await editor(page).fill('Texto que não chegou ao servidor.');
  await expect(page.getByText('Não salvou', { exact: true })).toBeVisible();
  await trashDocument(page, kept);
  await restoreSaves();
  await page.reload();

  await expect(editor(page)).toContainText('Texto que não chegou ao servidor.');
  await expect(page.getByText('Este documento foi movido para a lixeira.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Salvar meu rascunho como cópia' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Baixar cópia' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Abrir lixeira' })).toBeVisible();
  // The trash band alone: no failure beside it, and no save state to retry in the bar.
  await expect(page.getByText('Seu rascunho continua aqui.')).toHaveCount(0);
  await expect(page.getByText('Não salvou', { exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Tentar de novo' })).toHaveCount(0);

  // Nothing is sent to the trashed document: not when the network returns, nor by ⌘S, nor as the page leaves
  // and opens again. The text stays in the draft on this device.
  const saves: string[] = [];
  page.on('request', (request) => {
    if (new URL(request.url()).pathname === '/rpc/workspace/saveDocument') saves.push(request.url());
  });
  await page.evaluate(() => window.dispatchEvent(new Event('online')));
  await appShortcut(page, 's');
  await page.reload();
  await expect(editor(page)).toContainText('Texto que não chegou ao servidor.');
  await expect(page.getByText('Este documento foi movido para a lixeira.')).toBeVisible();
  expect(saves).toEqual([]);

  // With nothing local, the page only leads to the trash.
  const plain = await savedDocument(page, `Excluído sem rascunho ${Date.now()}`, 'Tudo salvo.');
  await trashDocument(page, plain);
  await page.reload();
  await expect(page.getByText('Este documento está na lixeira')).toBeVisible();
  await expect(editor(page)).toHaveCount(0);
});

/** The rows ⌘K shows on the page, by their labels without the keys. */
async function paletteRows(page: Page) {
  await appShortcut(page, 'k');
  const palette = page.getByRole('dialog', { name: 'Buscar e comandar' });
  await expect(palette).toBeVisible();
  const labels = await palette.locator('[role="menuitem"] .palette-row__label').allInnerTexts();
  await page.keyboard.press('Escape');
  await expect(palette).toBeHidden();
  return labels.map((label) => label.trim());
}

/** Neither the document's nor the drawing's own commands: the page offers no editor. */
const editorCommands = [
  'Criar tarefa da seleção',
  'Incorporar tarefa…',
  'Incorporar desenho…',
  'Exportar Markdown',
  'Importar Markdown',
  'Importar desenho',
  'Exportar desenho editável',
  'Exportar PNG',
  'Mover para a lixeira',
  'Salvar agora',
];

test('E2: a trashed document or drawing with nothing local offers ⌘K no command of its editor, nor its title to the tab', async ({
  page,
}) => {
  await login(page);
  const id = await savedDocument(page, `Na lixeira sem nada local ${Date.now()}`, 'Tudo salvo.');
  await trashDocument(page, id);
  await page.reload();
  await expect(page.getByText('Este documento está na lixeira')).toBeVisible();
  await expect(page).toHaveTitle('Tinyfold');
  const documentRows = await paletteRows(page);
  expect(documentRows).toEqual(expect.arrayContaining(['Fixar', 'Mover para pasta…', 'Mover para projeto…']));
  expect(documentRows.filter((label) => editorCommands.includes(label))).toEqual([]);

  const drawing = await drawingInProject(page, `Lixeira com desenho ${Date.now()}`);
  const canvas = await rpc(page, 'workspace/getCanvas', { id: drawing.id });
  await rpc(page, 'workspace/deleteCanvas', {
    id: drawing.id,
    expectedVersion: canvas.version,
    requestId: crypto.randomUUID(),
  });
  await page.goto(`/projetos/${drawing.projectId}/desenhos/${drawing.id}`);
  await expect(page.getByText('Este desenho está na lixeira')).toBeVisible();
  await expect(page).toHaveTitle('Tinyfold');
  const drawingRows = await paletteRows(page);
  expect(drawingRows).toEqual(expect.arrayContaining(['Fixar', 'Mover para pasta…', 'Mover para projeto…']));
  expect(drawingRows.filter((label) => editorCommands.includes(label))).toEqual([]);
});

/** An empty drawing made over RPC in a new project, with the project's ID. */
async function drawingInProject(page: Page, name: string) {
  const project = await seedProject(page, { name });
  const created = await seedCanvas(page, {
    projectId: project.id,
    title: 'Planta',
  });
  return { projectId: project.id, id: created.id ?? '' };
}

test('W5.7b: an archived project’s drawing opens to read only, with the band, and no save goes out', async ({
  page,
}) => {
  await login(page);
  const { projectId, id } = await drawingInProject(page, `Arquivado com desenho ${Date.now()}`);
  const project = (await rpc(page, 'workspace/listProjects', {})).find((each) => each.id === projectId);
  if (!project) throw new Error('Project not found.');
  await rpc(page, 'workspace/updateProject', {
    id: projectId,
    expectedVersion: project.version,
    archived: true,
    requestId: crypto.randomUUID(),
  });
  const saves: string[] = [];
  page.on('request', (request) => {
    if (request.url().includes('/rpc/workspace/saveCanvas')) saves.push(request.url());
  });
  await page.goto(`/projetos/${projectId}/desenhos/${id}`);
  await expect(page.getByText('Projeto arquivado: desarquive para editar o desenho.')).toBeVisible();
  const title = page.getByRole('textbox', { name: 'Título do desenho' });
  await expect(title).toHaveAttribute('readonly', '');
  await title.click();
  await page.keyboard.type(' novo');
  await expect(title).toHaveValue('Planta');

  // A rectangle drawn with the keyboard's tool and a drag changes nothing.
  const frame = page.getByTestId('canvas-editor');
  const box = await frame.boundingBox();
  if (!box) throw new Error('no canvas');
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  await page.keyboard.press('r');
  await page.mouse.move(box.x + 200, box.y + 200);
  await page.mouse.down();
  await page.mouse.move(box.x + 320, box.y + 300, { steps: 5 });
  await page.mouse.up();
  await page.waitForTimeout(2500);
  expect(saves).toEqual([]);
});
test('W5.7c: the drawing’s hidden file field stays out of the Tab order', async ({ page }) => {
  await login(page);
  const { projectId, id } = await drawingInProject(page, `Tab do desenho ${Date.now()}`);
  await page.goto(`/projetos/${projectId}/desenhos/${id}`);
  const field = page.getByLabel('Importar arquivo Excalidraw');
  await expect(field).toHaveAttribute('tabindex', '-1');
  // From the title, Shift+Tab walks back through the bands and the bar without stopping on the field.
  await page.getByRole('textbox', { name: 'Título do desenho' }).focus();
  for (let step = 0; step < 12; step += 1) {
    await page.keyboard.press('Shift+Tab');
    expect(await field.evaluate((input) => input === document.activeElement)).toBe(false);
  }
});
