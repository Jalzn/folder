import { expect, type Page, test } from '@playwright/test';
import { moveToTrash, newDocument } from './support/items.js';
import { createProject } from './support/navigation.js';
import { login } from './support/session.js';

/** Whether the project's name in the top bar ends before the page's actions start. */
async function nameClearsActions(page: Page) {
  const name = await page.locator('.top-bar__name').boundingBox();
  const actions = await page.locator('.top-bar__actions').boundingBox();
  if (!name || !actions) throw new Error('The top bar has no name or no actions.');
  return name.x + name.width <= actions.x;
}

test('below 720 px a long project name gives way to the page actions', async ({ page }, info) => {
  test.skip(info.project.name !== 'chrome-mobile', 'Only a phone has the single top bar.');
  // 40 characters, more than the bar holds beside the actions.
  const name = `Barra estreita com nome comprido ${String(Date.now()).slice(-7)}`;
  await login(page);
  const project = await createProject(page, name);
  await newDocument(page);
  await expect(page.getByText('Salvo', { exact: true })).toBeVisible();
  const document = page.url();
  // One item in the trash, so the trash shows its action.
  await newDocument(page);
  await expect(page.getByText('Salvo', { exact: true })).toBeVisible();
  await moveToTrash(page, 'documento');

  for (const address of [
    document,
    `/projetos/${project}/lixeira`,
    `/projetos/${project}/quadro`,
    `/projetos/${project}/indice`,
  ]) {
    await page.goto(address);
    await expect(page.locator('.top-bar__actions').getByRole('button').first()).toBeVisible();
    await expect(page.getByRole('button', { name: new RegExp(name) })).toBeVisible();
    expect(await nameClearsActions(page), address).toBe(true);
  }
});

test('the page actions keep the focus when the window crosses 720 px', async ({ page }, info) => {
  test.skip(info.project.name === 'chrome-mobile', 'A phone keeps its width.');
  await login(page);
  await newDocument(page);
  await expect(page.getByText('Salvo', { exact: true })).toBeVisible();
  const options = page.getByRole('button', { name: 'Opções do documento', exact: true });

  // With its menu open, ⋯ moves into the top bar and takes the focus there.
  await options.click();
  await expect(page.getByRole('menu')).toBeVisible();
  await page.setViewportSize({ width: 600, height: 900 });
  await expect(page.getByRole('menu')).toHaveCount(0);
  await expect(options).toBeFocused();
  await expect(page.locator('.top-bar__actions').getByRole('button', { name: 'Opções do documento' })).toBeVisible();

  // Back to the page bar, the same button keeps it.
  await page.setViewportSize({ width: 1440, height: 1000 });
  await expect(page.locator('.top-bar')).toHaveCount(0);
  await expect(options).toBeFocused();
});
