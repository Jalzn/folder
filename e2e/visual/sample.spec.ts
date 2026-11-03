import { expect, type Page } from '@playwright/test';
import { isolatedTest as test } from '../fixtures.js';
import { closeDrawer, openDrawer } from '../support/board.js';
import { documentEditor, embedCard } from '../support/document.js';
import { showSidebar } from '../support/navigation.js';

test.use({ sample: true, fixedTime: '2026-11-03T11:00:00.000Z' });

async function capture(page: Page, name: string) {
  await page.evaluate(async () => {
    await document.fonts.ready;
    // Let entry animations finish before disabling animations for the screenshot.
    await Promise.all(
      document
        .getAnimations()
        .filter((animation) => Number.isFinite(animation.effect?.getComputedTiming().endTime))
        .map((animation) => animation.finished.catch(() => undefined)),
    );
  });
  await expect(page).toHaveScreenshot(`${name}.png`);
}

test('sample pages and shared controls keep their pixels', async ({ page, api, isMobile }) => {
  const projects = await api.workspace.listProjects({});
  const project = projects.find((value) => value.name === 'Tinyfold');
  if (!project) throw new Error('The sample project is missing.');
  const base = `/projetos/${project.id}`;
  await page.goto(base);
  await expect(page.getByRole('heading', { name: 'Tinyfold', exact: true })).toBeVisible();
  await capture(page, 'overview');

  await showSidebar(page);
  const sidebar = isMobile ? page.getByRole('dialog', { name: 'Navegação' }) : page;
  await sidebar.getByRole('button', { name: 'Projeto Tinyfold. Trocar de projeto' }).click();
  await expect(page.getByRole('searchbox', { name: 'Trocar de projeto', exact: true })).toBeVisible();
  await capture(page, 'project-picker');
  await page.keyboard.press('Escape');

  await page.goto(`${base}/quadro`);
  await expect(page.getByRole('button', { name: /Configurar backup externo/ }).first()).toBeVisible();
  await capture(page, 'board');
  await openDrawer(page, 'Gerar token pessoal no Perfil');
  await capture(page, 'task-drawer');
  await page.getByRole('button', { name: 'Adicionar etiqueta', exact: true }).click();
  await expect(page.getByRole('searchbox', { name: 'Buscar ou criar etiqueta' })).toBeVisible();
  await expect(page.locator('.label-picker')).toHaveCSS('opacity', '1');
  await expect(page.locator('.label-picker')).toBeInViewport({ ratio: 1 });
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
  await page.getByRole('button', { name: 'Opções do documento' }).click();
  await page.getByRole('menuitem', { name: /Mover para pasta/ }).click();
  await expect(page.getByRole('searchbox', { name: 'Mover para pasta', exact: true })).toBeVisible();
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
