import { readFile } from 'node:fs/promises';
import { expect, type Page, test } from '@playwright/test';
import { newDocument, newTask } from './support/items.js';
import { createProject, searchProject } from './support/navigation.js';
import { login } from './support/session.js';

async function createDocument(page: Page, title: string, text: string) {
  await newDocument(page);
  await page.getByRole('textbox', { name: 'Título do documento' }).fill(title);
  const editor = page.locator('[contenteditable="true"]').first();
  await editor.fill(text);
  await expect(page.getByText('Salvo', { exact: true })).toBeVisible();
  return editor;
}

test('capture in the current project, reopen, search and export Markdown', async ({ page }, info) => {
  const title = `Ideias ${info.project.name} ${Date.now()}`;
  await login(page);
  await page.screenshot({ path: info.outputPath('inicio.png'), fullPage: true });
  await createDocument(page, title, 'Uma ideia simples para organizar meus projetos.');
  const url = page.url();
  await page.reload();
  await expect(page.getByRole('textbox', { name: 'Título do documento' })).toHaveValue(title);
  await expect
    .poll(() =>
      page
        .getByRole('textbox', { name: 'Título do documento' })
        .evaluate((field) => field.scrollWidth <= field.clientWidth && field.scrollHeight <= field.clientHeight + 1),
    )
    .toBe(true);
  await expect(page.locator('[contenteditable="true"]').first()).toContainText('Uma ideia simples');
  await page.screenshot({ path: info.outputPath('editor.png'), fullPage: true });
  await searchProject(page, 'documentos', 'organizar meus projetos');
  await expect(page.getByRole('main').getByRole('link', { name: new RegExp(title) })).toBeVisible();
  await page.goto(url);
  await page.getByRole('button', { name: 'Opções do documento' }).click();
  const downloaded = page.waitForEvent('download');
  await page.getByRole('menuitem', { name: 'Exportar Markdown' }).click();
  const file = await downloaded;
  expect(file.suggestedFilename()).toMatch(/\.md$/);
  const exportedPath = await file.path();
  expect(exportedPath).not.toBeNull();
  expect(await readFile(exportedPath as string, 'utf8')).toContain('Uma ideia simples para organizar meus projetos.');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

test('imports Markdown as a new document and keeps supported structure after reload', async ({ page }, info) => {
  await login(page);
  await createDocument(page, `Original ${info.project.name}`, 'Este documento deve permanecer intacto.');
  const original = page.url();
  await page.getByLabel('Importar arquivo Markdown').setInputFiles({
    name: 'Referencias.md',
    mimeType: 'text/markdown',
    buffer: Buffer.from(
      '# Referências\n\nUma **ideia** com [contexto](https://example.com).\n\n- [ ] Escrever o plano\n\n```js\nconst idea = "tinyfold";\n```\n',
    ),
  });
  await expect(page.getByRole('textbox', { name: 'Título do documento' })).toHaveValue('Referencias');
  const editor = page.locator('[contenteditable="true"]').first();
  await expect(editor.getByRole('heading', { name: 'Referências' })).toBeVisible();
  await expect(editor.getByRole('link', { name: 'contexto' })).toHaveAttribute('href', 'https://example.com');
  await expect(editor).toContainText('const idea');
  await page.reload();
  await expect(editor).toContainText('Escrever o plano');
  await page.goto(original);
  await expect(editor).toContainText('deve permanecer intacto');
});

test('create project, create and move task with accessible controls', async ({ page }, info) => {
  const name = `Projeto ${info.project.name} ${Date.now()}`;
  await login(page);
  await createProject(page, name);
  await newTask(page, 'Definir o primeiro passo');
  await page.getByRole('button', { name: 'Opções de Definir o primeiro passo' }).click();
  await page.getByRole('menuitem', { name: 'Mover para Em andamento' }).click();
  const doing = page.getByRole('region', { name: 'Em andamento', exact: true });
  await expect(doing.getByRole('button', { name: 'Definir o primeiro passo', exact: true })).toBeVisible();
  await doing.getByRole('button', { name: 'Concluir Definir o primeiro passo' }).click();
  await expect(
    page
      .getByRole('region', { name: 'Concluído', exact: true })
      .getByRole('button', { name: 'Definir o primeiro passo', exact: true }),
  ).toBeVisible();
  await page.screenshot({ path: info.outputPath('kanban.png'), fullPage: true });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

test('recover unsaved text after offline reload', async ({ page, context }, info) => {
  await login(page);
  await createDocument(page, `Rascunho ${info.project.name} ${Date.now()}`, 'Texto salvo inicialmente.');
  await context.setOffline(true);
  await page.locator('[contenteditable="true"]').first().fill('Meu texto precisa sobreviver à queda de conexão.');
  await expect(page.getByRole('button', { name: 'Tentar salvar', exact: true })).toBeVisible();
  await context.setOffline(false);
  await page.reload();
  await expect(page.locator('[contenteditable="true"]').first()).toContainText('precisa sobreviver');
  const retry = page.getByRole('button', { name: 'Tentar salvar', exact: true });
  if (await retry.isVisible()) await retry.click();
  await expect(page.getByText('Salvo', { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.locator('[contenteditable="true"]').first()).toContainText('precisa sobreviver');
});
