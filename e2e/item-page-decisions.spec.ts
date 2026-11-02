import { expect, type Page, test } from '@playwright/test';
import { newDocument } from './support/items.js';
import { answers, rpc } from './support/rpc.js';
import { login } from './support/session.js';

// The decided fixes of the open item's page (docs/etapas/12-refatoracao.md, "Correções decididas").
test.skip(({ isMobile }) => isMobile, 'Desktop: the bands and the Tab order of the page.');

const editor = (page: Page) => page.getByTestId('document-content');
const idOf = (page: Page) => new URL(page.url()).pathname.split('/').at(-1) ?? '';

/** A new document with one line saved; the caret stays at its end. */
async function savedDocument(page: Page, title: string, line: string) {
  await newDocument(page);
  await page.getByRole('textbox', { name: 'Título do documento' }).fill(title);
  const saved = page.waitForResponse(
    (response) =>
      answers(response, 'workspace/saveDocument') &&
      response.status() === 200 &&
      Boolean(response.request().postData()?.includes(line)),
  );
  await editor(page).fill(line);
  await saved;
  return idOf(page);
}

async function trashDocument(page: Page, id: string) {
  const document = await rpc<{ version: number }>(page, 'workspace/getDocument', { id });
  await rpc(page, 'workspace/deleteDocument', {
    id,
    expectedVersion: document.version,
    requestId: crypto.randomUUID(),
  });
}

test('W5.7a: a document trashed elsewhere keeps its editor while it holds unsaved text, and shows the trash notice without it', async ({
  page,
}) => {
  await login(page);
  const kept = await savedDocument(page, `Excluído com rascunho ${Date.now()}`, 'Primeira versão salva.');
  // Text that never reaches the server, then the document goes to the trash from elsewhere.
  await page.route('**/rpc/workspace/saveDocument', (route) => route.abort('failed'));
  await editor(page).fill('Texto que não chegou ao servidor.');
  await expect(page.getByText('Não salvou', { exact: true })).toBeVisible();
  await trashDocument(page, kept);
  await page.unroute('**/rpc/workspace/saveDocument');
  await page.reload();

  await expect(editor(page)).toContainText('Texto que não chegou ao servidor.');
  await expect(page.getByText('Este documento foi movido para a lixeira.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Salvar meu rascunho como cópia' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Abrir lixeira' })).toBeVisible();

  // With nothing local, the page only leads to the trash.
  const plain = await savedDocument(page, `Excluído sem rascunho ${Date.now()}`, 'Tudo salvo.');
  await trashDocument(page, plain);
  await page.reload();
  await expect(page.getByText('Este documento está na lixeira')).toBeVisible();
  await expect(editor(page)).toHaveCount(0);
});
