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
