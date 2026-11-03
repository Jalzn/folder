import { expect, type Page } from '@playwright/test';
import { isolatedTest as test } from '../fixtures.js';
import { closeDrawer, openDrawer } from '../support/board.js';
import { documentEditor, embedCard } from '../support/document.js';
import { showSidebar } from '../support/navigation.js';

test.use({ sample: true });

async function capture(page: Page, name: string) {
  await page.evaluate(() => document.fonts.ready);
  await expect(page).toHaveScreenshot(`${name}.png`);
}

test('sample pages and shared controls keep their pixels', async ({ page, api }) => {
  const projects = await api.workspace.listProjects({});
  const project = projects.find((value) => value.name === 'Tinyfold');
  if (!project) throw new Error('The sample project is missing.');
  const base = `/projetos/${project.id}`;
  await page.goto(base);
  await expect(page.getByRole('heading', { name: 'Tinyfold', exact: true })).toBeVisible();
  await capture(page, 'overview');

  await showSidebar(page);
  await page.getByRole('button', { name: 'Projeto Tinyfold. Trocar de projeto' }).click();
  await capture(page, 'project-picker');
  await page.keyboard.press('Escape');

  await page.goto(`${base}/quadro`);
  await expect(page.getByRole('button', { name: /Configurar backup externo/ }).first()).toBeVisible();
  await capture(page, 'board');
  await openDrawer(page, 'Gerar token pessoal no Perfil');
  await capture(page, 'task-drawer');
  await page.getByRole('button', { name: 'Adicionar etiqueta', exact: true }).click();
  await capture(page, 'label-picker');
  await page.keyboard.press('Escape');
  await closeDrawer(page);

  await page.goto(`${base}/indice`);
  await expect(page.getByRole('heading', { name: /Índice/ })).toBeVisible();
  await capture(page, 'index');
  const document = (await api.workspace.listDocuments({ projectId: project.id })).find(
    (value) => value.title === 'Visão do produto',
  );
  if (!document) throw new Error('The sample document is missing.');
  await page.goto(`${base}/documentos/${document.id}`);
  await expect(documentEditor(page)).toBeVisible();
  await expect(embedCard(page, 'Gerar token pessoal no Perfil')).toBeVisible();
  // The figure finishes its preview before the reference is taken.
  await expect(page.locator('.embed-figure img').first()).toBeVisible();
  await capture(page, 'document');
  await page.getByRole('button', { name: /Mover para pasta/ }).click();
  await capture(page, 'folder-picker');
  await page.keyboard.press('Escape');

  const drawing = (await api.workspace.listCanvases({ projectId: project.id })).find(
    (value) => value.title === 'Navegação com projeto no centro',
  );
  if (!drawing) throw new Error('The sample drawing is missing.');
  await page.goto(`${base}/desenhos/${drawing.id}`);
  await expect(page.locator('.excalidraw canvas.interactive')).toBeVisible();
  await capture(page, 'drawing');
  await page.goto(`${base}/lixeira`);
  await expect(page.getByRole('heading', { name: /Lixeira/ })).toBeVisible();
  await capture(page, 'trash');
});
