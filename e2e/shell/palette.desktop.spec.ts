import { expect, type Page } from '@playwright/test';
import { test } from '../fixtures.js';
import { seedDocument } from '../support/builders.js';
import { itemsTree } from '../support/folders.js';
import { appShortcut } from '../support/keyboard.js';
import { createProject } from '../support/navigation.js';
import { delayRpc } from '../support/network.js';
import { answers } from '../support/rpc.js';

// Typing into ⌘K right after opening it needs a hardware keyboard: desktop.

const palette = (page: Page) => page.getByRole('dialog', { name: 'Buscar e comandar' });
const field = (page: Page) => palette(page).getByRole('textbox', { name: 'Buscar ou comandar' });
const row = (page: Page, name: string) => palette(page).getByRole('menuitem').filter({ hasText: name });

/** The item search for `text` answers 800 ms late, so it replaces the rows after the typing is over. */
async function slowSearchFor(page: Page, text: string) {
  await delayRpc(page, 'workspace/search', 800, (request) => Boolean(request.postData()?.includes(text)));
}

/**
 * Opens ⌘K over the recent items and types `text` at once. `whileSearching` runs while the late search is
 * still on its way; then the answer is awaited, and the rows of the earlier list are gone.
 */
async function typeAtOnce(page: Page, text: string, recent: string, whileSearching?: () => Promise<void>) {
  await appShortcut(page, 'k');
  // The earlier list: before any text, the items edited last, with `recent` among them.
  await expect(row(page, recent).first()).toBeVisible();
  const late = page.waitForResponse(
    (response) => answers(response, 'workspace/search') && (response.request().postData() ?? '').includes(text),
  );
  await field(page).pressSequentially(text, { delay: 0 });
  // Meanwhile the earlier items stay in place, dimmed: they are not this text's.
  await expect(row(page, recent).first()).toHaveAttribute('data-disabled', 'true');
  await whileSearching?.();
  await late;
  await expect(row(page, recent)).toHaveCount(0);
}

test('⌘K typed at once runs the command on screen, even when the item search answers later', async ({ page }) => {
  const projectId = await createProject(page, `Paleta ${Date.now()}`);
  await seedDocument(page, { projectId, title: 'Recente da paleta' });
  await page.reload();
  await slowSearchFor(page, 'Nova pasta');

  await typeAtOnce(page, 'Nova pasta', 'Recente da paleta');
  // The highlight moved to a row of this list, and Enter runs it: the new folder's field, and no item opened.
  await expect(palette(page).locator('[role="menuitem"][data-focused]')).toHaveCount(1);
  await page.keyboard.press('Enter');
  const draft = itemsTree(page).getByRole('textbox', { name: 'Nome da nova pasta' });
  await expect(draft).toBeFocused();
  await expect(page).toHaveURL(new RegExp(`/projetos/${projectId}$`));
  await draft.press('Escape');
  await expect(draft).toHaveCount(0);
});

test('⌘K typed at once opens the item its late search found, not a row of the earlier list', async ({ page }) => {
  const token = `tardio${Date.now()}`;
  const projectId = await createProject(page, `Busca ${Date.now()}`);
  const { id: target } = await seedDocument(page, { projectId, title: `Relatório ${token}` });
  // Edited last, so it leads the list before any text.
  await seedDocument(page, { projectId, title: 'Mais recente da busca' });
  await page.reload();
  await slowSearchFor(page, token);

  await typeAtOnce(page, token, 'Mais recente da busca', async () => {
    // Before the answer no row is this text's, and Enter runs none of the earlier ones.
    await page.keyboard.press('Enter');
    await expect(palette(page)).toBeVisible();
    await expect(page).toHaveURL(new RegExp(`/projetos/${projectId}$`));
  });
  await expect(row(page, `Relatório ${token}`)).toHaveAttribute('data-focused');
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(new RegExp(`/projetos/${projectId}/documentos/${target}`));
  await expect(page.getByRole('textbox', { name: 'Título do documento' })).toHaveValue(`Relatório ${token}`);
});

test('⌘K Enter on a query with no results runs nothing, and ↓ then Enter runs the row it moved to', async ({
  page,
}) => {
  const token = `setas${Date.now()}`;
  const projectId = await createProject(page, `Setas ${Date.now()}`);
  const { id: first } = await seedDocument(page, { projectId, title: `Primeiro ${token}` });
  const { id: second } = await seedDocument(page, { projectId, title: `Segundo ${token}` });
  await page.reload();

  await appShortcut(page, 'k');
  await field(page).pressSequentially('zzqx nada assim', { delay: 0 });
  await expect(palette(page).getByText('Nada encontrado.')).toBeVisible();
  await page.keyboard.press('Enter');
  await expect(palette(page)).toBeVisible();
  await expect(page).toHaveURL(new RegExp(`/projetos/${projectId}$`));

  // Two results: the first is highlighted, ↓ moves to the other, and Enter opens that one.
  await field(page).fill('');
  await field(page).pressSequentially(token, { delay: 0 });
  const rows = palette(page).locator('[role="menuitem"]');
  await expect(rows).toHaveCount(2);
  await expect(rows.first()).toHaveAttribute('data-focused');
  const other = (await rows.nth(1).textContent()) ?? '';
  await page.keyboard.press('ArrowDown');
  await expect(rows.nth(1)).toHaveAttribute('data-focused');
  await expect(rows.first()).not.toHaveAttribute('data-focused');
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(new RegExp(`/documentos/${other.includes('Segundo') ? second : first}`));
});
