import { expect, type Locator } from '@playwright/test';
import { test } from './fixtures.js';
import { newDocument } from './support/items.js';
import { appShortcut, runCommand } from './support/keyboard.js';
import {
  createProject,
  currentProjectId,
  hideSidebar,
  openProject,
  projectNavigation,
  showSidebar,
} from './support/navigation.js';
import { answers, rpc } from './support/rpc.js';
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
  // Items that mention "índice" may come first; the command is in Comandos.
  await runCommand(page, 'Índice');
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

test('an open document moves with its unsaved text, stays in the new project and comes back', async ({
  page,
}, info) => {
  const suffix = `${info.project.name} ${Date.now()}`;
  const title = `Mover aberto ${suffix}`;
  const destination = `Destino ${suffix}`;
  await login(page);
  const home = currentProjectId(page);
  await page.goto(`/projetos/${home}`);
  const homeName = (await page.getByRole('heading', { level: 1 }).textContent()) ?? '';
  const target = await createProject(page, destination);
  await page.goto(`/projetos/${home}`);
  await newDocument(page);
  await page.getByRole('textbox', { name: 'Título do documento' }).fill(title);
  await expect(page.getByText('Salvo', { exact: true })).toBeVisible();
  const editor = page.locator('[contenteditable="true"]').first();
  const documentId = new URL(page.url()).pathname.split('/').at(-1) ?? '';
  const stored = () => rpc(page, 'workspace/getDocument', { id: documentId });
  const nextSave = () =>
    page.waitForResponse((response) => answers(response, 'workspace/saveDocument') && response.status() === 200);
  await editor.click();
  await page.keyboard.type('Escrito antes de mover.');

  // M on the document's own row in the sidebar, while the edit may still be on its way: "Mover para
  // pasta…" opens first, and "Outro projeto…" leads to the projects.
  const moved = page.waitForResponse(
    (response) => answers(response, 'workspace/moveItem') && response.status() === 200,
  );
  await showSidebar(page);
  // The focus goes to the row: React Aria sends a focus that lands on the link inside it, while the
  // keyboard is in use, to the tree's last row.
  const row = projectNavigation(page).getByRole('row', { name: new RegExp(`^${title}, documento`) });
  await row.focus();
  await page.keyboard.press('m');
  await page.getByRole('menu', { name: 'Pastas' }).getByRole('menuitem', { name: 'Outro projeto…' }).click();
  await page.getByRole('menuitemradio', { name: destination }).click();
  expect((await moved).request().postData()).not.toContain('Escrito antes de mover.');
  await expect(page).toHaveURL(new RegExp(`/projetos/${target}/documentos/`));
  await expect(page.getByText(`“${title}” foi para ${destination}.`)).toBeVisible();
  await expect(page.getByRole('main').getByRole('alert')).toHaveCount(0);
  await expect(editor).toContainText('Escrito antes de mover.');
  expect(await stored()).toMatchObject({
    projectId: target,
    plainText: expect.stringContaining('Escrito antes de mover.'),
  });

  // The next autosave keeps the document where it went, and so does a reload.
  await hideSidebar(page);
  await editor.click();
  await page.keyboard.press('End');
  const afterMove = nextSave();
  await page.keyboard.type(' Depois da mudança.');
  await afterMove;
  await expect(page.getByText('Salvo', { exact: true })).toBeVisible();
  expect((await stored()).projectId).toBe(target);
  await page.reload();
  await expect(page).toHaveURL(new RegExp(`/projetos/${target}/documentos/`));
  await expect(page.locator('[contenteditable="true"]').first()).toContainText('Depois da mudança.');

  // Moved from the ⋯ menu, Desfazer brings it back, and it stays back.
  await page.getByRole('button', { name: 'Opções do documento', exact: true }).click();
  await page.getByRole('menuitem', { name: /Mover para projeto/ }).click();
  await page.getByRole('menuitemradio', { name: homeName }).click();
  await expect(page).toHaveURL(new RegExp(`/projetos/${home}/documentos/`));
  await page.getByRole('button', { name: 'Desfazer', exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`/projetos/${target}/documentos/`));
  const afterUndo = nextSave();
  await page.locator('[contenteditable="true"]').first().click();
  await page.keyboard.press('End');
  await page.keyboard.type(' Ainda aqui.');
  await afterUndo;
  expect((await stored()).projectId).toBe(target);
  await page.reload();
  await expect(page).toHaveURL(new RegExp(`/projetos/${target}/documentos/`));
  await expect(page.locator('[contenteditable="true"]').first()).toContainText('Ainda aqui.');
});

test('⌘Z undoes the toast on screen, and never takes the undo of a field', async ({ page }, info) => {
  const suffix = `${info.project.name} ${Date.now()}`;
  const title = `Desfazer pelo teclado ${suffix}`;
  const destination = `Destino do ⌘Z ${suffix}`;
  await login(page);
  const home = currentProjectId(page);
  const target = await createProject(page, destination);
  await page.goto(`/projetos/${home}`);
  await newDocument(page);
  const titleField = page.getByRole('textbox', { name: 'Título do documento' });
  await titleField.fill(title);
  await expect(page.getByText('Salvo', { exact: true })).toBeVisible();

  await page.getByRole('button', { name: 'Opções do documento', exact: true }).click();
  await page.getByRole('menuitem', { name: /Mover para projeto/ }).click();
  await page.getByRole('menuitemradio', { name: destination }).click();
  await expect(page).toHaveURL(new RegExp(`/projetos/${target}/documentos/`));
  const undo = page.getByRole('button', { name: 'Desfazer', exact: true });
  await expect(undo).toHaveAttribute('aria-keyshortcuts', /^(Meta|Control)\+Z$/);

  // In the title, ⌘Z is the field's own undo: the move stays and the toast with it.
  await titleField.focus();
  await appShortcut(page, 'z');
  await expect(page).toHaveURL(new RegExp(`/projetos/${target}/documentos/`));
  await expect(undo).toBeVisible();

  // On the page, it runs the toast's Desfazer and closes the toast.
  await page.locator('main h1').first().focus();
  await appShortcut(page, 'z');
  await expect(page).toHaveURL(new RegExp(`/projetos/${home}/documentos/`));
  await expect(undo).toHaveCount(0);
  await expect(page.getByRole('main').getByRole('heading', { level: 1 })).toBeFocused();
});
