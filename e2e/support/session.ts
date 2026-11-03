import { type Cookie, expect, type Page } from '@playwright/test';
import { projectAddress } from './navigation.js';
import { rpc } from './rpc.js';
import { E2E_PASSWORD } from './server.js';

export { E2E_PASSWORD };

const sessions = new Map<string, Cookie[]>();

/**
 * Opens the app signed in, in a new project. The first login on each server keeps its
 * session cookie for the following tests, which keeps the suite under the login rate limit. An
 * independent login starts a session of its own, as another device would.
 */
export async function login(page: Page, { independent = false } = {}) {
  await signIn(page, { independent });
  if (!independent) {
    const project = await rpc(page, 'workspace/createProject', {
      requestId: crypto.randomUUID(),
      name: `Projeto de teste ${crypto.randomUUID()}`,
    });
    await page.goto(`/projetos/${project.id}`);
  }
  await expect(page).toHaveURL(projectAddress);
}

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
