import { expect, type Page, test } from '@playwright/test';
import { cardMenu, column, drawer, openDrawer } from './support/board.js';
import { folderRow, rpcDocument, rpcFolder, treeRow } from './support/folders.js';
import { moveToTrash, newDocument, newTask } from './support/items.js';
import { createProject, hideSidebar, showSidebar } from './support/navigation.js';
import { login } from './support/session.js';

/** Whether the project's name in the top bar ends before the page's actions start. */
async function nameClearsActions(page: Page) {
  const name = await page.locator('.top-bar__name').boundingBox();
  const actions = await page.locator('.top-bar__actions').boundingBox();
  if (!name || !actions) throw new Error('The top bar has no name or no actions.');
  return name.x + name.width <= actions.x;
}

test('below 720 px a long project name gives way to the page actions', async ({ page }, info) => {
  test.skip(info.project.name !== 'chrome-mobile', 'Only a phone has the single top bar.');
  // 40 characters, more than the bar holds beside the actions.
  const name = `Barra estreita com nome comprido ${String(Date.now()).slice(-7)}`;
  await login(page);
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

test('the page actions keep the focus when the window crosses 720 px', async ({ page }, info) => {
  test.skip(info.project.name === 'chrome-mobile', 'A phone keeps its width.');
  await login(page);
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

test('on a phone the tree opens over the page: a tap opens a folder, its tools show, and ⋯ moves an item', async ({
  page,
}, info) => {
  test.skip(info.project.name !== 'chrome-mobile', 'A phone: touch, no hover and no drag.');
  await login(page);
  const project = await createProject(page, `Celular ${Date.now()}`);
  const folder = await rpcFolder(page, project, 'Leituras');
  await rpcDocument(page, project, 'Artigo', folder);
  const { id } = await rpcDocument(page, project, 'Rascunho');
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

test('on a phone the board scrolls sideways, ⋯ moves a card, and the drawer covers the page', async ({
  page,
}, info) => {
  test.skip(info.project.name !== 'chrome-mobile', 'A phone: touch, no hover and no drag.');
  await login(page);
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
