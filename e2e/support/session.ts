import { type Cookie, expect, type Page } from '@playwright/test';

/** OWNER_PASSWORD of the server started by playwright.config.ts. */
export const E2E_PASSWORD = 'tinyfold-e2e-passphrase';

let saved: Cookie[] | undefined;

/**
 * Opens the home page signed in. The first login in a worker keeps its session cookie for the
 * following tests, which keeps the suite under the login rate limit. An independent login starts
 * a session of its own, as another device would.
 */
export async function login(page: Page, { independent = false } = {}) {
  if (saved && !independent) await page.context().addCookies(saved);
  await page.goto('/');
  if (!saved || independent) {
    await page.getByLabel('Sua senha').fill(E2E_PASSWORD);
    await page.getByRole('button', { name: 'Entrar no Tinyfold' }).click();
    await expect(page.getByRole('button', { name: 'Começar a escrever' })).toBeVisible();
    if (!independent) saved = await page.context().cookies();
  }
  await expect(page.getByRole('button', { name: 'Começar a escrever' })).toBeVisible();
}
