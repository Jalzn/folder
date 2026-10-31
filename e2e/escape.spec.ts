import { expect, test } from '@playwright/test';
import { pressCommand } from './support/keyboard.js';
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
