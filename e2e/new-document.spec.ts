import { expect, type Page, test } from '@playwright/test';
import { documentEditor } from './support/document.js';
import { pressCommand } from './support/keyboard.js';
import { createProject, projectNavigation, showSidebar } from './support/navigation.js';
import { rpc } from './support/rpc.js';
import { login } from './support/session.js';

// N, ⌘K and the sidebar's Novo menu with a keyboard; narrow.spec.ts has the phone.
test.skip(({ isMobile }) => isMobile, 'Desktop: N, ⌘K and the sidebar’s menu.');

/** Chrome on a Mac, where the app reads ⌘ for its shortcuts; the suite's desktop is Windows. */
const MAC =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36';

type Path = 'o menu Novo' | 'N' | '⌘K';
const paths: Path[] = ['o menu Novo', 'N', '⌘K'];

const titleField = (page: Page) => page.getByRole('textbox', { name: 'Título do documento' });

/** An open document, "Antigo", to make the new one from. */
async function openOld(page: Page) {
  const projectId = await createProject(page, `Criação ${Date.now()}`);
  const old = await rpc<{ id: string; version: number }>(page, 'workspace/createDocument', {
    requestId: crypto.randomUUID(),
    projectId,
    title: 'Antigo',
    content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Texto antigo', styles: {} }] }],
  });
  await page.goto(`/projetos/${projectId}/documentos/${old.id}`);
  await expect(titleField(page)).toHaveValue('Antigo');
  return old;
}

/**
 * Asks for a new document by one path, from the old document's page: from its text for the menu and ⌘K, which
 * give the focus back there as they close, and from its bar for N, which only works outside a field.
 */
async function askForNew(page: Page, path: Path) {
  if (path === 'N') {
    await page.locator('.page-frame__bar').click({ position: { x: 600, y: 20 } });
    await page.keyboard.press('n');
    await page.getByRole('menuitem', { name: 'Documento', exact: true }).click();
    return;
  }
  await documentEditor(page).getByText('Texto antigo', { exact: true }).click();
  if (path === 'o menu Novo') {
    await showSidebar(page);
    await projectNavigation(page).getByRole('button', { name: 'Novo item', exact: true }).click();
    await page.getByRole('menuitem', { name: 'Documento', exact: true }).click();
    return;
  }
  await pressCommand(page, 'k');
  const palette = page.getByRole('dialog', { name: 'Buscar e comandar' });
  await page.keyboard.type('Novo documento');
  await expect(palette.getByRole('menuitem', { name: /Novo documento/ }).first()).toBeVisible();
  await page.keyboard.press('Enter');
}

for (const [platform, userAgent] of [
  ['Windows', undefined],
  ['Mac', MAC],
] as const) {
  test.describe(`on ${platform}`, () => {
    if (userAgent) test.use({ userAgent });
    for (const path of paths) {
      test(`by ${path}, the new document opens with the focus on its title`, async ({ page }) => {
        await login(page);
        const old = await openOld(page);
        await askForNew(page, path);
        await expect(page).not.toHaveURL(new RegExp(old.id));
        await expect(titleField(page)).toHaveValue('');
        await expect(titleField(page)).toBeFocused();
        // Nothing takes it afterwards, as the page settles.
        await page.waitForTimeout(500);
        await expect(titleField(page)).toBeFocused();
      });
    }
  });
}
