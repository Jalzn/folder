import { expect, type Page, test } from '@playwright/test';
import { drawer, drawerOf, newTaskDrawer } from './support/board.js';
import { clickText, documentEditor, editorUndo, embedCard, embedFigure, pickEmbed, slash } from './support/document.js';
import { newDocument } from './support/items.js';
import { pressCommand } from './support/keyboard.js';
import { createProject, currentProjectId } from './support/navigation.js';
import { answers, rpc } from './support/rpc.js';
import { login } from './support/session.js';

// The `/` menu, the node selection and the drawer below the page need a desktop; narrow.spec.ts has the phone.
test.skip(({ isMobile }) => isMobile, 'Desktop: the keys and the drawer below the document.');

type Block = { id: string; type: string; props?: Record<string, unknown> };
const toast = (page: Page) => page.locator('.toast');

/** The document's id, from its address. */
const documentIdOf = (page: Page) => new URL(page.url()).pathname.split('/').at(-1) ?? '';

/** The embeds the server holds for the open document. */
async function savedEmbeds(page: Page) {
  const document = await rpc<{ content: Block[] }>(page, 'workspace/getDocument', { id: documentIdOf(page) });
  return document.content.filter((block) => block.type === 'taskEmbed' || block.type === 'drawingEmbed');
}

/** Waits until the autosave has brought the server to `count` embeds. */
const expectSavedEmbeds = (page: Page, count: number) =>
  expect.poll(async () => (await savedEmbeds(page)).length, { timeout: 10_000 }).toBe(count);

/** A task made over RPC in a project, as another tab would. */
async function rpcTask(page: Page, projectId: string, title: string) {
  return rpc<{ id: string; version: number }>(page, 'workspace/createTask', {
    requestId: crypto.randomUUID(),
    projectId,
    title,
  });
}

/** A new document with one line typed and saved; the caret stays at its end. */
async function writeDocument(page: Page, line: string) {
  await newDocument(page);
  await documentEditor(page).click();
  const saved = page.waitForResponse(
    (response) => answers(response, 'workspace/saveDocument') && response.status() === 200,
  );
  await page.keyboard.type(line);
  await saved;
}

test('/tarefa embeds a task found by the picker, the document’s project first, and the card follows the drawer', async ({
  page,
}) => {
  await login(page);
  // A word of this run only, so the other tests' tasks stay out of the list.
  const word = `contrato${Date.now().toString(36)}`;
  const elsewhere = await createProject(page, `Outro projeto ${Date.now()}`);
  await rpcTask(page, elsewhere, `Revisar ${word} de fora`);
  const here = await createProject(page, `Incorporar ${Date.now()}`);
  await rpcTask(page, here, `Revisar ${word} daqui`);
  await writeDocument(page, 'Plano da semana.');

  const picker = await slash(page, 'tarefa');
  await page.keyboard.type(word);
  // The document's project first; the other one after it, with its name on the right.
  const rows = picker.getByRole('menuitem');
  await expect(rows.nth(1)).toContainText(`Revisar ${word} daqui`);
  await expect(rows.nth(2)).toContainText(`Revisar ${word} de fora`);
  await expect(rows.nth(2)).toContainText('Outro projeto');
  for (let step = 0; step < 4 && (await rows.nth(1).getAttribute('data-focused')) === null; step += 1)
    await page.keyboard.press('ArrowDown');
  await expect(rows.nth(1)).toHaveAttribute('data-focused');
  await page.keyboard.press('Enter');
  const card = embedCard(page, `Revisar ${word} daqui`);
  await expect(card).toBeVisible();
  await expect(card).toContainText('A fazer');
  await expectSavedEmbeds(page, 1);
  expect((await savedEmbeds(page))[0]?.type).toBe('taskEmbed');

  // The card opens the drawer and says so; a change there shows on the card at once.
  await card.click();
  await expect(drawerOf(page, `Revisar ${word} daqui`)).toBeVisible();
  await expect(card).toContainText('aberta abaixo');
  await pressCommand(page, 'Enter');
  await expect(toast(page)).toContainText('Concluída');
  await expect(card).toContainText('Concluída');
  expect(currentProjectId(page)).toBe(here);
});

test('"Nova tarefa…" creates the task in the drawer and the card takes the line of the /', async ({ page }) => {
  await login(page);
  await createProject(page, `Nova pelo documento ${Date.now()}`);
  await writeDocument(page, 'Reunião com o fornecedor.');
  const picker = await slash(page, 'tarefa');
  await page.keyboard.press('ArrowDown');
  await expect(picker.getByRole('menuitem').first()).toHaveAttribute('data-focused');
  await page.keyboard.press('Enter');
  const form = newTaskDrawer(page);
  await expect(form.getByRole('textbox', { name: 'Título da nova tarefa' })).toBeFocused();
  await page.keyboard.type('Pedir orçamento');
  await page.keyboard.press('Enter');
  await expect(drawerOf(page, 'Pedir orçamento')).toBeVisible();
  await expect(embedCard(page, 'Pedir orçamento')).toBeVisible();
  // The empty line of the / became the card: the document has its paragraph and the embed only.
  await expect(documentEditor(page).locator('.bn-block-outer')).toHaveCount(3);
});

test('↵ after typing in the picker opens "Nova tarefa…" with the typed text as its title', async ({ page }) => {
  await login(page);
  await createProject(page, `Nova com o filtro ${Date.now()}`);
  await writeDocument(page, 'Combinar com o vizinho.');
  await slash(page, 'tarefa');
  const typed = `Muro do vizinho ${Date.now().toString(36)}`;
  await page.keyboard.type(typed);
  await page.keyboard.press('Enter');
  const title = newTaskDrawer(page).getByRole('textbox', { name: 'Título da nova tarefa' });
  await expect(title).toBeFocused();
  await expect(title).toHaveValue(typed);
});

test('↵ after typing an existing task’s title in the picker embeds that task, with no second one', async ({ page }) => {
  await login(page);
  const projectId = await createProject(page, `Título exato ${Date.now()}`);
  const word = `cerca${Date.now().toString(36)}`;
  await rpcTask(page, projectId, `Pintar a ${word} da Ação`);
  await writeDocument(page, 'Reforma do quintal.');
  const picker = await slash(page, 'tarefa');
  // Case and accents aside, as names compare.
  await page.keyboard.type(`pintar a ${word.toUpperCase()} da acao`);
  const row = picker.getByRole('menuitem').filter({ hasText: `Pintar a ${word} da Ação` });
  await expect(row).toContainText('↵');
  await page.keyboard.press('Enter');
  await expect(embedCard(page, `Pintar a ${word} da Ação`)).toBeVisible();
  await expect(newTaskDrawer(page)).toHaveCount(0);
  const found = await rpc<{ items: unknown[] }>(page, 'workspace/search', { query: word, types: ['task'] });
  expect(found.items).toHaveLength(1);
});

test('the arrows select a card: ↵ opens it, ⌫ removes it and the editor’s ⌘Z brings it back', async ({ page }) => {
  await login(page);
  const here = await createProject(page, `Teclas do card ${Date.now()}`);
  await rpcTask(page, here, 'Ligar para o banco');
  await writeDocument(page, 'Antes do card.');
  await pickEmbed(page, await slash(page, 'tarefa'), 'banco', 'Ligar para o banco');
  const card = embedCard(page, 'Ligar para o banco');
  await expect(card).toBeVisible();
  // The insertion is saved before the keys go on: the editor joins edits less than half a second apart in
  // one undo step, and a person's ⌫ comes later than that.
  await expectSavedEmbeds(page, 1);

  // From the text above, ↓ selects the card as a node, and ↵ opens it.
  await documentEditor(page).getByText('Antes do card.').click();
  await page.keyboard.press('ArrowDown');
  await expect(documentEditor(page).locator('.ProseMirror-selectednode .embed-card')).toHaveCount(1);
  await page.keyboard.press('Enter');
  await expect(drawerOf(page, 'Ligar para o banco')).toBeVisible();
  await drawer(page).getByRole('button', { name: 'Fechar a gaveta', exact: true }).click();

  await documentEditor(page).getByText('Antes do card.').click();
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Backspace');
  await expect(card).toHaveCount(0);
  await expectSavedEmbeds(page, 0);
  await editorUndo(page);
  await expect(card).toBeVisible();
  await expectSavedEmbeds(page, 1);
});

test('an embedded task in the trash offers Restaurar; one deleted for good, Remover with Desfazer', async ({
  page,
}) => {
  await login(page);
  const here = await createProject(page, `Indisponíveis ${Date.now()}`);
  const trashed = await rpcTask(page, here, 'Esboçar tela de boas-vindas');
  const purged = await rpcTask(page, here, 'Tarefa apagada de vez');
  await writeDocument(page, 'Itens que somem.');
  // Each embed leaves a paragraph after it, where ↓ goes on writing.
  await pickEmbed(page, await slash(page, 'tarefa'), 'boas-vindas', 'Esboçar tela de boas-vindas');
  await page.keyboard.press('ArrowDown');
  await pickEmbed(page, await slash(page, 'tarefa'), 'apagada', 'Tarefa apagada de vez');
  await expect(documentEditor(page).locator('.embed-card')).toHaveCount(2);

  // Another tab puts one in the trash and deletes the other for good.
  const edit = (task: { id: string; version: number }) => ({
    id: task.id,
    expectedVersion: task.version,
    requestId: crypto.randomUUID(),
  });
  await rpc(page, 'workspace/deleteTask', edit(trashed));
  await rpc(page, 'workspace/deleteTask', edit(purged));
  const inTrash = await rpc<{ version: number }>(page, 'workspace/getTask', { id: purged.id });
  await rpc(page, 'workspace/purgeTask', { ...edit(purged), expectedVersion: inTrash.version });
  await page.reload();

  const missing = documentEditor(page).locator('.embed-missing');
  await expect(missing.first()).toContainText('Na lixeira: Esboçar tela de boas-vindas');
  await expect(missing.last()).toContainText('Esta tarefa foi excluída.');
  await missing.first().getByRole('button', { name: 'Restaurar “Esboçar tela de boas-vindas”', exact: true }).click();
  await expect(toast(page)).toContainText('“Esboçar tela de boas-vindas” restaurado.');
  await expect(embedCard(page, 'Esboçar tela de boas-vindas')).toBeVisible();
  expect((await rpc<{ deletedAt: string | null }>(page, 'workspace/getTask', { id: trashed.id })).deletedAt).toBeNull();

  await missing.getByRole('button', { name: 'Remover a tarefa excluída', exact: true }).click();
  await expect(toast(page)).toContainText('Bloco removido do documento. O texto ao redor ficou como estava.');
  await expect(missing).toHaveCount(0);
  await expectSavedEmbeds(page, 1);
  await toast(page).getByRole('button', { name: 'Desfazer', exact: true }).click();
  await expect(missing).toContainText('Esta tarefa foi excluída.');
  await expectSavedEmbeds(page, 2);
});

test('/desenho embeds a drawing as a numbered figure, and "Novo desenho" makes one', async ({ page }) => {
  await login(page);
  const here = await createProject(page, `Figuras ${Date.now()}`);
  await rpc(page, 'workspace/createCanvas', {
    requestId: crypto.randomUUID(),
    projectId: here,
    title: 'Fluxo do autosave',
  });
  await writeDocument(page, 'Arquitetura.');
  await pickEmbed(page, await slash(page, 'desenho'), 'autosave', 'Fluxo do autosave');
  await expect(embedFigure(page, 'Fluxo do autosave')).toContainText('Figura 1 — Fluxo do autosave');

  await page.keyboard.press('ArrowDown');
  const second = await slash(page, 'desenho');
  await page.keyboard.press('ArrowDown');
  await expect(second.getByRole('menuitem').first()).toHaveAttribute('data-focused');
  await page.keyboard.press('Enter');
  await expect(toast(page)).toContainText('Desenho criado e incorporado.');
  await expect(documentEditor(page).locator('.embed-figure')).toHaveCount(2);
  await expect(documentEditor(page).locator('.embed-figure').last()).toContainText('Figura 2 — Sem título');
  await expect(documentEditor(page).locator('.embed-figure').last()).toContainText('Desenho vazio');
});

test('⌘K offers "Incorporar tarefa…" in the document, which opens the picker at the cursor', async ({ page }) => {
  await login(page);
  const here = await createProject(page, `Incorporar pelo ⌘K ${Date.now()}`);
  await rpcTask(page, here, 'Trocar a fechadura');
  await writeDocument(page, 'Portas.');
  await pressCommand(page, 'k');
  const palette = page.getByRole('dialog', { name: 'Buscar e comandar' });
  await expect(palette).toBeVisible();
  await page.keyboard.type('Incorporar tarefa');
  await expect(palette.getByRole('menuitem', { name: /Incorporar tarefa…/ })).toBeVisible();
  await page.keyboard.press('Enter');
  const picker = page.getByRole('menu', { name: 'Incorporar tarefa' });
  await expect(page.getByRole('searchbox', { name: 'Incorporar tarefa' })).toBeFocused();
  await pickEmbed(page, picker, 'fechadura', 'Trocar a fechadura');
  await expect(embedCard(page, 'Trocar a fechadura')).toBeVisible();
  await expectSavedEmbeds(page, 1);
});

test('the card follows the drawer’s labels and checklist, and names another project with its mark', async ({
  page,
}) => {
  await login(page);
  const word = `cartao${Date.now().toString(36)}`;
  const elsewhere = await createProject(page, `Outro projeto ${Date.now()}`);
  await rpcTask(page, elsewhere, `Comprar ${word}`);
  await createProject(page, `Card ao vivo ${Date.now()}`);
  await writeDocument(page, 'Compras.');
  await pickEmbed(page, await slash(page, 'tarefa'), word, `Comprar ${word}`);
  const card = embedCard(page, `Comprar ${word}`);
  await expect(card).toContainText('Outro projeto');
  await expect(card.locator('.project-mark')).toBeVisible();

  await card.click();
  const region = drawerOf(page, `Comprar ${word}`);
  await region.getByRole('button', { name: 'Adicionar etiqueta', exact: true }).click();
  await expect(page.getByRole('searchbox', { name: 'Buscar ou criar etiqueta' })).toBeFocused();
  await page.keyboard.type(word.slice(-6));
  await page.keyboard.press('Enter');
  await page.keyboard.press('Escape');
  await expect(card).toContainText(word.slice(-6));
  await region.getByRole('textbox', { name: 'Descrição da tarefa' }).click();
  await page.keyboard.type('[ ] Escolher a cor');
  await expect(card).toContainText('0/1');
});

test('figures renumber when a drawing moves above another', async ({ page }) => {
  await login(page);
  const here = await createProject(page, `Numeração ${Date.now()}`);
  for (const title of ['Primeira figura', 'Segunda figura'])
    await rpc(page, 'workspace/createCanvas', { requestId: crypto.randomUUID(), projectId: here, title });
  await writeDocument(page, 'Figuras.');
  await pickEmbed(page, await slash(page, 'desenho'), 'Primeira', 'Primeira figura');
  await page.keyboard.press('ArrowDown');
  await pickEmbed(page, await slash(page, 'desenho'), 'Segunda', 'Segunda figura');
  await expect(embedFigure(page, 'Segunda figura')).toContainText('Figura 2 — Segunda figura');
  // The second one, selected after its insertion, moves up a block at a time with the editor's keys.
  const moveUp = `${process.platform === 'darwin' ? 'Meta' : 'Control'}+Shift+ArrowUp`;
  for (let step = 0; step < 3; step += 1) await page.keyboard.press(moveUp);
  await expect(embedFigure(page, 'Segunda figura')).toContainText('Figura 1 — Segunda figura');
  await expect(embedFigure(page, 'Primeira figura')).toContainText('Figura 2 — Primeira figura');
});

test('a document of an archived project shows its embeds with no Restaurar or Remover', async ({ page }) => {
  await login(page);
  const here = await createProject(page, `Arquivado ${Date.now()}`);
  const task = await rpcTask(page, here, 'Tarefa que saiu');
  await rpc(page, 'workspace/deleteTask', {
    id: task.id,
    expectedVersion: task.version,
    requestId: crypto.randomUUID(),
  });
  const document = await rpc<{ id: string }>(page, 'workspace/createDocument', {
    requestId: crypto.randomUUID(),
    projectId: here,
    title: 'Documento guardado',
    content: [{ id: 'e1', type: 'taskEmbed', props: { taskId: task.id }, children: [] }],
  });
  const project = (await rpc<{ id: string; version: number }[]>(page, 'workspace/listProjects', {})).find(
    (each) => each.id === here,
  );
  await rpc(page, 'workspace/updateProject', {
    id: here,
    expectedVersion: project?.version,
    archived: true,
    requestId: crypto.randomUUID(),
  });
  await page.goto(`/projetos/${here}/documentos/${document.id}`);
  const missing = documentEditor(page).locator('.embed-missing');
  await expect(missing).toContainText('Na lixeira: Tarefa que saiu');
  await expect(missing.getByRole('button')).toHaveCount(0);
});

test('⌘C on a card copies its words and its link, and a paste in a description brings the link', async ({
  page,
  context,
}) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await login(page);
  const projectId = await createProject(page, `Copiar o card ${Date.now()}`);
  const task = await rpcTask(page, projectId, 'Card copiado');
  const { id } = await rpc<{ id: string }>(page, 'workspace/createDocument', {
    requestId: crypto.randomUUID(),
    projectId,
    title: 'Copiar',
    content: [
      { type: 'paragraph', content: [{ type: 'text', text: 'Antes', styles: {} }] },
      { type: 'taskEmbed', props: { taskId: task.id } },
      { type: 'paragraph', content: [{ type: 'text', text: 'Depois', styles: {} }] },
    ],
  });
  await page.goto(`/projetos/${projectId}/documentos/${id}`);
  await expect(embedCard(page, 'Card copiado')).toBeVisible();
  // What the copy hands the clipboard, read in the event itself: Markdown has no place in the async API.
  await page.evaluate(() =>
    document.addEventListener('copy', (event) => {
      const types = ['text/plain', 'text/html', 'text/markdown'];
      (window as unknown as { copied: string[] }).copied = types.map(
        (type) => event.clipboardData?.getData(type) ?? '',
      );
    }),
  );

  await clickText(page, 'Antes');
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('ControlOrMeta+c');
  const link = `${new URL(page.url()).origin}/tarefas/${task.id}`;
  const [plain, html, markdown] = await page.evaluate(() => (window as unknown as { copied: string[] }).copied);
  expect(plain).toBe('Tarefa: Card copiado (A fazer)');
  expect(html).toBe(`<p><a href="${link}">Tarefa: Card copiado (A fazer)</a></p>`);
  expect(markdown).toBe(`[Tarefa: Card copiado (A fazer)](${link})`);

  // The task's description has no embeds: the paste is the link, in a paragraph.
  await embedCard(page, 'Card copiado').click();
  const description = drawerOf(page, 'Card copiado').getByRole('textbox', { name: 'Descrição da tarefa' });
  await description.click();
  await page.keyboard.press('ControlOrMeta+v');
  await expect(description.getByRole('link', { name: 'Tarefa: Card copiado (A fazer)' })).toHaveAttribute('href', link);
});

test('a pasted embed with an ID the server refuses never lands, and the document saves with its cards', async ({
  page,
}) => {
  await login(page);
  const projectId = await createProject(page, `Colar forjado ${Date.now()}`);
  const task = await rpcTask(page, projectId, 'Card legítimo');
  const { id } = await rpc<{ id: string }>(page, 'workspace/createDocument', {
    requestId: crypto.randomUUID(),
    projectId,
    title: 'Colar',
    content: [
      { type: 'paragraph', content: [{ type: 'text', text: 'Linha antes', styles: {} }] },
      { type: 'taskEmbed', props: { taskId: task.id } },
      { type: 'paragraph', content: [{ type: 'text', text: 'Linha depois', styles: {} }] },
    ],
  });
  await page.goto(`/projetos/${projectId}/documentos/${id}`);
  await expect(embedCard(page, 'Card legítimo')).toBeVisible();
  // Another page the person copied from put BlockNote's own format on the clipboard, with an ID nobody issued.
  await page.evaluate(() =>
    document.addEventListener(
      'copy',
      (event) => {
        const forged = '<div data-content-type="taskEmbed" data-task-id="NOT-A-UUID"></div><p>Colado</p>';
        event.clipboardData?.setData('blocknote/html', forged);
        event.clipboardData?.setData('text/plain', 'Colado');
        event.preventDefault();
        event.stopImmediatePropagation();
      },
      { capture: true, once: true },
    ),
  );
  await clickText(page, 'Linha depois', 'end');
  await page.keyboard.press('ControlOrMeta+c');
  const saved = page.waitForResponse(
    (response) => answers(response, 'workspace/saveDocument') && response.status() === 200,
  );
  await page.keyboard.press('ControlOrMeta+v');
  await saved;
  await expect(documentEditor(page)).toContainText('Colado');
  await expect(documentEditor(page).locator('[data-content-type="taskEmbed"]')).toHaveCount(1);
  await expect(embedCard(page, 'Card legítimo')).toBeVisible();
  const content = (
    await rpc<{ content: { type: string; props?: { taskId?: string } }[] }>(page, 'workspace/getDocument', { id })
  ).content;
  expect(content.filter((block) => block.type === 'taskEmbed').map((block) => block.props?.taskId)).toEqual([task.id]);
});
