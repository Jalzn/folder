import { expect, type Locator, type Page, test } from '@playwright/test';
import { column } from './support/board.js';
import { newTask } from './support/items.js';
import { createProject, openBoard } from './support/navigation.js';
import { login } from './support/session.js';

// The browser's drag needs a fine pointer: the phone moves cards by their ⋯ (narrow.spec.ts).
test.skip(({ isMobile }) => isMobile, 'Desktop: dragging needs a mouse.');

const titles = (where: Locator) => where.locator('.task-card__title');

/** Drags a card by the mouse to a point, through the browser's own drag, and drops it there. */
async function drag(page: Page, card: Locator, to: { x: number; y: number }) {
  const from = await card.boundingBox();
  if (!from) throw new Error('The card is not on screen.');
  await page.mouse.move(from.x + 40, from.y + 10);
  await page.mouse.down();
  await page.mouse.move(from.x + 60, from.y + 20, { steps: 4 });
  await page.mouse.move(to.x, to.y, { steps: 10 });
  // One more step over the target, so the last dragover is the one under the pointer.
  await page.mouse.move(to.x + 1, to.y + 1);
}

test('cards drag between cards, to another column and to its end; a drop off the board moves nothing', async ({
  page,
}) => {
  await login(page);
  await createProject(page, `Arrastar ${Date.now()}`);
  await openBoard(page);
  for (const title of ['Primeira', 'Segunda', 'Terceira']) await newTask(page, title);
  const todo = column(page, 'A fazer');
  const doing = column(page, 'Em andamento');
  const card = (title: string) =>
    todo
      .locator('.task-card')
      .filter({ hasText: title })
      .or(doing.locator('.task-card').filter({ hasText: title }));

  // Terceira onto the upper half of Primeira: before it, with the drop line shown while dragging.
  const first = await card('Primeira').boundingBox();
  if (!first) throw new Error('Primeira is not on screen.');
  await drag(page, card('Terceira'), { x: first.x + 60, y: first.y + 4 });
  await expect(todo.locator('.board-drop-line')).toHaveCount(1);
  await expect(card('Terceira')).toHaveAttribute('data-dragging', 'true');
  await page.mouse.up();
  await expect(titles(todo)).toHaveText(['Terceira', 'Primeira', 'Segunda']);

  // Into the empty column: its background marks it while the card is over it.
  const empty = await doing.boundingBox();
  if (!empty) throw new Error('Em andamento is not on screen.');
  await drag(page, card('Primeira'), { x: empty.x + 60, y: empty.y + 60 });
  await expect(doing).toHaveAttribute('data-drop', 'true');
  await page.mouse.up();
  await expect(titles(doing)).toHaveText(['Primeira']);
  await expect(page.locator('p.sr-only[aria-live="polite"]')).toHaveText('Movida para Em andamento, 1 de 1');

  // To the end of Em andamento, below its last card.
  const last = await card('Primeira').boundingBox();
  if (!last) throw new Error('Primeira is not on screen.');
  await drag(page, card('Terceira'), { x: last.x + 60, y: last.y + last.height + 40 });
  await page.mouse.up();
  await expect(titles(doing)).toHaveText(['Primeira', 'Terceira']);

  // Dropped over the sidebar, outside the board: nothing moves.
  await drag(page, card('Segunda'), { x: 120, y: 400 });
  await page.mouse.up();
  await expect(titles(todo)).toHaveText(['Segunda']);
  await expect(titles(doing)).toHaveText(['Primeira', 'Terceira']);
  await expect(page.locator('.task-card[data-dragging]')).toHaveCount(0);

  // Into the done column, a drop completes the task with the same Desfazer as Concluir.
  const done = await column(page, 'Concluído').boundingBox();
  if (!done) throw new Error('Concluído is not on screen.');
  await drag(page, card('Segunda'), { x: done.x + 60, y: done.y + 60 });
  await page.mouse.up();
  await expect(page.locator('.toast')).toContainText('Concluída: Segunda.');
  await page.locator('.toast').getByRole('button', { name: 'Desfazer' }).click();
  await expect(titles(todo)).toHaveText(['Segunda']);
});
