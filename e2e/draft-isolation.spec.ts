import { expect, type Page } from '@playwright/test';
import { test } from './fixtures.js';
import { closeDrawer, createInDrawer, drawer } from './support/board.js';
import {
  createTaskFromSelection,
  documentEditor as editor,
  openDocumentTasks,
  writeAndSave,
} from './support/document.js';
import { newDocument } from './support/items.js';
import { hostShortcut } from './support/keyboard.js';
import { abortRpc } from './support/network.js';
import { login } from './support/session.js';

async function createDocument(page: Page, title: string) {
  await login(page);
  await newDocument(page);
  await page.getByRole('textbox', { name: 'Título do documento' }).fill(title);
  await writeAndSave(page, 'Ideia original antes de duplicar a aba.');
  return page.url();
}

test('a duplicated tab keeps its unsaved draft when the original tab saves and the duplicate reloads', async ({
  page,
  context,
}, info) => {
  const url = await createDocument(page, `Abas isoladas ${info.project.name} ${Date.now()}`);
  const inheritedSession = await page.evaluate(() => Object.fromEntries(Object.entries(sessionStorage)));
  const duplicate = await context.newPage();
  // Chrome duplicates sessionStorage when duplicating a tab. Copy it once before app initialization.
  await duplicate.goto('/health');
  await duplicate.evaluate((values) => {
    for (const [key, value] of Object.entries(values)) sessionStorage.setItem(key, value);
  }, inheritedSession);
  await duplicate.goto(url);
  await expect(editor(duplicate)).toContainText('Ideia original antes de duplicar a aba.');
  const restoreSaves = await abortRpc(duplicate, 'workspace/saveDocument');
  await editor(duplicate).fill('Rascunho exclusivo da aba duplicada.');
  await expect(duplicate.getByText('Não salvou', { exact: true })).toBeVisible();

  await writeAndSave(page, 'Versao confirmada na aba original.');
  await duplicate.reload();
  await expect(editor(duplicate)).toContainText('Rascunho exclusivo da aba duplicada.');
  await expect(editor(page)).toContainText('Versao confirmada na aba original.');
  await duplicate.screenshot({ path: info.outputPath('rascunho-aba-duplicada.png'), fullPage: true });
  await restoreSaves();
  await duplicate.close({ runBeforeUnload: false });
});

test('saving changed source text refreshes linked-task availability without leaving the document', async ({
  page,
}, info) => {
  await createDocument(page, `Origem atualizada ${info.project.name} ${Date.now()}`);
  await editor(page).click();
  await hostShortcut(editor(page), 'a');
  await createTaskFromSelection(page);
  const taskTitle = `Tarefa com origem ${Date.now()}`;
  await createInDrawer(page, taskTitle);
  await closeDrawer(page);
  const linked = new RegExp(`${taskTitle}.*A fazer`);
  await expect((await openDocumentTasks(page)).getByRole('button', { name: linked })).toBeVisible();
  await page.keyboard.press('Escape');
  await writeAndSave(page, 'Texto substituido depois da criacao da tarefa.');
  await (await openDocumentTasks(page)).getByRole('button', { name: linked }).click();
  await expect(
    page
      .getByRole('region', { name: `Tarefa: ${taskTitle}`, exact: true })
      .getByText('O trecho original foi removido. Você ainda pode abrir o documento.', { exact: true }),
  ).toBeVisible();
  await expect(drawer(page).locator('blockquote')).toHaveText('Ideia original antes de duplicar a aba.');
  await page.screenshot({ path: info.outputPath('origem-atualizada-sem-navegar.png'), fullPage: true });
});
