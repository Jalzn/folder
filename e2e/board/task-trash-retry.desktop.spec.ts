import { expect } from '@playwright/test';
import { test } from '../fixtures.js';
import { drawer, openDrawer } from '../support/board.js';
import { seedTask } from '../support/builders.js';
import { createProject, openBoard } from '../support/navigation.js';
import { loseFirstResponse } from '../support/network.js';
import { answers } from '../support/rpc.js';

// The decided fix W5.11a (docs/etapas/12-refatoracao.md, "Correções decididas").

test('W5.11a: the drawer resends a lost trash answer once, with the same request ID', async ({ page }) => {
  const projectId = await createProject(page, `Lixeira reenviada ${Date.now()}`);
  const title = `Tarefa da resposta perdida ${Date.now()}`;
  await seedTask(page, { projectId, title });
  await openBoard(page);
  await openDrawer(page, title);

  // The first answer is lost on the way back, after the server applied the write.
  const { inputs } = await loseFirstResponse(page, 'workspace/deleteTask');
  const answered = page.waitForResponse((response) => answers(response, 'workspace/deleteTask'));
  await drawer(page).getByRole('button', { name: 'Mais ações da tarefa' }).click();
  await page.getByRole('menuitem', { name: 'Mover para a lixeira' }).click();
  await page.getByRole('alertdialog').getByRole('button', { name: 'Mover para a lixeira' }).click();
  expect((await answered).status()).toBe(200);

  await expect(page.locator('.toast').filter({ hasText: 'Tarefa movida para a lixeira.' })).toBeVisible();
  await expect(drawer(page)).toHaveCount(0);
  expect(inputs).toHaveLength(2);
  expect(inputs[1]?.requestId).toBe(inputs[0]?.requestId);
});
