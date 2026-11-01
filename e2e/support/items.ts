import { expect, type Page } from '@playwright/test';
import { closeDrawer, createInDrawer } from './board.js';
import { openBoard, openTrash, projectNavigation, showSidebar } from './navigation.js';

/** Creates an item at the root of the current project, from the "+" of the sidebar's Itens. */
async function newItem(page: Page, kind: 'Documento' | 'Desenho') {
  await showSidebar(page);
  await projectNavigation(page).getByRole('button', { name: 'Novo item', exact: true }).click();
  await page.getByRole('menuitem', { name: kind, exact: true }).click();
}

/** Creates a document in the current project, from the "+" of the sidebar's Itens, and opens it. */
export async function newDocument(page: Page) {
  await newItem(page, 'Documento');
  await expect(page.getByRole('textbox', { name: 'Título do documento' })).toBeVisible();
}

/** Creates a drawing in the current project, from the "+" of the sidebar's Itens, and opens it. */
export async function newDrawing(page: Page) {
  await newItem(page, 'Desenho');
  await expect(page.getByTestId('canvas-editor')).toBeVisible();
}

/** Creates a task in the current project's first column, from its board, through the drawer, and closes it. */
export async function newTask(page: Page, title: string) {
  await openBoard(page);
  await page.getByRole('button', { name: 'Nova tarefa', exact: true }).click();
  await createInDrawer(page, title);
  await closeDrawer(page);
}

/** Moves the open document or drawing to the trash, confirming. */
export async function moveToTrash(page: Page, type: 'documento' | 'desenho') {
  await page.getByRole('button', { name: `Opções do ${type}`, exact: true }).click();
  await page.getByRole('menuitem', { name: 'Mover para a lixeira', exact: true }).click();
  await page.getByRole('alertdialog').getByRole('button', { name: 'Mover para a lixeira', exact: true }).click();
}

/** The row of an item in the current project's trash. */
export async function trashRow(page: Page, title: string) {
  await openTrash(page);
  return page.getByRole('main').getByRole('listitem').filter({ hasText: title });
}

/** Restores an item from the current project's trash. */
export async function restoreFromTrash(page: Page, title: string) {
  const row = await trashRow(page, title);
  await row.getByRole('button', { name: `Restaurar ${title}`, exact: true }).click();
  await expect(row).toHaveCount(0);
}
