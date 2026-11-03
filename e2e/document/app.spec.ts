import { readFile } from 'node:fs/promises';
import { expect } from '@playwright/test';
import { test } from '../fixtures.js';
import { cardMenu, column } from '../support/board.js';
import { createSavedDocument } from '../support/document.js';
import { newTask } from '../support/items.js';
import { createProject, searchProject } from '../support/navigation.js';

test(
  'capture in the current project, reopen, search and export Markdown',
  { tag: '@smoke' },
  async ({ page, project }, info) => {
    const title = `Ideias ${info.project.name} ${Date.now()}`;
    await expect(page).toHaveURL(new RegExp(`/projetos/${project.id}$`));
    await page.screenshot({ path: info.outputPath('inicio.png'), fullPage: true });
    await createSavedDocument(page, title, 'Uma ideia simples para organizar meus projetos.');
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
    const results = await searchProject(page, 'organizar meus projetos');
    await expect(results.getByRole('link', { name: new RegExp(title) })).toBeVisible();
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
  },
);

test(
  'imports Markdown as a new document and keeps supported structure after reload',
  { tag: '@smoke' },
  async ({ page }, info) => {
    await createSavedDocument(page, `Original ${info.project.name}`, 'Este documento deve permanecer intacto.');
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
    // The imported code must remain readable on its actual surface in either theme.
    const code = editor.locator('[data-content-type="codeBlock"] code');
    for (const colorScheme of ['light', 'dark'] as const) {
      await page.emulateMedia({ colorScheme });
      await expect(page.locator('html')).toHaveAttribute('data-theme', colorScheme);
      await expect
        .poll(() =>
          code.evaluate((element) => {
            const block = element.closest('[data-content-type="codeBlock"]');
            if (!block) throw new Error('Code block is missing.');
            const luminance = (rgb: string) => {
              const values = rgb
                .match(/\d+(?:\.\d+)?/g)
                ?.slice(0, 3)
                .map(Number);
              if (values?.length !== 3) throw new Error(`Unsupported computed color: ${rgb}`);
              return values.reduce((sum, value, index) => {
                const channel = value / 255;
                const linear = channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
                return sum + linear * ([0.2126, 0.7152, 0.0722][index] ?? 0);
              }, 0);
            };
            const text = luminance(getComputedStyle(element).color);
            const surface = luminance(getComputedStyle(block).backgroundColor);
            return (Math.max(text, surface) + 0.05) / (Math.min(text, surface) + 0.05);
          }),
        )
        .toBeGreaterThanOrEqual(4.5);
    }
    await page.goto(original);
    await expect(editor).toContainText('deve permanecer intacto');
  },
);

test('create project, create and move task with accessible controls', { tag: '@smoke' }, async ({ page }, info) => {
  const name = `Projeto ${info.project.name} ${Date.now()}`;
  await createProject(page, name);
  await newTask(page, 'Definir o primeiro passo');
  await cardMenu(page, 'Definir o primeiro passo', 'Mover para', 'Em andamento');
  await expect(
    column(page, 'Em andamento').getByRole('button', { name: 'Definir o primeiro passo', exact: true }),
  ).toBeVisible();
  await cardMenu(page, 'Definir o primeiro passo', 'Concluir');
  await expect(
    column(page, 'Concluído').getByRole('button', { name: 'Definir o primeiro passo', exact: true }),
  ).toBeVisible();
  await expect(page.getByText('Concluída: Definir o primeiro passo.')).toBeVisible();
  await page.screenshot({ path: info.outputPath('kanban.png'), fullPage: true });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

test('recover unsaved text after offline reload', { tag: '@smoke' }, async ({ page, context }, info) => {
  await createSavedDocument(page, `Rascunho ${info.project.name} ${Date.now()}`, 'Texto salvo inicialmente.');
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
