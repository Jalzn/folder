import { expect, type Page, test } from '@playwright/test';
import { drag, folderRow, itemsTree, rpcDocument, rpcFolder, treeRow } from './support/folders.js';
import { createProject, projectNavigation } from './support/navigation.js';
import { login } from './support/session.js';

// Dragging is a pointer on a desktop; a phone moves through M or the menus (narrow.spec.ts).
test.skip(({ isMobile }) => isMobile, 'Desktop only: a phone has no drag in the tree.');

const toast = (page: Page) => page.locator('.toast');
const folderNames = (page: Page) =>
  itemsTree(page)
    .getByRole('row', { name: /, pasta, / })
    .evaluateAll((rows) => rows.map((row) => row.getAttribute('aria-label')?.split(',')[0]));

async function sampleProject(page: Page) {
  await login(page);
  const projectId = await createProject(page, `Arrastar ${Date.now()}`);
  const segunda = await rpcFolder(page, projectId, 'Segunda');
  const primeira = await rpcFolder(page, projectId, 'Primeira');
  await rpcDocument(page, projectId, 'Dentro', segunda);
  await rpcDocument(page, projectId, 'Solto');
  await page.reload();
  await expect(folderRow(page, 'Primeira')).toBeVisible();
  return { projectId, primeira, segunda };
}

test('an item dropped on a folder goes into it, and on the Itens header back to the root', async ({ page }) => {
  await sampleProject(page);
  await drag(page, treeRow(page, 'Solto'), folderRow(page, 'Primeira'), { release: false });
  await expect(folderRow(page, 'Primeira')).toHaveAttribute('data-drop-target', 'true');
  await page.mouse.up();
  await expect(toast(page)).toContainText('Movido para Primeira.');
  await expect(folderRow(page, 'Primeira')).toHaveAttribute('aria-label', /, 1 item$/);

  // A closed folder opens under a held item, after React Aria's 800 ms.
  await folderRow(page, 'Primeira').focus();
  await page.keyboard.press('ArrowRight');
  await drag(page, treeRow(page, 'Solto'), folderRow(page, 'Segunda'), { release: false });
  await expect(folderRow(page, 'Segunda')).toHaveAttribute('aria-expanded', 'true', { timeout: 3_000 });
  // Between the children of a folder is that folder.
  await drag(page, treeRow(page, 'Solto'), treeRow(page, 'Dentro'), { y: 0.9, release: false });
  await page.mouse.up();
  await expect(toast(page)).toContainText('Movido para Segunda.');
  await expect(treeRow(page, 'Solto')).toHaveAttribute('aria-level', '2');

  // The header takes it back to the root.
  const header = projectNavigation(page).locator('.items-header');
  await drag(page, treeRow(page, 'Solto'), header, { release: false });
  await expect(header).toHaveClass(/is-drop-target/);
  await page.mouse.up();
  await expect(toast(page)).toContainText('Movido para a raiz do projeto.');
  await expect(treeRow(page, 'Solto')).toHaveAttribute('aria-level', '1');
});

test('a folder dragged between folders reorders them, and Esc cancels a drag', async ({ page }) => {
  await sampleProject(page);
  expect(await folderNames(page)).toEqual(['Primeira', 'Segunda']);
  // Below the last folder.
  await drag(page, folderRow(page, 'Primeira'), folderRow(page, 'Segunda'), { y: 0.85 });
  await expect.poll(() => folderNames(page)).toEqual(['Segunda', 'Primeira']);

  // Esc while dragging leaves everything where it was.
  await drag(page, treeRow(page, 'Solto'), folderRow(page, 'Primeira'), { release: false });
  await page.keyboard.press('Escape');
  await page.mouse.up();
  await expect(treeRow(page, 'Solto')).toHaveAttribute('aria-level', '1');
  await expect(folderRow(page, 'Primeira')).toHaveAttribute('aria-label', /, 0 itens$/);
  expect(await folderNames(page)).toEqual(['Segunda', 'Primeira']);
  await expect(toast(page)).toHaveCount(0);
});

test('the plan’s refused places stay refused: an item before a folder, a folder on another', async ({ page }) => {
  await sampleProject(page);
  // The top third of a folder row is before it: no target, and nothing moves.
  await drag(page, treeRow(page, 'Solto'), folderRow(page, 'Primeira'), { y: 0.15 });
  await expect(treeRow(page, 'Solto')).toHaveAttribute('aria-level', '1');
  await expect(folderRow(page, 'Primeira')).toHaveAttribute('aria-label', /, 0 itens$/);
  // A folder on the middle of another folder neither nests nor reorders.
  await drag(page, folderRow(page, 'Segunda'), folderRow(page, 'Primeira'));
  expect(await folderNames(page)).toEqual(['Primeira', 'Segunda']);
  await expect(page.locator('.toast')).toHaveCount(0);
});

test('a closed folder opens under a held item that keeps moving a little', async ({ page }) => {
  await sampleProject(page);
  await drag(page, treeRow(page, 'Solto'), folderRow(page, 'Segunda'), { release: false });
  const box = await folderRow(page, 'Segunda').boundingBox();
  if (!box) throw new Error('No folder row.');
  // A pixel every 200 ms, as a hand on a trackpad: React Aria's own timer would start over each time.
  for (let step = 0; step < 6; step += 1) {
    await page.mouse.move(box.x + 60 + (step % 2), box.y + box.height / 2);
    await page.waitForTimeout(200);
  }
  await expect(folderRow(page, 'Segunda')).toHaveAttribute('aria-expanded', 'true');
  await page.keyboard.press('Escape');
  await page.mouse.up();
});
