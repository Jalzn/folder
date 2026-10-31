import { type Cookie, expect, type Page } from '@playwright/test';
import { rpc } from './rpc.js';

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
  await ensureTestProject(page);
}

/**
 * Every item belongs to a project, and the E2E database starts without any. Creates one when no
 * project is active, so the specs always have a project to create items in, and reloads the page
 * so it lists the new project.
 */
export async function ensureTestProject(page: Page) {
  const active = await rpc<unknown[]>(page, 'workspace/listProjects', {});
  if (active.length) return;
  await rpc(page, 'workspace/createProject', { requestId: crypto.randomUUID(), name: 'Projeto de teste' });
  await page.reload();
}
