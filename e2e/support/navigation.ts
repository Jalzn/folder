import { expect, type Page } from '@playwright/test';

/** An address inside a project: `/projetos/<id>` and below. */
export const projectAddress = /\/projetos\/[^/?#]+/;
/** A project's Visão geral, where the app goes after an item leaves for the trash. */
export const overviewAddress = /\/projetos\/[^/?#]+$/;

/** The project of the page now shown. */
export function currentProjectId(page: Page) {
  const id = new URL(page.url()).pathname.split('/')[2];
  if (!id) throw new Error(`No project in ${page.url()}.`);
  return id;
}

/** On a narrow screen the sidebar opens over the page from the top bar's menu. */
export async function showSidebar(page: Page) {
  if (await page.getByRole('dialog', { name: 'Navegação' }).isVisible()) return;
  const open = page.getByRole('button', { name: 'Abrir navegação', exact: true });
  if (await open.isVisible()) await open.click();
}

/** Closes the sidebar over the page, if open, and waits until it is gone. */
export async function hideSidebar(page: Page) {
  const overlay = page.getByRole('dialog', { name: 'Navegação' });
  if (!(await overlay.isVisible())) return;
  await page.keyboard.press('Escape');
  await expect(overlay).toBeHidden();
}

/** The current project's navigation in the sidebar. */
export const projectNavigation = (page: Page) => page.getByRole('navigation', { name: /^Projeto / });

/** Opens the project switcher, from the sidebar or from the top bar. */
export async function openSwitcher(page: Page) {
  await page.getByRole('button', { name: /Trocar de projeto|Abrir o seletor/ }).click();
  await expect(page.getByRole('dialog', { name: 'Trocar de projeto' })).toBeVisible();
}

/** Creates a project from the switcher and opens it; returns its id. */
export async function createProject(page: Page, name: string) {
  await openSwitcher(page);
  await page.getByRole('menuitem', { name: 'Novo projeto', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Novo projeto' });
  await dialog.getByRole('textbox', { name: 'Nome' }).fill(name);
  await dialog.getByRole('button', { name: 'Criar projeto', exact: true }).click();
  await expect(page.getByRole('heading', { name, exact: true, level: 1 })).toBeVisible();
  return currentProjectId(page);
}

/** Opens a project's Visão geral from the switcher. */
export async function openProject(page: Page, name: string) {
  await openSwitcher(page);
  await page.getByRole('menuitem', { name, exact: true }).click();
  await expect(page.getByRole('heading', { name, exact: true, level: 1 })).toBeVisible();
}

/** The current project's board, from the sidebar. */
export async function openBoard(page: Page) {
  await showSidebar(page);
  await projectNavigation(page).getByRole('link', { name: 'Quadro' }).click();
  await expect(page).toHaveURL(/\/quadro$/);
}

/** The current project's trash, from the sidebar's footer. */
export async function openTrash(page: Page) {
  await showSidebar(page);
  await page.getByRole('link', { name: /^Lixeira de / }).click();
  await expect(page).toHaveURL(/\/lixeira$/);
}

/** The current project's Índice, filtered by type. */
export async function openIndex(page: Page, type: 'documentos' | 'desenhos') {
  await page.goto(`/${type}`);
  await expect(page).toHaveURL(new RegExp(`/indice\\?tipo=${type}$`));
}

/** The sidebar's Buscar of the current project, over the page on a narrow screen. */
export async function projectSearchbox(page: Page) {
  await showSidebar(page);
  return projectNavigation(page).getByRole('searchbox', { name: /^Buscar em / });
}

/**
 * Searches the current project with the sidebar's Buscar and returns the sidebar's navigation, where the
 * results replace the sections.
 */
export async function searchProject(page: Page, text: string) {
  await (await projectSearchbox(page)).fill(text);
  return projectNavigation(page);
}

/** Leaves an item page for the project's Visão geral through an in-app link, without loading the page again. */
export async function leaveItem(page: Page) {
  await showSidebar(page);
  await projectNavigation(page).getByRole('link', { name: 'Visão geral' }).click();
  await expect(page).toHaveURL(overviewAddress);
}

/** Opens an item listed on the current page, or in the sidebar, by its title. */
export async function openListedItem(page: Page, title: string) {
  await page.getByRole('link').filter({ hasText: title }).first().click();
}
