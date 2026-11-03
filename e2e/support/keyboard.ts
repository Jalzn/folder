import type { Locator, Page } from '@playwright/test';

/**
 * Presses a ⌘ shortcut as the app reads it: ⌘ on Apple platforms, Ctrl elsewhere. The configured devices
 * report Windows and Android, whatever machine runs the suite.
 */
export async function appShortcut(page: Page, key: string) {
  const apple = await page.evaluate(() => {
    const data = (navigator as Navigator & { userAgentData?: { platform?: string } }).userAgentData;
    return /mac|iphone|ipad|ipod/i.test(data?.platform ?? navigator.platform);
  });
  await page.keyboard.press(`${apple ? 'Meta' : 'Control'}+${key}`);
}

/** Native editing and clipboard shortcuts follow the host, even when the app emulates another platform. */
export async function hostShortcut(target: Page | Locator, key: string) {
  const keyboard = 'keyboard' in target ? target.keyboard : target;
  await keyboard.press(`${process.platform === 'darwin' ? 'Meta' : 'Control'}+${key}`);
}

/** ProseMirror's caret navigation uses the real host platform too. */
export function hostKey(key: 'lineStart' | 'documentStart' | 'documentEnd') {
  const keys = {
    lineStart: ['Meta+ArrowLeft', 'Home'],
    documentStart: ['Meta+ArrowUp', 'Control+Home'],
    documentEnd: ['Meta+ArrowDown', 'Control+End'],
  } as const;
  return keys[key][process.platform === 'darwin' ? 0 : 1];
}

/** Undo inside the block editor follows ProseMirror's host keymap. */
export const editorUndo = (page: Page) => hostShortcut(page, 'z');

/** Runs a command of the palette by its exact label, as a person picks it from the list. */
export async function runCommand(page: Page, label: string) {
  await appShortcut(page, 'k');
  const palette = page.getByRole('dialog', { name: 'Buscar e comandar' });
  await palette.getByRole('textbox', { name: 'Buscar ou comandar' }).fill(label);
  await palette
    .getByRole('menuitem')
    .filter({ has: page.getByText(label, { exact: true }) })
    .click();
}
