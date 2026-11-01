import { expect, test } from '@playwright/test';
import { newDrawing } from './support/items.js';
import { createProject } from './support/navigation.js';
import { login } from './support/session.js';

// The bar keeps its actions on a desktop; below 720 px they go to the top bar (narrow.spec.ts).
test.skip(({ isMobile }) => isMobile, 'Desktop: the page bar keeps its actions.');

test('the drawing’s bar has "Exportar ▾" with PNG and the editable file, and its ⋯ imports first', async ({ page }) => {
  await login(page);
  await createProject(page, `Barra do desenho ${Date.now()}`);
  await newDrawing(page);
  await expect(page.getByRole('status').filter({ hasText: /^Salvo/ })).toHaveText('Salvo · editado hoje');

  await page.getByRole('button', { name: 'Exportar', exact: true }).click();
  const exportMenu = page.getByRole('menu', { name: 'Exportar' });
  await expect(exportMenu.getByRole('menuitem')).toHaveCount(2);
  await expect(exportMenu.getByRole('menuitem').first()).toContainText('PNG');
  await expect(exportMenu.getByRole('menuitem').first()).toContainText('Imagem com o conteúdo atual');
  await expect(exportMenu.getByRole('menuitem').last()).toContainText('.excalidraw editável');
  await expect(exportMenu.getByRole('menuitem').last()).toContainText('Mesmo com salvamento pendente');
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button', { name: 'Exportar', exact: true })).toBeFocused();

  await page.getByRole('button', { name: 'Opções do desenho', exact: true }).click();
  const options = page.getByRole('menu', { name: 'Opções do desenho' });
  await expect(options.getByRole('menuitem').first()).toContainText('Importar .excalidraw');
  await expect(options.getByRole('menuitem').first()).toContainText('Cria outro desenho');
  await expect(options.getByRole('menuitem', { name: /Exportar/ })).toHaveCount(0);
});
