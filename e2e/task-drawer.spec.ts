import { expect, type Page, test } from '@playwright/test';
import { card, drawerOf, openDrawer, drawer as openTask } from './support/board.js';
import { newTask } from './support/items.js';
import { pressCommand } from './support/keyboard.js';
import { createProject, openBoard } from './support/navigation.js';
import { login } from './support/session.js';

// The drawer's fields and text by the keyboard; narrow.spec.ts covers the phone.
test.skip(({ isMobile }) => isMobile, 'Desktop: the drawer sits below the board.');

const toast = (page: Page) => page.locator('.toast');

test('the drawer edits the due date, the labels and the text, which saves and shows on the card', async ({ page }) => {
  await login(page);
  await createProject(page, `Gaveta ${Date.now()}`);
  await openBoard(page);
  await newTask(page, 'Escrever o plano');
  await openDrawer(page, 'Escrever o plano');
  // Its name follows the title, which this test changes.
  const drawer = openTask(page);

  // Prazo: the calendar opens on today; → and ↵ choose tomorrow, "Sem prazo" clears it.
  const due = drawer.getByRole('button', { name: /^Prazo:/ });
  await expect(due).toContainText('Sem prazo');
  await due.click();
  const calendar = page.getByRole('dialog', { name: 'Prazo' });
  await expect(calendar.getByRole('grid')).toBeVisible();
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('Enter');
  await expect(calendar).toHaveCount(0);
  await expect(due).toContainText('amanhã');
  await expect(card(page, 'Escrever o plano').locator('.card-meta')).toContainText(/\d{2} \w{3}/);
  await due.click();
  await calendar.getByRole('button', { name: 'Sem prazo', exact: true }).click();
  await expect(due).toContainText('Sem prazo');

  // Etiquetas: typing a new name offers to create it; the chip's "×" removes it and the focus goes to "+".
  const add = drawer.getByRole('button', { name: 'Adicionar etiqueta', exact: true });
  await add.click();
  const search = page.getByRole('searchbox', { name: 'Buscar ou criar etiqueta' });
  await expect(search).toBeFocused();
  const label = `mcp${Date.now() % 100_000}`;
  await page.keyboard.type(label);
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');
  await expect(drawer.getByRole('button', { name: `Remover etiqueta ${label}`, exact: true })).toBeAttached();
  await page.keyboard.press('Escape');
  await expect(search).toHaveCount(0);
  await expect(card(page, 'Escrever o plano')).toContainText(label);
  await drawer.getByRole('button', { name: `Remover etiqueta ${label}`, exact: true }).click();
  await expect(add).toBeFocused();
  await expect(card(page, 'Escrever o plano')).not.toContainText(label);

  // ↵ in the title goes to the description, whose checklist shows in the properties as it is typed.
  const title = drawer.getByRole('textbox', { name: 'Título da tarefa' });
  await title.click();
  await page.keyboard.press('End');
  await page.keyboard.type(' de lançamento');
  await page.keyboard.press('Enter');
  const description = drawer.getByRole('textbox', { name: 'Descrição da tarefa' });
  await expect(description).toBeFocused();
  await page.keyboard.type('[] Primeiro passo');
  await page.keyboard.press('Enter');
  await page.keyboard.type('Segundo passo');
  await expect(drawer.getByText('0 de 2 itens feitos')).toBeAttached();
  await expect(drawer.getByText('Salvo', { exact: true })).toBeVisible();
  await expect(card(page, 'Escrever o plano de lançamento')).toContainText('0/2');
  await description.getByRole('checkbox').first().check();
  await expect(drawer.getByText('1 de 2 itens feitos')).toBeAttached();
  await expect(card(page, 'Escrever o plano de lançamento')).toContainText('1/2');

  // ⌘↵ from the description completes the task.
  await description.click();
  await pressCommand(page, 'Enter');
  await expect(toast(page)).toContainText('Concluída: Escrever o plano de lançamento.');

  // The text came back from the server after a reload.
  await page.reload();
  await expect(card(page, 'Escrever o plano de lançamento')).toContainText('1/2');
  await openDrawer(page, 'Escrever o plano de lançamento');
  await expect(
    drawerOf(page, 'Escrever o plano de lançamento').getByRole('textbox', { name: 'Descrição da tarefa' }),
  ).toContainText('Segundo passo');
});
