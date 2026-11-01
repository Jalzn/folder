import { expect, type Page, type Request, test } from '@playwright/test';
import {
  createFolder,
  folderRow,
  itemsTree,
  moveToFolder,
  rpcDocument,
  rpcFolder,
  treeRow,
} from './support/folders.js';
import { pressCommand, runCommand } from './support/keyboard.js';
import { createProject, currentProjectId, openTrash, projectNavigation } from './support/navigation.js';
import { rpc } from './support/rpc.js';
import { login } from './support/session.js';

// The tree's keys, hover tools and drag need a desktop; narrow.spec.ts covers the phone.
test.skip(({ isMobile }) => isMobile, 'Desktop: the sidebar is fixed beside the page.');

/** The shell's live region, where moves and the tree's changes are announced. */
const live = (page: Page) => page.locator('p.sr-only[aria-live="polite"]');
const toast = (page: Page) => page.locator('.toast');

/** A fresh project for the test, so the tree holds only what it creates. */
async function freshProject(page: Page, name: string) {
  await login(page);
  return createProject(page, `${name} ${Date.now()}`);
}

test('folders are created, renamed and reordered in place, by the mouse and the keyboard', async ({ page }) => {
  await freshProject(page, 'Pastas');

  // "+" › Pasta: the field takes the focus with "Nova pasta" selected; leaving it empty creates nothing.
  await projectNavigation(page).getByRole('button', { name: 'Novo item', exact: true }).click();
  await page.getByRole('menuitem', { name: 'Pasta', exact: true }).click();
  const draft = itemsTree(page).getByRole('textbox', { name: 'Nome da nova pasta' });
  await expect(draft).toBeFocused();
  expect(await draft.evaluate((input: HTMLInputElement) => input.value.slice(input.selectionStart ?? 0))).toBe(
    'Nova pasta',
  );
  await draft.fill('');
  await draft.press('Enter');
  await expect(draft).toHaveCount(0);
  await expect(itemsTree(page).getByRole('row', { name: /, pasta, / })).toHaveCount(0);

  await createFolder(page, 'MCP');
  // A name that differs only in case and accents is the same folder: the error stays inline.
  await projectNavigation(page).getByRole('button', { name: 'Novo item', exact: true }).click();
  await page.getByRole('menuitem', { name: 'Pasta', exact: true }).click();
  await draft.fill('mcp');
  await draft.press('Enter');
  await expect(itemsTree(page).getByRole('alert')).toContainText('Já existe uma pasta');
  await expect(draft).toBeFocused();
  await draft.fill('Arquitetura');
  await draft.press('Enter');
  await expect(folderRow(page, 'Arquitetura')).toBeFocused();
  // The newest folder comes first.
  const folderNames = () =>
    itemsTree(page)
      .getByRole('row', { name: /, pasta, / })
      .evaluateAll((rows) => rows.map((row) => row.getAttribute('aria-label')?.split(',')[0]));
  expect(await folderNames()).toEqual(['Arquitetura', 'MCP']);

  // F2 renames; Esc gives the old name back and leaves the focus on the row.
  await page.keyboard.press('F2');
  const rename = itemsTree(page).getByRole('textbox', { name: 'Novo nome da pasta Arquitetura' });
  await expect(rename).toBeFocused();
  await rename.fill('Rascunho');
  await rename.press('Escape');
  await expect(rename).toHaveCount(0);
  await expect(folderRow(page, 'Arquitetura')).toBeFocused();
  await page.keyboard.press('F2');
  await rename.fill('Arquitetura do sistema');
  await rename.press('Enter');
  await expect(folderRow(page, 'Arquitetura do sistema')).toBeFocused();

  // ⌥↓ and ⌥↑ move it, keeping the focus and saying where it went.
  await page.keyboard.press('Alt+ArrowDown');
  await expect(live(page)).toHaveText('Pasta Arquitetura do sistema na posição 2 de 2');
  await expect.poll(folderNames).toEqual(['MCP', 'Arquitetura do sistema']);
  await expect(folderRow(page, 'Arquitetura do sistema')).toBeFocused();
  await page.keyboard.press('Alt+ArrowUp');
  await expect.poll(folderNames).toEqual(['Arquitetura do sistema', 'MCP']);

  // The folder's ⋯ does the same, and ⌘K's "Nova pasta" starts another one.
  await folderRow(page, 'MCP').hover();
  await page.getByRole('button', { name: 'Opções da pasta MCP', exact: true }).click();
  await page.getByRole('menuitem', { name: /^Mover para cima/ }).click();
  await expect.poll(folderNames).toEqual(['MCP', 'Arquitetura do sistema']);
  await runCommand(page, 'Nova pasta');
  await expect(draft).toBeFocused();
  await draft.press('Escape');
  await expect(draft).toHaveCount(0);
});

test('a new folder started by the keyboard keeps its name field: ⌘K, N and the "+" of Itens', async ({ page }) => {
  const projectId = await freshProject(page, 'Teclado');
  await rpcDocument(page, projectId, 'Solto');
  await page.reload();
  const draft = itemsTree(page).getByRole('textbox', { name: 'Nome da nova pasta' });
  /** The field holds the focus with "Nova pasta" selected, so typing replaces it; nothing is created yet. */
  async function nameIt(name: string) {
    await expect(draft).toBeFocused();
    expect(await draft.evaluate((input: HTMLInputElement) => input.value.slice(input.selectionStart ?? 0))).toBe(
      'Nova pasta',
    );
    await expect(itemsTree(page).getByRole('row', { name: /^Nova pasta, pasta, / })).toHaveCount(0);
    await page.keyboard.type(name);
    await page.keyboard.press('Enter');
    await expect(folderRow(page, name)).toBeFocused();
  }

  // ⌘K: the typed text highlights "Nova pasta", and ↵ runs it (palette.spec.ts types it at once).
  await pressCommand(page, 'k');
  await page.keyboard.type('Nova pasta', { delay: 50 });
  const command = page
    .getByRole('dialog', { name: 'Buscar e comandar' })
    .getByRole('menuitem')
    .filter({ has: page.getByText('Nova pasta', { exact: true }) });
  await expect(command).toHaveAttribute('data-focused');
  await page.keyboard.press('Enter');
  await nameIt('Pelo comando');

  // N on a row, then ↓ to Pasta and ↵.
  await treeRow(page, 'Solto').focus();
  await page.keyboard.press('n');
  const folderItem = page.getByRole('menuitem', { name: /^Pasta/ });
  await expect(page.getByRole('menuitem').first()).toBeFocused();
  while (!(await folderItem.evaluate((item) => item === document.activeElement)))
    await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');
  await nameIt('Pelo N');

  // The "+" of Itens by ↵, then ↓ to Pasta and ↵.
  await projectNavigation(page).getByRole('button', { name: 'Novo item', exact: true }).focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('menuitem').first()).toBeFocused();
  while (!(await folderItem.evaluate((item) => item === document.activeElement)))
    await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');
  await nameIt('Pelo mais');
});

test('M moves an item between folders, with Desfazer and ⌘Z, and a full folder takes it unpinned', async ({ page }) => {
  const projectId = await freshProject(page, 'Mover');
  const full = await rpcFolder(page, projectId, 'Cheia');
  for (let index = 1; index <= 8; index += 1) {
    const { id } = await rpcDocument(page, projectId, `Fixado ${index}`, full);
    await rpc(page, 'workspace/pinItem', { type: 'document', id });
  }
  const { id: loose } = await rpcDocument(page, projectId, 'Solto fixado');
  await rpc(page, 'workspace/pinItem', { type: 'document', id: loose });
  await page.reload();
  await expect(treeRow(page, 'Solto fixado, documento, fixado')).toBeVisible();

  // Into the full folder: it goes, unpinned, and the toast says why.
  await moveToFolder(page, 'Solto fixado', 'Cheia');
  await expect(toast(page)).toContainText('Movido para Cheia, sem fixar: a pasta já tem 8 fixados.');
  await expect(treeRow(page, 'Solto fixado')).toHaveCount(0);
  // ⌘Z, away from any field, moves it back and pins it again.
  await page.getByRole('heading', { level: 1 }).focus();
  await pressCommand(page, 'z');
  await expect(treeRow(page, 'Solto fixado, documento, fixado')).toBeVisible();
  await expect(toast(page)).toHaveCount(0);

  // "Nova pasta…" names a folder in the sidebar and moves the item into it.
  await treeRow(page, 'Solto fixado').focus();
  await page.keyboard.press('m');
  const menu = page.getByRole('menu', { name: 'Pastas' });
  await menu.getByRole('menuitem', { name: 'Nova pasta…' }).click();
  const draft = itemsTree(page).getByRole('textbox', { name: 'Nome da nova pasta' });
  await expect(draft).toBeFocused();
  await draft.fill('Leituras');
  await draft.press('Enter');
  await expect(toast(page)).toContainText('Movido para Leituras.');
  await expect(folderRow(page, 'Leituras')).toHaveAttribute('aria-label', /, 1 item$/);

  // The filter narrows the folders, and the button says Desfazer.
  await folderRow(page, 'Leituras').focus();
  await page.keyboard.press('ArrowRight');
  await treeRow(page, 'Solto fixado').focus();
  await page.keyboard.press('m');
  await page.getByRole('searchbox', { name: 'Mover para pasta' }).fill('raiz');
  await expect(menu.getByRole('menuitem')).toHaveText(['Raiz do projeto', 'Nova pasta…', 'Outro projeto…']);
  await menu.getByRole('menuitem', { name: 'Raiz do projeto' }).click();
  await expect(toast(page)).toContainText('Movido para a raiz do projeto.');
  await toast(page).getByRole('button', { name: 'Desfazer' }).click();
  await expect(folderRow(page, 'Leituras')).toHaveAttribute('aria-label', /, 1 item$/);
});

test('deleting a folder moves its items to the root, and Desfazer brings back the folder, its place and pins', async ({
  page,
}) => {
  const projectId = await freshProject(page, 'Excluir');
  const first = await rpcFolder(page, projectId, 'Primeira');
  await rpcFolder(page, projectId, 'Segunda');
  const { id } = await rpcDocument(page, projectId, 'Nota da primeira', first);
  await rpc(page, 'workspace/pinItem', { type: 'document', id });
  await page.reload();

  // The deletion's lists go back to restoreFolder unchanged, keptPin included.
  let deleted: unknown;
  page.on('response', async (response) => {
    if (new URL(response.url()).pathname === '/rpc/workspace/deleteFolder' && response.ok())
      deleted = ((await response.json()) as { json: unknown }).json;
  });
  const restored = page.waitForRequest(
    (request: Request) => new URL(request.url()).pathname === '/rpc/workspace/restoreFolder',
  );

  await folderRow(page, 'Primeira').focus();
  await page.keyboard.press('Shift+F10');
  await page.getByRole('menuitem', { name: /^Excluir pasta(?! e)/ }).click();
  await expect(toast(page)).toContainText('Pasta “Primeira” excluída. 1 item foi para a raiz.');
  await expect(folderRow(page, 'Primeira')).toHaveCount(0);
  await expect(treeRow(page, 'Nota da primeira, documento, fixado')).toBeVisible();
  // The focus stays in the tree, on a neighbour.
  await expect(itemsTree(page).getByRole('row').and(page.locator(':focus'))).toHaveCount(1);

  await toast(page).getByRole('button', { name: 'Desfazer' }).click();
  const sent = (await restored).postDataJSON() as { json: { moved: unknown; trashed: unknown } };
  const answer = deleted as { moved: unknown; trashed: unknown };
  expect(sent.json.moved).toEqual(answer.moved);
  expect(sent.json.trashed).toEqual(answer.trashed);
  await expect(folderRow(page, 'Primeira')).toHaveAttribute('aria-label', /, 1 item$/);
  const order = await itemsTree(page)
    .getByRole('row', { name: /, pasta, / })
    .evaluateAll((rows) => rows.map((row) => row.getAttribute('aria-label')?.split(',')[0]));
  expect(order).toEqual(['Segunda', 'Primeira']);
  await folderRow(page, 'Primeira').focus();
  await page.keyboard.press('ArrowRight');
  await expect(treeRow(page, 'Nota da primeira, documento, fixado')).toBeVisible();

  // "Excluir pasta e itens…" asks first, sends the items to the trash, and is undone the same way.
  await folderRow(page, 'Primeira').focus();
  await page.keyboard.press('Shift+F10');
  await page.getByRole('menuitem', { name: 'Excluir pasta e itens…' }).click();
  const dialog = page.getByRole('alertdialog', { name: 'Excluir “Primeira” e 1 item?' });
  await dialog.getByRole('button', { name: 'Excluir pasta e itens' }).click();
  await expect(toast(page)).toContainText('“Primeira” e 1 item foram para a Lixeira.');
  await expect(treeRow(page, 'Nota da primeira')).toHaveCount(0);
  await page.getByRole('heading', { level: 1 }).focus();
  await pressCommand(page, 'z');
  await expect(folderRow(page, 'Primeira')).toHaveAttribute('aria-label', /, 1 item$/);
});

test('the trash names an item’s folder, and restores it to the root once the folder is gone', async ({ page }) => {
  const projectId = await freshProject(page, 'Origem');
  const project = (await page.getByRole('heading', { level: 1 }).textContent()) ?? '';
  const folder = await rpcFolder(page, projectId, 'Antiga');
  const { id } = await rpcDocument(page, projectId, 'Lembrete', folder);
  const document = await rpc<{ version: number }>(page, 'workspace/getDocument', { id });
  await rpc(page, 'workspace/deleteDocument', {
    requestId: crypto.randomUUID(),
    id,
    expectedVersion: document.version,
  });

  await openTrash(page);
  const row = page.getByRole('main').getByRole('listitem').filter({ hasText: 'Lembrete' });
  await expect(row.getByTitle('Origem')).toHaveText(`${project} › Antiga`);

  // The folder goes meanwhile; the trash still names it, and the restore says where the item went.
  await page.goto(`/projetos/${projectId}`);
  await folderRow(page, 'Antiga').focus();
  await page.keyboard.press('Shift+F10');
  await page.getByRole('menuitem', { name: /^Excluir pasta/ }).click();
  await expect(toast(page)).toContainText('Pasta “Antiga” excluída. Estava vazia.');
  await openTrash(page);
  await expect(row.getByTitle('Origem')).toHaveText(`${project} › Antiga`);
  await row.getByRole('button', { name: 'Restaurar Lembrete' }).click();
  await expect(toast(page)).toContainText('A pasta “Antiga” foi excluída; o item voltou para a raiz.');
  await expect(treeRow(page, 'Lembrete, documento')).toHaveAttribute('aria-level', '1');
});

/** A project with MCP holding Leitura (its id is given), and Solto at the root. */
async function pagesProject(page: Page, name: string) {
  const projectId = await freshProject(page, name);
  const project = (await page.getByRole('heading', { level: 1 }).textContent()) ?? '';
  const mcp = await rpcFolder(page, projectId, 'MCP');
  const { id } = await rpcDocument(page, projectId, 'Leitura', mcp);
  await rpcDocument(page, projectId, 'Solto');
  // The sidebar reads what came by RPC.
  await page.reload();
  return { projectId, project, mcp, leitura: id };
}

test('the header’s folder label opens "Mover para pasta…" with the current place checked', async ({ page }) => {
  const { projectId, leitura } = await pagesProject(page, 'Rótulo');
  await page.goto(`/projetos/${projectId}/documentos/${leitura}`);
  const label = page.getByRole('button', { name: 'Pasta MCP. Mover para pasta (M)' });
  await expect(label).toBeVisible();
  await label.click();
  const menu = page.getByRole('menu', { name: 'Pastas' });
  const here = menu.getByRole('menuitem', { name: /^MCP\b.*lugar atual/ });
  await expect(here).toBeVisible();
  // The ✓ is in the accent, as in the prototype, even with the row highlighted.
  const accent = await page.evaluate(() => {
    const probe = document.body.appendChild(document.createElement('span'));
    probe.style.color = 'var(--accent)';
    const color = getComputedStyle(probe).color;
    probe.remove();
    return color;
  });
  const check = here.locator('svg').first();
  await expect(check).toHaveCSS('color', accent);
  await here.hover();
  await expect(here).toHaveAttribute('data-focused');
  await expect(check).toHaveCSS('color', accent);
  await page.keyboard.press('Escape');
  await expect(menu).toBeHidden();
  await expect(label).toBeFocused();
});

test('N on the page of an item in a folder offers that folder first, and creates there', async ({ page }) => {
  const { projectId, leitura } = await pagesProject(page, 'Novo na pasta');
  await page.goto(`/projetos/${projectId}/documentos/${leitura}`);
  await page.getByRole('heading', { level: 1 }).focus();
  await page.keyboard.press('n');
  await expect(page.getByRole('menuitem').first()).toHaveText('Novo documento em MCP');
  await page.getByRole('menuitem', { name: 'Novo documento em MCP' }).click();
  await expect(page).not.toHaveURL(new RegExp(leitura));
  await expect(page.getByRole('button', { name: 'Pasta MCP. Mover para pasta (M)' })).toBeVisible();
});

test('the Índice groups by folder, "Sem pasta" last, and ungrouped shows the Pasta column', async ({ page }) => {
  const { projectId, project } = await pagesProject(page, 'Agrupado');
  await page.goto(`/projetos/${projectId}/indice`);
  const table = page.getByRole('grid', { name: `Índice de ${project}` });
  await expect(table.locator('.index-table__group')).toHaveText(['MCP1', 'Sem pasta1']);
  await expect(table.getByRole('columnheader', { name: 'Pasta' })).toHaveCount(0);
  await page.getByText('Agrupar por pasta').click();
  await expect(table.getByRole('columnheader', { name: 'Pasta' })).toBeVisible();
  await expect(table.getByRole('row', { name: /^Solto/ })).toContainText('Sem pasta');
  // The choice stays on this device.
  await page.reload();
  await expect(page.getByRole('switch', { name: 'Agrupar por pasta' })).not.toBeChecked();
  await page.getByText('Agrupar por pasta').click();
});

test('the Índice’s Pasta filter is in the address, and a folder the project lacks is Todas', async ({ page }) => {
  const { projectId, project, mcp } = await pagesProject(page, 'Filtrado');
  await page.goto(`/projetos/${projectId}/indice`);
  await page.getByRole('button', { name: 'Pasta: Todas' }).click();
  await page.getByRole('menuitemradio', { name: 'Sem pasta' }).click();
  await expect(page).toHaveURL(/\?pasta=raiz$/);
  await expect(page.getByText(`1 item em ${project} · Sem pasta.`)).toBeVisible();
  await page.goto(`/projetos/${projectId}/indice?pasta=${mcp}`);
  await expect(page.getByText(`1 item em ${project} · MCP.`)).toBeVisible();
  await page.goto(`/projetos/${projectId}/indice?pasta=desconhecida`);
  await expect(page).toHaveURL(new RegExp(`/projetos/${projectId}/indice$`));
  await expect(page.getByRole('button', { name: 'Pasta: Todas' })).toBeVisible();
});

test('⌘K shows an item’s path, and a folder opens in the sidebar with its first item focused', async ({ page }) => {
  const { project } = await pagesProject(page, 'Paleta');
  await pressCommand(page, 'k');
  const palette = page.getByRole('dialog', { name: 'Buscar e comandar' });
  await palette.getByRole('textbox', { name: 'Buscar ou comandar' }).fill('Leitura');
  await expect(
    palette.getByRole('menuitem', { name: /^Leitura\b/ }).filter({ hasText: `${project} › MCP` }),
  ).toHaveCount(1);
  await palette.getByRole('textbox', { name: 'Buscar ou comandar' }).fill('MCP');
  await palette
    .getByRole('menuitem', { name: /^MCP · pasta · 1 item/ })
    .filter({ hasText: project })
    .click();
  await expect(folderRow(page, 'MCP')).toHaveAttribute('aria-expanded', 'true');
  await expect(itemsTree(page).getByRole('row', { level: 2 }).first()).toBeFocused();
});

test('the Visão geral says the type and the folder of each recent item', async ({ page }) => {
  const { projectId } = await pagesProject(page, 'Recentes');
  await page.goto(`/projetos/${projectId}`);
  await expect(page.getByRole('main').getByText('Documento · MCP').first()).toBeVisible();
  expect(currentProjectId(page)).toBe(projectId);
});
