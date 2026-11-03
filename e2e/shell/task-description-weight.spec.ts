import { expect } from '@playwright/test';
import { isolatedTest as test } from '../fixtures.js';
import { openDrawer } from '../support/board.js';

test.use({ sample: true, colorScheme: 'dark' });

test('the dark task description uses the same 400 weight and 14/22 size as the light theme', async ({ page, api }) => {
  const project = (await api.workspace.listProjects({})).find((each) => each.name === 'Tinyfold');
  if (!project) throw new Error('Missing sample project');
  await page.goto(`/projetos/${project.id}/quadro`);
  await openDrawer(page, 'Gerar token pessoal no Perfil');
  const editor = page.locator('.task-description .bn-editor');
  await expect(editor).toHaveCSS('font-size', '14px');
  await expect(editor).toHaveCSS('line-height', '22px');
  await expect(editor).toHaveCSS('font-weight', '400');
});
