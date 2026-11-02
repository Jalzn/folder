import type { Page } from '@playwright/test';

/** The toast on screen, with its text and its Desfazer. */
export const toast = (page: Page) => page.locator('.toast');
