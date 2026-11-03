import { expect } from '@playwright/test';
import { test } from '../fixtures.js';

test('the project filter matches every word regardless of order and keeps the create action', async ({
  page,
  api,
  project,
}) => {
  const target = await api.workspace.createProject({ requestId: crypto.randomUUID(), name: 'Projeto São Paulo' });
  await page.goto(`/projetos/${project.id}`);
  await page.getByRole('button', { name: `Projeto ${project.name}. Trocar de projeto` }).click();
  const filter = page.getByRole('searchbox', { name: 'Trocar de projeto', exact: true });
  await filter.fill('PAULO projeto sao');
  const menu = page.getByRole('menu', { name: 'Projetos' });
  await expect(menu.getByRole('menuitem', { name: /Novo projeto/ })).toBeVisible();
  await expect(menu.getByRole('menuitem', { name: /Projeto São Paulo/ })).toBeVisible();
  await filter.fill('paulo inexistente');
  await expect(menu.getByRole('menuitem', { name: /Projeto São Paulo/ })).toHaveCount(0);
  await filter.fill('sao projeto');
  const option = menu.getByRole('menuitem', { name: /Projeto São Paulo/ });
  await expect(option).toBeVisible();
  for (let step = 0; step < 4 && (await option.getAttribute('data-focused')) === null; step += 1)
    await filter.press('ArrowDown');
  await expect(option).toHaveAttribute('data-focused');
  await filter.press('Enter');
  await expect(page).toHaveURL(new RegExp(`/projetos/${target.id}$`));
});
