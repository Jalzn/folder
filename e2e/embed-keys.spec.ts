import { expect, type Page, test } from '@playwright/test';
import { clickText, documentEditor, embedCard } from './support/document.js';
import { pressCommand } from './support/keyboard.js';
import { createProject } from './support/navigation.js';
import { answers, rpc } from './support/rpc.js';
import { login } from './support/session.js';

// The keys around embeds, from the stage 11 review: they need a desktop keyboard; narrow.spec.ts has the phone.
test.skip(({ isMobile }) => isMobile, 'Desktop: the keys of the document’s editor.');

type Block = { id?: string; type: string; props?: Record<string, unknown>; content?: unknown; children?: Block[] };

const paragraph = (text: string): Block => ({
  type: 'paragraph',
  content: text ? [{ type: 'text', text, styles: {} }] : [],
});
const card = (taskId: string): Block => ({ type: 'taskEmbed', props: { taskId } });
const figure = (canvasId: string): Block => ({ type: 'drawingEmbed', props: { canvasId } });
const textOf = (block: Block) =>
  Array.isArray(block.content) ? block.content.map((each: { text?: string }) => each.text ?? '').join('') : '';

/** A task of the project, made over RPC. */
const task = async (page: Page, projectId: string, title: string) =>
  (await rpc<{ id: string }>(page, 'workspace/createTask', { requestId: crypto.randomUUID(), projectId, title })).id;

/** A drawing of the project, made over RPC. */
const drawing = async (page: Page, projectId: string, title: string) =>
  (await rpc<{ id: string }>(page, 'workspace/createCanvas', { requestId: crypto.randomUUID(), projectId, title })).id;

/**
 * Where the editor's caret is: "[id]" for the block selected as a node, "gap" for ProseMirror's gap cursor,
 * else the text of the block it is in.
 */
const caret = (page: Page) =>
  documentEditor(page).evaluate((element) => {
    type Selection = {
      node?: unknown;
      toJSON(): { type: string };
      $from: { parent: { attrs: { id?: string }; textContent: string } };
    };
    const selection = (element as HTMLElement & { editor?: { state: { selection: Selection } } }).editor?.state
      .selection;
    if (!selection) return null;
    if (selection.node) return `[${selection.$from.parent.attrs.id}]`;
    return selection.toJSON().type === 'gapcursor' ? 'gap' : selection.$from.parent.textContent;
  });

/** Presses each key and reads where the caret went after it. */
/** Presses each key and reads where the caret went after it, `pause` ms later: a person's pace is 150 ms or more. */
async function walk(page: Page, keys: string[], pause = 0) {
  const stops: (string | null)[] = [];
  for (const key of keys) {
    await page.keyboard.press(key);
    if (pause) await page.waitForTimeout(pause);
    stops.push(await caret(page));
  }
  return stops;
}

/** The pace of the walks: Playwright's own, with no pause, and a person's, which Chrome's drift needs. */
const paces = { 'with no pause': 0, 'at a person’s pace': 200 } as const;

/** A document with these blocks, made over RPC as the editor saves them, and opened. */
async function openDocument(page: Page, projectId: string, blocks: Block[]) {
  const { id } = await rpc<{ id: string }>(page, 'workspace/createDocument', {
    requestId: crypto.randomUUID(),
    projectId,
    title: 'Teclas e incorporados',
    content: blocks,
  });
  await page.goto(`/projetos/${projectId}/documentos/${id}`);
  await expect(documentEditor(page)).toBeVisible();
  return id;
}

/** Blocks the editor shows inside an embed's block, as a Tab under a card nested them. */
const nestedUnderEmbed = '.bn-block:has(> .react-renderer > [data-content-type$="Embed"]) > .bn-block-group';

/** What the server holds of the document. */
const saved = async (page: Page, id: string) =>
  (await rpc<{ content: Block[] }>(page, 'workspace/getDocument', { id })).content;

/** The next save the server takes, with status 200. */
const nextSave = (page: Page) =>
  page.waitForResponse((response) => answers(response, 'workspace/saveDocument') && response.status() === 200);

test('Tab under a card leaves the line where it was, so the document saves and opens again', async ({ page }) => {
  await login(page);
  const projectId = await createProject(page, `Tab sob o card ${Date.now()}`);
  const taskId = await task(page, projectId, 'Card acima do recuo');
  const id = await openDocument(page, projectId, [paragraph('Antes'), card(taskId), paragraph('Depois do card')]);

  await clickText(page, 'Depois do card');
  await page.keyboard.press('Tab');
  const save = nextSave(page);
  await page.keyboard.type(' recuado');
  await save;
  await expect(documentEditor(page).locator(nestedUnderEmbed)).toHaveCount(0);
  const blocks = await saved(page, id);
  expect(blocks.map((block) => [block.type, block.children?.length ?? 0])).toEqual([
    ['paragraph', 0],
    ['taskEmbed', 0],
    ['paragraph', 0],
  ]);
  expect(textOf(blocks[2] as Block)).toContain('recuado');

  await page.reload();
  await expect(documentEditor(page)).toContainText('recuado');
  await expect(page.getByText(/não pôde ser aberto/)).toHaveCount(0);
});

const runs = {
  'three cards': ['task', 'task', 'task'],
  'two cards and a figure': ['task', 'task', 'drawing'],
  'three figures': ['drawing', 'drawing', 'drawing'],
} as const;

for (const [pace, pause] of Object.entries(paces))
  for (const [name, kinds] of Object.entries(runs))
    test(`↓ and ↑ go through ${name} in a row a block at a time, ${pace}, at the start, the middle and the end`, async ({
      page,
    }) => {
      await login(page);
      const projectId = await createProject(page, `Setas ${Date.now()}`);
      const run: Block[] = [];
      for (const [index, kind] of kinds.entries()) {
        const title = `Item ${index + 1}`;
        const block =
          kind === 'task' ? card(await task(page, projectId, title)) : figure(await drawing(page, projectId, title));
        run.push({ ...block, id: `x${index + 1}` });
      }
      const before = { ...paragraph('Antes'), id: 'antes' };
      const after = { ...paragraph('Depois'), id: 'depois' };
      const selected = ['[x1]', '[x2]', '[x3]'];

      // In the middle: down through each one to the text below, then back up, and ← → at the text's edge.
      await openDocument(page, projectId, [before, ...run, after]);
      await clickText(page, 'Antes');
      expect(await walk(page, ['ArrowDown', 'ArrowDown', 'ArrowDown', 'ArrowDown'], pause)).toEqual([
        ...selected,
        'Depois',
      ]);
      expect(await walk(page, ['ArrowLeft', 'ArrowRight'], pause)).toEqual(['[x3]', 'Depois']);
      expect(await walk(page, ['ArrowUp', 'ArrowUp', 'ArrowUp', 'ArrowUp'], pause)).toEqual([
        ...selected.toReversed(),
        'Antes',
      ]);

      // At the start of the document: up from the text below to the first one, and down again.
      await openDocument(page, projectId, [...run, after]);
      await clickText(page, 'Depois');
      expect(await walk(page, ['ArrowUp', 'ArrowUp', 'ArrowUp'], pause)).toEqual(selected.toReversed());
      expect(await walk(page, ['ArrowDown', 'ArrowDown', 'ArrowDown'], pause)).toEqual(['[x2]', '[x3]', 'Depois']);

      // At the end: down from the text above to the last one, and up again.
      await openDocument(page, projectId, [before, ...run]);
      await clickText(page, 'Antes');
      expect(await walk(page, ['ArrowDown', 'ArrowDown', 'ArrowDown'], pause)).toEqual(selected);
      expect(await walk(page, ['ArrowUp', 'ArrowUp', 'ArrowUp'], pause)).toEqual(['[x2]', '[x1]', 'Antes']);
    });

test('⌫ after a card and Delete before one select it first, and the second key takes it out with Desfazer', async ({
  page,
}) => {
  await login(page);
  const projectId = await createProject(page, `Apagar ao lado ${Date.now()}`);
  const taskId = await task(page, projectId, 'Card entre parágrafos');
  const id = await openDocument(page, projectId, [
    { ...paragraph('Antes'), id: 'antes' },
    { ...card(taskId), id: 'card' },
    { ...paragraph('Depois'), id: 'depois' },
  ]);
  const toast = page.locator('.toast').filter({ hasText: 'Bloco removido do documento' });

  await clickText(page, 'Depois', 'start');
  await page.keyboard.press('Backspace');
  expect(await caret(page)).toBe('[card]');
  await expect(documentEditor(page)).toContainText('Card entre parágrafos');
  const removed = nextSave(page);
  await page.keyboard.press('Backspace');
  await expect(toast).toBeVisible();
  await removed;
  expect((await saved(page, id)).map((block) => block.type)).toEqual(['paragraph', 'paragraph']);
  await toast.getByRole('button', { name: 'Desfazer' }).click();
  await expect(documentEditor(page)).toContainText('Card entre parágrafos');
  await expect
    .poll(async () => (await saved(page, id)).map((block) => block.type))
    .toEqual(['paragraph', 'taskEmbed', 'paragraph']);

  await clickText(page, 'Antes', 'end');
  await page.keyboard.press('Delete');
  expect(await caret(page)).toBe('[card]');
  await page.keyboard.press('Delete');
  await expect(toast).toBeVisible();
  await expect(documentEditor(page).locator('[data-content-type="taskEmbed"]')).toHaveCount(0);
  expect(await caret(page)).toBe('Depois');
});

test('Restaurar gives the focus to the card it brings back, selected in the editor', async ({ page }) => {
  await login(page);
  const projectId = await createProject(page, `Restaurar e foco ${Date.now()}`);
  const trashed = await rpc<{ id: string; version: number }>(page, 'workspace/createTask', {
    requestId: crypto.randomUUID(),
    projectId,
    title: 'Tarefa de volta',
  });
  await rpc(page, 'workspace/deleteTask', {
    id: trashed.id,
    expectedVersion: trashed.version,
    requestId: crypto.randomUUID(),
  });
  await openDocument(page, projectId, [
    { ...paragraph('Antes'), id: 'antes' },
    { ...card(trashed.id), id: 'card' },
    { ...paragraph('Depois'), id: 'depois' },
  ]);

  await documentEditor(page)
    .getByRole('button', { name: /^Restaurar/ })
    .focus();
  await page.keyboard.press('Enter');
  await expect(embedCard(page, 'Tarefa de volta')).toBeVisible();
  await expect(documentEditor(page)).toBeFocused();
  expect(await caret(page)).toBe('[card]');
});

test('an archived project’s document only reads: no typing, no ⌫ on its embeds, no Criar tarefa, no save', async ({
  page,
}) => {
  await login(page);
  const projectId = await createProject(page, `Só leitura ${Date.now()}`);
  const taskId = await task(page, projectId, 'Card guardado');
  const id = await openDocument(page, projectId, [
    { ...paragraph('Texto guardado'), id: 'texto' },
    { ...card(taskId), id: 'card' },
    { ...paragraph('Depois'), id: 'depois' },
  ]);
  const project = (await rpc<{ id: string; version: number }[]>(page, 'workspace/listProjects', {})).find(
    (each) => each.id === projectId,
  );
  await rpc(page, 'workspace/updateProject', {
    id: projectId,
    expectedVersion: project?.version,
    archived: true,
    requestId: crypto.randomUUID(),
  });
  const saves: string[] = [];
  page.on('request', (request) => {
    if (new URL(request.url()).pathname === '/rpc/workspace/saveDocument') saves.push(request.url());
  });
  await page.reload();
  await expect(page.getByText('Projeto arquivado: desarquive para editar o documento.')).toBeVisible();
  await expect(documentEditor(page)).toHaveAttribute('contenteditable', 'false');
  await expect(page.getByRole('textbox', { name: 'Título do documento' })).toHaveAttribute('readonly', '');

  // Keys change nothing: the text, the card under it, the title.
  await documentEditor(page).getByText('Texto guardado', { exact: true }).click({ clickCount: 3 });
  await page.keyboard.type('X');
  await page.keyboard.press('Backspace');
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Backspace');
  await page.getByRole('textbox', { name: 'Título do documento' }).click();
  await page.keyboard.type('Y');
  await expect(documentEditor(page)).toContainText('Texto guardado');
  await expect(documentEditor(page).locator('[data-content-type="taskEmbed"]')).toHaveCount(1);

  // Criar tarefa: ⌘⌥T with an excerpt selected says why, and the ⋯ offers it disabled.
  await documentEditor(page).getByText('Texto guardado', { exact: true }).click({ clickCount: 3 });
  await pressCommand(page, 'Alt+t');
  await expect(page.locator('.toast')).toContainText('Projeto arquivado: desarquive para criar itens.');
  await expect(page.getByRole('region', { name: 'Nova tarefa', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Opções do documento', exact: true }).click();
  const item = page.getByRole('menu', { name: 'Opções do documento' }).getByRole('menuitem', { name: /^Criar tarefa/ });
  await expect(item).toBeDisabled();
  await expect(item).toContainText('Projeto arquivado: desarquive para criar itens');
  await page.keyboard.press('Escape');

  expect(saves).toEqual([]);
  expect(textOf((await saved(page, id))[0] as Block)).toBe('Texto guardado');
});

test('typing on a selected card writes in a new paragraph after it, an accent’s composition too', async ({ page }) => {
  await login(page);
  const projectId = await createProject(page, `Digitar no card ${Date.now()}`);
  const taskId = await task(page, projectId, 'Card selecionado');
  const id = await openDocument(page, projectId, [
    { ...paragraph('Antes'), id: 'antes' },
    { ...card(taskId), id: 'card' },
    { ...paragraph('Depois'), id: 'depois' },
  ]);
  const lines = async () =>
    (await saved(page, id)).map((block) => (block.type === 'taskEmbed' ? '[card]' : textOf(block)));

  await clickText(page, 'Antes');
  await page.keyboard.press('ArrowDown');
  expect(await caret(page)).toBe('[card]');
  await page.keyboard.type('X');
  expect(await caret(page)).toBe('X');
  await expect.poll(lines).toEqual(['Antes', '[card]', 'X', 'Depois']);

  // An accent on the card selected again, as a dead key composes it: the key goes down, the composition
  // shows "´", and "a" commits "á".
  await page.keyboard.press('ArrowUp');
  expect(await caret(page)).toBe('[card]');
  const cdp = await page.context().newCDPSession(page);
  const dead = { key: 'Dead', code: 'BracketLeft', windowsVirtualKeyCode: 229 };
  await cdp.send('Input.dispatchKeyEvent', { type: 'rawKeyDown', ...dead });
  await cdp.send('Input.imeSetComposition', { text: '´', selectionStart: 1, selectionEnd: 1 });
  await cdp.send('Input.dispatchKeyEvent', { type: 'keyUp', ...dead });
  await cdp.send('Input.insertText', { text: 'á' });
  await expect.poll(lines).toEqual(['Antes', '[card]', 'á', 'X', 'Depois']);
});

test('after Restaurar pressed with an embed selected, the arrows still go a block at a time', async ({ page }) => {
  await login(page);
  const projectId = await createProject(page, `Setas depois de restaurar ${Date.now()}`);
  const tasks: { id: string; version: number }[] = [];
  for (const index of [1, 2, 3, 4, 5])
    tasks.push(
      await rpc(page, 'workspace/createTask', { requestId: crypto.randomUUID(), projectId, title: `Card ${index}` }),
    );
  const trashed = tasks[2] as { id: string; version: number };
  await rpc(page, 'workspace/deleteTask', {
    id: trashed.id,
    expectedVersion: trashed.version,
    requestId: crypto.randomUUID(),
  });
  await openDocument(page, projectId, [
    { ...paragraph('Antes'), id: 'antes' },
    ...tasks.map((each, index) => ({ ...card(each.id), id: `x${index + 1}` })),
    { ...paragraph('Depois'), id: 'depois' },
  ]);

  // The first card selected with the keys, then the third one restored with the pointer.
  await clickText(page, 'Antes');
  await page.keyboard.press('ArrowDown');
  expect(await caret(page)).toBe('[x1]');
  await documentEditor(page).getByRole('button', { name: 'Restaurar “Card 3”' }).click();
  await expect(embedCard(page, 'Card 3')).toBeVisible();
  expect(await caret(page)).toBe('[x3]');
  expect(await walk(page, ['ArrowDown', 'ArrowDown', 'ArrowDown'], 200)).toEqual(['[x4]', '[x5]', 'Depois']);
});

test('from a selected embed, keys the embed keys leave alone and a selection set in the page move it as always', async ({
  page,
}) => {
  await login(page);
  const projectId = await createProject(page, `Outras teclas ${Date.now()}`);
  const run: Block[] = [];
  for (const index of [1, 2, 3]) run.push({ ...card(await task(page, projectId, `Card ${index}`)), id: `x${index}` });
  const lines = [1, 2, 3, 4, 5].map((index) => ({ ...paragraph(`Linha ${index}`), id: `l${index}` }));
  await openDocument(page, projectId, [{ ...paragraph('Antes'), id: 'antes' }, ...run, ...lines]);
  const apple = process.platform === 'darwin';
  /** The middle card selected with the keys at a person's pace, a moment after they went up. */
  const selectMiddle = async () => {
    await clickText(page, 'Antes', 'end');
    expect(await walk(page, ['ArrowDown', 'ArrowDown'], 200)).toEqual(['[x1]', '[x2]']);
  };
  // Each from a fresh page: after ⌘↑ or a selection set in the DOM, Chrome on a Mac takes the next click as one
  // that extends the selection.
  await selectMiddle();
  await page.keyboard.press(apple ? 'Meta+ArrowDown' : 'Control+End');
  await expect.poll(() => caret(page)).toBe('Linha 5');
  await page.reload();
  await selectMiddle();
  await page.keyboard.press(apple ? 'Meta+ArrowUp' : 'Control+Home');
  await expect.poll(() => caret(page)).toBe('Antes');
  // A selection a screen reader or the page's search puts in the DOM.
  await page.reload();
  await selectMiddle();
  await documentEditor(page)
    .getByText('Linha 4', { exact: true })
    .evaluate((element) => {
      const text = element.firstChild as Text;
      element.ownerDocument.getSelection()?.collapse(text, 3);
    });
  await expect.poll(() => caret(page)).toBe('Linha 4');
});

test('⌫ right after a jump to the line start still selects the card first', async ({ page }) => {
  await login(page);
  const projectId = await createProject(page, `Teclas rápidas ${Date.now()}`);
  const taskId = await task(page, projectId, 'Card na corrida');
  await openDocument(page, projectId, [
    { ...paragraph('Antes'), id: 'antes' },
    { ...card(taskId), id: 'card' },
    { ...paragraph('Depois do card'), id: 'depois' },
  ]);
  await clickText(page, 'Depois do card');
  // The two keys with no pause, faster than ProseMirror hears of the first.
  await page.keyboard.press(process.platform === 'darwin' ? 'Meta+ArrowLeft' : 'Home');
  await page.keyboard.press('Backspace');
  expect(await caret(page)).toBe('[card]');
  await expect(documentEditor(page)).toContainText('Card na corrida');
  await expect(documentEditor(page).getByText('Depois do card', { exact: true })).toBeVisible();
  await expect(page.locator('.toast').filter({ hasText: 'Bloco removido' })).toHaveCount(0);
});

test('the arrows walk a document of text, figures and cards at a person’s pace, both ways', async ({ page }) => {
  await login(page);
  const projectId = await createProject(page, `Documento misto ${Date.now()}`);
  const figureOne = await drawing(page, projectId, 'Figura um');
  const figureTwo = await drawing(page, projectId, 'Figura dois');
  const cards = [await task(page, projectId, 'Card um'), await task(page, projectId, 'Card dois')];
  await openDocument(page, projectId, [
    { ...paragraph('Topo'), id: 'topo' },
    { ...figure(figureOne), id: 'f1' },
    { ...paragraph('Meio'), id: 'meio' },
    { ...card(cards[0] as string), id: 't1' },
    { ...card(cards[1] as string), id: 't2' },
    { ...figure(figureTwo), id: 'f2' },
    { ...paragraph('Fim'), id: 'fim' },
  ]);
  const down = Array(6).fill('ArrowDown');
  await clickText(page, 'Topo');
  expect(await walk(page, down, 200)).toEqual(['[f1]', 'Meio', '[t1]', '[t2]', '[f2]', 'Fim']);
  expect(await walk(page, Array(6).fill('ArrowUp'), 200)).toEqual(['[f2]', '[t2]', '[t1]', 'Meio', '[f1]', 'Topo']);
  await clickText(page, 'Fim', 'start');
  expect(await walk(page, Array(4).fill('ArrowLeft'), 200)).toEqual(['[f2]', '[t2]', '[t1]', 'Meio']);
  expect(await walk(page, Array(4).fill('ArrowRight'), 200)).toEqual(['[t1]', '[t2]', '[f2]', 'Fim']);
});

test('⇧↓ and ⇧↑ from an embed take the block beside it, and Page Down stays, at a person’s pace', async ({ page }) => {
  await login(page);
  const projectId = await createProject(page, `Shift e página ${Date.now()}`);
  const run: Block[] = [];
  for (const index of [1, 2, 3]) run.push({ ...card(await task(page, projectId, `Card ${index}`)), id: `x${index}` });
  const above = Array.from({ length: 20 }, (_, index) => ({
    ...paragraph(`Linha ${index + 1} acima.`),
    id: `a${index}`,
  }));
  const id = await openDocument(page, projectId, [
    ...above,
    { ...paragraph('Antes'), id: 'antes' },
    ...run,
    { ...paragraph('Depois'), id: 'depois' },
  ]);
  /** What the selection covers: the text, and [e] for each embed. */
  const covered = () =>
    documentEditor(page).evaluate((element) => {
      type State = {
        doc: { textBetween(from: number, to: number, block: string, leaf: string): string };
        selection: { from: number; to: number };
      };
      const state = (element as HTMLElement & { editor?: { state: State } }).editor?.state;
      return state ? state.doc.textBetween(state.selection.from, state.selection.to, '|', '[e]') : null;
    });
  /** The card `index` selected with ↓ from Antes, on a fresh page, then `key` a moment later. */
  const fromCard = async (index: number, key?: string) => {
    await page.reload();
    await clickText(page, 'Antes', 'end');
    const walked = await walk(page, Array(index).fill('ArrowDown'), 200);
    expect(walked.at(-1)).toBe(`[x${index}]`);
    if (!key) return;
    await page.keyboard.press(key);
    await page.waitForTimeout(200);
  };

  // The middle card, between two cards, is the one Chrome's drift took to the first line.
  await fromCard(2);
  expect(await walk(page, ['PageDown', 'PageUp'], 200)).toEqual(['[x2]', '[x2]']);
  await fromCard(2, 'Shift+ArrowUp');
  expect(await covered()).toBe('[e]|[e]');
  await fromCard(1, 'Shift+ArrowUp');
  expect(await covered()).toBe('Antes|[e]');
  await fromCard(3, 'Shift+ArrowDown');
  expect(await covered()).toBe('[e]|Depois');
  await fromCard(2, 'Shift+ArrowDown');
  expect(await covered()).toBe('[e]|[e]');
  // A letter then takes the place of what was selected there, not of a line far above.
  const save = nextSave(page);
  await page.keyboard.type('x');
  await save;
  const blocks = await saved(page, id);
  expect(blocks.slice(0, 20).map((block) => textOf(block))).toEqual(above.map((block) => textOf(block)));
  expect(blocks.slice(20).map((block) => (block.type === 'taskEmbed' ? '[card]' : textOf(block)))).toEqual([
    'Antes',
    '[card]',
    'x',
    'Depois',
  ]);
});
