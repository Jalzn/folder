import { expect, type Locator, type Page } from '@playwright/test';
import { pressCommand } from './keyboard.js';

/**
 * ⌘⌥T (Ctrl+Alt+T on the suite's devices): a task from the excerpt selected in the document's editor. It
 * waits for the formatting toolbar, which shows once the editor has the selection: the keys come faster than
 * any person types, before the editor reads a selection the mouse or ⇧ made.
 */
export async function createTaskFromSelection(page: Page) {
  await expect(page.getByRole('button', { name: 'Criar tarefa', exact: true })).toBeVisible();
  await pressCommand(page, 'Alt+t');
}

/** The document's "Tarefas · n" popover, opened from the bar: the tasks born in the document. */
export async function openDocumentTasks(page: Page) {
  await page.getByRole('button', { name: /^Tarefas · / }).click();
  const tasks = page.getByRole('dialog', { name: 'Tarefas deste documento' });
  await expect(tasks).toBeVisible();
  return tasks;
}

/** The document's content area. */
export const documentEditor = (page: Page) => page.getByTestId('document-content');

/**
 * Clicks a block's text, in its middle or at its start or end, and waits until the editor reads the caret in
 * it: the keys a test presses next come faster than a person's, before ProseMirror takes the selection the
 * click made.
 */
export async function clickText(page: Page, text: string, at: 'middle' | 'start' | 'end' = 'middle') {
  const line = documentEditor(page).getByText(text, { exact: true });
  const box = await line.boundingBox();
  if (at === 'middle' || !box) await line.click();
  else await line.click({ position: { x: at === 'start' ? 1 : box.width - 1, y: box.height / 2 } });
  // The text, and the caret at its edge when the click was there: the caret may have been in it already.
  const edge = at === 'start' ? 'start' : at === 'end' ? 'end' : 'any';
  await expect
    .poll(() =>
      documentEditor(page).evaluate((element, edge) => {
        type From = { parentOffset: number; parent: { textContent: string; content: { size: number } } };
        const $from = (element as HTMLElement & { editor?: { state: { selection: { $from: From } } } }).editor?.state
          .selection.$from;
        if (!$from) return null;
        const offset = edge === 'start' ? 0 : edge === 'end' ? $from.parent.content.size : $from.parentOffset;
        return $from.parentOffset === offset ? $from.parent.textContent : null;
      }, edge),
    )
    .toBe(text);
}

/** Waits until the editor reads `text` as its selection, which ⇧ and the arrows made in the DOM first. */
export async function expectSelected(page: Page, text: string) {
  await expect
    .poll(() =>
      documentEditor(page).evaluate((element) => {
        type State = {
          doc: { textBetween(from: number, to: number): string };
          selection: { from: number; to: number };
        };
        const state = (element as HTMLElement & { editor?: { state: State } }).editor?.state;
        return state?.doc.textBetween(state.selection.from, state.selection.to);
      }),
    )
    .toBe(text);
}

/** An embedded task's card, by its title. */
export const embedCard = (page: Page, title: string) =>
  documentEditor(page).getByRole('button', { name: new RegExp(`^Tarefa: ${escapeRegExp(title)},`) });

/** An embedded drawing's figure, by its title. */
export const embedFigure = (page: Page, title: string) =>
  documentEditor(page).getByRole('link', { name: new RegExp(`^Figura \\d+: ${escapeRegExp(title)}\\.`) });

const escapeRegExp = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Opens a new line after the caret, types `/` and the menu's word, and picks the item with ↵; the picker's
 * search field takes the focus. Returns the picker's list.
 */
export async function slash(page: Page, word: 'tarefa' | 'desenho') {
  await page.keyboard.press('Enter');
  await page.keyboard.type(`/${word}`);
  await expect(page.locator('.bn-suggestion-menu-item').first()).toContainText(
    word === 'tarefa' ? 'Tarefa' : 'Desenho',
  );
  await page.keyboard.press('Enter');
  const name = word === 'tarefa' ? 'Incorporar tarefa' : 'Incorporar desenho';
  await expect(page.getByRole('searchbox', { name })).toBeFocused();
  return page.getByRole('menu', { name });
}

/**
 * Types the picker's filter and embeds an item found: ↓ until the item is the active one, then ↵, as a person
 * moves down the list to what they want once the search answered.
 */
export async function pickEmbed(page: Page, picker: Locator, filter: string, title: string) {
  await page.keyboard.type(filter);
  // The document's project comes first, so a same title elsewhere is further down.
  const row = picker.getByRole('menuitem').filter({ hasText: title }).first();
  await expect(row).toBeVisible();
  for (let step = 0; step < 6 && (await row.getAttribute('data-focused')) === null; step += 1)
    await page.keyboard.press('ArrowDown');
  await expect(row).toHaveAttribute('data-focused');
  await page.keyboard.press('Enter');
}

/**
 * The block editor's own ⌘Z. ProseMirror reads the modifier from navigator.platform, which the devices leave
 * as the machine's, unlike the user agent the app reads: ⌘ on a Mac running the suite, Ctrl elsewhere.
 */
export async function editorUndo(page: Page) {
  await page.keyboard.press(`${process.platform === 'darwin' ? 'Meta' : 'Control'}+z`);
}
