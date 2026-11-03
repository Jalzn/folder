import { type Cookie, expect, type Page } from '@playwright/test';
import { E2E_PASSWORD } from './server.js';

export { E2E_PASSWORD };

const sessions = new Map<string, Cookie[]>();

/** Signs in without creating a project, for the project and API fixtures or a second device. */
export async function signIn(page: Page, { independent = false } = {}) {
  // /health belongs to the fixture's base URL and does not initialize the application.
  await page.goto('/health');
  const origin = new URL(page.url()).origin;
  const saved = sessions.get(origin);
  if (saved && !independent) await page.context().addCookies(saved);
  await page.goto('/');
  if (!saved || independent) {
    await page.getByLabel('Sua senha').fill(E2E_PASSWORD);
    await page.getByRole('button', { name: 'Entrar no Tinyfold' }).click();
    await expect(page).toHaveURL(/\/projetos/);
    if (!independent) sessions.set(origin, await page.context().cookies());
  }
  await expect(page).toHaveURL(/\/projetos/);
}
