import { expect, type Page } from '@playwright/test';
import { test } from '../fixtures.js';
import { seedDocument, seedFolder } from '../support/builders.js';
import { escapeRegExp, folderRow, itemsTree, treeRow } from '../support/folders.js';
import { appShortcut } from '../support/keyboard.js';
import { createProject, projectNavigation } from '../support/navigation.js';
import { holdRpc } from '../support/network.js';

// The keyboard of a fixed sidebar; narrow.spec.ts covers the tree over the page on a phone.

const focusedRow = (page: Page) =>
  page.evaluate(() => document.activeElement?.closest('[role="row"]')?.getAttribute('aria-label') ?? null);

/** A project with Arquitetura (Fluxo, Notas), the empty Vazia, and Zebra and Visão at the root. */
async function sampleProject(page: Page) {
  const projectId = await createProject(page, `Árvore ${Date.now()}`);
  await seedFolder(page, { projectId, name: 'Vazia' });
  const arquitetura = await seedFolder(page, { projectId, name: 'Arquitetura' });
  await seedDocument(page, { projectId, title: 'Notas', folderId: arquitetura });
  const fluxo = await seedDocument(page, { projectId, title: 'Fluxo', folderId: arquitetura });
  await seedDocument(page, { projectId, title: 'Zebra' });
  await seedDocument(page, { projectId, title: 'Visão' });
  await page.reload();
  await expect(folderRow(page, 'Arquitetura')).toBeVisible();
  return { projectId, arquitetura, fluxo: fluxo.id };
}

test('the tree is a treegrid that the arrows, Enter and type-to-select walk, with Esc doing nothing', async ({
  page,
}) => {
  const { projectId } = await sampleProject(page);
  const tree = itemsTree(page);
  await expect(folderRow(page, 'Arquitetura')).toHaveAttribute('aria-level', '1');
  await expect(folderRow(page, 'Arquitetura')).toHaveAttribute('aria-expanded', 'false');

  // ↓ from Quadro enters the tree; → opens a folder, ↓ goes in, ← goes back to the folder, ← closes it.
  await projectNavigation(page).getByRole('link', { name: 'Quadro' }).focus();
  await page.keyboard.press('ArrowDown');
  expect(await focusedRow(page)).toBe('Arquitetura, pasta, 2 itens');
  await page.keyboard.press('ArrowRight');
  await expect(folderRow(page, 'Arquitetura')).toHaveAttribute('aria-expanded', 'true');
  await page.keyboard.press('ArrowDown');
  expect(await focusedRow(page)).toMatch(/^Fluxo, documento/);
  await expect(tree.getByRole('row', { name: /^Fluxo, / })).toHaveAttribute('aria-level', '2');
  await page.keyboard.press('ArrowLeft');
  expect(await focusedRow(page)).toBe('Arquitetura, pasta, 2 itens');
  await page.keyboard.press('ArrowLeft');
  await expect(folderRow(page, 'Arquitetura')).toHaveAttribute('aria-expanded', 'false');

  // Esc neither closes a folder nor leaves the page.
  await page.keyboard.press('Enter');
  await expect(folderRow(page, 'Arquitetura')).toHaveAttribute('aria-expanded', 'true');
  const here = page.url();
  await page.keyboard.press('Escape');
  await expect(folderRow(page, 'Arquitetura')).toHaveAttribute('aria-expanded', 'true');
  expect(page.url()).toBe(here);

  // Home and End; a letter that is no shortcut selects by name.
  await page.keyboard.press('End');
  expect(await focusedRow(page)).toMatch(/^Zebra|^Visão/);
  await page.keyboard.press('Home');
  expect(await focusedRow(page)).toMatch(/^Arquitetura/);
  await page.keyboard.press('z');
  expect(await focusedRow(page)).toMatch(/^Zebra, documento/);

  // Enter opens the item, and one click is one entry in the history.
  await page.keyboard.press('Enter');
  await expect(page.getByRole('textbox', { name: 'Título do documento' })).toHaveValue('Zebra');
  await treeRow(page, 'Notas').click();
  await expect(page.getByRole('textbox', { name: 'Título do documento' })).toHaveValue('Notas');
  await page.goBack();
  await expect(page.getByRole('textbox', { name: 'Título do documento' })).toHaveValue('Zebra');
  await page.goBack();
  await expect(page).toHaveURL(new RegExp(`/projetos/${projectId}$`));
});

test('N, P, M and G P act on the row in focus, F2 and ⇧F10 on a folder', async ({ page }) => {
  const { projectId } = await sampleProject(page);
  const project = (await page.getByRole('heading', { level: 1 }).textContent()) ?? '';

  // P pins the item in focus, and again unpins it.
  await treeRow(page, 'Zebra').focus();
  await page.keyboard.press('p');
  await expect(treeRow(page, 'Zebra, documento, fixado')).toBeFocused();
  await page.keyboard.press('p');
  await expect(treeRow(page, 'Zebra')).toHaveAttribute('aria-label', 'Zebra, documento');

  // N on a folder offers it first; on a root item, the project's menu.
  await folderRow(page, 'Arquitetura').focus();
  await page.keyboard.press('n');
  await expect(page.getByRole('menuitem').first()).toHaveText('Novo documento em Arquitetura');
  await page.keyboard.press('Escape');
  await expect(folderRow(page, 'Arquitetura')).toBeFocused();
  await treeRow(page, 'Zebra').focus();
  await page.keyboard.press('n');
  await expect(page.getByRole('menu', { name: `Novo em ${project}` })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(treeRow(page, 'Zebra')).toBeFocused();

  // M opens "Mover para pasta…" on the item; on a folder it does nothing.
  await page.keyboard.press('m');
  await expect(page.getByRole('menu', { name: 'Pastas' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('menu', { name: 'Pastas' })).toBeHidden();
  await expect(treeRow(page, 'Zebra')).toBeFocused();
  await folderRow(page, 'Arquitetura').focus();
  await page.keyboard.press('m');
  await expect(page.getByRole('menu', { name: 'Pastas' })).toHaveCount(0);

  // ⇧F10 opens the folder's menu; G P the switcher.
  await page.keyboard.press('Shift+F10');
  await expect(page.getByRole('menu', { name: 'Opções da pasta Arquitetura' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(folderRow(page, 'Arquitetura')).toBeFocused();
  await page.keyboard.press('g');
  await page.keyboard.press('p');
  await expect(page.getByRole('dialog', { name: 'Trocar de projeto' })).toBeVisible();
  await page.keyboard.press('Escape');
  expect(projectId).toBeTruthy();
});

test('open folders persist per project, and arriving at an item opens its folder', async ({ page }) => {
  const { projectId, fluxo } = await sampleProject(page);
  // The first visit opens only the folder of the item on screen.
  await expect(folderRow(page, 'Arquitetura')).toHaveAttribute('aria-expanded', 'false');
  await page.goto(`/projetos/${projectId}/documentos/${fluxo}`);
  await expect(folderRow(page, 'Arquitetura')).toHaveAttribute('aria-expanded', 'true');
  await expect(treeRow(page, 'Fluxo').getByRole('link')).toHaveAttribute('aria-current', 'page');

  // Closed, it stays closed after a reload, until the next arrival at one of its items.
  await folderRow(page, 'Arquitetura').focus();
  await page.keyboard.press('ArrowLeft');
  await expect(folderRow(page, 'Arquitetura')).toHaveAttribute('aria-expanded', 'false');
  await page.reload();
  await expect(folderRow(page, 'Arquitetura')).toHaveAttribute('aria-expanded', 'false');
  // It marks that it holds the open item.
  await expect(folderRow(page, 'Arquitetura')).toHaveAttribute('data-holds-current', 'true');

  // An empty folder shows "Pasta vazia", and → reaches its two links.
  await folderRow(page, 'Vazia').focus();
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('ArrowDown');
  const empty = itemsTree(page).getByRole('row', { name: /Pasta vazia/ });
  await expect(empty).toBeFocused();
  await page.keyboard.press('ArrowRight');
  await expect(empty.getByRole('button', { name: '+ Documento' })).toBeFocused();
  await page.keyboard.press('ArrowRight');
  await expect(empty.getByRole('button', { name: '+ Desenho' })).toBeFocused();
});

test('a large folder shows eight items and "Ver todos", which opens the Índice filtered by it', async ({ page }) => {
  const projectId = await createProject(page, `Grande ${Date.now()}`);
  const folder = await seedFolder(page, { projectId, name: 'Muitos' });
  const ids: string[] = [];
  for (let index = 1; index <= 10; index += 1)
    ids.push(
      (await seedDocument(page, { projectId, title: `Item ${String(index).padStart(2, '0')}`, folderId: folder })).id,
    );
  for (let index = 1; index <= 9; index += 1) await seedDocument(page, { projectId, title: `Raiz ${index}` });
  await page.reload();

  // The first item, edited longest ago, is not among the eight: opened, it shows as a ninth row.
  await page.goto(`/projetos/${projectId}/documentos/${ids[0]}`);
  const children = itemsTree(page).getByRole('row', { level: 2 });
  await expect(children).toHaveCount(10);
  await expect(children.nth(8)).toHaveAttribute('aria-label', /^Item 01, /);
  const more = itemsTree(page).getByRole('row', { name: 'Ver todos os 10 itens de Muitos no Índice' });
  await expect(more).toBeVisible();
  await expect(
    itemsTree(page).getByRole('row', { name: 'Ver todos os 9 itens da raiz do projeto no Índice' }),
  ).toBeVisible();

  await more.focus();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(new RegExp(`/indice\\?pasta=${escapeRegExp(folder)}$`));
  await expect(page.getByText(/^10 itens em Grande \d+ · Muitos\./)).toBeVisible();
});

test('a closed folder and the rail show the dot of an item not yet saved, and the rail opens the tree', async ({
  page,
}) => {
  const { projectId, fluxo } = await sampleProject(page);
  await page.goto(`/projetos/${projectId}/documentos/${fluxo}`);
  await expect(folderRow(page, 'Arquitetura')).toHaveAttribute('aria-expanded', 'true');
  await folderRow(page, 'Arquitetura').focus();
  await page.keyboard.press('ArrowLeft');

  // Saves wait, so the edit stays pending.
  const pendingSave = await holdRpc(page, 'workspace/saveDocument');
  await page.locator('[contenteditable="true"]').first().click();
  await page.keyboard.type('Ainda não salvo.');
  await expect(folderRow(page, 'Arquitetura')).toHaveAttribute(
    'aria-label',
    /, 1 item não salvo, contém o item aberto$/,
  );

  // Collapsed, the rail's Itens carries it and opens the same tree in a popover.
  await appShortcut(page, 'Backslash');
  const items = page.getByRole('button', { name: /^Itens/ });
  await expect(items).toBeVisible();
  // It says what the dot shows, and is the current place on an item's page.
  await expect(items).toHaveAccessibleName('Itens, 1 item não salvo');
  await expect(items).toHaveAttribute('data-on', 'true');
  await items.click();
  const popover = page.getByRole('dialog', { name: /^Itens de / });
  await expect(popover.getByRole('treegrid')).toBeVisible();
  await expect(
    popover.getByRole('row', { name: /^Arquitetura, pasta, 2 itens, 1 item não salvo, contém o item aberto$/ }),
  ).toBeVisible();
  await page.keyboard.press('Escape');
  await pendingSave.restore();
  await appShortcut(page, 'Backslash');
});
