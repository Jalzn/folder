import { expect, type Page, test } from '@playwright/test';
import { closeDrawer, createInDrawer, drawer, drawerOf, newTaskDrawer } from './support/board.js';
import { clickText, createTaskFromSelection, documentEditor, embedCard, expectSelected } from './support/document.js';
import { toast } from './support/feedback.js';
import { newDocument } from './support/items.js';
import { createProject } from './support/navigation.js';
import { answers, rpc } from './support/rpc.js';
import { login } from './support/session.js';

// The markers need a pointer to hover and a desktop drawer; the phone reaches the tasks by "Tarefas".
test.skip(({ isMobile }) => isMobile, 'Desktop: hover and the drawer below the document.');

/** The text the hovered marker's underline covers: the CSS highlight "origin-excerpt", or null without one. */
const underlined = (page: Page) =>
  page.evaluate(() => {
    const highlight = CSS.highlights.get('origin-excerpt');
    return highlight ? [...highlight].map((range) => range.toString()).join('') : null;
  });
/** A marker by its task's title; as `has` of a block, it is looked up inside that block. */
const marker = (page: Page, title: string) =>
  page.getByRole('button', { name: new RegExp(`^Tarefa originada aqui: ${title},`) });

/** A new document with one paragraph per line, typed with real keys and saved. */
async function writeDocument(page: Page, lines: string[]) {
  await newDocument(page);
  await documentEditor(page).click();
  for (const [index, line] of lines.entries()) {
    if (index) await page.keyboard.press('Enter');
    await page.keyboard.type(line);
  }
  await page.waitForResponse(
    (response) =>
      answers(response, 'workspace/saveDocument') &&
      response.status() === 200 &&
      Boolean(
        response
          .request()
          .postData()
          ?.includes(lines.at(-1) ?? ''),
      ),
  );
}

/** Selects a paragraph with a triple click, makes a task of it with ⌘⌥T, and leaves "Incorporar" as asked. */
async function taskFromParagraph(page: Page, text: string, title: string, embed: boolean) {
  await documentEditor(page).getByText(text, { exact: true }).click({ clickCount: 3 });
  await createTaskFromSelection(page);
  const form = newTaskDrawer(page);
  const embedBox = form.getByRole('checkbox', { name: 'Incorporar no documento' });
  await expect(embedBox).toBeChecked();
  if (!embed) {
    await embedBox.uncheck();
    await form.getByRole('textbox', { name: 'Título da nova tarefa' }).focus();
  }
  await createInDrawer(page, title);
}

test('a task from an excerpt leaves a marker after it, which names the task and opens it', async ({ page }) => {
  await login(page);
  await createProject(page, `Marcadores ${Date.now()}`);
  await writeDocument(page, ['Ligar para o banco amanhã.', 'Outro parágrafo.']);
  await taskFromParagraph(page, 'Ligar para o banco amanhã.', 'Ligar para o banco', false);
  await expect(toast(page)).toContainText('Tarefa criada em A fazer');
  await closeDrawer(page);

  const button = marker(page, 'Ligar para o banco');
  await expect(button).toHaveAccessibleName('Tarefa originada aqui: Ligar para o banco, A fazer. Abrir');
  await expect(button).toHaveAttribute('title', 'Originou: Ligar para o banco · A fazer');
  // Right after the excerpt, in its paragraph, which the JSON never got.
  await expect(documentEditor(page).locator('.bn-block-content', { has: button })).toContainText(
    'Ligar para o banco amanhã.',
  );
  const id = new URL(page.url()).pathname.split('/').at(-1);
  const saved = await rpc<{ content: unknown[] }>(page, 'workspace/getDocument', { id });
  expect(JSON.stringify(saved.content)).not.toContain('origin');

  // Hovering underlines the excerpt; a click opens the task.
  await button.hover();
  await expect.poll(() => underlined(page)).toBe('Ligar para o banco amanhã.');
  await button.click();
  await expect(drawerOf(page, 'Ligar para o banco')).toBeVisible();
});

test('the marker follows the excerpt, goes to the end of a changed block, and leaves with the task', async ({
  page,
}) => {
  await login(page);
  await createProject(page, `Marcador e trecho ${Date.now()}`);
  await writeDocument(page, ['Medir a janela da sala.']);
  await taskFromParagraph(page, 'Medir a janela da sala.', 'Medir a janela', false);
  await closeDrawer(page);
  const button = marker(page, 'Medir a janela');
  await expect(button).toBeVisible();

  // The excerpt edited away: the marker stays, at the end of its block.
  await documentEditor(page).getByText('Medir a janela da sala.').click();
  await page.keyboard.type('XX');
  const block = documentEditor(page).locator('.bn-block-content', { has: button });
  await expect(block).toContainText('XX');
  await expect(block).not.toContainText('Medir a janela da sala.');
  const after = await button.evaluate((element) => {
    const range = document.createRange();
    range.setStartAfter(element);
    range.setEndAfter(element.parentElement?.lastChild ?? element);
    return range.toString();
  });
  expect(after).toBe('');

  // The task in the trash takes its marker away.
  await button.click();
  await drawer(page).getByRole('button', { name: 'Mais ações da tarefa' }).click();
  await page.getByRole('menuitem', { name: 'Mover para a lixeira' }).click();
  await page.getByRole('alertdialog').getByRole('button', { name: 'Mover para a lixeira' }).click();
  await expect(button).toHaveCount(0);
});

test('"Incorporar no documento" puts the card under the paragraph, and only while the document is open', async ({
  page,
}) => {
  await login(page);
  await createProject(page, `Incorporar ao criar ${Date.now()}`);
  await writeDocument(page, ['Pintar a parede.', 'Depois do card.']);
  await taskFromParagraph(page, 'Pintar a parede.', 'Pintar a parede', true);
  await expect(toast(page)).toContainText('Tarefa criada. O card entrou abaixo do parágrafo.');
  const card = embedCard(page, 'Pintar a parede');
  await expect(card).toBeVisible();
  // The card sits between the paragraph it came from and the next one.
  const order = await documentEditor(page)
    .locator('.bn-block-content')
    .evaluateAll((blocks) => blocks.map((block) => block.getAttribute('data-content-type')));
  expect(order.slice(0, 3)).toEqual(['paragraph', 'taskEmbed', 'paragraph']);
  await closeDrawer(page);

  // With the document left before Criar, the task is made without the card.
  await documentEditor(page).getByText('Depois do card.', { exact: true }).click({ clickCount: 3 });
  await createTaskFromSelection(page);
  await expect(newTaskDrawer(page).getByRole('checkbox', { name: 'Incorporar no documento' })).toBeChecked();
  await page.getByRole('link', { name: 'Visão geral' }).click();
  await newTaskDrawer(page).getByRole('button', { name: 'Criar', exact: true }).click();
  await expect(toast(page)).toContainText('Tarefa criada em A fazer');
});

test('with the focus on "Incorporar no documento", P does nothing and ⌥↑ steps the drawer, as elsewhere in it', async ({
  page,
}) => {
  await login(page);
  await createProject(page, `Checkbox da gaveta ${Date.now()}`);
  await writeDocument(page, ['Comprar tinta.']);
  await documentEditor(page).getByText('Comprar tinta.', { exact: true }).click({ clickCount: 3 });
  await createTaskFromSelection(page);
  const form = newTaskDrawer(page);
  const embedBox = form.getByRole('checkbox', { name: 'Incorporar no documento' });
  await embedBox.focus();
  const pins: string[] = [];
  page.on('request', (request) => {
    if (new URL(request.url()).pathname === '/rpc/workspace/pinItem') pins.push(request.url());
  });
  // A checkbox only takes a press: the drawer's keys work there. P would otherwise pin the document behind.
  await page.keyboard.press('p');
  const before = (await form.boundingBox())?.height ?? 0;
  await page.keyboard.press('Alt+ArrowUp');
  await expect.poll(async () => (await form.boundingBox())?.height ?? 0).toBeGreaterThan(before);
  await expect(embedBox).toBeFocused();
  await expect(embedBox).toBeChecked();
  expect(pins).toEqual([]);
});

test('the marker of a word in mid-sentence stays out of the Tab order, and the hover redraws without breaking', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await login(page);
  await createProject(page, `Marcador no meio ${Date.now()}`);
  const line = 'Primeiro: ligar para o fornecedor amanhã cedo.';
  await writeDocument(page, [line]);
  // "fornecedor", in the middle of the line, selected by a double click on it.
  const word = await documentEditor(page)
    .getByText(line, { exact: true })
    .evaluate((element) => {
      // The typed line can be in several text nodes: the word's range goes through them.
      const range = document.createRange();
      const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
      const from = (element.textContent ?? '').indexOf('fornecedor');
      const to = from + 'fornecedor'.length;
      let seen = 0;
      for (let node = walker.nextNode(); node; node = walker.nextNode()) {
        const length = node.textContent?.length ?? 0;
        if (from >= seen && from <= seen + length) range.setStart(node, from - seen);
        if (to >= seen && to <= seen + length) range.setEnd(node, to - seen);
        seen += length;
      }
      const box = range.getBoundingClientRect();
      return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
    });
  await page.mouse.dblclick(word.x, word.y);
  await expectSelected(page, 'fornecedor');
  await createTaskFromSelection(page);
  await createInDrawer(page, 'Ligar para o fornecedor');
  await closeDrawer(page);

  const button = marker(page, 'Ligar para o fornecedor');
  await expect(button).toBeVisible();
  await expect(button).toHaveAttribute('tabindex', '-1');
  await clickText(page, line, 'start');
  await page.keyboard.press('Tab');
  await expect(button).not.toBeFocused();

  // The underline leaves the marker's element as it was, and goes when the pointer does.
  const element = await button.elementHandle();
  await button.hover();
  await expect.poll(() => underlined(page)).toBe('fornecedor');
  expect(await element?.evaluate((node) => node.isConnected)).toBe(true);
  await page.mouse.move(0, 0);
  await expect.poll(() => underlined(page)).toBeNull();
  await button.click();
  await expect(drawerOf(page, 'Ligar para o fornecedor')).toBeVisible();
  expect(errors).toEqual([]);
});
