import { expect, type Page, test } from '@playwright/test';
import { rpc } from './support/rpc.js';
import { login } from './support/session.js';

interface Project {
  id: string;
  name: string;
  version: number;
  archivedAt: string | null;
}

const setArchived = (page: Page, project: Project, archived: boolean) =>
  rpc<Project>(page, 'workspace/updateProject', {
    requestId: crypto.randomUUID(),
    id: project.id,
    expectedVersion: project.version,
    archived,
  });

/**
 * With every project archived, `/projetos` is the only page outside a project: it lists the archived ones
 * and offers Novo projeto. Unarchiving one opens its Visão geral with the whole shell back.
 */
test('without an active project the app waits on /projetos until one comes back', async ({ page }) => {
  await login(page);
  const active = (await rpc<Project[]>(page, 'workspace/listProjects', {})).filter((project) => !project.archivedAt);
  const archived = await Promise.all(active.map((project) => setArchived(page, project, true)));
  try {
    await page.goto('/');
    await expect(page).toHaveURL(/\/projetos$/);
    await expect(page.getByRole('heading', { name: 'Nenhum projeto ativo', level: 1 })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Novo projeto', exact: true })).toBeVisible();
    await expect(page.getByRole('navigation', { name: /^Projeto / })).toHaveCount(0);
    const [first] = archived;
    if (!first) throw new Error('The test needs a project to archive.');
    const row = page.getByRole('listitem').filter({ has: page.getByText(first.name, { exact: true }) });
    await row.getByRole('button', { name: 'Desarquivar', exact: true }).click();
    await expect(page.getByText(`${first.name} desarquivado.`)).toBeVisible();
    await expect(page).toHaveURL(new RegExp(`/projetos/${first.id}$`));
    await expect(page.getByRole('heading', { name: first.name, level: 1 })).toBeVisible();
  } finally {
    // The other specs expect their projects active.
    const now = await rpc<Project[]>(page, 'workspace/listProjects', { includeArchived: true });
    for (const project of now)
      if (project.archivedAt && archived.some((item) => item.id === project.id))
        await setArchived(page, project, false);
  }
});
