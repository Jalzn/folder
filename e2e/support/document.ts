import { expect, type Page } from '@playwright/test';
import { pressCommand } from './keyboard.js';

/**
 * ⌘⌥T (Ctrl+Alt+T on the suite's devices): a task from the excerpt selected in the document's editor. It
 * waits for the formatting toolbar, which shows once the editor has the selection: the keys come faster than
 * any person types, before the editor reads a selection the mouse or ⇧ made.
 */
export async function createTaskFromSelection(page: Page) {
  await expect(page.getByRole('button', { name: 'Criar tarefa', exact: true })).toBeVisible();
  await pressCommand(page, 'Alt+t');
}

/** The document's "Tarefas · n" popover, opened from the bar: the tasks born in the document. */
export async function openDocumentTasks(page: Page) {
  await page.getByRole('button', { name: /^Tarefas · / }).click();
  const tasks = page.getByRole('dialog', { name: 'Tarefas deste documento' });
  await expect(tasks).toBeVisible();
  return tasks;
}
