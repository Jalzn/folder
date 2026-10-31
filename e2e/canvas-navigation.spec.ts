import { expect, type Page, test } from '@playwright/test';
import { moveToTrash, newDocument, newDrawing, restoreFromTrash, trashRow } from './support/items.js';
import { createProject, leaveItem, openIndex } from './support/navigation.js';
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

test('project drawings support keyboard tabs, the project list, trash and restore', async ({ page }, info) => {
  const suffix = `${info.project.name} ${Date.now()}`;
  const projectName = `Projeto visual ${suffix}`;
  const drawingTitle = `Mapa do projeto ${suffix}`;
  await login(page);
  await createProject(page, projectName);
  const projectUrl = page.url();

  const documents = page.getByRole('tab', { name: /^Documentos/ });
  const canvases = page.getByRole('tab', { name: /^Desenhos/ });
  const kanban = page.getByRole('tab', { name: 'Kanban', exact: true });
  await documents.focus();
  await documents.press('ArrowRight');
  await expect(canvases).toBeFocused();
  await expect(canvases).toHaveAttribute('aria-selected', 'true');
  await canvases.press('End');
  await expect(kanban).toBeFocused();
  await expect(kanban).toHaveAttribute('aria-selected', 'true');
  await kanban.press('ArrowRight');
  await expect(documents).toBeFocused();
  await expect(documents).toHaveAttribute('aria-selected', 'true');
  await documents.press('ArrowLeft');
  await expect(kanban).toBeFocused();
  await kanban.press('Home');
  await expect(documents).toBeFocused();
  await newDrawing(page);
  await expect(page).toHaveURL(new RegExp(`^${projectUrl}/desenhos/`));
  await saveCanvasTitle(page, drawingTitle);
  const drawingUrl = page.url();

  await openIndex(page, 'desenhos');
  const search = page.getByRole('textbox', { name: 'Buscar nos desenhos' });
  const row = page.locator('.document-row').filter({ hasText: drawingTitle });
  await search.fill(drawingTitle);
  await expect(row).toBeVisible();
  await search.fill('Uma busca sem resultado neste desenho');
  await expect(row).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Nenhum desenho encontrado' })).toBeVisible();
  await search.fill(drawingTitle);
  await row.click();
  await expect(page).toHaveURL(drawingUrl);
  await moveToTrash(page, 'desenho');
  await expect(page).toHaveURL(projectUrl);
  const trashed = await trashRow(page, drawingTitle);
  await expect(trashed).toContainText('Desenho');
  await restoreFromTrash(page, drawingTitle);
  await page.goto(projectUrl);
  await canvases.click();
  await expect(canvases).toContainText('1');
  await page.getByRole('link').filter({ hasText: drawingTitle }).click();
  await expect(canvasTitle(page)).toHaveValue(drawingTitle);
  await expect(page).toHaveURL(drawingUrl);
  await page.screenshot({ path: info.outputPath('desenho-restaurado.png'), fullPage: true });
  await page.goto(projectUrl);
  await page.getByRole('button', { name: 'Opções do projeto', exact: true }).click();
  await page.getByRole('menuitem', { name: 'Arquivar projeto', exact: true }).click();
  await canvases.click();
  await expect(page.getByRole('button', { name: 'Novo desenho', exact: true })).toHaveCount(0);
  await expect(page.getByRole('link').filter({ hasText: drawingTitle })).toBeVisible();
  await openIndex(page, 'desenhos');
  await expect(page.getByRole('button', { name: 'Novo desenho', exact: true })).toBeDisabled();
  await expect(page.getByText('Este projeto está arquivado. Desarquive para criar um desenho.')).toBeVisible();
  await expect(row).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('the sidebar opens the project documents and drawings, and each list opens its item', async ({ page }, info) => {
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
  await leaveItem(page, 'documentos');
  const documentRow = page.locator('.document-row').filter({ hasText: documentTitle });
  await expect(documentRow.getByRole('img', { name: 'Documento', exact: true })).toBeVisible();
  await documentRow.click();
  await expect(page).toHaveURL(documentUrl);
  await leaveItem(page, 'desenhos');
  await expect(page.getByRole('heading', { name: 'Desenhos', exact: true })).toBeVisible();
  const drawingRow = page.locator('.document-row').filter({ hasText: drawingTitle });
  await expect(drawingRow.getByRole('img', { name: 'Desenho', exact: true })).toBeVisible();
  await page.screenshot({ path: info.outputPath('biblioteca-desenhos.png'), fullPage: true });
  await drawingRow.click();
  await expect(page).toHaveURL(drawingUrl);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
