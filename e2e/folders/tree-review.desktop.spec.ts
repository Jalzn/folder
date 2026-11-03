import { expect, type Page } from '@playwright/test';
import { test } from '../fixtures.js';
import { seedDocument, seedFolder } from '../support/builders.js';

import { folderRow, treeRow } from '../support/folders.js';
import { appShortcut } from '../support/keyboard.js';
import { createProject, projectNavigation } from '../support/navigation.js';

// The tree review's keyboard and focus findings (tree.md M2, M3, M5, B1, B4, B5, B6 and B7).

const live = (page: Page) => page.locator('p.sr-only[aria-live="polite"]');
const focusedRow = (page: Page) =>
  page.evaluate(() => document.activeElement?.closest('[role="row"]')?.getAttribute('aria-label') ?? null);

/** Arquitetura holds Notas and Fluxo; Vazia is empty; Opções de layout, Visão and Zebra are at the root. */
async function sampleProject(page: Page) {
  const projectId = await createProject(page, `Revisão ${Date.now()}`);
  await seedFolder(page, { projectId, name: 'Vazia' });
  const arquitetura = await seedFolder(page, { projectId, name: 'Arquitetura' });
  await seedDocument(page, { projectId, title: 'Notas', folderId: arquitetura });
  const fluxo = await seedDocument(page, { projectId, title: 'Fluxo', folderId: arquitetura });
  await seedDocument(page, { projectId, title: 'Zebra' });
  await seedDocument(page, { projectId, title: 'Opções de layout' });
  await seedDocument(page, { projectId, title: 'Visão' });
  await page.reload();
  await expect(folderRow(page, 'Arquitetura')).toBeVisible();
  return { projectId, fluxo: fluxo.id };
}

test('a folder closed over the open item stays closed when the sidebar comes back, wide and at 900 px', {
  tag: '@timing',
}, async ({ page }) => {
  const { projectId, fluxo } = await sampleProject(page);
  await page.goto(`/projetos/${projectId}/documentos/${fluxo}`);
  await expect(folderRow(page, 'Arquitetura')).toHaveAttribute('aria-expanded', 'true');
  await folderRow(page, 'Arquitetura').focus();
  await page.keyboard.press('ArrowLeft');
  await expect(folderRow(page, 'Arquitetura')).toHaveAttribute('aria-expanded', 'false');
  // It names the open item it holds, and the open item's row says it is the page.
  await expect(folderRow(page, 'Arquitetura')).toHaveAttribute('aria-label', /, contém o item aberto$/);
  await page.getByRole('main').getByRole('heading', { level: 1 }).focus();
  await appShortcut(page, 'Backslash');
  await appShortcut(page, 'Backslash');
  await expect(folderRow(page, 'Arquitetura')).toHaveAttribute('aria-expanded', 'false');

  // 900 px: the sidebar over the page unmounts on each close.
  await page.setViewportSize({ width: 900, height: 900 });
  const open = page.getByRole('button', { name: 'Abrir a barra lateral' });
  await open.click();
  await expect(folderRow(page, 'Arquitetura')).toHaveAttribute('aria-expanded', 'false');
  await folderRow(page, 'Arquitetura').focus();
  await page.keyboard.press('ArrowRight');
  await expect(treeRow(page, 'Fluxo')).toHaveAttribute('aria-current', 'page');
  await page.keyboard.press('ArrowLeft');
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog', { name: 'Navegação' })).toBeHidden();
  await open.click();
  await expect(folderRow(page, 'Arquitetura')).toHaveAttribute('aria-expanded', 'false');

  // There, Esc in "Mover para pasta…" gives the focus back to the row.
  await treeRow(page, 'Zebra').focus();
  await page.keyboard.press('m');
  await expect(page.getByRole('dialog', { name: 'Mover para pasta' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(treeRow(page, 'Zebra')).toBeFocused();
});

test('type-to-select keeps the letters that would be shortcuts, which act again after the pause', {
  tag: '@timing',
}, async ({ page }) => {
  await sampleProject(page);
  await treeRow(page, 'Visão').focus();
  // "op" reaches "Opções de layout": the P goes on the search instead of pinning.
  await page.keyboard.press('o');
  await page.keyboard.press('p');
  expect(await focusedRow(page)).toBe('Opções de layout, documento');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  // After the pause, P pins, and says so.
  await page.waitForTimeout(1100);
  await page.keyboard.press('p');
  await expect(live(page)).toHaveText('Fixado.');
  await expect(treeRow(page, 'Opções de layout')).toHaveAttribute('aria-label', /, fixado$/);
  await page.waitForTimeout(1100);
  await page.keyboard.press('p');
  await expect(live(page)).toHaveText('Desafixado.');
});

test('→ on an open folder goes to its first child, Tab comes in at the open item, and ⌥↑ says the end', {
  tag: '@timing',
}, async ({ page }) => {
  const { projectId, fluxo } = await sampleProject(page);
  await folderRow(page, 'Arquitetura').focus();
  await page.keyboard.press('ArrowRight');
  await expect(folderRow(page, 'Arquitetura')).toHaveAttribute('aria-expanded', 'true');
  await page.keyboard.press('ArrowRight');
  expect(await focusedRow(page)).toMatch(/^Fluxo, documento/);
  await expect(page.getByRole('button', { name: 'Novo em Arquitetura' })).not.toBeFocused();

  // The first folder cannot go up, and says so.
  await folderRow(page, 'Arquitetura').focus();
  await page.keyboard.press('Alt+ArrowUp');
  await expect(live(page)).toHaveText('“Arquitetura” já é a primeira pasta.');
  await folderRow(page, 'Vazia').focus();
  await page.keyboard.press('Alt+ArrowDown');
  await expect(live(page)).toHaveText('“Vazia” já é a última pasta.');

  // Tab from Quadro comes into the tree at the open item's row, past the header's buttons.
  await page.goto(`/projetos/${projectId}/documentos/${fluxo}`);
  await projectNavigation(page).getByRole('link', { name: 'Quadro' }).focus();
  for (let step = 0; step < 6 && !(await focusedRow(page)); step += 1) await page.keyboard.press('Tab');
  expect(await focusedRow(page)).toMatch(/^Fluxo, documento/);
});

test('the layers the tree opens have names: the move popover, the row’s Novo and the folder’s ⋯', {
  tag: '@timing',
}, async ({ page }) => {
  await sampleProject(page);
  await treeRow(page, 'Zebra').focus();
  await page.keyboard.press('m');
  await expect(page.getByRole('dialog', { name: 'Mover para pasta' })).toBeVisible();
  await page.keyboard.press('Escape');
  await folderRow(page, 'Arquitetura').focus();
  await page.keyboard.press('n');
  await expect(page.getByRole('menu', { name: /^Novo em / })).toBeVisible();
  const unnamed = await page.evaluate(
    () =>
      [...document.querySelectorAll('[role="dialog"]')].filter(
        (layer) => !layer.getAttribute('aria-label') && !layer.getAttribute('aria-labelledby'),
      ).length,
  );
  expect(unnamed).toBe(0);
  await page.keyboard.press('Escape');
  await expect(folderRow(page, 'Arquitetura')).toBeFocused();
  await page.keyboard.press('Shift+F10');
  await expect(page.getByRole('menu', { name: 'Opções da pasta Arquitetura' })).toBeVisible();
  expect(
    await page.evaluate(
      () =>
        [...document.querySelectorAll('[role="dialog"]')].filter(
          (layer) => !layer.getAttribute('aria-label') && !layer.getAttribute('aria-labelledby'),
        ).length,
    ),
  ).toBe(0);
});

test('M on a row opens "Mover para pasta…", which ↓ and Enter drive, in the sidebar and in the rail’s Itens', {
  tag: '@timing',
}, async ({ page }) => {
  await sampleProject(page);
  const toast = page.locator('.toast');
  // The menu lists the root, then the folders in their order: Arquitetura (the newest) and Vazia.
  await treeRow(page, 'Zebra').focus();
  await page.keyboard.press('m');
  await expect(page.getByRole('dialog', { name: 'Mover para pasta' })).toBeVisible();
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');
  await expect(toast).toContainText('Movido para Arquitetura.');
  await expect(treeRow(page, 'Zebra')).toHaveAttribute('aria-level', '2');

  // The rail's popover, at 900 px: the same keys from one of its rows.
  await page.setViewportSize({ width: 900, height: 900 });
  await page.getByRole('button', { name: /^Itens/ }).click();
  const popover = page.getByRole('dialog', { name: /^Itens de / });
  // The popover gives its entry row the focus as it opens; then a row of choice.
  await expect(popover.getByRole('row').first()).toBeFocused();
  await popover.getByRole('row', { name: /^Visão, documento/ }).focus();
  await page.keyboard.press('m');
  await expect(page.getByRole('dialog', { name: 'Mover para pasta' })).toBeVisible();
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');
  await expect(toast).toContainText('Movido para Vazia.');
});

test('letters that type-to-select finds nothing for stay in the tree: "zp" pins nothing, "an" opens nothing', {
  tag: '@timing',
}, async ({ page }) => {
  const { projectId } = await sampleProject(page);
  const visao = treeRow(page, 'Visão');
  await visao.click();
  await expect(page.getByRole('textbox', { name: 'Título do documento' })).toHaveValue('Visão');
  // "z" finds Zebra, "zp" nothing: the P must not pin the open item.
  await treeRow(page, 'Arquitetura').focus();
  await page.keyboard.press('z');
  await page.keyboard.press('p');
  await page.waitForTimeout(300);
  await expect(visao).not.toHaveAttribute('aria-label', /fixado/);
  await expect(live(page)).not.toHaveText('Fixado.');
  // "a" finds Arquitetura, "an" nothing: the N must not open Novo.
  await page.waitForTimeout(1100);
  await page.keyboard.press('a');
  await page.keyboard.press('n');
  await page.waitForTimeout(300);
  await expect(page.getByRole('menu', { name: /^Novo em / })).toHaveCount(0);
  expect(page.url()).toContain(projectId);
});

test('↓ from Quadro comes into the tree at the open item’s row, and ↑ from the first row goes back', {
  tag: '@timing',
}, async ({ page }) => {
  const { projectId, fluxo } = await sampleProject(page);
  await page.goto(`/projetos/${projectId}/documentos/${fluxo}`);
  await expect(treeRow(page, 'Fluxo')).toHaveAttribute('aria-current', 'page');
  await projectNavigation(page).getByRole('link', { name: 'Quadro' }).focus();
  await page.keyboard.press('ArrowDown');
  expect(await focusedRow(page)).toMatch(/^Fluxo, documento/);
  // The first row's ↑ leaves for the navigation's last row.
  await folderRow(page, 'Arquitetura').focus();
  await page.keyboard.press('ArrowUp');
  await expect(projectNavigation(page).getByRole('link', { name: 'Quadro' })).toBeFocused();
});
