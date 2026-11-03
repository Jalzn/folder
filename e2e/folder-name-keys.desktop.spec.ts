import { expect, type Page } from '@playwright/test';
import { test } from './fixtures.js';
import { folderRow, itemsTree, rpcFolder } from './support/folders.js';
import { createProject, projectNavigation } from './support/navigation.js';
import { rpc } from './support/rpc.js';
import { login } from './support/session.js';

// The folder name field owns its keys (tree.md A1 and M4), typed for real, not filled. Desktop: the fixed
// sidebar, where F2 and the arrows apply.

/** The project's folders as the server has them, by name. */
const serverFolders = async (page: Page, projectId: string) =>
  (await rpc(page, 'workspace/listFolders', { projectId })).folders.map((folder) => folder.name);

test('in the rename field the arrows move the caret, and only Enter saves', async ({ page }) => {
  await login(page);
  const projectId = await createProject(page, `Teclas ${Date.now()}`);
  await rpcFolder(page, projectId, 'Arquitetura');
  await page.reload();

  await folderRow(page, 'Arquitetura').focus();
  await page.keyboard.press('F2');
  const field = itemsTree(page).getByRole('textbox', { name: 'Novo nome da pasta Arquitetura' });
  await expect(field).toBeFocused();
  // A typo, fixed with the caret: ← ←, ⌫, →, then the right letter.
  await page.keyboard.type('Arquitetrua');
  await page.keyboard.press('ArrowLeft');
  await page.keyboard.press('ArrowLeft');
  await page.keyboard.press('Backspace');
  await page.keyboard.press('ArrowRight');
  await page.keyboard.type('r');
  await expect(field).toHaveValue('Arquitetura');
  // ↑, ↓, Home, End and the shortcut letters stay in the field, which keeps the focus and saves nothing.
  for (const key of ['ArrowUp', 'ArrowDown', 'Home', 'End', 'Shift+ArrowLeft']) await page.keyboard.press(key);
  // → leaves the selection at its end, which is the end of the name.
  await page.keyboard.press('ArrowRight');
  await page.keyboard.type(' mpng');
  await expect(field).toBeFocused();
  await expect(field).toHaveValue('Arquitetura mpng');
  expect(await serverFolders(page, projectId)).toEqual(['Arquitetura']);
  await expect(page.getByRole('menu')).toHaveCount(0);
  await page.keyboard.press('Enter');
  await expect(folderRow(page, 'Arquitetura mpng')).toBeFocused();
  expect(await serverFolders(page, projectId)).toEqual(['Arquitetura mpng']);
});

test('the new folder field selects with ⇧ and the arrows, and keeps its spaces after a type-to-select', async ({
  page,
}) => {
  await login(page);
  const projectId = await createProject(page, `Teclas novas ${Date.now()}`);
  await rpcFolder(page, projectId, 'Arquivo');
  await page.reload();

  await projectNavigation(page).getByRole('button', { name: 'Novo item', exact: true }).click();
  await page.getByRole('menuitem', { name: 'Pasta', exact: true }).click();
  const draft = itemsTree(page).getByRole('textbox', { name: 'Nome da nova pasta' });
  await expect(draft).toBeFocused();
  await page.keyboard.type('Notas fiscais');
  // ⇧← seven times selects "fiscais", which the next letters replace.
  for (let step = 0; step < 7; step += 1) await page.keyboard.press('Shift+ArrowLeft');
  await page.keyboard.type('de compra');
  await page.keyboard.press('ArrowDown');
  await expect(draft).toBeFocused();
  await expect(draft).toHaveValue('Notas de compra');
  expect(await serverFolders(page, projectId)).toEqual(['Arquivo']);
  await page.keyboard.press('Enter');
  await expect(folderRow(page, 'Notas de compra')).toBeFocused();

  // A letter starts a type-to-select on the rows; F2 right after it keeps every space typed.
  await folderRow(page, 'Arquivo').focus();
  await page.keyboard.press('a');
  await expect(folderRow(page, 'Arquivo')).toBeFocused();
  await page.keyboard.press('F2');
  const rename = itemsTree(page).getByRole('textbox', { name: 'Novo nome da pasta Arquivo' });
  await expect(rename).toBeFocused();
  await page.keyboard.type('Arq Velha de 2024');
  await expect(rename).toHaveValue('Arq Velha de 2024');
  await page.keyboard.press('Escape');
  await expect(folderRow(page, 'Arquivo')).toBeFocused();
});
