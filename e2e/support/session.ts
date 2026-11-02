import { type Cookie, expect, type Page } from '@playwright/test';
import { projectAddress } from './navigation.js';
import { rpc } from './rpc.js';
import { E2E_PASSWORD } from './server.js';

export { E2E_PASSWORD };

let saved: Cookie[] | undefined;

/**
 * Opens the app signed in, in the project where `/` continues. The first login in a worker keeps its
 * session cookie for the following tests, which keeps the suite under the login rate limit. An
 * independent login starts a session of its own, as another device would.
 */
export async function login(page: Page, { independent = false } = {}) {
  if (saved && !independent) await page.context().addCookies(saved);
  await page.goto('/');
  if (!saved || independent) {
    await page.getByLabel('Sua senha').fill(E2E_PASSWORD);
    await page.getByRole('button', { name: 'Entrar no Tinyfold' }).click();
    await expect(page).toHaveURL(/\/projetos/);
    if (!independent) saved = await page.context().cookies();
  }
  await ensureTestProject(page);
  await expect(page).toHaveURL(projectAddress);
}

/**
 * Every item belongs to a project, and the E2E database starts without any. Creates one when no
 * project is active, so the specs always have a project to create items in, and opens it.
 */
export async function ensureTestProject(page: Page) {
  await expect(page).toHaveURL(/\/projetos/);
  const active = await rpc<unknown[]>(page, 'workspace/listProjects', {});
  if (active.length) return;
  await rpc(page, 'workspace/createProject', { requestId: crypto.randomUUID(), name: 'Projeto de teste' });
  await page.goto('/');
}
