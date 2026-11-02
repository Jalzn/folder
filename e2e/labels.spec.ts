import { expect, test } from '@playwright/test';
import { card, closeDrawer, drawer, openDrawer } from './support/board.js';
import { toast } from './support/feedback.js';
import { newTask } from './support/items.js';
import { pressCommand, runCommand } from './support/keyboard.js';
import { createProject, openBoard } from './support/navigation.js';
import { login } from './support/session.js';

// The dialog's keys need a desktop.
test.skip(({ isMobile }) => isMobile, 'Desktop: the dialog is driven by the keyboard.');

test('Gerenciar etiquetas creates, renames, recolors and deletes a label in use, which Desfazer brings back', async ({
  page,
}) => {
  await login(page);
  await createProject(page, `Etiquetas ${Date.now()}`);
  await openBoard(page);
  await newTask(page, 'Ligar para o marceneiro');
  const name = `forn${Date.now() % 100_000}`;

  await runCommand(page, 'Gerenciar etiquetas…');
  const dialog = page.getByRole('dialog', { name: 'Etiquetas' });
  await dialog.getByRole('button', { name: 'Nova etiqueta', exact: true }).click();
  const created = dialog.getByRole('textbox', { name: 'Nome da nova etiqueta' });
  await expect(created).toBeFocused();
  await page.keyboard.type(`${name}x`);
  await page.keyboard.press('Backspace');
  await page.keyboard.press('Enter');
  const row = dialog.getByRole('button', { name, exact: true });
  await expect(row).toBeFocused();

  // ↵ renames in place; the field keeps its keys.
  await page.keyboard.press('Enter');
  const field = dialog.getByRole('textbox', { name: 'Nome da etiqueta' });
  await expect(field).toBeFocused();
  await page.keyboard.press('ControlOrMeta+a');
  await page.keyboard.type(`${name}es`);
  await page.keyboard.press('Enter');
  const renamed = dialog.getByRole('button', { name: `${name}es`, exact: true });
  await expect(renamed).toBeFocused();

  // Cor ▸ Coral.
  await dialog.getByRole('button', { name: `Opções da etiqueta ${name}es`, exact: true }).click();
  await page.getByRole('menuitem', { name: 'Cor' }).press('ArrowRight');
  await page.getByRole('menuitemradio', { name: 'Coral' }).click();
  await expect(renamed).toHaveAccessibleDescription(/Coral/);
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);

  // On a task, then deleted at once: the toast counts the task, and Desfazer brings the chip back.
  await openDrawer(page, 'Ligar para o marceneiro');
  await drawer(page).getByRole('button', { name: 'Adicionar etiqueta', exact: true }).click();
  await page.keyboard.type(`${name}es`);
  await page.getByRole('menuitemcheckbox', { name: `${name}es` }).click();
  // The first Esc clears the search, the second closes the picker.
  await page.keyboard.press('Escape');
  await page.keyboard.press('Escape');
  await expect(page.getByRole('searchbox', { name: 'Buscar ou criar etiqueta' })).toHaveCount(0);
  await expect(card(page, 'Ligar para o marceneiro')).toContainText(`${name}es`);
  await closeDrawer(page);
  await runCommand(page, 'Gerenciar etiquetas…');
  await dialog.getByRole('button', { name: `Opções da etiqueta ${name}es`, exact: true }).click();
  await page.getByRole('menuitem', { name: 'Excluir' }).click();
  await expect(toast(page)).toContainText(`Etiqueta ${name}es excluída. Estava em 1 tarefa.`);
  await expect(dialog.getByRole('button', { name: `${name}es`, exact: true })).toHaveCount(0);
  await expect(card(page, 'Ligar para o marceneiro')).not.toContainText(`${name}es`);
  await pressCommand(page, 'z');
  await expect(toast(page)).toContainText(`Etiqueta ${name}es restaurada.`);
  await expect(dialog.getByRole('button', { name: `${name}es`, exact: true })).toBeVisible();
  await expect(card(page, 'Ligar para o marceneiro')).toContainText(`${name}es`);
});
