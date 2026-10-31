import { expect, type Page, test } from '@playwright/test';
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

test('project drawings support keyboard tabs, project filters, trash and restore', async ({ page }, info) => {
  const suffix = `${info.project.name} ${Date.now()}`;
  const projectName = `Projeto visual ${suffix}`;
  const drawingTitle = `Mapa do projeto ${suffix}`;
  await login(page);
  await page.getByRole('button', { name: 'Novo projeto', exact: true }).click();
  await page.getByLabel('Nome do projeto').fill(projectName);
  await page.getByRole('dialog').getByRole('button', { name: 'Criar projeto', exact: true }).click();
  await expect(page.getByRole('heading', { name: projectName, exact: true })).toBeVisible();
  const projectUrl = page.url();
  const projectId = new URL(projectUrl).pathname.split('/').at(-1);
  if (!projectId) throw new Error('Project URL has no identifier.');

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
  await canvases.click();
  await page.getByRole('button', { name: 'Novo desenho', exact: true }).click();
  await expect(page.getByTestId('canvas-editor')).toBeVisible();
  await expect(page.getByRole('combobox', { name: 'Projeto do desenho' })).toHaveValue(projectId);
  await saveCanvasTitle(page, drawingTitle);
  const drawingUrl = page.url();

  await page.goto('/desenhos');
  const search = page.getByRole('textbox', { name: 'Buscar nos desenhos' });
  const filter = page.getByRole('combobox', { name: 'Filtrar por projeto' });
  const row = page.locator('.document-row').filter({ hasText: drawingTitle });
  await search.fill(drawingTitle);
  await expect(row).toBeVisible();
  await filter.selectOption('none');
  await expect(row).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Nenhum desenho encontrado' })).toBeVisible();
  await filter.selectOption(projectId);
  await expect(row).toBeVisible();
  await search.fill('Uma busca sem resultado neste desenho');
  await expect(row).toHaveCount(0);
  await search.fill(drawingTitle);
  await row.click();
  await expect(page).toHaveURL(drawingUrl);
  await page.getByRole('button', { name: 'Opções do desenho', exact: true }).click();
  await page.getByRole('menuitem', { name: 'Mover para a lixeira', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Mover para a lixeira', exact: true }).click();
  await expect(page).toHaveURL(/\/desenhos$/);
  await page.goto('/lixeira');
  const trashed = page.locator('.document-row').filter({ hasText: drawingTitle });
  await expect(trashed).toContainText('Desenho');
  await expect(trashed).toContainText(projectName);
  await trashed.getByRole('button', { name: 'Restaurar', exact: true }).click();
  await expect(trashed).toHaveCount(0);
  await page.goto(projectUrl);
  await canvases.click();
  await expect(canvases).toContainText('1');
  await page.getByRole('link').filter({ hasText: drawingTitle }).click();
  await expect(canvasTitle(page)).toHaveValue(drawingTitle);
  await expect(page.getByRole('combobox', { name: 'Projeto do desenho' })).toHaveValue(projectId);
  await page.screenshot({ path: info.outputPath('desenho-restaurado.png'), fullPage: true });
  await page.goto(projectUrl);
  await page.getByRole('button', { name: 'Opções do projeto', exact: true }).click();
  await page.getByRole('menuitem', { name: 'Arquivar projeto', exact: true }).click();
  await canvases.click();
  await expect(page.getByRole('button', { name: 'Novo desenho', exact: true })).toHaveCount(0);
  await expect(page.getByRole('link').filter({ hasText: drawingTitle })).toBeVisible();
  await page.goto('/desenhos');
  await filter.selectOption(projectId);
  await expect(page.getByRole('button', { name: 'Novo desenho', exact: true })).toBeDisabled();
  await expect(
    page.getByText('Este projeto está arquivado. Escolha outro filtro para criar um desenho.'),
  ).toBeVisible();
  await expect(row).toBeVisible();
  await filter.selectOption('none');
  await expect(page.getByRole('button', { name: 'Novo desenho', exact: true })).toBeEnabled();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('home combines recent documents and drawings and sidebar opens the drawing library', async ({ page }, info) => {
  const suffix = `${info.project.name} ${Date.now()}`;
  const documentTitle = `Nota visual ${suffix}`;
  const drawingTitle = `Rascunho visual ${suffix}`;
  await login(page);
  await page.getByRole('button', { name: 'Começar a escrever', exact: true }).click();
  const documentSaved = page.waitForResponse(
    (response) =>
      answers(response, 'workspace/saveDocument') &&
      response.status() === 200 &&
      Boolean(response.request().postData()?.includes(documentTitle)),
  );
  await page.getByRole('textbox', { name: 'Título do documento' }).fill(documentTitle);
  await documentSaved;
  const documentUrl = page.url();
  await page.goto('/');
  await page.getByRole('button', { name: 'Começar um desenho', exact: true }).click();
  await expect(page.getByTestId('canvas-editor')).toBeVisible();
  await saveCanvasTitle(page, drawingTitle);
  const drawingUrl = page.url();
  await page.goto('/');
  const recent = page
    .locator('.home-section')
    .filter({ has: page.getByRole('heading', { name: 'Continue de onde parou' }) });
  const rows = recent.locator('.document-row');
  await expect(rows.nth(0)).toContainText(drawingTitle);
  await expect(rows.nth(0).getByRole('img', { name: 'Desenho', exact: true })).toBeVisible();
  await expect(rows.nth(1)).toContainText(documentTitle);
  await expect(rows.nth(1).getByRole('img', { name: 'Documento', exact: true })).toBeVisible();
  await rows.nth(1).click();
  await expect(page).toHaveURL(documentUrl);
  await page.goto('/');
  await recent.getByRole('link').filter({ hasText: drawingTitle }).click();
  await expect(page).toHaveURL(drawingUrl);
  const openNavigation = page.getByRole('button', { name: 'Abrir navegação', exact: true });
  if (await openNavigation.isVisible()) await openNavigation.click();
  await page.locator('.sidebar').getByRole('link', { name: 'Desenhos', exact: true }).click();
  await expect(page).toHaveURL(/\/desenhos$/);
  await expect(page.getByRole('heading', { name: 'Desenhos', exact: true })).toBeVisible();
  await expect(page.getByRole('link').filter({ hasText: drawingTitle })).toBeVisible();
  await page.screenshot({ path: info.outputPath('biblioteca-desenhos.png'), fullPage: true });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
