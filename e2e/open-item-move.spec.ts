import { expect, type Page, test } from '@playwright/test';
import { toast } from './support/feedback.js';
import { drag, folderRow, itemsTree, rpcDocument, rpcFolder, treeRow } from './support/folders.js';
import { pressCommand } from './support/keyboard.js';
import { createProject, projectNavigation } from './support/navigation.js';
import { login } from './support/session.js';

// The open item moved from its own page, between a folder and the root (tree.md C1): the page and the tree
// stay, and the item shows once. Desktop, where the sidebar and the drag are beside the page.
test.skip(({ isMobile }) => isMobile, 'Desktop: the tree is beside the page.');

/** The document's page is still there, and the tree lists it once, at the level given. */
async function intact(page: Page, title: string, level: '1' | '2') {
  await expect(page.getByRole('textbox', { name: 'Título do documento' })).toHaveValue(title);
  await expect(page.getByText('Something went wrong')).toHaveCount(0);
  await expect(treeRow(page, title)).toHaveCount(1);
  await expect(treeRow(page, title)).toHaveAttribute('aria-level', level);
}

/** A project with the folder Leituras holding the document Artigo, whose page is open. */
async function openInFolder(page: Page) {
  await login(page);
  const projectId = await createProject(page, `Item aberto ${Date.now()}`);
  const folder = await rpcFolder(page, projectId, 'Leituras');
  const { id } = await rpcDocument(page, projectId, 'Artigo', folder);
  await page.goto(`/projetos/${projectId}/documentos/${id}`);
  await intact(page, 'Artigo', '2');
  return { projectId, folder, id };
}

async function moveWithM(page: Page, target: string) {
  await page.getByRole('main').getByRole('heading', { level: 1 }).focus();
  await page.keyboard.press('m');
  await page
    .getByRole('menu', { name: 'Pastas' })
    .getByRole('menuitem', { name: new RegExp(`^${target}`) })
    .click();
}

test('M moves the open item to the root with its folder open or closed, and ⌘Z brings it back', async ({ page }) => {
  await openInFolder(page);
  await moveWithM(page, 'Raiz do projeto');
  await expect(toast(page)).toContainText('Movido para a raiz do projeto.');
  await intact(page, 'Artigo', '1');
  await expect(page.getByRole('button', { name: 'Sem pasta. Mover para pasta (M)' })).toBeVisible();

  // ⌘Z puts it back in the folder; the toast's Desfazer of the next move takes it out again.
  await page.getByRole('main').getByRole('heading', { level: 1 }).focus();
  await pressCommand(page, 'z');
  await intact(page, 'Artigo', '2');
  await expect(page.getByRole('button', { name: 'Pasta Leituras. Mover para pasta (M)' })).toBeVisible();

  // With the folder closed in the tree.
  await folderRow(page, 'Leituras').focus();
  await page.keyboard.press('ArrowLeft');
  await expect(folderRow(page, 'Leituras')).toHaveAttribute('aria-expanded', 'false');
  await moveWithM(page, 'Raiz do projeto');
  await intact(page, 'Artigo', '1');

  // From the root into the folder, still closed, and Desfazer back to the root.
  await moveWithM(page, 'Leituras');
  await expect(toast(page)).toContainText('Movido para Leituras.');
  await expect(page.getByRole('button', { name: 'Pasta Leituras. Mover para pasta (M)' })).toBeVisible();
  await expect(folderRow(page, 'Leituras')).toHaveAttribute('aria-label', /^Leituras, pasta, 1 item/);
  await expect(treeRow(page, 'Artigo')).toHaveCount(0);
  await toast(page).getByRole('button', { name: 'Desfazer' }).click();
  await intact(page, 'Artigo', '1');
});

test('the open item dragged to the Itens header goes to the root and the page stays', async ({ page }) => {
  await openInFolder(page);
  await drag(page, treeRow(page, 'Artigo'), projectNavigation(page).locator('.items-header'));
  await expect(toast(page)).toContainText('Movido para a raiz do projeto.');
  await intact(page, 'Artigo', '1');
  await page.getByRole('main').getByRole('heading', { level: 1 }).focus();
  await pressCommand(page, 'z');
  await intact(page, 'Artigo', '2');
  await expect(itemsTree(page).getByRole('row')).toHaveCount(2);
});
