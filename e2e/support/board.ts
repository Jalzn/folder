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
    .getByRole('listitem')
    .filter({ has: page.getByRole('button', { name: title, exact: true }) });

/** A column of the board, by its name. */
export const column = (page: Page, name: string) => page.getByRole('region', { name, exact: true });

/** Chooses an item of a card's ⋯, and of its "Mover para" when `to` names a column, "Topo" or "Fim". */
export async function cardMenu(page: Page, title: string, item: string, to?: string) {
  await page.getByRole('button', { name: `Opções de ${title}`, exact: true }).click();
  // An item's name also carries its shortcut, as "Concluir Ctrl↵".
  const menuItem = page.getByRole('menuitem').filter({ has: page.getByText(item, { exact: true }) });
  if (!to) return menuItem.click();
  await menuItem.press('ArrowRight');
  await page
    .getByRole('menu', { name: 'Mover para' })
    .getByRole('menuitemradio')
    .filter({ has: page.getByText(to, { exact: true }) })
    .click();
}

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
