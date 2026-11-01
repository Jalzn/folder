import { expect, type Page, test } from '@playwright/test';
import { folderRow, itemsTree, rpcDocument, rpcFolder } from './support/folders.js';
import { pressCommand } from './support/keyboard.js';
import { createProject } from './support/navigation.js';
import { rpc } from './support/rpc.js';
import { login } from './support/session.js';

// Failures around folders (sec-quality.md S2, S3 and S4): a copy whose folder went, an undo the server
// refuses, and an undo pressed while another folder write is on its way. Desktop: the fixed sidebar.
test.skip(({ isMobile }) => isMobile, 'Desktop: the fixed sidebar.');

const toast = (page: Page) => page.locator('.toast');

/** The folder's version, as the tree has it, for a write by RPC. */
async function folderVersion(page: Page, projectId: string, folderId: string) {
  const { tree } = await rpc<{ tree: { folders: { id: string; version: number }[] } }>(
    page,
    'workspace/projectNavigation',
    { projectId },
  );
  return tree.folders.find((folder) => folder.id === folderId)?.version ?? 0;
}

test('a draft saved as a copy goes to the root when its folder was deleted elsewhere', async ({ page }) => {
  await login(page);
  const projectId = await createProject(page, `Cópia ${Date.now()}`);
  const folder = await rpcFolder(page, projectId, 'Efêmera');
  const { id } = await rpcDocument(page, projectId, 'Rascunho', folder);
  await page.goto(`/projetos/${projectId}/documentos/${id}`);
  await expect(page.getByRole('button', { name: 'Pasta Efêmera. Mover para pasta (M)' })).toBeVisible();

  // Another device saves the document, then deletes its folder.
  const saved = await rpc<{ version: number; title: string; content: unknown }>(page, 'workspace/getDocument', { id });
  await rpc(page, 'workspace/saveDocument', {
    requestId: crypto.randomUUID(),
    id,
    expectedVersion: saved.version,
    title: saved.title,
    content: saved.content,
  });
  await rpc(page, 'workspace/deleteFolder', {
    requestId: crypto.randomUUID(),
    id: folder,
    expectedVersion: await folderVersion(page, projectId, folder),
    withItems: false,
  });

  // Here an edit meets the conflict, and the draft goes to a copy at the root, not to a folder that is gone.
  await page.locator('[contenteditable="true"]').first().click();
  await page.keyboard.type('Meu rascunho.');
  await expect(page.getByText('Este documento mudou em outro dispositivo.', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Salvar meu rascunho como cópia', exact: true }).click();
  await expect(toast(page)).toContainText(
    'Seu rascunho foi salvo em um novo documento, na raiz do projeto: a pasta foi excluída.',
  );
  await expect(page.getByRole('textbox', { name: 'Título do documento' })).toHaveValue('Rascunho — cópia');
  await expect(page.getByRole('button', { name: 'Sem pasta. Mover para pasta (M)' })).toBeVisible();
  await expect(page.locator('[contenteditable="true"]').first()).toContainText('Meu rascunho.');
});

test('an undo the server refuses says so in its own words, and the folder stays deleted', async ({ page }) => {
  await login(page);
  const projectId = await createProject(page, `Desfazer ${Date.now()}`);
  await rpcFolder(page, projectId, 'Antiga');
  await page.reload();
  await folderRow(page, 'Antiga').focus();
  await page.keyboard.press('Shift+F10');
  await page.getByRole('menuitem', { name: /^Excluir pasta/ }).click();
  await expect(toast(page)).toContainText('Pasta “Antiga” excluída.');
  await page.route('**/rpc/workspace/restoreFolder', (route) =>
    route.fulfill({
      status: 400,
      contentType: 'application/json',
      body: JSON.stringify({
        json: { defined: false, code: 'BAD_REQUEST', status: 400, message: 'Mensagem crua do servidor.', data: {} },
      }),
    }),
  );
  await toast(page).getByRole('button', { name: 'Desfazer' }).click();
  await expect(
    page.getByRole('alert').filter({ hasText: 'Não foi possível desfazer a exclusão da pasta.' }),
  ).toBeVisible();
  await expect(page.getByText('Mensagem crua do servidor.')).toHaveCount(0);
  await expect(folderRow(page, 'Antiga')).toHaveCount(0);
});

test('⌘Z pressed while a rename is on its way undoes the deletion once the rename is done', async ({ page }) => {
  await login(page);
  const projectId = await createProject(page, `Fila ${Date.now()}`);
  await rpcFolder(page, projectId, 'Segunda');
  await rpcFolder(page, projectId, 'Primeira');
  await page.reload();

  await folderRow(page, 'Primeira').focus();
  await page.keyboard.press('Shift+F10');
  await page.getByRole('menuitem', { name: /^Excluir pasta/ }).click();
  await expect(toast(page)).toContainText('Pasta “Primeira” excluída.');

  // The rename waits at the network while ⌘Z comes.
  let release = () => {};
  const held = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route('**/rpc/workspace/renameFolder', async (route) => {
    await held;
    await route.continue();
  });
  await folderRow(page, 'Segunda').focus();
  await page.keyboard.press('F2');
  const field = itemsTree(page).getByRole('textbox', { name: 'Novo nome da pasta Segunda' });
  await field.fill('Segunda renomeada');
  await field.press('Enter');
  await page.getByRole('main').getByRole('heading', { level: 1 }).focus();
  await pressCommand(page, 'z');
  await expect(folderRow(page, 'Primeira')).toHaveCount(0);
  release();
  await expect(folderRow(page, 'Segunda renomeada')).toBeVisible();
  await expect(folderRow(page, 'Primeira')).toBeVisible();
  await expect(toast(page)).toContainText('Pasta “Primeira” restaurada.');
});
