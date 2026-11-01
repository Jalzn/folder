import { expect, type Page, test } from '@playwright/test';
import { card, closeDrawer, column, createInDrawer } from './support/board.js';
import { newTask } from './support/items.js';
import { pressCommand } from './support/keyboard.js';
import { createProject, openBoard } from './support/navigation.js';
import { rpc } from './support/rpc.js';
import { login } from './support/session.js';

// The board's keys and its columns' menus need a desktop; narrow.spec.ts covers the phone.
test.skip(({ isMobile }) => isMobile, 'Desktop: the board shows its columns side by side.');

/** The columns of a new installation, which every other test expects. */
const FIRST_COLUMNS = {
  todo: '00000000-0000-4000-8000-000000000010',
  doing: '00000000-0000-4000-8000-000000000011',
  done: '00000000-0000-4000-8000-000000000012',
};

// Columns are the same for every project: whatever a test left, even failing, goes, so the next tests see the
// first three again.
test.afterEach(async ({ page }, info) => {
  if (info.status === 'skipped') return;
  type Column = { id: string; version: number; isDone: boolean };
  const { columns } = await rpc<{ columns: Column[] }>(page, 'workspace/listColumns', {});
  if (!columns.find((each) => each.id === FIRST_COLUMNS.done)?.isDone)
    await rpc(page, 'workspace/setDoneColumn', { requestId: crypto.randomUUID(), id: FIRST_COLUMNS.done });
  const first = new Set(Object.values(FIRST_COLUMNS));
  for (const extra of columns.filter((each) => !first.has(each.id)))
    await rpc(page, 'workspace/deleteColumn', {
      requestId: crypto.randomUUID(),
      id: extra.id,
      expectedVersion: extra.version,
      destinationId: FIRST_COLUMNS.todo,
    });
});

/** The shell's live region, where the board's moves are announced. */
const live = (page: Page) => page.locator('p.sr-only[aria-live="polite"]');
const toast = (page: Page) => page.locator('.toast');
/** A column's name, the button whose ↵ renames it. */
const columnName = (page: Page, name: string) => column(page, name).locator('.board-column__name');
/** The card's title, the button that takes the board's focus. */
const cardTitle = (page: Page, title: string) =>
  page.getByRole('main').getByRole('button', { name: title, exact: true });
const columnNames = (page: Page) => page.getByRole('main').locator('.board-column__name');

/** A fresh project with its board open. */
async function freshBoard(page: Page, name: string) {
  await login(page);
  await createProject(page, `${name} ${Date.now()}`);
  await openBoard(page);
}

test('columns are created, renamed, moved, deleted with a destination and given back', async ({ page }) => {
  await freshBoard(page, 'Colunas');
  await expect(columnNames(page)).toHaveText(['A fazer', 'Em andamento', 'Concluído']);

  // "+ Coluna" creates "Nova coluna" before the done column, with its name selected in a field.
  await page.getByRole('button', { name: 'Nova coluna', exact: true }).click();
  const field = page.getByRole('textbox', { name: 'Nome da coluna' });
  await expect(field).toBeFocused();
  expect(await field.evaluate((input: HTMLInputElement) => input.value.slice(input.selectionStart ?? 0))).toBe(
    'Nova coluna',
  );
  // The field keeps its keys: the arrows and the space edit the name, and the board moves nothing.
  await page.keyboard.type('Revisao');
  await page.keyboard.press('ArrowLeft');
  await page.keyboard.press('Backspace');
  await page.keyboard.type('ã');
  await page.keyboard.press('ArrowRight');
  await page.keyboard.type('  ');
  await page.keyboard.press('Enter');
  await expect(columnNames(page)).toHaveText(['A fazer', 'Em andamento', 'Revisão', 'Concluído']);
  await expect(columnName(page, 'Revisão')).toBeFocused();
  await expect(live(page)).toHaveText('Coluna renomeada para Revisão');

  // ⇧← moves it, and says where.
  await page.keyboard.press('Shift+ArrowLeft');
  await expect(columnNames(page)).toHaveText(['A fazer', 'Revisão', 'Em andamento', 'Concluído']);
  await expect(live(page)).toHaveText('Coluna Revisão na posição 2 de 4');
  await expect(columnName(page, 'Revisão')).toBeFocused();

  // A name another column has, by its key, says so under the field; Esc gives the name back.
  await page.keyboard.press('Enter');
  await page.keyboard.press('ControlOrMeta+a');
  await page.keyboard.type('a FAZER');
  await page.keyboard.press('Enter');
  await expect(page.getByRole('alert').filter({ hasText: 'Já existe uma coluna A fazer.' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(columnName(page, 'Revisão')).toBeFocused();

  // N on the column's name: "Tarefa" creates in it.
  await page.keyboard.press('n');
  await page.getByRole('menuitem', { name: 'Tarefa', exact: true }).click();
  await createInDrawer(page, 'Revisar o texto');
  await expect(toast(page)).toContainText('Tarefa criada em Revisão');
  await closeDrawer(page);
  await expect(column(page, 'Revisão').getByRole('button', { name: 'Revisar o texto', exact: true })).toBeVisible();

  // With a task, Excluir… asks where it goes, the left neighbour by default, which has the focus.
  await columnName(page, 'Revisão').focus();
  await page.keyboard.press('Shift+F10');
  await page.getByRole('menu', { name: 'Coluna Revisão' }).getByRole('menuitem', { name: 'Excluir…' }).click();
  const dialog = page.getByRole('alertdialog', { name: 'Excluir a coluna “Revisão”?' });
  await expect(dialog).toContainText('Há 1 tarefa nela, somando todos os projetos');
  await expect(dialog.getByRole('radio', { name: /A fazer/ })).toBeFocused();
  await expect(dialog.getByRole('radio', { name: /A fazer/ })).toBeChecked();
  await page.keyboard.press('ArrowDown');
  await expect(dialog.getByRole('radio', { name: 'Em andamento' })).toBeChecked();
  await dialog.getByRole('button', { name: 'Mover e excluir', exact: true }).click();
  await expect(toast(page)).toContainText('Coluna excluída. 1 tarefa foi para Em andamento.');
  await expect(columnNames(page)).toHaveText(['A fazer', 'Em andamento', 'Concluído']);
  await expect(columnName(page, 'Em andamento')).toBeFocused();
  await expect(
    column(page, 'Em andamento').getByRole('button', { name: 'Revisar o texto', exact: true }),
  ).toBeVisible();

  // ⌘Z gives the column back with its task.
  await pressCommand(page, 'z');
  await expect(toast(page)).toContainText('Coluna Revisão restaurada.');
  await expect(columnNames(page)).toHaveText(['A fazer', 'Revisão', 'Em andamento', 'Concluído']);
  await expect(column(page, 'Revisão').getByRole('button', { name: 'Revisar o texto', exact: true })).toBeVisible();

  // The done column changes, and Desfazer changes it back.
  await columnName(page, 'Em andamento').focus();
  await page.keyboard.press('Shift+F10');
  await page.getByRole('menuitem', { name: 'Marcar como conclusão' }).click();
  await expect(toast(page)).toContainText('Em andamento agora é a coluna de conclusão.');
  await expect(columnName(page, 'Em andamento')).toHaveAccessibleName(/coluna de conclusão/);
  await toast(page).getByRole('button', { name: 'Desfazer' }).click();
  await expect(columnName(page, 'Concluído')).toHaveAccessibleName(/coluna de conclusão/);
  await expect(columnName(page, 'Em andamento')).not.toHaveAccessibleName(/coluna de conclusão/);

  // The done column cannot go; the others leave the board as it was for the next tests.
  await columnName(page, 'Concluído').focus();
  await page.keyboard.press('Shift+F10');
  await expect(page.getByRole('menuitem', { name: /Excluir…/ })).toBeDisabled();
  await expect(page.getByRole('menuitem', { name: /Excluir…/ })).toContainText(
    'Marque outra coluna como conclusão antes.',
  );
  await page.keyboard.press('Escape');
  await columnName(page, 'Revisão').focus();
  await page.keyboard.press('Shift+F10');
  await page.getByRole('menu', { name: 'Coluna Revisão' }).getByRole('menuitem', { name: 'Excluir…' }).click();
  await page.getByRole('alertdialog').getByRole('button', { name: 'Mover e excluir', exact: true }).click();
  await expect(columnNames(page)).toHaveText(['A fazer', 'Em andamento', 'Concluído']);
});

test('cards move by the keyboard, are announced, and complete with ⌘↵ and Desfazer', async ({ page }) => {
  await freshBoard(page, 'Cards');
  for (const title of ['Primeira', 'Segunda', 'Terceira']) await newTask(page, title);
  const todo = column(page, 'A fazer');
  await expect(todo.getByRole('listitem')).toHaveCount(3);

  // One Tab stop: the arrows walk the cards, and ↑ on the first goes to the column's name.
  await cardTitle(page, 'Primeira').focus();
  await page.keyboard.press('ArrowDown');
  await expect(cardTitle(page, 'Segunda')).toBeFocused();
  await expect(cardTitle(page, 'Segunda')).toHaveAttribute('tabindex', '0');
  await expect(cardTitle(page, 'Primeira')).toHaveAttribute('tabindex', '-1');
  await page.keyboard.press('ArrowUp');
  await page.keyboard.press('ArrowUp');
  await expect(columnName(page, 'A fazer')).toBeFocused();
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('ArrowDown');
  await expect(cardTitle(page, 'Segunda')).toBeFocused();

  // ⇧→ moves it to the next column, with the focus, and says where.
  await page.keyboard.press('Shift+ArrowRight');
  await expect(column(page, 'Em andamento').getByRole('button', { name: 'Segunda', exact: true })).toBeFocused();
  await expect(live(page)).toHaveText('Movida para Em andamento, 1 de 1');
  // ⇧← brings it back at the same height: the first place.
  await page.keyboard.press('Shift+ArrowLeft');
  await expect(todo.getByRole('button', { name: 'Segunda', exact: true })).toBeFocused();
  await expect(live(page)).toHaveText('Movida para A fazer, 1 de 3');

  // ⇧↓ and ⇧↑ within the column, a second press waiting for the first; the ends say so.
  await page.keyboard.press('Shift+ArrowDown');
  await page.keyboard.press('Shift+ArrowDown');
  await expect(live(page)).toHaveText('Posição 3 de 3 em A fazer');
  await page.keyboard.press('Shift+ArrowDown');
  await expect(live(page)).toHaveText('Já está no fim.');
  await page.keyboard.press('Shift+ArrowUp');
  await expect(live(page)).toHaveText('Posição 2 de 3 em A fazer');
  await expect(todo.locator('.task-card__title')).toHaveText(['Primeira', 'Segunda', 'Terceira']);
  await expect(cardTitle(page, 'Segunda')).toBeFocused();
  // No column with cards to the right: the focus stays.
  await page.keyboard.press('ArrowRight');
  await expect(cardTitle(page, 'Segunda')).toBeFocused();

  // M opens "Mover para" at once; the columns are radios.
  await page.keyboard.press('m');
  const move = page.getByRole('menu', { name: 'Mover para' });
  await expect(move.getByRole('menuitemradio', { name: 'A fazer' })).toBeFocused();
  await move.getByRole('menuitemradio', { name: /Concluído/ }).click();
  await expect(column(page, 'Concluído').getByRole('button', { name: 'Segunda', exact: true })).toBeFocused();
  await expect(live(page)).toHaveText('Movida para Concluído, 1 de 1');

  // ⌘↵ reopens it at the end of the first open column; Desfazer puts it back.
  await pressCommand(page, 'Enter');
  await expect(toast(page)).toContainText('Reaberta em A fazer.');
  await expect(todo.locator('.task-card__title')).toHaveText(['Primeira', 'Terceira', 'Segunda']);
  await expect(cardTitle(page, 'Segunda')).toBeFocused();
  await pressCommand(page, 'z');
  await expect(column(page, 'Concluído').getByRole('button', { name: 'Segunda', exact: true })).toBeVisible();
  await expect(cardTitle(page, 'Segunda')).toBeFocused();

  // ⌘↵ on an open card completes it at the top of the done column.
  await cardTitle(page, 'Primeira').focus();
  await pressCommand(page, 'Enter');
  await expect(toast(page)).toContainText('Concluída: Primeira.');
  await expect(column(page, 'Concluído').locator('.task-card__title')).toHaveText(['Primeira', 'Segunda']);
  await expect(cardTitle(page, 'Primeira')).toBeFocused();

  // ⇧F10 opens the card's ⋯; Esc gives the focus back to the card.
  await page.keyboard.press('Shift+F10');
  await expect(page.getByRole('menuitem', { name: /Reabrir/ })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(cardTitle(page, 'Primeira')).toBeFocused();

  // ↵ opens the drawer.
  await page.keyboard.press('Enter');
  await expect(page.getByRole('region', { name: 'Tarefa: Primeira', exact: true })).toBeVisible();
  await expect(card(page, 'Primeira')).toHaveAttribute('data-open', 'true');
});
