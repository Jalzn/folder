import { writeFile } from 'node:fs/promises';
import { expect, type Page } from '@playwright/test';
import { test } from './fixtures.js';
import { closeDrawer, createInDrawer } from './support/board.js';
import { createTaskFromSelection } from './support/document.js';
import { createFolder, folderRow } from './support/folders.js';
import { moveToTrash, newDocument, newDrawing } from './support/items.js';
import { connectMcp, jsonOf, mcpStatus, textOf } from './support/mcp.js';
import { createProject, leaveItem, openListedItem, overviewAddress, projectAddress } from './support/navigation.js';
import { answers, rpc } from './support/rpc.js';
import { login } from './support/session.js';

const isMobile = (projectName: string) => projectName.includes('mobile');

/** Generates a token in the Perfil and returns its secret, leaving the "Token gerado" dialog open. */
async function generateToken(page: Page, name: string) {
  await page.goto('/perfil');
  await page.getByRole('button', { name: 'Gerar token', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Novo token' });
  await expect(dialog.getByRole('textbox', { name: /^Nome/ })).toBeFocused();
  await expect(dialog.getByRole('textbox', { name: /^Nome/ })).toHaveValue('Claude Code');
  await expect(dialog.getByRole('textbox', { name: /^Nome/ })).toHaveAttribute('autocomplete', 'off');
  await expect(dialog.getByRole('textbox', { name: /^Nome/ })).toHaveAttribute('data-1p-ignore', 'true');
  await dialog.getByRole('textbox', { name: /^Nome/ }).fill(name);
  const created = page.waitForResponse((response) => answers(response, 'auth/createAccessToken'));
  await dialog.getByRole('button', { name: 'Gerar', exact: true }).click();
  expect((await created).status()).toBe(200);
  const result = page.getByRole('dialog', { name: 'Token gerado' });
  const field = result.getByRole('textbox', { name: 'Token', exact: true });
  await expect(field).toBeFocused();
  const token = await field.inputValue();
  expect(token).toMatch(/^tf_mcp_[A-Za-z0-9_-]{43}$/);
  return { token, dialog: result };
}

async function closeTokenDialog(page: Page) {
  await page.getByRole('dialog', { name: 'Token gerado' }).getByRole('button', { name: 'Concluir' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
}

test('Perfil shows a new token once, copies it with the Claude Code command and lists it without the secret', async ({
  page,
  context,
  baseURL,
}, info) => {
  const name = `Claude Code — ${info.project.name}`;
  await login(page);
  const { token, dialog } = await generateToken(page, name);
  const command = dialog.locator('pre');
  await expect(command).toHaveText(
    `claude mcp add --transport http --scope user tinyfold ${new URL('/mcp', baseURL).href} --header "Authorization: Bearer ${token}"`,
  );
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  expect(await command.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true);
  await page.screenshot({ path: info.outputPath('perfil-token.png'), animations: 'disabled' });

  if (isMobile(info.project.name)) {
    // Phones often refuse clipboard writes: the text is selected for a manual copy instead.
    await page.evaluate(() => {
      navigator.clipboard.writeText = () => Promise.reject(new Error('Área de transferência indisponível.'));
    });
    await dialog.getByRole('button', { name: 'Copiar token' }).click();
    await expect(dialog.getByRole('status')).toHaveText('Selecione e copie manualmente.');
    await expect(dialog.getByRole('textbox', { name: 'Token', exact: true })).toBeFocused();
    expect(
      await dialog
        .getByRole('textbox', { name: 'Token', exact: true })
        .evaluate((field: HTMLInputElement) => field.value.slice(field.selectionStart ?? 0, field.selectionEnd ?? 0)),
    ).toBe(token);
    await dialog.getByRole('button', { name: 'Copiar comando' }).click();
    expect(await page.evaluate(() => window.getSelection()?.toString())).toContain(`Bearer ${token}`);
  } else {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await dialog.getByRole('button', { name: 'Copiar token' }).click();
    await expect(dialog.getByRole('status')).toHaveText('Token copiado.');
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(token);
    await dialog.getByRole('button', { name: 'Copiar comando' }).click();
    await expect(dialog.getByRole('status')).toHaveText('Comando copiado.');
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(await command.textContent());
  }

  // A stray click outside keeps the secret; Esc closes the dialog and discards it.
  await page.mouse.click(5, 5);
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole('button', { name: 'Copiar comando' })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Gerar token', exact: true })).toBeFocused();

  await page.reload();
  const row = page.getByRole('listitem').filter({ hasText: name });
  await expect(row).toBeVisible();
  await page.screenshot({ path: info.outputPath('perfil-tokens.png'), fullPage: true });
  await expect(row).toContainText(`${token.slice(0, 13)}…`);
  await expect(row).toContainText('Nunca usado');
  await expect(row).toContainText(/Criado em \d{2}\/\d{2}\/\d{4}/);
  await expect(page.locator('body')).not.toContainText(token);
  expect(
    await page.evaluate(() => JSON.stringify({ local: { ...localStorage }, session: { ...sessionStorage } })),
  ).not.toContain(token);

  await row.getByRole('button', { name: /^Revogar/ }).click();
  await page
    .getByRole('alertdialog', { name: `Revogar “${name}”?` })
    .getByRole('button', { name: 'Revogar token' })
    .click();
  await expect(page.getByText('Token revogado.')).toBeVisible();
  await expect(row).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Gerar token', exact: true })).toBeFocused();
  expect(await mcpStatus(baseURL as string, token)).toBe(401);
});

const canvasSaved = (page: Page) =>
  page.waitForResponse((response) => answers(response, 'workspace/saveCanvas') && response.status() === 200);

/** A document with a checklist and code, and a task created from its first sentence. */
async function createDocumentWithTask(page: Page, title: string, taskTitle: string) {
  await newDocument(page);
  await page.getByRole('textbox', { name: 'Título do documento' }).fill(title);
  const editor = page.getByTestId('document-content');
  await editor.click();
  await editor.pressSequentially('O acesso usa um token pessoal somente leitura.');
  await editor.press('Enter');
  await editor.pressSequentially('[ ] Revisar a prévia do desenho');
  await editor.press('Enter');
  await editor.press('Enter');
  await editor.pressSequentially('``` claude mcp list');
  await expect(editor.locator('[data-content-type="checkListItem"]')).toHaveCount(1);
  await expect(editor.locator('[data-content-type="codeBlock"]')).toHaveCount(1);
  await expect(page.getByText('Salvo', { exact: true })).toBeVisible();

  await editor.getByText('O acesso usa um token pessoal somente leitura.').click({ clickCount: 3 });
  await createTaskFromSelection(page);
  await createInDrawer(page, taskTitle);
  await closeDrawer(page);
  return page.url();
}

/** A drawing with a rectangle and a text joined by an arrow, drawn with the Excalidraw tools. */
async function createDrawing(page: Page, title: string, text: string) {
  await newDrawing(page);
  const surface = page.locator('.excalidraw canvas.interactive');
  await expect(surface).toBeVisible();
  let saved = canvasSaved(page);
  await page.getByRole('textbox', { name: 'Título do desenho' }).fill(title);
  await saved;
  const box = await surface.boundingBox();
  if (!box) throw new Error('Canvas surface has no dimensions.');
  const at = (x: number, y: number) => ({ x: box.x + box.width * x, y: box.y + box.height * y });
  const drag = async (tool: string, from: [number, number], to: [number, number]) => {
    await page.getByRole('radio', { name: tool, exact: true }).locator('..').click();
    saved = canvasSaved(page);
    await page.mouse.move(at(...from).x, at(...from).y);
    await page.mouse.down();
    await page.mouse.move(at(...to).x, at(...to).y, { steps: 8 });
    await page.mouse.up();
    await saved;
  };
  // Right of the desktop properties panel, which covers the left of the surface.
  await drag('Retângulo', [0.4, 0.45], [0.55, 0.6]);
  await page.getByRole('radio', { name: 'Texto', exact: true }).locator('..').click();
  await page.mouse.click(at(0.75, 0.5).x, at(0.75, 0.5).y);
  const input = page.locator('textarea.excalidraw-wysiwyg');
  await input.fill(text);
  saved = canvasSaved(page);
  await input.press('Escape');
  await saved;
  // From inside the rectangle to the text, so the arrow binds both.
  await drag('Flecha', [0.5, 0.52], [0.77, 0.51]);
  await expect(page.getByText('Salvo', { exact: true })).toBeVisible();
}

test('Claude Code reads what the interface created, never the trash, until the token is revoked', async ({
  page,
  baseURL,
}, info) => {
  test.setTimeout(120_000);
  const marker = `marco${info.project.name.replace(/\W/g, '')}${Date.now()}`;
  const name = `Leitura — ${info.project.name}`;
  await login(page);
  const { token } = await generateToken(page, name);
  await closeTokenDialog(page);
  const mcp = await connectMcp(baseURL as string, token);

  await page.goto('/');
  await expect(page).toHaveURL(projectAddress);
  const documentUrl = await createDocumentWithTask(page, `Plano ${marker}`, `Tarefa ${marker}`);
  await createDrawing(page, `Fluxo ${marker}`, 'Validar versão');

  // The browser uploads the preview after the last save; the image then matches the current scene.
  const drawingId = new URL(page.url()).pathname.split('/').at(-1);
  await expect
    .poll(async () => textOf(await mcp.call('read_drawing', { id: drawingId })), { timeout: 20_000 })
    .toMatch(/^Imagem: versão \d+ \(atual\)/m);
  const drawing = await mcp.call('read_drawing', { id: drawingId });
  expect(textOf(drawing)).toContain('Elementos ativos: 3 (1 retângulo, 1 seta, 1 texto)');
  expect(textOf(drawing)).toMatch(/^ {2}t1 texto "Validar versão"/m);
  expect(textOf(drawing)).toMatch(/^ {2}s1 seta: .+ → t1$/m);
  const image = drawing.content.find((block) => block.type === 'image');
  expect(image?.mimeType).toBe('image/png');
  const png = Buffer.from(image?.type === 'image' ? image.data : '', 'base64');
  expect(png.subarray(0, 8)).toEqual(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  expect(Math.max(png.readUInt32BE(16), png.readUInt32BE(20))).toBeLessThanOrEqual(1568);
  expect(png.byteLength).toBeLessThanOrEqual(256 * 1024);
  await writeFile(info.outputPath('previa-desenho.png'), png);
  await info.attach('read_drawing.txt', { body: textOf(drawing), contentType: 'text/plain' });

  type Found = { items: { type: string; id: string; title: string }[] };
  const found = jsonOf<Found>(await mcp.call('search', { query: marker }));
  expect(found.items.map((item) => item.type).sort()).toEqual(['document', 'drawing', 'task']);
  const documentId = found.items.find((item) => item.type === 'document')?.id;
  const taskId = found.items.find((item) => item.type === 'task')?.id;

  const document = textOf(await mcp.call('read_document', { id: documentId }));
  expect(document).toContain(`# Plano ${marker}`);
  expect(document).toContain(`"Tarefa ${marker}"`);
  expect(document).toContain('- [ ] Revisar a prévia do desenho');
  expect(document).toMatch(/```[a-z]*\nclaude mcp list\n```/);

  const task = textOf(await mcp.call('read_task', { id: taskId }));
  expect(task).toContain(`# Tarefa ${marker}\n`);
  expect(task).toContain(`\n- Origem: documento "Plano ${marker}" (id ${documentId})`);
  expect(task).toContain('\n  - Trecho: "O acesso usa um token pessoal somente leitura."\n');

  // list_tasks filters by column name, by its key: "a fazer" finds "A fazer".
  type Listed = { columns: { name: string }[]; tasks: { id: string; column: { name: string } }[] };
  const projectId = new URL(documentUrl).pathname.split('/')[2];
  const listed = jsonOf<Listed>(await mcp.call('list_tasks', { projectId, columns: ['a fazer'] }));
  expect(listed.columns.map((column) => column.name)).toContain('A fazer');
  expect(listed.tasks.find((each) => each.id === taskId)?.column.name).toBe('A fazer');
  const unknown = await mcp.call('list_tasks', { columns: ['Pronto'] });
  expect(unknown.isError).toBe(true);
  expect(textOf(unknown)).toContain('Coluna não encontrada: Pronto.');

  // Trash hides the document from every tool.
  await page.goto(documentUrl);
  await moveToTrash(page, 'documento');
  await expect(page).toHaveURL(overviewAddress);
  const afterTrash = jsonOf<Found>(await mcp.call('search', { query: marker }));
  expect(afterTrash.items.map((item) => item.type).sort()).toEqual(['drawing', 'task']);
  const trashed = await mcp.call('read_document', { id: documentId });
  expect(trashed.isError).toBe(true);
  expect(textOf(trashed)).toBe('Documento não encontrado ou na lixeira.');

  // The Perfil shows the use, and revoking cuts the next call.
  await page.goto('/perfil');
  const row = page.getByRole('listitem').filter({ hasText: name });
  // The last use is recorded at most once a minute.
  await expect(row).toContainText(/Último uso (agora|há 1 minuto)/);
  await row.getByRole('button', { name: /^Revogar/ }).click();
  await page.getByRole('alertdialog').getByRole('button', { name: 'Revogar token' }).click();
  await expect(row).toHaveCount(0);
  await expect(mcp.call('list_projects')).rejects.toThrow();
  expect(await mcpStatus(baseURL as string, token)).toBe(401);
  await mcp.close();
});

test('a drawing changed on another device gets a new preview when reopened, and a rename renders none', async ({
  page,
}, info) => {
  test.setTimeout(90_000);
  const title = `Prévia remota ${info.project.name} ${Date.now()}`;
  await login(page);
  await createDrawing(page, title, 'Antes');
  const id = new URL(page.url()).pathname.split('/').at(-1);
  if (!id) throw new Error('The item URL has no ID.');
  const read = () => rpc(page, 'workspace/getCanvas', { id });
  await expect.poll(async () => (await read()).previewCurrent, { timeout: 20_000 }).toBe(true);

  // Leave through an in-app link, then another device moves the rectangle.
  await leaveItem(page);
  const before = await read();
  const elements = before.scene.elements.map((element) =>
    element.type === 'rectangle'
      ? { ...element, x: Number(element.x) + 120, version: Number(element.version) + 1, versionNonce: 4242 }
      : element,
  );
  await rpc(page, 'workspace/saveCanvas', {
    id,
    title: before.title,
    scene: { ...before.scene, elements },
    expectedVersion: before.version,
    requestId: crypto.randomUUID(),
  });
  expect((await read()).previewCurrent).toBe(false);

  // The editor's data stays fresh for 10 s; reopening after that refetches it without a page load.
  await page.waitForTimeout(10_500);
  await openListedItem(page, title);
  await expect
    .poll(
      async () => {
        const drawing = await read();
        return drawing.previewCurrent && drawing.previewVersion === before.version + 1;
      },
      { timeout: 20_000 },
    )
    .toBe(true);

  // A new title keeps the scene, so the stored preview stays current and nothing is rendered again.
  let uploads = 0;
  page.on('request', (request) => {
    if (new URL(request.url()).pathname === '/rpc/workspace/saveCanvasPreview') uploads += 1;
  });
  const renamed = page.waitForResponse((response) => answers(response, 'workspace/saveCanvas'));
  await page.getByRole('textbox', { name: 'Título do desenho' }).fill(`${title} renomeado`);
  await renamed;
  await page.waitForTimeout(3_000);
  expect(uploads).toBe(0);
  expect(await read()).toMatchObject({ version: before.version + 2, previewCurrent: true });
});

test(
  'Claude Code searches one folder of what the interface filed there',
  { tag: '@desktop' },
  async ({ page, baseURL }, info) => {
    const marker = `pasta${Date.now()}`;
    await login(page);
    const { token } = await generateToken(page, `Pastas — ${info.project.name}`);
    await closeTokenDialog(page);
    const mcp = await connectMcp(baseURL as string, token);
    await page.goto('/');
    const projectId = await createProject(page, `MCP ${marker}`);
    const folderId = await createFolder(page, 'Leituras');
    // Its "+" creates the document inside it; the other one stays at the root.
    await folderRow(page, 'Leituras').hover();
    await page.getByRole('button', { name: 'Novo em Leituras', exact: true }).click();
    await page.getByRole('menuitem', { name: 'Documento', exact: true }).click();
    await page.getByRole('textbox', { name: 'Título do documento' }).fill(`Dentro ${marker}`);
    await expect(page.getByText('Salvo', { exact: true })).toBeVisible();
    await rpc(page, 'workspace/createDocument', { requestId: crypto.randomUUID(), projectId, title: `Fora ${marker}` });

    type Found = { items: { title: string; folder: { id: string; name: string } | null }[] };
    const all = jsonOf<Found>(await mcp.call('search', { query: marker }));
    expect(all.items.map((item) => item.title).sort()).toEqual([`Dentro ${marker}`, `Fora ${marker}`]);
    const inFolder = jsonOf<Found>(await mcp.call('search', { query: marker, folderId }));
    expect(inFolder.items).toEqual([
      expect.objectContaining({ title: `Dentro ${marker}`, folder: { id: folderId, name: 'Leituras' } }),
    ]);
    await mcp.close();
  },
);

test('Claude Code reads the tasks a document embeds as links, and follows one to read_task', async ({
  page,
  baseURL,
}, info) => {
  const mark = `incorporada${info.project.name.replace(/\W/g, '')}${Date.now().toString(36)}`;
  await login(page);
  const { token } = await generateToken(page, `Incorporados — ${info.project.name}`);
  await closeTokenDialog(page);
  const mcp = await connectMcp(baseURL as string, token);
  await page.goto('/');
  await expect(page).toHaveURL(projectAddress);
  const projectId = new URL(page.url()).pathname.split('/')[2] as string;
  const task = await rpc(page, 'workspace/createTask', {
    requestId: crypto.randomUUID(),
    projectId,
    title: `Tarefa ${mark}`,
  });
  // As the interface saves a document with a card: an embed block with the task's ID.
  const document = await rpc(page, 'workspace/createDocument', {
    requestId: crypto.randomUUID(),
    projectId,
    title: `Plano ${mark}`,
    content: [
      { id: 'p1', type: 'paragraph', props: {}, content: [{ type: 'text', text: 'Antes.', styles: {} }], children: [] },
      { id: 'e1', type: 'taskEmbed', props: { taskId: task.id }, children: [] },
    ],
  });

  const read = textOf(await mcp.call('read_document', { id: document.id }));
  expect(read).toContain(`[Tarefa: Tarefa ${mark} (A fazer)](tinyfold:task/${task.id})`);
  const followed = textOf(await mcp.call('read_task', { id: task.id }));
  expect(followed).toContain(`Tarefa ${mark}`);
  await mcp.close();
});
