import { expect, type Page } from '@playwright/test';

/** The task drawer with a task open in it. */
export const drawer = (page: Page) => page.getByRole('region', { name: /^Tarefa: / });

/** The drawer of a task, by its title. */
export const drawerOf = (page: Page, title: string) =>
  page.getByRole('region', { name: `Tarefa: ${title}`, exact: true });

/** The drawer of a new task. */
export const newTaskDrawer = (page: Page) => page.getByRole('region', { name: 'Nova tarefa', exact: true });

/** A card on the board, by its title. */
export const card = (page: Page, title: string) =>
  page
    .getByRole('main')
    .getByRole('article')
    .filter({ has: page.getByRole('button', { name: title, exact: true }) });

/** Opens a task in the drawer from its card on the board. */
export async function openDrawer(page: Page, title: string) {
  await page.getByRole('main').getByRole('button', { name: title, exact: true }).click();
  await expect(drawerOf(page, title)).toBeVisible();
}

/** Types a new task's title over what its field holds, with real keys, and creates it; the drawer shows it. */
export async function createInDrawer(page: Page, title: string) {
  const form = newTaskDrawer(page);
  const field = form.getByRole('textbox', { name: 'Título da nova tarefa' });
  await expect(field).toBeFocused();
  await field.press('ControlOrMeta+a');
  await page.keyboard.type(title);
  await form.getByRole('button', { name: 'Criar', exact: true }).click();
  await expect(drawerOf(page, title)).toBeVisible();
}

/** Closes the drawer by its ✕. */
export async function closeDrawer(page: Page) {
  await drawer(page).getByRole('button', { name: 'Fechar a gaveta', exact: true }).click();
  await expect(drawer(page)).toHaveCount(0);
}
