import { expect, type Page, test } from '@playwright/test';
import { moveToTrash, newDocument, newDrawing, restoreFromTrash, trashRow } from './support/items.js';
import {
  createProject,
  hideSidebar,
  openListedItem,
  projectNavigation,
  projectSearchbox,
  searchProject,
  showSidebar,
} from './support/navigation.js';
import { answers } from './support/rpc.js';
import { login } from './support/session.js';

const canvasTitle = (page: Page) => page.getByRole('textbox', { name: 'Título do desenho' });

async function saveCanvasTitle(page: Page, title: string) {
  const saved = page.waitForResponse(
    (response) =>
      answers(response, 'workspace/saveCanvas') &&
      response.status() === 200 &&
      Boolean(response.request().postData()?.includes(title)),
  );
  await canvasTitle(page).fill(title);
  await saved;
  await expect(page.getByText('Salvo', { exact: true })).toBeVisible();
}

test('a project keeps its drawings through the sidebar, the Índice, the trash and archiving', async ({
  page,
}, info) => {
  const suffix = `${info.project.name} ${Date.now()}`;
  const projectName = `Projeto visual ${suffix}`;
  const drawingTitle = `Mapa do projeto ${suffix}`;
  await login(page);
  await createProject(page, projectName);
  const projectUrl = page.url();
  await newDrawing(page);
  await expect(page).toHaveURL(new RegExp(`^${projectUrl}/desenhos/`));
  await saveCanvasTitle(page, drawingTitle);
  const drawingUrl = page.url();
  await showSidebar(page);
  const sidebarLink = projectNavigation(page).getByRole('link', { name: new RegExp(`^${drawingTitle}, desenho`) });
  await expect(sidebarLink).toHaveAttribute('aria-current', 'page');
  await hideSidebar(page);

  const results = await searchProject(page, drawingTitle);
  const row = results.getByRole('link').filter({ hasText: drawingTitle });
  await expect(row).toBeVisible();
  await (await projectSearchbox(page)).fill('Uma busca sem resultado neste desenho');
  await expect(row).toHaveCount(0);
  await expect(results.getByRole('region', { name: 'Itens: 0' })).toBeVisible();
  await (await projectSearchbox(page)).fill(drawingTitle);
  await row.click();
  await expect(page).toHaveURL(drawingUrl);
  await moveToTrash(page, 'desenho');
  await expect(page).toHaveURL(projectUrl);
  await expect(await trashRow(page, drawingTitle)).toContainText('Desenho');
  await restoreFromTrash(page, drawingTitle);
  await page.goto(projectUrl);
  await openListedItem(page, drawingTitle);
  await expect(canvasTitle(page)).toHaveValue(drawingTitle);
  await expect(page).toHaveURL(drawingUrl);
  await page.screenshot({ path: info.outputPath('desenho-restaurado.png'), fullPage: true });

  await page.goto(projectUrl);
  await page.getByRole('button', { name: 'Opções do projeto', exact: true }).click();
  await page.getByRole('menuitem', { name: 'Arquivar', exact: true }).click();
  const archived = page.getByText('Projeto arquivado. O conteúdo está preservado.');
  await expect(archived).toBeVisible();
  await showSidebar(page);
  await expect(projectNavigation(page).getByRole('button', { name: 'Novo item', exact: true })).toHaveCount(0);
  await expect(projectNavigation(page).getByRole('link', { name: new RegExp(`^${drawingTitle}`) })).toBeVisible();
  await hideSidebar(page);
  await page.getByRole('main').getByRole('button', { name: 'Desarquivar', exact: true }).click();
  await expect(archived).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('the sidebar lists the project documents and drawings and opens each one', async ({ page }, info) => {
  const suffix = `${info.project.name} ${Date.now()}`;
  const documentTitle = `Nota visual ${suffix}`;
  const drawingTitle = `Rascunho visual ${suffix}`;
  await login(page);
  await newDocument(page);
  const documentSaved = page.waitForResponse(
    (response) =>
      answers(response, 'workspace/saveDocument') &&
      response.status() === 200 &&
      Boolean(response.request().postData()?.includes(documentTitle)),
  );
  await page.getByRole('textbox', { name: 'Título do documento' }).fill(documentTitle);
  await documentSaved;
  const documentUrl = page.url();
  await newDrawing(page);
  await saveCanvasTitle(page, drawingTitle);
  const drawingUrl = page.url();
  await showSidebar(page);
  await projectNavigation(page)
    .getByRole('link', { name: new RegExp(`^${documentTitle}, documento`) })
    .click();
  await expect(page).toHaveURL(documentUrl);
  await showSidebar(page);
  const drawing = projectNavigation(page).getByRole('link', { name: new RegExp(`^${drawingTitle}, desenho`) });
  await expect(drawing).not.toHaveAttribute('aria-current', 'page');
  await page.screenshot({ path: info.outputPath('lateral-do-projeto.png'), fullPage: true });
  await drawing.click();
  await expect(page).toHaveURL(drawingUrl);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
