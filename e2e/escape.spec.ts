import { expect, type Page, test } from '@playwright/test';
import { folderRow, rpcDocument, rpcFolder, treeRow } from './support/folders.js';
import { newDocument } from './support/items.js';
import { pressCommand } from './support/keyboard.js';
import { createProject, openBoard } from './support/navigation.js';
import { login } from './support/session.js';

/**
 * Esc closes only the newest layer, one per press, and never navigates. On a phone the stack starts with
 * the sidebar over the page and the switcher opened from it; on a desktop, with the shortcuts dialog. The
 * palette goes on top of either.
 */
test('Esc closes one layer at a time, newest first, and stays on the page', async ({ page }, info) => {
  await login(page);
  const address = page.url();
  const phone = info.project.name === 'chrome-mobile';
  const stack = phone
    ? [page.getByRole('dialog', { name: 'Navegação' }), page.getByRole('dialog', { name: 'Trocar de projeto' })]
    : [page.getByRole('dialog', { name: 'Atalhos' })];
  if (phone) {
    await page.getByRole('button', { name: 'Abrir navegação', exact: true }).click();
    await stack[0]?.getByRole('button', { name: /Trocar de projeto|Abrir o seletor/ }).click();
  } else {
    await page.locator('body').press('?');
  }
  for (const layer of stack) await expect(layer).toBeVisible();
  await pressCommand(page, 'k');
  const palette = page.getByRole('dialog', { name: 'Buscar e comandar' });
  await expect(palette).toBeVisible();
  stack.push(palette);

  while (stack.length) {
    const top = stack.pop();
    await page.keyboard.press('Escape');
    if (top) await expect(top).toBeHidden();
    for (const below of stack) await expect(below).toBeVisible();
    await expect(page).toHaveURL(address);
  }
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page).toHaveURL(address);
});

/** The sidebar over the page: the top bar's menu on a phone, the rail's button at 900 px. */
async function openOverlay(page: Page, phone: boolean) {
  if (!phone) await page.setViewportSize({ width: 900, height: 900 });
  await page.getByRole('button', { name: phone ? 'Abrir navegação' : 'Abrir a barra lateral', exact: true }).click();
  const overlay = page.getByRole('dialog', { name: 'Navegação' });
  await expect(overlay).toBeVisible();
  return overlay;
}

test('in Buscar over the page, Esc clears the text and nothing else', async ({ page }, info) => {
  await login(page);
  const overlay = await openOverlay(page, info.project.name === 'chrome-mobile');
  const search = overlay.getByRole('searchbox', { name: /^Buscar em / });
  await search.fill('notas');
  await page.keyboard.press('Escape');
  await expect(search).toHaveValue('');
  await expect(overlay).toBeVisible();
  await expect(search).toBeFocused();
});

test('keys of an IME composition, Esc included, stay with the composition', async ({ page }, info) => {
  await login(page);
  const overlay = await openOverlay(page, info.project.name === 'chrome-mobile');
  const search = overlay.getByRole('searchbox', { name: /^Buscar em / });
  await search.fill('にほ');
  await search.evaluate((field) =>
    field.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', isComposing: true, bubbles: true })),
  );
  await expect(search).toHaveValue('にほ');
  await expect(overlay).toBeVisible();
  await expect(search).toBeFocused();
  await search.evaluate((field) =>
    field.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', keyCode: 229, bubbles: true })),
  );
  await expect(search).toHaveValue('にほ');
});

test('Esc in a changed task dialog asks before discarding, and Esc there goes back to it', async ({ page }) => {
  await login(page);
  await openBoard(page);
  await page.getByRole('button', { name: 'Nova tarefa', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Um próximo passo' });
  await dialog.getByRole('textbox', { name: 'Título da tarefa' }).fill('Ainda não salva');
  await page.keyboard.press('Escape');
  const discard = page.getByRole('alertdialog', { name: 'Descartar alterações?' });
  await expect(discard).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(discard).toBeHidden();
  await expect(dialog.getByRole('textbox', { name: 'Título da tarefa' })).toHaveValue('Ainda não salva');
  await expect(dialog.getByRole('textbox', { name: 'Título da tarefa' })).toBeFocused();
  await expect(page.getByRole('alertdialog')).toHaveCount(0);
  await page.keyboard.press('Escape');
  await discard.getByRole('button', { name: 'Descartar', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
});

test('the rail’s Itens tree works from the keyboard and closes on a choice', async ({ page }, info) => {
  test.skip(info.project.name === 'chrome-mobile', 'Phones have no rail.');
  const title = `Pela faixa ${Date.now()}`;
  await login(page);
  await newDocument(page);
  await page.getByRole('textbox', { name: 'Título do documento' }).fill(title);
  await expect(page.getByText('Salvo', { exact: true })).toBeVisible();
  await newDocument(page);
  await expect(page.getByText('Salvo', { exact: true })).toBeVisible();
  await page.locator('body').click({ position: { x: 1000, y: 700 } });
  await pressCommand(page, 'Backslash');
  const items = page.getByRole('button', { name: 'Itens', exact: true });
  await items.focus();
  await page.keyboard.press('Enter');
  const list = page.getByRole('dialog', { name: /^Itens de / });
  const tree = list.getByRole('treegrid');
  // The open item's row takes the focus; the one written just before it comes next.
  await expect(tree.locator('[role="row"].is-current')).toBeFocused();
  await page.keyboard.press('ArrowDown');
  const titled = tree.getByRole('row', { name: new RegExp(`^${title}, documento`) });
  await expect(titled).toBeFocused();
  const target = await titled.getByRole('link').getAttribute('href');
  await page.keyboard.press('Enter');
  await expect(list).toBeHidden();
  await expect(page).toHaveURL(new RegExp(`${target}$`));

  // The item already open changes no page, and still closes the list; the page's title takes the focus.
  await items.focus();
  await page.keyboard.press('Enter');
  await expect(tree.locator('[role="row"].is-current')).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(list).toBeHidden();
  await expect(page.getByRole('main').getByRole('heading', { level: 1 })).toBeFocused();
  await pressCommand(page, 'Backslash');
});

test('a dialog opened from N gives the focus back to where it was', async ({ page }, info) => {
  await login(page);
  const phone = info.project.name === 'chrome-mobile';
  const before = phone
    ? page.getByRole('button', { name: 'Abrir navegação', exact: true })
    : page.getByRole('navigation', { name: /^Projeto / }).getByRole('link', { name: 'Quadro' });
  await before.focus();
  await page.keyboard.press('n');
  await page.getByRole('menuitem', { name: 'Tarefa' }).click();
  await expect(page.getByRole('dialog', { name: 'Um próximo passo' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(before).toBeFocused();
});

test('Esc leaves a folder’s rename, then the move menu, one at a time, and never closes a folder', async ({
  page,
}, info) => {
  test.skip(info.project.name === 'chrome-mobile', 'The tree’s keys need the fixed sidebar.');
  await login(page);
  const projectId = await createProject(page, `Esc pastas ${Date.now()}`);
  const folder = await rpcFolder(page, projectId, 'Leituras');
  await rpcDocument(page, projectId, 'Artigo', folder);
  await page.reload();
  const row = folderRow(page, 'Leituras');
  await row.focus();
  await page.keyboard.press('ArrowRight');
  await expect(row).toHaveAttribute('aria-expanded', 'true');

  // The rename field: Esc gives the name back and the focus to the row, with the folder still open.
  await page.keyboard.press('F2');
  const field = page.getByRole('textbox', { name: 'Novo nome da pasta Leituras' });
  await field.fill('Outro nome');
  await page.keyboard.press('Escape');
  await expect(field).toHaveCount(0);
  await expect(row).toBeFocused();
  await expect(row).toHaveAttribute('aria-expanded', 'true');

  // "Mover para pasta…": the first Esc clears its filter's text, the next closes it, the one after does nothing.
  await treeRow(page, 'Artigo').focus();
  await page.keyboard.press('m');
  const filter = page.getByRole('searchbox', { name: 'Mover para pasta' });
  await filter.fill('lei');
  await page.keyboard.press('Escape');
  await expect(filter).toHaveValue('');
  await page.keyboard.press('Escape');
  await expect(page.getByRole('menu', { name: 'Pastas' })).toBeHidden();
  await expect(treeRow(page, 'Artigo')).toBeFocused();
  const here = page.url();
  await page.keyboard.press('Escape');
  expect(page.url()).toBe(here);
  await expect(row).toHaveAttribute('aria-expanded', 'true');
});
