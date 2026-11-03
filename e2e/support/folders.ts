import { expect, type Locator, type Page } from '@playwright/test';
import { projectNavigation, showSidebar } from './navigation.js';
import { rpc } from './rpc.js';

/** The current project's Itens tree in the sidebar. */
export const itemsTree = (page: Page) => projectNavigation(page).getByRole('treegrid', { name: /^Itens de / });

/** A row of the tree by the start of its accessible name: "Notas" finds "Notas, documento, fixado". */
export const treeRow = (page: Page, name: string) =>
  itemsTree(page).getByRole('row', { name: new RegExp(`^${escapeRegExp(name)}(,|$)`) });

/** A folder's row, whatever its count. */
export const folderRow = (page: Page, name: string) =>
  itemsTree(page).getByRole('row', { name: new RegExp(`^${escapeRegExp(name)}, pasta, `) });

export const escapeRegExp = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Creates a folder from the "+" of Itens, typing its name over "Nova pasta"; returns its id. */
export async function createFolder(page: Page, name: string) {
  await showSidebar(page);
  await projectNavigation(page).getByRole('button', { name: 'Novo item', exact: true }).click();
  await page.getByRole('menuitem', { name: 'Pasta', exact: true }).click();
  const field = itemsTree(page).getByRole('textbox', { name: 'Nome da nova pasta' });
  await expect(field).toBeFocused();
  await field.fill(name);
  const created = page.waitForResponse(
    (response) => new URL(response.url()).pathname === '/rpc/workspace/createFolder' && response.ok(),
  );
  await field.press('Enter');
  const { json } = (await (await created).json()) as { json: { id: string } };
  await expect(folderRow(page, name)).toBeVisible();
  return json.id;
}

/** Opens a folder in the tree, if it is closed. */
export async function expandFolder(page: Page, name: string) {
  const row = folderRow(page, name);
  if ((await row.getAttribute('aria-expanded')) === 'true') return;
  await row.focus();
  await page.keyboard.press('ArrowRight');
  await expect(row).toHaveAttribute('aria-expanded', 'true');
}

/** M on a row of the tree, then the folder (or "Raiz do projeto") in "Mover para pasta…". */
export async function moveToFolder(page: Page, rowName: string, target: string) {
  await treeRow(page, rowName).focus();
  await page.keyboard.press('m');
  const menu = page.getByRole('menu', { name: 'Pastas' });
  await expect(menu).toBeVisible();
  await menu.getByRole('menuitem', { name: new RegExp(`^${escapeRegExp(target)}`) }).click();
  await expect(menu).toBeHidden();
}

/** Creates a document by RPC, in a folder or at the root, as another device would. */
export async function rpcDocument(page: Page, projectId: string, title: string, folderId?: string) {
  return rpc(page, 'workspace/createDocument', {
    requestId: crypto.randomUUID(),
    projectId,
    title,
    ...(folderId ? { folderId } : {}),
  });
}

/** Creates a folder by RPC; returns its id. */
export async function rpcFolder(page: Page, projectId: string, name: string) {
  return (await rpc(page, 'workspace/createFolder', { requestId: crypto.randomUUID(), projectId, name })).id;
}

/**
 * A row's box once the tree stops moving, as after a move redraws it and a folder's "Pasta vazia" row comes
 * in above: the row has to keep its place for a few frames running before it is measured.
 */
async function settledBox(locator: Locator) {
  await locator.evaluate(
    (element) =>
      new Promise<void>((resolve) => {
        let last = '';
        let still = 0;
        let frames = 0;
        const look = () => {
          const rect = element.getBoundingClientRect();
          const now = `${rect.left},${rect.top},${rect.height}`;
          still = now === last ? still + 1 : 0;
          last = now;
          if (still >= 5 || frames++ > 300) resolve();
          else requestAnimationFrame(look);
        };
        requestAnimationFrame(look);
      }),
  );
  return locator.boundingBox();
}

/** Presses on a row, moves in steps onto the target (at `y` of its height) and lets go, or not. */
export async function drag(page: Page, source: Locator, target: Locator, { y = 0.5, release = true } = {}) {
  const from = await settledBox(source);
  const to = await settledBox(target);
  if (!from || !to) throw new Error('A row to drag is not on screen.');
  await page.mouse.move(from.x + 60, from.y + from.height / 2);
  await page.mouse.down();
  await page.mouse.move(from.x + 64, from.y + from.height / 2 + 6, { steps: 4 });
  await page.mouse.move(to.x + 60, to.y + to.height * y, { steps: 12 });
  if (release) await page.mouse.up();
}
