import type { Page } from '@playwright/test';

/** Native selection and pointer events need real elapsed time to exercise browser drift. */
export const PACE = {
  humanKey: 200,
  selection: 300,
  repeatedKey: 100,
  typeaheadReset: 1100,
  overlayExit: 500,
  pickerSettle: 400,
} as const;

export async function pauseForBrowser(page: Page, milliseconds: number) {
  // biome-ignore lint/suspicious/noPlaywrightWaitForTimeout: These scenarios exercise native events at a person's pace, not application timers.
  await page.waitForTimeout(milliseconds);
}

/** Runs every due timer beyond the 650 ms autosave debounce, without waiting in real time. */
export const AUTOSAVE_WINDOW = 1500;
export const elapseAutosave = (page: Page) => page.clock.runFor(AUTOSAVE_WINDOW);
