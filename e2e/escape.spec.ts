import { expect, type Page, test } from '@playwright/test';
import { newDocument } from './support/items.js';
import { pressCommand } from './support/keyboard.js';
import { openBoard } from './support/navigation.js';
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

test('the rail lists work from the keyboard and close on a choice', async ({ page }, info) => {
  test.skip(info.project.name === 'chrome-mobile', 'Phones have no rail.');
  await login(page);
  await newDocument(page);
  await page.getByRole('textbox', { name: 'Título do documento' }).fill(`Pela faixa ${Date.now()}`);
  await expect(page.getByText('Salvo', { exact: true })).toBeVisible();
  await newDocument(page);
  await expect(page.getByText('Salvo', { exact: true })).toBeVisible();
  await page.locator('body').click({ position: { x: 1000, y: 700 } });
  await pressCommand(page, 'Backslash');
  const documents = page.getByRole('button', { name: 'Documentos', exact: true });
  await documents.focus();
  await page.keyboard.press('Enter');
  const list = page.getByRole('dialog', { name: /^Documentos de / });
  const rows = list.getByRole('link');
  await expect(rows.first()).toBeFocused();
  await page.keyboard.press('ArrowDown');
  await expect(rows.nth(1)).toBeFocused();
  const target = await rows.nth(1).getAttribute('href');
  await page.keyboard.press('Enter');
  await expect(list).toBeHidden();
  await expect(page).toHaveURL(new RegExp(`${target}$`));
  await pressCommand(page, 'Backslash');
});
