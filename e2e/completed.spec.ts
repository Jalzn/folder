import { expect, type Page, test } from '@playwright/test';
import { cardMenu, column } from './support/board.js';
import { toast } from './support/feedback.js';
import { newTask } from './support/items.js';
import { createProject } from './support/navigation.js';
import { login } from './support/session.js';

const summary = (page: Page) => page.getByRole('main').locator('.page-header__description');

test('Concluídas groups the completed tasks by month and reopens one, with Desfazer', async ({ page }) => {
  await login(page);
  await createProject(page, `Concluídas ${Date.now()}`);
  for (const title of ['Escrever o resumo', 'Revisar o texto']) {
    await newTask(page, title);
    await cardMenu(page, title, 'Concluir');
    await expect(column(page, 'Concluído').getByRole('button', { name: title, exact: true })).toBeVisible();
  }

  await page.getByRole('button', { name: 'Mais ações do quadro', exact: true }).click();
  await page.getByRole('menuitem', { name: 'Ver concluídas' }).click();
  await expect(page).toHaveURL(/\/concluidas$/);
  await expect(page.getByRole('heading', { name: 'Concluídas', level: 1 })).toBeVisible();
  await expect(summary(page)).toHaveText('2 tarefas concluídas. O quadro mostra só os últimos 14 dias.');
  // The latest completed first, under this month's heading with its count.
  await expect(page.getByRole('heading', { level: 2 }).first()).toContainText('· 2');

  await page
    .getByRole('button', { name: /Reabrir/ })
    .first()
    .click();
  await expect(toast(page)).toContainText('Reaberta em A fazer.');
  await expect(summary(page)).toHaveText('1 tarefa concluída. O quadro mostra só os últimos 14 dias.');
  await toast(page).getByRole('button', { name: 'Desfazer' }).click();
  await expect(summary(page)).toHaveText('2 tarefas concluídas. O quadro mostra só os últimos 14 dias.');

  // A title opens the task in the drawer, over the list.
  await page.getByRole('main').getByRole('button', { name: 'Escrever o resumo', exact: true }).click();
  await expect(page.getByRole('region', { name: 'Tarefa: Escrever o resumo', exact: true })).toBeVisible();
});
