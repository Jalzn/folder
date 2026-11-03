import { expect } from '@playwright/test';
import { test } from './fixtures.js';
import { seedDocument, seedFolder } from './support/builders.js';
import { createProject, currentProjectId } from './support/navigation.js';
import { replyRpc } from './support/network.js';
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
  const folder = await seedFolder(page, { projectId: project, name: 'Notas' });
  await seedDocument(page, { projectId: project, title: 'Na pasta', folderId: folder });
  await seedDocument(page, { projectId: project, title: 'Na raiz' });

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

test('a failure in the shell itself still shows the error page in Portuguese', async ({ page, isMobile }) => {
  await login(page);
  // A sidebar answer the shell cannot draw.
  await replyRpc(page, 'workspace/projectNavigation', 200, {
    tree: { total: 1, pinned: null, folders: [], loose: { total: 0, items: [] } },
    openTasks: 0,
    trashCount: 0,
  });
  await page.reload();
  // On a phone the tree draws when the sidebar opens over the page.
  if (isMobile) await page.getByRole('button', { name: 'Abrir navegação', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Algo deu errado nesta página', level: 1 })).toBeVisible();
  await expect(page.getByText('Something went wrong')).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'Ir para o início' })).toBeVisible();
});
