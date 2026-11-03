import { type BrowserContext, expect } from '@playwright/test';
import { test } from '../fixtures.js';
import { closeDrawer, createInDrawer, drawer, drawerOf, newTaskDrawer, openDrawer } from '../support/board.js';
import {
  createSavedDocument,
  createTaskFromSelection,
  documentEditor as editor,
  openDocumentTasks,
  writeAndSave,
} from '../support/document.js';
import { moveToTrash, restoreFromTrash } from '../support/items.js';
import { hostShortcut } from '../support/keyboard.js';
import { openBoard, overviewAddress } from '../support/navigation.js';
import { holdRpc, loseFirstResponse } from '../support/network.js';
import { signIn } from '../support/session.js';

async function closeContext(context: BrowserContext, release: () => void) {
  release();
  await context.unrouteAll({ behavior: 'ignoreErrors' });
  await context.close();
}

test('two independent sessions keep both versions when a conflicting draft is saved as a copy', async ({
  page,
  browser,
}, info) => {
  const title = `Conflito ${info.project.name} ${Date.now()}`;
  const documentUrl = await createSavedDocument(page, title, 'Ideia original compartilhada.');
  const otherContext = await browser.newContext({
    baseURL: new URL(page.url()).origin,
    viewport: page.viewportSize() ?? { width: 1440, height: 1000 },
  });
  let release = () => {};
  try {
    const other = await otherContext.newPage();
    await signIn(other, { independent: true });
    await other.goto(documentUrl);
    await expect(editor(other)).toContainText('Ideia original compartilhada.');
    const held = await holdRpc(other, 'workspace/saveDocument');
    release = held.release;
    await editor(other).fill('Rascunho do segundo dispositivo preservado.');
    await held.intercepted;
    await writeAndSave(page, 'Versao principal confirmada no primeiro dispositivo.');
    release();
    await expect(other.getByText('Este documento mudou em outro dispositivo.', { exact: true })).toBeVisible();
    await expect(editor(other)).toContainText('Rascunho do segundo dispositivo preservado.');
    await other.screenshot({ path: info.outputPath('conflito-preservado.png'), fullPage: true });
    await other.getByRole('button', { name: 'Salvar meu rascunho como cópia', exact: true }).click();
    await expect(other).not.toHaveURL(documentUrl);
    await expect(other.getByRole('textbox', { name: 'Título do documento' })).toHaveValue(`${title} — cópia`);
    await expect(editor(other)).toContainText('Rascunho do segundo dispositivo preservado.');
    await other.reload();
    await expect(editor(other)).toContainText('Rascunho do segundo dispositivo preservado.');
    await page.reload();
    await expect(editor(page)).toContainText('Versao principal confirmada no primeiro dispositivo.');
    await expect(page.getByRole('textbox', { name: 'Título do documento' })).toHaveValue(title);
  } finally {
    await closeContext(otherContext, release);
  }
});

test('a task created from selected text survives document trash and restores its source link', async ({
  page,
}, info) => {
  const title = `Origem ${info.project.name} ${Date.now()}`;
  const taskTitle = `Proximo passo ${info.project.name} ${Date.now()}`;
  const documentUrl = await createSavedDocument(page, title, 'Organizar as referencias do projeto.');
  await editor(page).click();
  await hostShortcut(editor(page), 'a');
  await createTaskFromSelection(page);
  await expect(newTaskDrawer(page).getByRole('textbox', { name: 'Título da nova tarefa' })).toHaveValue(
    'Organizar as referencias do projeto.',
  );
  await createInDrawer(page, taskTitle);
  await closeDrawer(page);
  const tasks = await openDocumentTasks(page);
  await expect(tasks.getByRole('button', { name: new RegExp(`${taskTitle}.*A fazer`) })).toBeVisible();
  await page.keyboard.press('Escape');
  await moveToTrash(page, 'documento');
  await expect(page).toHaveURL(overviewAddress);
  await openBoard(page);
  await openDrawer(page, taskTitle);
  await expect(
    drawer(page).getByText('O documento está na lixeira. A tarefa continua aqui.', { exact: true }),
  ).toBeVisible();
  await expect(drawer(page).locator('blockquote')).toHaveText('Organizar as referencias do projeto.');
  await closeDrawer(page);
  await restoreFromTrash(page, title);
  await openBoard(page);
  await openDrawer(page, taskTitle);
  // The origin opens its document in the excerpt, and the drawer stays.
  await drawer(page).getByRole('button', { name: title, exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`${documentUrl}(?:\\?bloco=.+)?$`));
  await expect(editor(page)).toContainText('Organizar as referencias do projeto.');
  await page.screenshot({ path: info.outputPath('origem-restaurada.png'), fullPage: true });
});

test('retrying after a committed task response is lost creates only one task', async ({ page }, info) => {
  await openBoard(page);
  const title = `Reenvio unico ${info.project.name} ${Date.now()}`;
  const { requests } = await loseFirstResponse(page, 'workspace/createTask');
  await page.getByRole('button', { name: 'Nova tarefa', exact: true }).click();
  const form = newTaskDrawer(page);
  await expect(form.getByRole('textbox', { name: 'Título da nova tarefa' })).toBeFocused();
  await page.keyboard.type(title);
  await form.getByRole('button', { name: 'Criar', exact: true }).click();
  await expect(form.getByRole('alert')).toBeVisible();
  await form.getByRole('button', { name: 'Criar', exact: true }).click();
  await expect(drawerOf(page, title)).toBeVisible();
  expect(requests).toHaveLength(2);
  expect(requests[0]).toBe(requests[1]);
  await expect(page.getByRole('button', { name: title, exact: true })).toHaveCount(1);
  await page.reload();
  await expect(page.getByRole('button', { name: title, exact: true })).toHaveCount(1);
  await page.screenshot({ path: info.outputPath('reenvio-sem-duplicacao.png'), fullPage: true });
});
