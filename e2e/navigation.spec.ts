import { expect, type Locator, test } from '@playwright/test';
import { newDocument } from './support/items.js';
import { pressCommand } from './support/keyboard.js';
import {
  createProject,
  currentProjectId,
  hideSidebar,
  openProject,
  projectNavigation,
  showSidebar,
} from './support/navigation.js';
import { answers } from './support/rpc.js';
import { login } from './support/session.js';

/**
 * A column's order. React Aria leaves aria-sort out on Android, where TalkBack does not read it, and
 * describes the order instead; the data attribute holds it everywhere.
 */
const sortOf = async (header: Locator) =>
  (await header.getAttribute('aria-sort')) ?? (await header.getAttribute('data-sort-direction'));

test('the switcher, G chords, ⌘K and old addresses move between projects and pages', async ({ page }, info) => {
  const name = `Navegar ${info.project.name} ${Date.now()}`;
  await login(page);
  const home = currentProjectId(page);
  await page.goto(`/projetos/${home}`);
  const homeName = (await page.getByRole('heading', { level: 1 }).textContent()) ?? '';
  const project = await createProject(page, name);
  await expect(page.getByText(`Projeto ${name} criado.`)).toBeVisible();
  const overview = new RegExp(`/projetos/${project}$`);

  await page.locator('body').press('g');
  await page.keyboard.press('q');
  await expect(page).toHaveURL(new RegExp(`/projetos/${project}/quadro$`));
  await expect(page.getByRole('heading', { name: 'Quadro', level: 1 })).toBeFocused();
  await page.locator('body').press('g');
  await page.keyboard.press('l');
  await expect(page).toHaveURL(new RegExp(`/projetos/${project}/lixeira$`));
  await page.locator('body').press('g');
  await page.keyboard.press('v');
  await expect(page).toHaveURL(overview);

  // G P opens the switcher; Esc closes it without leaving.
  await page.locator('body').press('g');
  await page.keyboard.press('p');
  await expect(page.getByRole('dialog', { name: 'Trocar de projeto' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog', { name: 'Trocar de projeto' })).toBeHidden();
  await expect(page).toHaveURL(overview);

  // ⌘K finds a page of the current project by name.
  await pressCommand(page, 'k');
  const palette = page.getByRole('dialog', { name: 'Buscar e comandar' });
  await palette.getByRole('textbox', { name: 'Buscar ou comandar' }).fill('indice');
  // Items that mention "índice" may come first; the command is in Comandos.
  await palette
    .getByRole('menuitem')
    .filter({ has: page.getByText('Índice', { exact: true }) })
    .click();
  await expect(page).toHaveURL(new RegExp(`/projetos/${project}/indice$`));

  // An address from before stage 08 opens the Índice of the last project.
  await page.goto('/documentos?q=antigo');
  await expect(page).toHaveURL(new RegExp(`/projetos/${project}/indice\\?tipo=documentos$`));
  await expect(page.getByRole('button', { name: 'Tipo: Documentos' })).toBeVisible();

  // The Índice keeps its order on the device.
  const title = page.getByRole('columnheader', { name: /Título/ });
  const edited = page.getByRole('columnheader', { name: /Editado/ });
  await title.click();
  await expect.poll(() => sortOf(title)).toBe('ascending');
  await page.reload();
  await expect.poll(() => sortOf(title)).toBe('ascending');
  await edited.click();
  await expect.poll(() => sortOf(edited)).toBe('descending');

  // `/` comes back to the last place of the last project.
  await page.goto(`/projetos/${project}/quadro`);
  await page.goto('/');
  await expect(page).toHaveURL(new RegExp(`/projetos/${project}/quadro$`));

  // The switcher opens another project's Visão geral, not its last place.
  await openProject(page, homeName);
  await expect(page).toHaveURL(new RegExp(`/projetos/${home}$`));
});

test('an open document moves with its unsaved text, keeps its address canonical and comes back', async ({
  page,
}, info) => {
  const suffix = `${info.project.name} ${Date.now()}`;
  const title = `Mover aberto ${suffix}`;
  const destination = `Destino ${suffix}`;
  await login(page);
  const home = currentProjectId(page);
  const target = await createProject(page, destination);
  await page.goto(`/projetos/${home}`);
  await newDocument(page);
  await page.getByRole('textbox', { name: 'Título do documento' }).fill(title);
  await expect(page.getByText('Salvo', { exact: true })).toBeVisible();
  const editor = page.locator('[contenteditable="true"]').first();
  await editor.click();
  await page.keyboard.type('Escrito antes de mover.');

  // M on the document's own row in the sidebar, while the edit may still be on its way.
  const saved = page.waitForResponse(
    (response) =>
      answers(response, 'workspace/saveDocument') &&
      response.status() === 200 &&
      Boolean(response.request().postData()?.includes(target)),
  );
  await showSidebar(page);
  const row = projectNavigation(page).getByRole('link', { name: new RegExp(`^${title}, documento`) });
  await row.focus();
  await page.keyboard.press('m');
  await page.getByRole('menuitemradio', { name: destination }).click();
  expect((await saved).request().postData()).toContain('Escrito antes de mover.');
  await expect(page).toHaveURL(new RegExp(`/projetos/${target}/documentos/`));
  await expect(page.getByText(`“${title}” foi para ${destination}.`)).toBeVisible();
  await expect(page.getByRole('alert')).toHaveCount(0);
  await expect(editor).toContainText('Escrito antes de mover.');

  await hideSidebar(page);
  await page.getByRole('button', { name: 'Desfazer', exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`/projetos/${home}/documentos/`));
  await expect(page.getByText('Salvo', { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.locator('[contenteditable="true"]').first()).toContainText('Escrito antes de mover.');
  await expect(page).toHaveURL(new RegExp(`/projetos/${home}/documentos/`));
});
