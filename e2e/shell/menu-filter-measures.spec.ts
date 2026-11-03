import { expect, type Locator } from '@playwright/test';
import { isolatedTest as test } from '../fixtures.js';
import { closeDrawer, openDrawer } from '../support/board.js';
import { documentEditor, slash } from '../support/document.js';
import { showSidebar } from '../support/navigation.js';

test.use({ sample: true });

async function measures(field: Locator) {
  await expect(field).toBeVisible();
  return field.evaluate((input) => {
    const inner = getComputedStyle(input);
    const outer = getComputedStyle(input.parentElement as HTMLElement);
    return { height: inner.height, padding: inner.padding, outerPadding: outer.padding, margin: outer.margin };
  });
}

test('project, folder, label and embed menu filters use the same field measures', async ({ page, api, isMobile }) => {
  const project = (await api.workspace.listProjects({})).find((each) => each.name === 'Tinyfold');
  if (!project) throw new Error('Missing sample project');
  const base = `/projetos/${project.id}`;
  const expected = { height: '28px', padding: '0px 6px', outerPadding: '6px', margin: '0px' };
  await page.goto(base);
  await showSidebar(page);
  const sidebar = isMobile ? page.getByRole('dialog', { name: 'Navegação' }) : page;
  await sidebar.getByRole('button', { name: 'Projeto Tinyfold. Trocar de projeto' }).click();
  expect
    .soft(await measures(page.getByRole('searchbox', { name: 'Trocar de projeto', exact: true })))
    .toEqual(expected);
  await page.keyboard.press('Escape');
  await page.goto(`${base}/quadro`);
  await openDrawer(page, 'Gerar token pessoal no Perfil');
  await page.getByRole('button', { name: 'Adicionar etiqueta', exact: true }).click();
  expect.soft(await measures(page.getByRole('searchbox', { name: 'Buscar ou criar etiqueta' }))).toEqual(expected);
  await page.keyboard.press('Escape');
  await closeDrawer(page);
  const document = (await api.workspace.listDocuments({ projectId: project.id })).find(
    (each) => each.title === 'Visão do produto',
  );
  if (!document) throw new Error('Missing sample document');
  await page.goto(`${base}/documentos/${document.id}`);
  await expect(documentEditor(page)).toBeVisible();
  await page.getByRole('button', { name: 'Opções do documento' }).click();
  await page.getByRole('menuitem', { name: /Mover para pasta/ }).click();
  expect.soft(await measures(page.getByRole('searchbox', { name: 'Mover para pasta', exact: true }))).toEqual(expected);
  await page.keyboard.press('Escape');
  const blank = await api.workspace.createDocument({
    requestId: crypto.randomUUID(),
    projectId: project.id,
    title: 'Medidas do filtro',
  });
  await page.goto(`${base}/documentos/${blank.id}`);
  await documentEditor(page).click();
  await slash(page, 'tarefa');
  expect.soft(await measures(page.getByRole('searchbox', { name: 'Incorporar tarefa' }))).toEqual(expected);
});
