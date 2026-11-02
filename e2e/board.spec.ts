import { expect, type Page, test } from '@playwright/test';
import { card, cardMenu, closeDrawer, column, createInDrawer, drawer, openDrawer } from './support/board.js';
import { toast } from './support/feedback.js';
import { newTask } from './support/items.js';
import { pressCommand } from './support/keyboard.js';
import { createProject, openBoard, showSidebar } from './support/navigation.js';
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
/** A column's name, the button whose ↵ renames it. */
const columnName = (page: Page, name: string) => column(page, name).locator('.board-column__name');
/** The card's title, the button that takes the board's focus. */
const cardTitle = (page: Page, title: string) =>
  page.getByRole('main').getByRole('button', { name: title, exact: true });
const columnNames = (page: Page) => page.getByRole('main').locator('.board-column__name');

/** A fresh project with its board open; resolves to the project's ID. */
async function freshBoard(page: Page, name: string) {
  await login(page);
  const projectId = await createProject(page, `${name} ${Date.now()}`);
  await openBoard(page);
  return projectId;
}

type Ack = { id: string; version: number };
type BoardTask = { id: string; title: string; columnId: string };

/** Tasks made over RPC, in order, in a column or the first open one; the board reads them again. */
async function seedTasks(page: Page, projectId: string, titles: string[], columnId?: string) {
  const ids: string[] = [];
  for (const title of titles) {
    const input = { requestId: crypto.randomUUID(), title, projectId, ...(columnId ? { columnId } : {}) };
    ids.push((await rpc<Ack>(page, 'workspace/createTask', input)).id);
  }
  await page.reload();
  for (const title of titles) await expect(cardTitle(page, title)).toBeVisible();
  return ids;
}

/** The board as the server has it: each column's titles, in order. */
async function serverBoard(page: Page, projectId: string) {
  const board = await rpc<{ tasks: BoardTask[] }>(page, 'workspace/projectBoard', { projectId });
  const columns = await rpc<{ columns: { id: string; name: string; isDone: boolean }[] }>(
    page,
    'workspace/listColumns',
    {},
  );
  return Object.fromEntries(
    columns.columns.map((each) => [
      each.name,
      board.tasks.filter((task) => task.columnId === each.id).map((task) => task.title),
    ]),
  );
}

/** The columns as the server has them: their names in order, the done one marked with ✓. */
async function serverColumns(page: Page) {
  type Column = { name: string; position: number; isDone: boolean };
  const { columns } = await rpc<{ columns: Column[] }>(page, 'workspace/listColumns', {});
  return [...columns].sort((a, b) => a.position - b.position).map((each) => `${each.name}${each.isDone ? ' ✓' : ''}`);
}

test('a new column is named in place with its field’s keys, moves, and refuses a taken name', async ({ page }) => {
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
});

test('deleting a column with tasks asks where they go, and ⌘Z gives the column and its tasks back', async ({
  page,
}) => {
  const projectId = await freshBoard(page, 'Excluir coluna');
  const created = await rpc<Ack>(page, 'workspace/createColumn', { requestId: crypto.randomUUID(), name: 'Revisão' });
  const [taskId] = await seedTasks(page, projectId, ['Revisar o texto'], created.id);
  await expect(columnNames(page)).toHaveText(['A fazer', 'Em andamento', 'Revisão', 'Concluído']);
  // Moved left of Em andamento, so its left neighbour is A fazer.
  await columnName(page, 'Revisão').focus();
  await page.keyboard.press('Shift+ArrowLeft');
  await expect(columnNames(page)).toHaveText(['A fazer', 'Revisão', 'Em andamento', 'Concluído']);

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
  expect(await serverColumns(page)).toEqual(['A fazer', 'Em andamento', 'Concluído ✓']);
  expect((await serverBoard(page, projectId))['Em andamento']).toEqual(['Revisar o texto']);
  await expect(columnNames(page)).toHaveText(['A fazer', 'Em andamento', 'Concluído']);
  await expect(columnName(page, 'Em andamento')).toBeFocused();
  await expect(
    column(page, 'Em andamento').getByRole('button', { name: 'Revisar o texto', exact: true }),
  ).toBeVisible();

  // ⌘Z gives the column back with its task.
  await pressCommand(page, 'z');
  await expect(toast(page)).toContainText('Coluna Revisão restaurada.');
  expect(await serverColumns(page)).toEqual(['A fazer', 'Revisão', 'Em andamento', 'Concluído ✓']);
  expect((await rpc<BoardTask>(page, 'workspace/getTask', { id: taskId })).columnId).toBe(created.id);
  await expect(columnNames(page)).toHaveText(['A fazer', 'Revisão', 'Em andamento', 'Concluído']);
  await expect(column(page, 'Revisão').getByRole('button', { name: 'Revisar o texto', exact: true })).toBeVisible();
});

test('the done column passes to another column and back with Desfazer, and cannot be deleted', async ({ page }) => {
  await freshBoard(page, 'Conclusão da coluna');
  // The done column changes, and Desfazer changes it back.
  await columnName(page, 'Em andamento').focus();
  await page.keyboard.press('Shift+F10');
  await page.getByRole('menuitem', { name: 'Marcar como conclusão' }).click();
  await expect(toast(page)).toContainText('Em andamento agora é a coluna de conclusão.');
  expect(await serverColumns(page)).toEqual(['A fazer', 'Em andamento ✓', 'Concluído']);
  await expect(columnName(page, 'Em andamento')).toHaveAccessibleName(/coluna de conclusão/);
  await toast(page).getByRole('button', { name: 'Desfazer' }).click();
  await expect(columnName(page, 'Concluído')).toHaveAccessibleName(/coluna de conclusão/);
  await expect(columnName(page, 'Em andamento')).not.toHaveAccessibleName(/coluna de conclusão/);
  expect(await serverColumns(page)).toEqual(['A fazer', 'Em andamento', 'Concluído ✓']);

  // The done column cannot go; the others leave the board as it was for the next tests.
  await columnName(page, 'Concluído').focus();
  await page.keyboard.press('Shift+F10');
  await expect(page.getByRole('menuitem', { name: /Excluir…/ })).toBeDisabled();
  await expect(page.getByRole('menuitem', { name: /Excluir…/ })).toContainText(
    'Marque outra coluna como conclusão antes.',
  );
  await page.keyboard.press('Escape');
});

test('the arrows walk the cards and the columns’ names, and the board is one Tab stop', async ({ page }) => {
  const projectId = await freshBoard(page, 'Setas');
  await seedTasks(page, projectId, ['Primeira', 'Segunda', 'Terceira']);
  const todo = column(page, 'A fazer');
  await expect(todo.getByRole('listitem')).toHaveCount(3);

  // One Tab stop: the arrows walk the cards, and ↑ on the first goes to the column's name.
  await cardTitle(page, 'Primeira').focus();
  await page.keyboard.press('ArrowDown');
  await expect(cardTitle(page, 'Segunda')).toBeFocused();
  await expect(cardTitle(page, 'Segunda')).toHaveAttribute('tabindex', '0');
  await expect(cardTitle(page, 'Primeira')).toHaveAttribute('tabindex', '-1');
  // The board is one Tab stop: Tab leaves it, past "+ Coluna".
  await page.keyboard.press('Tab');
  expect(await page.evaluate(() => document.querySelector('.board-columns')?.contains(document.activeElement))).toBe(
    false,
  );
  await expect(page.getByRole('button', { name: 'Nova coluna', exact: true })).not.toBeFocused();
  await cardTitle(page, 'Segunda').focus();
  await page.keyboard.press('ArrowUp');
  await page.keyboard.press('ArrowUp');
  await expect(columnName(page, 'A fazer')).toBeFocused();
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('ArrowDown');
  await expect(cardTitle(page, 'Segunda')).toBeFocused();
});

test('⇧ and the arrows move a card and say where; M opens Mover para', async ({ page }) => {
  const projectId = await freshBoard(page, 'Mover');
  await seedTasks(page, projectId, ['Primeira', 'Segunda', 'Terceira']);
  const todo = column(page, 'A fazer');
  await cardTitle(page, 'Segunda').focus();

  // ⇧→ moves it to the next column, with the focus, and says where.
  await page.keyboard.press('Shift+ArrowRight');
  await expect(column(page, 'Em andamento').getByRole('button', { name: 'Segunda', exact: true })).toBeFocused();
  await expect(live(page)).toHaveText('Movida para Em andamento, 1 de 1');
  // ⇧← brings it back at the same height: the first place.
  await page.keyboard.press('Shift+ArrowLeft');
  await expect(todo.getByRole('button', { name: 'Segunda', exact: true })).toBeFocused();
  await expect(live(page)).toHaveText('Movida para A fazer, 1 de 3');

  // ⇧↓ three times at once: each press waits for the one before, and the end joins the last move's words, so
  // the move that happened is still said.
  await page.keyboard.press('Shift+ArrowDown');
  await page.keyboard.press('Shift+ArrowDown');
  await page.keyboard.press('Shift+ArrowDown');
  await expect(live(page)).toHaveText('Posição 3 de 3 em A fazer. Já está no fim.');
  await page.keyboard.press('Shift+ArrowUp');
  await expect(live(page)).toHaveText('Posição 2 de 3 em A fazer');
  await expect(todo.locator('.task-card__title')).toHaveText(['Primeira', 'Segunda', 'Terceira']);
  expect((await serverBoard(page, projectId))['A fazer']).toEqual(['Primeira', 'Segunda', 'Terceira']);
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
  expect((await serverBoard(page, projectId)).Concluído).toEqual(['Segunda']);
});

test('⌘↵ reopens and completes a card with Desfazer; ⇧F10 opens its ⋯ and ↵ the drawer', async ({ page }) => {
  const projectId = await freshBoard(page, 'Concluir');
  await seedTasks(page, projectId, ['Primeira', 'Terceira']);
  const [segunda] = await seedTasks(page, projectId, ['Segunda'], FIRST_COLUMNS.done);
  await expect(page.getByRole('main').locator('.task-card')).toHaveCount(3);
  const todo = column(page, 'A fazer');
  await cardTitle(page, 'Segunda').focus();

  // ⌘↵ reopens it at the end of the first open column; Desfazer puts it back.
  await pressCommand(page, 'Enter');
  await expect(toast(page)).toContainText('Reaberta em A fazer.');
  await expect(todo.locator('.task-card__title')).toHaveText(['Primeira', 'Terceira', 'Segunda']);
  await expect(cardTitle(page, 'Segunda')).toBeFocused();
  await pressCommand(page, 'z');
  await expect(column(page, 'Concluído').getByRole('button', { name: 'Segunda', exact: true })).toBeVisible();
  expect((await rpc<BoardTask>(page, 'workspace/getTask', { id: segunda })).columnId).toBe(FIRST_COLUMNS.done);
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

test('the label filter keeps the tasks with every chosen label; an archived project only reads', async ({ page }) => {
  await freshBoard(page, 'Filtro');
  for (const title of ['Alfa', 'Beta']) await newTask(page, title);
  const label = `mcp${Date.now() % 100_000}`;
  await openDrawer(page, 'Alfa');
  await drawer(page).getByRole('button', { name: 'Adicionar etiqueta', exact: true }).click();
  await page.keyboard.type(label);
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');
  await page.keyboard.press('Escape');
  await expect(card(page, 'Alfa')).toContainText(label);
  await closeDrawer(page);

  // F opens the filter from the board; the count and the columns follow it.
  await cardTitle(page, 'Alfa').focus();
  await page.keyboard.press('f');
  // The menu takes the name of the button that opens it.
  const choice = page.getByRole('menuitemcheckbox', { name: label });
  await choice.click();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button', { name: `Etiquetas: ${label}` })).toBeVisible();
  await expect(live(page)).toHaveText(`Filtro ${label}: 1 tarefa`);
  await expect(page.locator('.board-head__count')).toHaveText('1 tarefa');
  await expect(column(page, 'A fazer').locator('.task-card__title')).toHaveText(['Alfa']);
  await expect(column(page, 'Em andamento')).toContainText('Nada aqui.');

  // A column the filter emptied says so.
  await page.getByRole('button', { name: 'Mais ações do quadro', exact: true }).click();
  await page.getByRole('menuitem', { name: 'Limpar filtro de etiquetas' }).click();
  await expect(page.locator('.board-head__count')).toHaveText('2 tarefas');
  await page.getByRole('button', { name: 'Etiquetas', exact: true }).click();
  await choice.click();
  await page.keyboard.press('Escape');
  await cardTitle(page, 'Alfa').focus();
  await page.keyboard.press('Shift+ArrowRight');
  await expect(column(page, 'A fazer')).toContainText(`Nenhuma tarefa com ${label}.`);

  // Archived: the board shows its cards to open, without the ways to add or move.
  await page.getByRole('button', { name: 'Mais ações do quadro', exact: true }).click();
  await page.getByRole('menuitem', { name: /Visão geral/ }).click();
  await page.getByRole('button', { name: 'Opções do projeto', exact: true }).click();
  await page.getByRole('menuitem', { name: 'Arquivar', exact: true }).click();
  await expect(page.getByText('Projeto arquivado. O conteúdo está preservado.')).toBeVisible();
  await showSidebar(page);
  await openBoard(page);
  await expect(page.getByRole('button', { name: 'Nova tarefa', exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Nova coluna', exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Opções de Alfa', exact: true })).toHaveCount(0);
  await openDrawer(page, 'Alfa');
  await expect(drawer(page).getByText('Projeto arquivado: desarquive para editar a tarefa.')).toBeVisible();
  await expect(drawer(page).getByRole('textbox', { name: 'Título da tarefa' })).toHaveAttribute('readonly', '');
});

test('every move into the done column offers Desfazer, and a later move of the task takes it away', async ({
  page,
}) => {
  await freshBoard(page, 'Conclusão');
  await newTask(page, 'Pagar a conta');
  // Mover para › Concluído completes it, with Desfazer, which puts it back.
  await cardMenu(page, 'Pagar a conta', 'Mover para', 'Concluído');
  await expect(toast(page)).toContainText('Concluída: Pagar a conta.');
  await toast(page).getByRole('button', { name: 'Desfazer' }).click();
  await expect(column(page, 'A fazer').getByRole('button', { name: 'Pagar a conta', exact: true })).toBeVisible();

  // ⌘↵ completes it; moving it again by the keyboard takes that toast's Desfazer away.
  await cardTitle(page, 'Pagar a conta').focus();
  await pressCommand(page, 'Enter');
  await expect(toast(page)).toContainText('Concluída: Pagar a conta.');
  await expect(toast(page).getByRole('button', { name: 'Desfazer' })).toBeVisible();
  await expect(cardTitle(page, 'Pagar a conta')).toBeFocused();
  await page.keyboard.press('Shift+ArrowLeft');
  await expect(live(page)).toHaveText('Movida para Em andamento, 1 de 1');
  await expect(toast(page).getByRole('button', { name: 'Desfazer' })).toHaveCount(0);
});
