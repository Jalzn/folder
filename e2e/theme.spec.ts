import { expect } from '@playwright/test';
import { test } from './fixtures.js';
import { runCommand } from './support/keyboard.js';
import { showSidebar } from './support/navigation.js';
import { login } from './support/session.js';

test('the theme follows the system until a choice, which stays on the device from the first paint', async ({
  page,
}) => {
  await page.emulateMedia({ colorScheme: 'dark' });
  await login(page);
  const html = page.locator('html');
  await expect(html).toHaveAttribute('data-theme', 'dark');

  await showSidebar(page);
  await page.getByRole('button', { name: 'Você: perfil, tema e sair' }).click();
  await page.getByRole('menuitem', { name: /^Tema/ }).click();
  await page.getByRole('menuitemradio', { name: 'Claro' }).click();
  await expect(page.getByText('Tema: Claro.')).toBeVisible();
  await expect(html).toHaveAttribute('data-theme', 'light');

  // A new toast replaces the one on screen: the latest action is the one shown.
  await runCommand(page, 'Tema: Escuro');
  await expect(page.getByText('Tema: Escuro.')).toBeVisible();
  await expect(page.getByText('Tema: Claro.')).toHaveCount(0);
  await runCommand(page, 'Tema: Claro');
  await expect(page.getByText('Tema: Claro.')).toBeVisible();
  await expect(page.getByText('Tema: Escuro.')).toHaveCount(0);
  await expect(page.locator('meta[name="theme-color"]').first()).toHaveAttribute('content', /#/);

  // theme.js applies the choice before the app loads.
  await page.goto('/perfil', { waitUntil: 'commit' });
  await page.waitForFunction(() => document.documentElement.dataset.theme !== undefined);
  expect(await html.getAttribute('data-theme')).toBe('light');

  const appearance = page.getByRole('radiogroup', { name: 'Tema' });
  await expect(appearance.getByRole('radio', { name: 'Claro' })).toBeChecked();
  // The radio is drawn as a chip; its label takes the click.
  await appearance.getByText('Sistema', { exact: true }).click();
  await expect(page.getByText('Tema: Sistema.')).toBeVisible();
  await expect(html).toHaveAttribute('data-theme', 'dark');
  await page.emulateMedia({ colorScheme: 'light' });
  await expect(html).toHaveAttribute('data-theme', 'light');
});
