import type { Page } from '@playwright/test';

/**
 * Presses a ⌘ shortcut as the app reads it: ⌘ on Apple platforms, Ctrl elsewhere. The configured devices
 * report Windows and Android, whatever machine runs the suite.
 */
export async function pressCommand(page: Page, key: string) {
  const apple = await page.evaluate(() => {
    const data = (navigator as Navigator & { userAgentData?: { platform?: string } }).userAgentData;
    return /mac|iphone|ipad|ipod/i.test(data?.platform ?? navigator.platform);
  });
  await page.keyboard.press(`${apple ? 'Meta' : 'Control'}+${key}`);
}

/** Runs a command of the palette by its exact label, as a person picks it from the list. */
export async function runCommand(page: Page, label: string) {
  await pressCommand(page, 'k');
  const palette = page.getByRole('dialog', { name: 'Buscar e comandar' });
  await palette.getByRole('textbox', { name: 'Buscar ou comandar' }).fill(label);
  await palette
    .getByRole('menuitem')
    .filter({ has: page.getByText(label, { exact: true }) })
    .click();
}
