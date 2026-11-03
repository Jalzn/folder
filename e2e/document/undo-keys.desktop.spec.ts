import { expect, type Page } from '@playwright/test';
import { test } from '../fixtures.js';

test.use({ controlledClock: true });

import { drawer, openDrawer } from '../support/board.js';
import { newDocument, newTask } from '../support/items.js';
import { hostShortcut } from '../support/keyboard.js';
import { createProject, currentProjectId } from '../support/navigation.js';
import { elapseAutosave } from '../support/pace.js';
import { answers, rpc } from '../support/rpc.js';

// Esc and ⌘Z from a hardware keyboard; the phone has neither.

/** Counts the saves of a procedure from now on. */
function countSaves(page: Page, procedure: string) {
  let count = 0;
  page.on('request', (request) => {
    if (new URL(request.url()).pathname === `/rpc/${procedure}`) count += 1;
  });
  return () => count;
}

test('⌘Z in the drawer outside its fields leaves the description and its saved version alone', {
  tag: '@timing',
}, async ({ page }) => {
  await createProject(page, `Desfazer fora do campo ${Date.now()}`);
  await newTask(page, 'Revisar o contrato');
  await openDrawer(page, 'Revisar o contrato');
  const region = drawer(page);
  const description = region.getByRole('textbox', { name: 'Descrição da tarefa' });
  const saved = page.waitForResponse(
    (response) =>
      answers(response, 'workspace/saveTaskText') &&
      response.status() === 200 &&
      Boolean(response.request().postData()?.includes('Teste dois.')),
  );
  await description.click();
  await page.keyboard.type('Primeira linha. Teste dois.');
  await saved;
  await expect(region.getByText('Salvo', { exact: true })).toBeVisible();

  const board = await rpc(page, 'workspace/projectBoard', {
    projectId: currentProjectId(page),
  });
  const id = board.tasks.find((task) => task.title === 'Revisar o contrato')?.id;
  if (!id) throw new Error('The created task is missing.');
  const version = async () => (await rpc(page, 'workspace/getTask', { id })).textVersion;
  const before = await version();

  // Esc leaves the description for the drawer; ⌘Z there has no toast to undo and must not reach the editor.
  await page.keyboard.press('Escape');
  await expect(region).toBeFocused();
  const saves = countSaves(page, 'workspace/saveTaskText');
  await hostShortcut(page, 'z');
  await elapseAutosave(page);
  await expect(description).toContainText('Primeira linha. Teste dois.');
  expect(saves()).toBe(0);
  expect(await version()).toBe(before);
});

test('⌘Z on the document page outside the editor leaves the text and its saved version alone', {
  tag: '@timing',
}, async ({ page }) => {
  await createProject(page, `Desfazer na página ${Date.now()}`);
  await newDocument(page);
  const editor = page.getByTestId('document-content');
  const saved = page.waitForResponse(
    (response) =>
      answers(response, 'workspace/saveDocument') &&
      response.status() === 200 &&
      Boolean(response.request().postData()?.includes('Visão do produto.')),
  );
  await editor.click();
  await page.keyboard.type('Visão do produto.');
  await saved;
  await expect(page.getByText('Salvo', { exact: true })).toBeVisible();

  const id = new URL(page.url()).pathname.split('/').at(-1);
  if (!id) throw new Error('The item URL has no ID.');
  const version = async () => (await rpc(page, 'workspace/getDocument', { id })).version;
  const before = await version();

  // Esc leaves the editor for the page; ⌘Z there must not reach the editor.
  await page.keyboard.press('Escape');
  await expect(page.locator('#main-content')).toBeFocused();
  const saves = countSaves(page, 'workspace/saveDocument');
  await hostShortcut(page, 'z');
  await elapseAutosave(page);
  await expect(editor).toContainText('Visão do produto.');
  expect(saves()).toBe(0);
  expect(await version()).toBe(before);
});
