import { expect, test } from '@playwright/test';
import { rpcDocument, rpcFolder } from './support/folders.js';
import { createProject, currentProjectId } from './support/navigation.js';
import { login } from './support/session.js';

test('a broken or unknown address shows a page in Portuguese inside the shell', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await login(page);
  for (const address of [
    '/projetos/%E0%A4%A',
    '/projetos/%E0%A4%A/quadro',
    '/documentos/%E0%A4%A',
    '/qualquer-coisa',
  ]) {
    await page.goto(address);
    await expect(page.getByRole('heading', { name: 'Esta página não existe', level: 1 })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Ir para o início' })).toBeVisible();
    // Active projects exist, so the switcher does not claim there are none.
    await expect(page.getByRole('button', { name: /Nenhum projeto ativo/ })).toHaveCount(0);
  }
  expect(errors).toEqual([]);
  await page.getByRole('link', { name: 'Ir para o início' }).click();
  await expect(page).toHaveURL(/\/projetos\/[^/]+/);
});

test('a stored last place that would leave the app is dropped', async ({ page }) => {
  await login(page);
  const project = currentProjectId(page);
  const origin = new URL(page.url()).origin;
  await page.evaluate((id) => {
    const key = Object.keys(localStorage).find((name) => name.endsWith(':nav'));
    if (!key) throw new Error('No navigation state yet.');
    localStorage.setItem(
      key,
      JSON.stringify({
        version: 1,
        lastProjectId: id,
        projects: { [id]: { path: `https:evil.example/projetos/${id}`, scrollTop: 0, at: new Date().toISOString() } },
      }),
    );
  }, project);
  await page.goto('/');
  await expect(page).toHaveURL(new RegExp(`^${origin}/projetos/${project}$`));
});

test('the Índice reads ?pasta=: a folder, the root, and anything else as Todas', async ({ page }) => {
  await login(page);
  const project = await createProject(page, `Rotas ${Date.now()}`);
  const folder = await rpcFolder(page, project, 'Notas');
  await rpcDocument(page, project, 'Na pasta', folder);
  await rpcDocument(page, project, 'Na raiz');

  await page.goto(`/projetos/${project}/indice?pasta=${folder}`);
  await expect(page.getByRole('button', { name: 'Pasta: Notas' })).toBeVisible();
  await expect(page.getByRole('main').getByRole('link', { name: 'Na pasta' })).toBeVisible();
  await expect(page.getByRole('main').getByRole('link', { name: 'Na raiz' })).toHaveCount(0);

  await page.goto(`/projetos/${project}/indice?tipo=documentos&pasta=raiz`);
  await expect(page.getByRole('button', { name: 'Pasta: Sem pasta' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Tipo: Documentos' })).toBeVisible();
  await expect(page.getByRole('main').getByRole('link', { name: 'Na raiz' })).toBeVisible();
  await expect(page.getByRole('main').getByRole('link', { name: 'Na pasta' })).toHaveCount(0);

  // A folder the project does not have, deleted or never there, becomes Todas without a new history entry.
  await page.goto(`/projetos/${project}/indice?tipo=documentos&pasta=${crypto.randomUUID()}`);
  await expect(page).toHaveURL(new RegExp(`/projetos/${project}/indice\\?tipo=documentos$`));
  await expect(page.getByRole('button', { name: 'Pasta: Todas' })).toBeVisible();
  await page.goBack();
  await expect(page).toHaveURL(/pasta=raiz$/);
});
