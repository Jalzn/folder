import { expect, type Page } from '@playwright/test';
import { test } from './fixtures.js';
import { toast } from './support/feedback.js';
import { drag, folderRow, itemsTree, rpcDocument, rpcFolder, treeRow } from './support/folders.js';
import { appShortcut } from './support/keyboard.js';
import { createProject } from './support/navigation.js';
import { rpc } from './support/rpc.js';
import { login } from './support/session.js';

// Failures around folders (sec-quality.md S2, S3 and S4): a copy whose folder went, an undo the server
// refuses, and an undo pressed while another folder write is on its way. Desktop: the fixed sidebar.

/** The folder's version, as the tree has it, for a write by RPC. */
async function folderVersion(page: Page, projectId: string, folderId: string) {
  const { tree } = await rpc(page, 'workspace/projectNavigation', { projectId });
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
  const saved = await rpc(page, 'workspace/getDocument', { id });
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
  // The deletion gives the focus to the next folder.
  await expect(folderRow(page, 'Segunda')).toBeFocused();

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
  await appShortcut(page, 'z');
  await expect(folderRow(page, 'Primeira')).toHaveCount(0);
  release();
  await expect(folderRow(page, 'Segunda renomeada')).toBeVisible();
  await expect(folderRow(page, 'Primeira')).toBeVisible();
  await expect(toast(page)).toContainText('Pasta “Primeira” restaurada.');
});

test('a deletion whose answer was lost is sent again with its request, and its Desfazer comes back', async ({
  page,
}) => {
  await login(page);
  const projectId = await createProject(page, `Perdida ${Date.now()}`);
  const folder = await rpcFolder(page, projectId, 'Efêmera');
  await rpcDocument(page, projectId, 'Dentro', folder);
  await page.reload();
  // The first deletion reaches the server, which applies it, but its answer never comes back.
  let sent = 0;
  const ids: string[] = [];
  await page.route('**/rpc/workspace/deleteFolder', async (route) => {
    sent += 1;
    ids.push((route.request().postDataJSON() as { json: { requestId: string } }).json.requestId);
    if (sent > 1) return route.continue();
    await route.fetch();
    await route.abort('failed');
  });
  await folderRow(page, 'Efêmera').focus();
  await page.keyboard.press('Shift+F10');
  await page.getByRole('menuitem', { name: /^Excluir pasta(?! e)/ }).click();
  await expect(toast(page)).toContainText('Pasta “Efêmera” excluída. 1 item foi para a raiz.');
  expect(sent).toBe(2);
  expect(ids[1]).toBe(ids[0]);
  await toast(page).getByRole('button', { name: 'Desfazer' }).click();
  await expect(folderRow(page, 'Efêmera')).toHaveAttribute('aria-label', /, 1 item$/);
});

test('an undo applies only to its own move: a newer move of the item takes the Desfazer away', async ({ page }) => {
  await login(page);
  const projectId = await createProject(page, `Vaivém ${Date.now()}`);
  await rpcFolder(page, projectId, 'Dois');
  await rpcFolder(page, projectId, 'Um');
  await rpcDocument(page, projectId, 'Vai e vem');
  await page.reload();
  const moveTo = async (target: string) => {
    await treeRow(page, 'Vai e vem').focus();
    await page.keyboard.press('m');
    await page
      .getByRole('menu', { name: 'Pastas' })
      .getByRole('menuitem', { name: new RegExp(`^${target}`) })
      .click();
  };
  await moveTo('Um');
  await expect(toast(page)).toContainText('Movido para Um.');
  await expect(toast(page).getByRole('button', { name: 'Desfazer' })).toBeVisible();

  // The second move waits at the network; the first toast loses its Desfazer as it starts, and ⌘Z does nothing.
  let release = () => {};
  const held = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route('**/rpc/workspace/moveItem', async (route) => {
    await held;
    await route.continue();
  });
  await moveTo('Dois');
  await expect(toast(page).getByRole('button', { name: 'Desfazer' })).toHaveCount(0);
  await page.getByRole('main').getByRole('heading', { level: 1 }).focus();
  await appShortcut(page, 'z');
  release();
  await expect(toast(page)).toContainText('Movido para Dois.');
  await expect(folderRow(page, 'Dois')).toHaveAttribute('aria-label', /, 1 item$/);
  // This toast's own Desfazer takes it back to Um, where the first move left it.
  await page.unroute('**/rpc/workspace/moveItem');
  await toast(page).getByRole('button', { name: 'Desfazer' }).click();
  await expect(folderRow(page, 'Um')).toHaveAttribute('aria-label', /, 1 item$/);
  await expect(folderRow(page, 'Dois')).toHaveAttribute('aria-label', /, 0 itens$/);
});

test('a second move refused while another write runs leaves the first toast its Desfazer', async ({ page }) => {
  await login(page);
  const projectId = await createProject(page, `Recusa ${Date.now()}`);
  await rpcFolder(page, projectId, 'Dois');
  await rpcFolder(page, projectId, 'Um');
  await rpcDocument(page, projectId, 'Outro');
  await rpcDocument(page, projectId, 'Vai e vem');
  await page.reload();
  // Dragging uses one set of writes for the tree: the first move goes through.
  await drag(page, treeRow(page, 'Vai e vem'), folderRow(page, 'Um'));
  await expect(toast(page)).toContainText('Movido para Um.');
  // A move of another item waits at the network; a second move of the first item is refused meanwhile.
  let release = () => {};
  const held = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route('**/rpc/workspace/moveItem', async (route) => {
    await held;
    await route.continue();
  });
  await drag(page, treeRow(page, 'Outro'), folderRow(page, 'Dois'));
  await drag(page, treeRow(page, 'Vai e vem'), folderRow(page, 'Dois'));
  await expect(toast(page)).toContainText('Movido para Um.');
  await expect(toast(page).getByRole('button', { name: 'Desfazer' })).toBeVisible();
  release();
  await expect(toast(page)).toContainText('Movido para Dois.');
  await expect(folderRow(page, 'Um')).toHaveAttribute('aria-label', /, 1 item$/);
});

test('Desfazer of a move to another project puts the item back in its folder, or at the root if it is gone', async ({
  page,
}) => {
  await login(page);
  const target = `Destino ${Date.now()}`;
  await createProject(page, target);
  const projectId = await createProject(page, `Origem ${Date.now()}`);
  const project = (await page.getByRole('heading', { level: 1 }).textContent()) ?? '';
  const folder = await rpcFolder(page, projectId, 'Casa');
  await rpcDocument(page, projectId, 'Viajante', folder);
  await rpcDocument(page, projectId, 'Sem volta', folder);
  await page.reload();
  const toProject = async (title: string) => {
    await folderRow(page, 'Casa').focus();
    if ((await folderRow(page, 'Casa').getAttribute('aria-expanded')) !== 'true')
      await page.keyboard.press('ArrowRight');
    await treeRow(page, title).focus();
    await page.keyboard.press('m');
    await page.getByRole('menu', { name: 'Pastas' }).getByRole('menuitem', { name: 'Outro projeto…' }).click();
    await page.getByRole('menuitemradio', { name: target }).click();
    await expect(toast(page)).toContainText(`“${title}” foi para ${target}.`);
  };

  await toProject('Viajante');
  await toast(page).getByRole('button', { name: 'Desfazer' }).click();
  await expect(folderRow(page, 'Casa')).toHaveAttribute('aria-label', /, 2 itens/);

  // The folder goes while the item is away: Desfazer brings it to the root, and says so.
  await toProject('Sem volta');
  await rpc(page, 'workspace/deleteFolder', {
    requestId: crypto.randomUUID(),
    id: folder,
    expectedVersion: await folderVersion(page, projectId, folder),
    withItems: false,
  });
  await toast(page).getByRole('button', { name: 'Desfazer' }).click();
  await expect(toast(page)).toContainText(
    `“Sem volta” voltou para ${project}, na raiz: a pasta de onde saiu foi excluída.`,
  );
  await expect(treeRow(page, 'Sem volta')).toHaveAttribute('aria-level', '1');
});
