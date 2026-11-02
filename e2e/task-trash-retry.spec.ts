import { expect, test } from '@playwright/test';
import { drawer, openDrawer } from './support/board.js';
import { createProject, openBoard } from './support/navigation.js';
import { answers, rpc } from './support/rpc.js';
import { login } from './support/session.js';

// The decided fix W5.11a (docs/etapas/12-refatoracao.md, "Correções decididas").
test.skip(({ isMobile }) => isMobile, 'Desktop: the drawer below the board.');

test('W5.11a: the drawer resends a lost trash answer once, with the same request ID', async ({ page }) => {
  await login(page);
  const projectId = await createProject(page, `Lixeira reenviada ${Date.now()}`);
  const title = `Tarefa da resposta perdida ${Date.now()}`;
  await rpc(page, 'workspace/createTask', { requestId: crypto.randomUUID(), projectId, title });
  await openBoard(page);
  await openDrawer(page, title);

  // The first answer is lost on the way back, after the server applied the write.
  const sent: string[] = [];
  await page.route('**/rpc/workspace/deleteTask', async (route) => {
    sent.push(JSON.parse(route.request().postData() ?? '{}').json?.requestId);
    if (sent.length === 1) {
      await route.fetch();
      await route.abort('failed');
    } else await route.continue();
  });
  const answered = page.waitForResponse((response) => answers(response, 'workspace/deleteTask'));
  await drawer(page).getByRole('button', { name: 'Mais ações da tarefa' }).click();
  await page.getByRole('menuitem', { name: 'Mover para a lixeira' }).click();
  await page.getByRole('alertdialog').getByRole('button', { name: 'Mover para a lixeira' }).click();
  expect((await answered).status()).toBe(200);

  await expect(page.locator('.toast').filter({ hasText: 'Tarefa movida para a lixeira.' })).toBeVisible();
  await expect(drawer(page)).toHaveCount(0);
  expect(sent).toHaveLength(2);
  expect(sent[1]).toBe(sent[0]);
});
