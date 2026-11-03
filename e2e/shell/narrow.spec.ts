import { expect, type Page } from '@playwright/test';
import { test } from '../fixtures.js';
import { cardMenu, column, drawer, openDrawer } from '../support/board.js';
import { seedCanvas, seedDocument, seedFolder, seedTask } from '../support/builders.js';
import { folderRow, treeRow } from '../support/folders.js';
import { moveToTrash, newDocument, newTask } from '../support/items.js';
import { createProject, hideSidebar, showSidebar } from '../support/navigation.js';
import { rpc } from '../support/rpc.js';

/** Whether the project's name in the top bar ends before the page's actions start. */
async function nameClearsActions(page: Page) {
  const name = await page.locator('.top-bar__name').boundingBox();
  const actions = await page.locator('.top-bar__actions').boundingBox();
  if (!name || !actions) throw new Error('The top bar has no name or no actions.');
  return name.x + name.width <= actions.x;
}

test('below 720 px a long project name gives way to the page actions', { tag: '@mobile' }, async ({ page }) => {
  // 40 characters, more than the bar holds beside the actions.
  const name = `Barra estreita com nome comprido ${String(Date.now()).slice(-7)}`;
  const project = await createProject(page, name);
  await newDocument(page);
  await expect(page.getByText('Salvo', { exact: true })).toBeVisible();
  const document = page.url();
  // One item in the trash, so the trash shows its action.
  await newDocument(page);
  await expect(page.getByText('Salvo', { exact: true })).toBeVisible();
  await moveToTrash(page, 'documento');

  for (const address of [
    document,
    `/projetos/${project}/lixeira`,
    `/projetos/${project}/quadro`,
    `/projetos/${project}/indice`,
  ]) {
    await page.goto(address);
    await expect(page.locator('.top-bar__actions').getByRole('button').first()).toBeVisible();
    await expect(page.getByRole('button', { name: new RegExp(name) })).toBeVisible();
    expect(await nameClearsActions(page), address).toBe(true);
  }
});

test('the page actions keep the focus when the window crosses 720 px', { tag: '@desktop' }, async ({ page }) => {
  await newDocument(page);
  await expect(page.getByText('Salvo', { exact: true })).toBeVisible();
  const options = page.getByRole('button', { name: 'Opções do documento', exact: true });

  // With its menu open, ⋯ moves into the top bar and takes the focus there.
  await options.click();
  await expect(page.getByRole('menu')).toBeVisible();
  await page.setViewportSize({ width: 600, height: 900 });
  await expect(page.getByRole('menu')).toHaveCount(0);
  await expect(options).toBeFocused();
  await expect(page.locator('.top-bar__actions').getByRole('button', { name: 'Opções do documento' })).toBeVisible();

  // Back to the page bar, the same button keeps it.
  await page.setViewportSize({ width: 1440, height: 1000 });
  await expect(page.locator('.top-bar')).toHaveCount(0);
  await expect(options).toBeFocused();
});

test('on a phone the tree opens over the page: a tap opens a folder, its tools show, and ⋯ moves an item', {
  tag: '@mobile',
}, async ({ page }) => {
  const project = await createProject(page, `Celular ${Date.now()}`);
  const folder = await seedFolder(page, { projectId: project, name: 'Leituras' });
  await seedDocument(page, { projectId: project, title: 'Artigo', folderId: folder });
  const { id } = await seedDocument(page, { projectId: project, title: 'Rascunho' });
  await page.reload();

  await showSidebar(page);
  const row = folderRow(page, 'Leituras');
  await row.tap();
  await expect(row).toHaveAttribute('aria-expanded', 'true');
  await expect(treeRow(page, 'Artigo')).toBeVisible();
  // Without hover, the folder's "+" and "⋯" stay on screen.
  await expect(row.getByRole('button', { name: 'Novo em Leituras' })).toBeVisible();
  await expect(row.getByRole('button', { name: 'Opções da pasta Leituras' })).toBeVisible();
  await row.tap();
  await expect(row).toHaveAttribute('aria-expanded', 'false');
  await hideSidebar(page);

  // The page's ⋯ says where the item is and moves it; the header has no folder label on a phone.
  await page.goto(`/projetos/${project}/documentos/${id}`);
  await expect(page.getByRole('button', { name: /^Sem pasta\. Mover para pasta/ })).toHaveCount(0);
  await page.getByRole('button', { name: 'Opções do documento', exact: true }).click();
  await page.getByRole('menuitem', { name: /^Mover para pasta…/ }).click();
  await page
    .getByRole('menu', { name: 'Pastas' })
    .getByRole('menuitem', { name: /^Leituras/ })
    .click();
  await expect(page.getByText('Movido para Leituras.')).toBeVisible();
  await page.getByRole('button', { name: 'Opções do documento', exact: true }).click();
  await expect(page.getByRole('menuitem', { name: /^Mover para pasta…/ })).toContainText('Em Leituras');
  await page.keyboard.press('Escape');
});

test('on a phone the board scrolls sideways, ⋯ moves a card, and the drawer covers the page', {
  tag: '@mobile',
}, async ({ page }) => {
  await createProject(page, `Quadro no celular ${Date.now()}`);
  // newTask opens the board itself: opening it twice on a phone races the sidebar's slide.
  await newTask(page, 'Medir a janela');
  // The columns scroll inside the board, not the page.
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  const row = page.locator('.board-columns');
  expect(await row.evaluate((element) => element.scrollWidth > element.clientWidth)).toBe(true);
  // The column's "+" and ⋯ show without hover, and the card's ⋯ moves it.
  await expect(column(page, 'A fazer').getByRole('button', { name: 'Opções da coluna A fazer' })).toBeVisible();
  await cardMenu(page, 'Medir a janela', 'Mover para', 'Em andamento');
  await expect(
    column(page, 'Em andamento').getByRole('button', { name: 'Medir a janela', exact: true }),
  ).toBeAttached();
  await openDrawer(page, 'Medir a janela');
  const main = await page.locator('main').boundingBox();
  const sheet = await drawer(page).boundingBox();
  expect(sheet && main && sheet.height >= main.height - 1).toBe(true);
  await expect(drawer(page).getByRole('button', { name: 'Fechar a gaveta', exact: true })).toBeVisible();
});

test('on a phone the embeds take the width: a tap opens the card in the drawer, Restaurar shows, the figure opens', {
  tag: '@mobile',
}, async ({ page }) => {
  const projectId = await createProject(page, `Incorporados no celular ${Date.now()}`);
  const task = await seedTask(page, {
    projectId,
    title: 'Card no celular',
  });
  const trashed = await seedTask(page, {
    projectId,
    title: 'Na lixeira do celular',
  });
  await rpc(page, 'workspace/deleteTask', {
    id: trashed.id,
    expectedVersion: trashed.version,
    requestId: crypto.randomUUID(),
  });
  const drawing = await seedCanvas(page, {
    projectId,
    title: 'Figura no celular',
  });
  const document = await seedDocument(page, {
    projectId,
    title: 'Documento com incorporados',
    content: [
      { id: 'e1', type: 'taskEmbed', props: { taskId: task.id }, children: [] },
      { id: 'e2', type: 'taskEmbed', props: { taskId: trashed.id }, children: [] },
      { id: 'e3', type: 'drawingEmbed', props: { canvasId: drawing.id }, children: [] },
    ],
  });
  await page.goto(`/projetos/${projectId}/documentos/${document.id}`);
  const content = page.getByTestId('document-content');
  const card = content.getByRole('button', { name: /^Tarefa: Card no celular,/ });
  await expect(card).toBeVisible();
  const width = await content.evaluate((element) => element.getBoundingClientRect().width);
  expect((await card.boundingBox())?.width ?? 0).toBeGreaterThan(width - 4);
  const missing = content.locator('.embed-missing');
  await expect(missing).toContainText('Na lixeira: Na lixeira do celular');
  expect((await missing.boundingBox())?.width ?? 0).toBeGreaterThan(width - 4);
  // Restaurar and Remover show without a pointer to hover.
  await expect(content.getByRole('button', { name: 'Restaurar “Na lixeira do celular”', exact: true })).toBeVisible();
  await card.tap();
  await expect(drawer(page)).toBeVisible();
  await drawer(page).getByRole('button', { name: 'Fechar a gaveta', exact: true }).tap();
  // The focus does not go back to the editor, which would bring up the on-screen keyboard.
  await expect(drawer(page)).toHaveCount(0);
  await expect(content).not.toBeFocused();
  await content.getByRole('link', { name: /^Figura 1: Figura no celular\./ }).tap();
  await expect(page).toHaveURL(new RegExp(`/projetos/${projectId}/desenhos/${drawing.id}$`));
});
