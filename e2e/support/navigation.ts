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

/** On a narrow screen the sidebar sits behind the menu button. */
export async function showSidebar(page: Page) {
  const open = page.getByRole('button', { name: 'Abrir navegação', exact: true });
  if (await open.isVisible()) await open.click();
}

/** Creates a project and opens it; returns its id. */
export async function createProject(page: Page, name: string) {
  await showSidebar(page);
  await page.getByRole('button', { name: 'Criar projeto', exact: true }).click();
  await page.getByLabel('Nome do projeto').fill(name);
  await page.getByRole('dialog').getByRole('button', { name: 'Criar projeto', exact: true }).click();
  await expect(page.getByRole('heading', { name, exact: true })).toBeVisible();
  return currentProjectId(page);
}

/** Opens a project's Visão geral. */
export async function openProject(page: Page, name: string) {
  await showSidebar(page);
  await page.getByRole('navigation', { name: 'Projetos' }).getByRole('link', { name, exact: true }).click();
  await expect(page.getByRole('heading', { name, exact: true })).toBeVisible();
}

/** The current project's board. */
export async function openBoard(page: Page) {
  await page.goto('/kanban');
  await expect(page).toHaveURL(/\/quadro$/);
}

/** The current project's trash. */
export async function openTrash(page: Page) {
  await page.goto('/lixeira');
  await expect(page).toHaveURL(/\/lixeira$/);
}

/** The current project's documents or drawings. */
export async function openIndex(page: Page, type: 'documentos' | 'desenhos') {
  await page.goto(`/${type}`);
  await expect(page).toHaveURL(new RegExp(`/indice\\?tipo=${type}$`));
}

/** Searches the current project's documents or drawings and leaves the results on screen. */
export async function searchProject(page: Page, type: 'documentos' | 'desenhos', text: string) {
  await openIndex(page, type);
  await page
    .getByRole('textbox', { name: type === 'documentos' ? 'Buscar nos documentos' : 'Buscar nos desenhos' })
    .fill(text);
}

/** Leaves an item page through an in-app link, without loading the page again. */
export async function leaveItem(page: Page, type: 'documentos' | 'desenhos') {
  await showSidebar(page);
  await page
    .locator('.sidebar')
    .getByRole('link', { name: type === 'documentos' ? 'Documentos' : 'Desenhos', exact: true })
    .click();
  await expect(page).toHaveURL(/\/indice\?tipo=/);
}

/** Opens an item listed on the current page by its title. */
export async function openListedItem(page: Page, title: string) {
  await page.getByRole('link').filter({ hasText: title }).first().click();
}
