import { expect, type Locator } from '@playwright/test';
import { isolatedTest as test } from '../fixtures.js';
import { folderRow } from '../support/folders.js';
import { runCommand } from '../support/keyboard.js';

test.use({ sample: true });

async function expectNameStyle(field: Locator, duplicate: string) {
  await expect(field).toBeFocused();
  await field.fill(duplicate);
  await field.press('Enter');
  await expect(field).toHaveAttribute('aria-invalid', 'true');
  expect.soft(await field.evaluate((input) => getComputedStyle(input).fontWeight)).toBe('500');
  const colors = await field.evaluate((input) => {
    const error = document.getElementById(input.getAttribute('aria-describedby') ?? '');
    if (!error) throw new Error('Missing associated error');
    const probe = document.createElement('span');
    probe.style.color = 'var(--danger)';
    error.append(probe);
    const value = { actual: getComputedStyle(error).color, expected: getComputedStyle(probe).color };
    probe.remove();
    return value;
  });
  expect.soft(colors.actual).toBe(colors.expected);
  await field.press('Escape');
}

for (const colorScheme of ['light', 'dark'] as const) {
  test(`folder, column and label rename fields share weight and error color in ${colorScheme}`, async ({
    page,
    api,
  }) => {
    await page.emulateMedia({ colorScheme });
    const project = (await api.workspace.listProjects({})).find((each) => each.name === 'Tinyfold');
    if (!project) throw new Error('Missing sample project');
    await page.goto(`/projetos/${project.id}/quadro`);
    await folderRow(page, 'Arquitetura').focus();
    await page.keyboard.press('F2');
    await expectNameStyle(page.getByRole('textbox', { name: 'Novo nome da pasta Arquitetura' }), 'MCP');
    await page.getByRole('button', { name: 'Opções da coluna Revisão' }).click();
    await page.getByRole('menuitem', { name: /Renomear/ }).click();
    await expectNameStyle(page.getByRole('textbox', { name: 'Nome da coluna' }), 'A fazer');
    await runCommand(page, 'Gerenciar etiquetas…');
    const dialog = page.getByRole('dialog', { name: 'Etiquetas' });
    await dialog.getByRole('button', { name: 'backend', exact: true }).press('Enter');
    await expectNameStyle(dialog.getByRole('textbox', { name: 'Nome da etiqueta' }), 'mcp');
  });
}
