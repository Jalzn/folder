import { readFile } from 'node:fs/promises';
import { expect, type Page, test } from '@playwright/test';
import { closeDrawer, createInDrawer, drawer, drawerOf, newTaskDrawer } from './support/board.js';
import { createTaskFromSelection, openDocumentTasks, pickEmbed, slash } from './support/document.js';
import { newDocument } from './support/items.js';
import { pressCommand } from './support/keyboard.js';
import { createProject, currentProjectId } from './support/navigation.js';
import { answers, rpc } from './support/rpc.js';
import { login } from './support/session.js';

// The bar's keys and its popover need a desktop; narrow.spec.ts covers the phone's bar.
test.skip(({ isMobile }) => isMobile, 'Desktop: the page bar keeps its actions.');

const editor = (page: Page) => page.getByTestId('document-content');
const toast = (page: Page) => page.locator('.toast');

/** A new document with a title and one paragraph per line, typed with real keys and saved. */
async function writeDocument(page: Page, title: string, lines: string[]) {
  await newDocument(page);
  await page.getByRole('textbox', { name: 'Título do documento' }).click();
  await page.keyboard.type(title);
  await page.keyboard.press('Enter');
  await expect(editor(page)).toBeFocused();
  const last = lines.at(-1) ?? '';
  const saved = page.waitForResponse(
    (response) =>
      answers(response, 'workspace/saveDocument') &&
      response.status() === 200 &&
      Boolean(response.request().postData()?.includes(last)),
  );
  for (const [index, line] of lines.entries()) {
    if (index) await page.keyboard.press('Enter');
    await page.keyboard.type(line);
  }
  await saved;
  await expect(page.getByText('Salvo', { exact: true })).toBeVisible();
}

/** Selects a paragraph of the editor with a triple click and makes a task of it with ⌘⌥T. */
async function taskFromParagraph(page: Page, text: string, title: string) {
  await editor(page).getByText(text, { exact: true }).click({ clickCount: 3 });
  await createTaskFromSelection(page);
  await expect(newTaskDrawer(page).getByRole('textbox', { name: 'Título da nova tarefa' })).toHaveValue(text);
  await createInDrawer(page, title);
  await closeDrawer(page);
}

test('the bar says when the document was edited, and its ⋯ starts with Criar tarefa', async ({ page }) => {
  await login(page);
  await createProject(page, `Barra do documento ${Date.now()}`);
  await writeDocument(page, 'Plano da barra', ['Primeiro parágrafo.']);
  await expect(page.getByRole('status').filter({ hasText: /^Salvo/ })).toHaveText('Salvo · editado hoje');

  await page.getByRole('button', { name: 'Opções do documento', exact: true }).click();
  const menu = page.getByRole('menu', { name: 'Opções do documento' });
  const names = await menu.getByRole('menuitem').evaluateAll((items) =>
    // The label without its note, which follows it in the same span.
    items.map((item) => item.querySelector('.menu-item__label')?.firstChild?.textContent ?? ''),
  );
  expect(names).toEqual([
    'Criar tarefa',
    'Exportar Markdown',
    'Importar Markdown',
    'Fixar',
    'Mover para pasta…',
    'Mover para projeto…',
    'Mover para a lixeira',
  ]);
  await expect(menu.getByRole('menuitem', { name: /^Criar tarefa/ })).toContainText(
    'Selecione um trecho para criar a partir dele',
  );
  await page.keyboard.press('Escape');
  // The hint and the button under the text are gone; the editor's placeholder is the hint now.
  await expect(page.getByRole('button', { name: 'Criar tarefa da seleção' })).toHaveCount(0);
});

test('⌘⌥T makes a task of the excerpt selected in the editor, and outside it says how', async ({ page }) => {
  await login(page);
  await createProject(page, `Atalho de tarefa ${Date.now()}`);
  await writeDocument(page, 'Notas da reunião', ['Ligar para o fornecedor.']);

  // In the title, there is no excerpt to take.
  await page.getByRole('textbox', { name: 'Título do documento' }).click();
  await pressCommand(page, 'Alt+t');
  await expect(toast(page)).toContainText('Selecione um trecho do documento primeiro.');
  await expect(newTaskDrawer(page)).toHaveCount(0);

  await taskFromParagraph(page, 'Ligar para o fornecedor.', 'Ligar para o fornecedor');
  const tasks = await openDocumentTasks(page);
  await expect(tasks.getByRole('button', { name: /^Ligar para o fornecedor.*A fazer/ })).toBeVisible();
});

test('"Tarefas · n" opens the document’s tasks: ↑ ↓ walk them, ↵ opens one, Esc goes back to the button', async ({
  page,
}) => {
  await login(page);
  await createProject(page, `Tarefas do documento ${Date.now()}`);
  await writeDocument(page, 'Lista de compras', ['Comprar cadeiras.', 'Comprar mesas.']);
  await taskFromParagraph(page, 'Comprar cadeiras.', 'Cadeiras');
  await taskFromParagraph(page, 'Comprar mesas.', 'Mesas');

  const button = page.getByRole('button', { name: 'Tarefas · 2', exact: true });
  await button.focus();
  await page.keyboard.press('Enter');
  const tasks = page.getByRole('dialog', { name: 'Tarefas deste documento' });
  await expect(tasks.getByRole('button', { name: /^Cadeiras/ })).toBeFocused();
  await page.keyboard.press('ArrowDown');
  await expect(tasks.getByRole('button', { name: /^Mesas/ })).toBeFocused();
  await page.keyboard.press('ArrowDown');
  await expect(tasks.getByRole('button', { name: /^Cadeiras/ })).toBeFocused();
  await page.keyboard.press('ArrowUp');
  await page.keyboard.press('Enter');
  await expect(drawerOf(page, 'Mesas')).toBeVisible();
  await expect(tasks).toHaveCount(0);
  await closeDrawer(page);

  await button.focus();
  await page.keyboard.press('Enter');
  await expect(tasks).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(tasks).toHaveCount(0);
  await expect(button).toBeFocused();
});

test('the failure band stays under the bar, outside the text that scrolls', async ({ page, context }) => {
  await login(page);
  await createProject(page, `Faixas fixas ${Date.now()}`);
  await writeDocument(page, 'Rascunho longo', ['Começo do texto.']);
  await context.setOffline(true);
  await editor(page).click();
  await page.keyboard.press('End');
  await page.keyboard.type(' Mais uma frase.');
  const band = page.getByText('Seu rascunho continua aqui.');
  await expect(band).toBeVisible();
  // The bands sit between the bar and the page's scroll area, so the text scrolls under them.
  expect(await band.evaluate((element) => element.closest('[data-scroll-key]') === null)).toBe(true);
  await expect(page.getByRole('button', { name: 'Tentar de novo', exact: true })).toBeVisible();
  // Back online, the document tries again by itself, and the band goes.
  await context.setOffline(false);
  await expect(band).toHaveCount(0);
});

test('a task’s permanent link opens it on its project’s board', async ({ page }) => {
  await login(page);
  await createProject(page, `Link da tarefa ${Date.now()}`);
  await writeDocument(page, 'Origem do link', ['Revisar o contrato.']);
  await taskFromParagraph(page, 'Revisar o contrato.', 'Revisar o contrato');
  const projectId = currentProjectId(page);
  const board = await rpc<{ tasks: { id: string; title: string }[] }>(page, 'workspace/projectBoard', { projectId });
  const task = board.tasks.find((each) => each.title === 'Revisar o contrato');
  if (!task) throw new Error('The task was not created.');

  await page.goto(`/tarefas/${task.id}`);
  await expect(page).toHaveURL(new RegExp(`/projetos/${projectId}/quadro$`));
  await expect(drawer(page)).toHaveAccessibleName('Tarefa: Revisar o contrato');

  await page.goto('/tarefas/00000000-0000-4000-8000-00000000dead');
  await expect(page.getByRole('heading', { name: 'Esta tarefa não existe mais' })).toBeVisible();
});

test('Exportar Markdown writes an embedded task as a link to the app, and the import brings it back as one', async ({
  page,
}) => {
  await login(page);
  const projectId = await createProject(page, `Markdown com incorporados ${Date.now()}`);
  const task = await rpc<{ id: string }>(page, 'workspace/createTask', {
    requestId: crypto.randomUUID(),
    projectId,
    title: 'Revisar o orçamento',
  });
  await writeDocument(page, 'Exportar com incorporados', ['Plano.']);
  const saved = page.waitForResponse(
    (response) => answers(response, 'workspace/saveDocument') && response.status() === 200,
  );
  await pickEmbed(page, await slash(page, 'tarefa'), 'orçamento', 'Revisar o orçamento');
  await saved;

  await page.getByRole('button', { name: 'Opções do documento', exact: true }).click();
  const downloaded = page.waitForEvent('download');
  await page.getByRole('menuitem', { name: /^Exportar Markdown/ }).click();
  const file = await downloaded;
  const markdown = await readFile((await file.path()) as string, 'utf8');
  const origin = new URL(page.url()).origin;
  expect(markdown).toBe(
    `# Exportar com incorporados\n\nPlano.\n\n[Tarefa: Revisar o orçamento (A fazer)](${origin}/tarefas/${task.id})\n`,
  );

  // Read back, the link stays a link, in a new document.
  await page.getByLabel('Importar arquivo Markdown').setInputFiles({
    name: 'exportado.md',
    mimeType: 'text/markdown',
    buffer: Buffer.from(markdown),
  });
  await expect(page.getByRole('textbox', { name: 'Título do documento' })).toHaveValue('exportado');
  const link = editor(page).getByRole('link', { name: 'Tarefa: Revisar o orçamento (A fazer)' });
  await expect(link).toHaveAttribute('href', `${origin}/tarefas/${task.id}`);
  await expect(editor(page).locator('.embed-card')).toHaveCount(0);
});
