import { expect, type Page } from '@playwright/test';
import { test } from '../fixtures.js';
import { seedDocument } from '../support/builders.js';
import { documentEditor } from '../support/document.js';
import { appShortcut } from '../support/keyboard.js';
import { createProject, projectNavigation, showSidebar } from '../support/navigation.js';
import { delayRpc } from '../support/network.js';
import { rpc } from '../support/rpc.js';

// N, ⌘K and the sidebar's Novo menu with a keyboard; narrow.spec.ts has the phone.

/** Chrome on a Mac, where the app reads ⌘ for its shortcuts; the suite's desktop is Windows. */
const MAC =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36';

type Path = 'o menu Novo' | 'N' | '⌘K';
const paths: Path[] = ['o menu Novo', 'N', '⌘K'];

const titleField = (page: Page) => page.getByRole('textbox', { name: 'Título do documento' });

type Block = { content?: { text?: string }[] };

/** An open document, "Antigo", to make the new one from. */
async function openOld(page: Page) {
  const projectId = await createProject(page, `Criação ${Date.now()}`);
  const old = await seedDocument(page, {
    projectId,
    title: 'Antigo',
    content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Texto antigo', styles: {} }] }],
  });
  await page.goto(`/projetos/${projectId}/documentos/${old.id}`);
  await expect(titleField(page)).toHaveValue('Antigo');
  return { ...old, projectId };
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
  await appShortcut(page, 'k');
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
      test(`by ${path}, the new document opens with the focus on its title`, { tag: '@timing' }, async ({ page }) => {
        const old = await openOld(page);
        await askForNew(page, path);
        await expect(page).not.toHaveURL(new RegExp(old.id));
        await expect(titleField(page)).toHaveValue('');
        await expect(titleField(page)).toBeFocused();
        // Nothing takes it afterwards, as the page settles.
        await page.waitForTimeout(500);
        await expect(titleField(page)).toBeFocused();
      });

      test(`by ${path}, what is typed at once goes to the new title, never to the page being left`, {
        tag: '@timing',
      }, async ({ page }) => {
        const old = await openOld(page);
        // The document takes a moment to be made, as on a slow network: the old page stays meanwhile.
        await delayRpc(page, 'workspace/createDocument', 400);
        await askForNew(page, path);
        // At machine speed, while the old page is still the one shown: a mistake taken back with ⌫, too.
        await page.keyboard.type('Plano da semx');
        await page.keyboard.press('Backspace');
        await page.keyboard.type('ana de maio');
        await expect(page).not.toHaveURL(new RegExp(old.id));
        await expect(titleField(page)).toHaveValue('Plano da semana de maio');
        await expect(titleField(page)).toBeFocused();
        // The old document is as it was, at its version, and no shortcut ran on its page.
        const kept = await rpc(page, 'workspace/getDocument', {
          id: old.id,
        });
        expect(kept.version).toBe(old.version);
        expect(kept.title).toBe('Antigo');
        expect((kept.content as Block[]).map((block) => block.content?.map((part) => part.text).join(''))).toEqual([
          'Texto antigo',
        ]);
        expect((await rpc(page, 'workspace/listFolders', { projectId: old.projectId })).folders).toEqual([]);
      });
    }
  });
}
