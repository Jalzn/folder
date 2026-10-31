import { expect, type Page } from '@playwright/test';
import { openBoard, openTrash, projectNavigation, showSidebar } from './navigation.js';

/** Creates a document in the current project, with the "+" of the sidebar's Documentos, and opens it. */
export async function newDocument(page: Page) {
  await showSidebar(page);
  await projectNavigation(page).getByRole('button', { name: 'Novo documento', exact: true }).click();
  await expect(page.getByRole('textbox', { name: 'Título do documento' })).toBeVisible();
}

/** Creates a drawing in the current project, with the "+" of the sidebar's Desenhos, and opens it. */
export async function newDrawing(page: Page) {
  await showSidebar(page);
  await projectNavigation(page).getByRole('button', { name: 'Novo desenho', exact: true }).click();
  await expect(page.getByTestId('canvas-editor')).toBeVisible();
}

/** Creates a task in the current project's first column, from its board. */
export async function newTask(page: Page, title: string) {
  await openBoard(page);
  await page.getByRole('button', { name: 'Nova tarefa', exact: true }).click();
  await page.getByRole('textbox', { name: 'Título da tarefa' }).fill(title);
  await page.getByRole('dialog').getByRole('button', { name: 'Criar tarefa', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
}

/** Moves the open document or drawing to the trash, confirming. */
export async function moveToTrash(page: Page, type: 'documento' | 'desenho') {
  await page.getByRole('button', { name: `Opções do ${type}`, exact: true }).click();
  await page.getByRole('menuitem', { name: 'Mover para a lixeira', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Mover para a lixeira', exact: true }).click();
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
