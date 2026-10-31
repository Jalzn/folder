import { readFile } from 'node:fs/promises';
import { type BrowserContext, expect, type Page, test } from '@playwright/test';
import { moveToTrash, newDrawing } from './support/items.js';
import { overviewAddress, searchProject } from './support/navigation.js';
import { answers } from './support/rpc.js';
import { E2E_PASSWORD, login } from './support/session.js';

const titleField = (page: Page) => page.getByRole('textbox', { name: 'Título do desenho' });

async function createCanvas(page: Page, title: string) {
  await newDrawing(page);
  await saveTitle(page, title);
  return page.url();
}

async function saveTitle(page: Page, title: string) {
  const saved = page.waitForResponse(
    (response) =>
      answers(response, 'workspace/saveCanvas') &&
      response.status() === 200 &&
      Boolean(response.request().postData()?.includes(title)),
  );
  await titleField(page).fill(title);
  await saved;
  await expect(page.getByText('Salvo', { exact: true })).toBeVisible();
}

async function drawRectangle(page: Page) {
  const surface = page.locator('.excalidraw canvas.interactive');
  await expect(surface).toBeVisible();
  await page.getByRole('radio', { name: 'Retângulo', exact: true }).locator('..').click();
  const box = await surface.boundingBox();
  if (!box) throw new Error('Canvas surface has no dimensions.');
  const saved = page.waitForResponse(
    (response) => answers(response, 'workspace/saveCanvas') && response.status() === 200,
  );
  await page.mouse.move(box.x + box.width * 0.35, box.y + box.height * 0.45);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.7, box.y + box.height * 0.65, { steps: 8 });
  await page.mouse.up();
  await saved;
  await expect(page.getByText('Salvo', { exact: true })).toBeVisible();
}

async function drawText(page: Page, text: string) {
  await page.getByRole('radio', { name: 'Texto', exact: true }).locator('..').click();
  const box = await page.locator('.excalidraw canvas.interactive').boundingBox();
  if (!box) throw new Error('Canvas surface has no dimensions.');
  await page.mouse.click(box.x + box.width * 0.4, box.y + box.height * 0.3);
  const input = page.locator('textarea.excalidraw-wysiwyg');
  await expect(input).toBeVisible();
  await input.fill(text);
  const saved = page.waitForResponse(
    (response) =>
      answers(response, 'workspace/saveCanvas') &&
      response.status() === 200 &&
      Boolean(response.request().postData()?.includes(text)),
  );
  await input.press('Escape');
  await saved;
  await expect(page.getByText('Salvo', { exact: true })).toBeVisible();
}

async function drawStroke(page: Page, touch = false) {
  await page.getByRole('radio', { name: 'Desenhar', exact: true }).locator('..').click();
  const box = await page.locator('.excalidraw canvas.interactive').boundingBox();
  if (!box) throw new Error('Canvas surface has no dimensions.');
  const saved = page.waitForResponse(
    (response) => answers(response, 'workspace/saveCanvas') && response.status() === 200,
  );
  if (touch) {
    const session = await page.context().newCDPSession(page);
    const point = (x: number, y: number) => [
      { x: box.x + box.width * x, y: box.y + box.height * y, id: 1, force: 0.5 },
    ];
    try {
      await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: point(0.55, 0.75) });
      for (let index = 1; index <= 12; index += 1) {
        await session.send('Input.dispatchTouchEvent', {
          type: 'touchMove',
          touchPoints: point(0.55 + index / 48, 0.75 + Math.sin((index / 12) * Math.PI) * 0.05),
        });
      }
      await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    } finally {
      await session.detach();
    }
  } else {
    await page.mouse.move(box.x + box.width * 0.55, box.y + box.height * 0.75);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width * 0.65, box.y + box.height * 0.8, { steps: 6 });
    await page.mouse.move(box.x + box.width * 0.8, box.y + box.height * 0.75, { steps: 6 });
    await page.mouse.up();
  }
  await saved;
  await expect(page.getByText('Salvo', { exact: true })).toBeVisible();
}

async function exportDrawing(page: Page) {
  await page.getByRole('button', { name: 'Opções do desenho', exact: true }).click();
  const download = page.waitForEvent('download');
  await page.getByRole('menuitem', { name: 'Exportar desenho editável', exact: true }).click();
  const file = await download;
  expect(file.suggestedFilename()).toMatch(/\.excalidraw$/);
  const path = await file.path();
  if (!path) throw new Error('Drawing download was not saved.');
  const buffer = await readFile(path);
  return { buffer, data: JSON.parse(buffer.toString()) as { elements: { type: string; isDeleted?: boolean }[] } };
}

test('draw, reload, export PNG and round-trip an editable drawing with local fonts', async ({ page }, info) => {
  const importedTitle = `Fluxo reimportado ${info.project.name} ${Date.now()}`;
  const policyErrors: string[] = [];
  const fontRequests: string[] = [];
  const editorRequests: string[] = [];
  page.on('console', (message) => {
    if (message.text().includes('Content Security Policy')) policyErrors.push(message.text());
  });
  page.on('request', (request) => {
    if (request.url().includes('/excalidraw/fonts/')) fontRequests.push(request.url());
    if (/\/DrawingPage-[^/]+\.js/.test(request.url())) editorRequests.push(request.url());
  });
  await login(page);
  expect(editorRequests).toEqual([]);
  const original = await createCanvas(page, `Fluxo ${info.project.name} ${Date.now()}`);
  await drawRectangle(page);
  await drawText(page, 'Roteiro visual pesquisavel');
  await drawStroke(page, info.project.name === 'chrome-mobile');
  const before = await exportDrawing(page);
  expect(before.data.elements.some((element) => element.type === 'rectangle' && !element.isDeleted)).toBe(true);
  expect(before.data.elements.some((element) => element.type === 'freedraw' && !element.isDeleted)).toBe(true);
  await page.reload();
  await expect(page.getByTestId('canvas-editor')).toBeVisible();
  expect((await exportDrawing(page)).data.elements).toEqual(before.data.elements);
  await page.getByRole('button', { name: 'Opções do desenho', exact: true }).click();
  const pngDownload = page.waitForEvent('download');
  await page.getByRole('menuitem', { name: 'Exportar PNG', exact: true }).click();
  const png = await pngDownload;
  expect(png.suggestedFilename()).toMatch(/\.png$/);
  const pngPath = await png.path();
  expect(pngPath).not.toBeNull();
  expect((await readFile(pngPath as string)).subarray(0, 8)).toEqual(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  await page.getByLabel('Importar arquivo Excalidraw').setInputFiles({
    name: `${importedTitle}.excalidraw`,
    mimeType: 'application/json',
    buffer: before.buffer,
  });
  await expect(page).not.toHaveURL(original);
  await expect(titleField(page)).toHaveValue(importedTitle);
  const titleBounds = await titleField(page).boundingBox();
  // Below 720 px the page's actions live in the top bar, the page's only bar.
  const bar = info.project.name === 'chrome-mobile' ? '.top-bar' : '.page-frame__bar';
  const toolbarBounds = await page.locator(bar).boundingBox();
  expect(titleBounds).not.toBeNull();
  expect(toolbarBounds).not.toBeNull();
  expect(titleBounds?.y ?? 0).toBeGreaterThanOrEqual((toolbarBounds?.y ?? 0) + (toolbarBounds?.height ?? 0));
  expect((await exportDrawing(page)).data.elements).toEqual(before.data.elements);
  await page.screenshot({ path: info.outputPath('canvas-editor.png'), fullPage: true });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(policyErrors).toEqual([]);
  expect(editorRequests.length).toBeGreaterThan(0);
  expect(fontRequests.length).toBeGreaterThan(0);
  expect(fontRequests.every((url) => new URL(url).origin === new URL(page.url()).origin)).toBe(true);
  const results = await searchProject(page, 'Roteiro visual pesquisavel');
  await expect(results.getByRole('link').filter({ hasText: importedTitle })).toBeVisible();
});

test('lost save response reuses the exact request and preserves newer edits', async ({ page }, info) => {
  await login(page);
  await createCanvas(page, `Antes do reenvio ${info.project.name} ${Date.now()}`);
  let first = true;
  const requests: string[] = [];
  await page.route('**/rpc/workspace/saveCanvas', async (route) => {
    requests.push(route.request().postData() ?? '');
    if (first) {
      first = false;
      expect((await route.fetch()).status()).toBe(200);
      await route.abort('failed');
    } else await route.continue();
  });
  await titleField(page).fill('Versao cujo retorno foi perdido');
  await expect(page.getByRole('button', { name: 'Tentar salvar', exact: true })).toBeVisible();
  await titleField(page).fill('Versao mais nova preservada');
  await page.getByRole('button', { name: 'Tentar salvar', exact: true }).click();
  await expect(page.getByText('Salvo', { exact: true })).toBeVisible();
  expect(requests).toHaveLength(3);
  expect(requests[0]).toBe(requests[1]);
  expect(requests[2]).toContain('Versao mais nova preservada');
  await page.reload();
  await expect(titleField(page)).toHaveValue('Versao mais nova preservada');
});

test('reload recovers a failed canvas draft without losing the server scene', async ({ page }, info) => {
  await login(page);
  await createCanvas(page, `Rascunho ${info.project.name} ${Date.now()}`);
  await drawRectangle(page);
  const scene = (await exportDrawing(page)).data.elements;
  await page.route('**/rpc/workspace/saveCanvas', (route) => route.abort('failed'));
  await titleField(page).fill('Rascunho de desenho recuperado');
  await expect(page.getByRole('button', { name: 'Tentar salvar', exact: true })).toBeVisible();
  await page.reload();
  await expect(titleField(page)).toHaveValue('Rascunho de desenho recuperado');
  expect((await exportDrawing(page)).data.elements).toEqual(scene);
  await page.unroute('**/rpc/workspace/saveCanvas');
  const retry = page.getByRole('button', { name: 'Tentar salvar', exact: true });
  await expect(retry).toBeVisible();
  await retry.click();
  await expect(page.getByText('Salvo', { exact: true })).toBeVisible();
  await page.reload();
  await expect(titleField(page)).toHaveValue('Rascunho de desenho recuperado');
});

test('independent sessions preserve a conflicting drawing as a separate copy', async ({ page, browser }, info) => {
  await login(page);
  const original = await createCanvas(page, `Conflito ${info.project.name} ${Date.now()}`);
  await drawRectangle(page);
  const scene = (await exportDrawing(page)).data.elements;
  const otherContext: BrowserContext = await browser.newContext({ baseURL: new URL(page.url()).origin });
  let release = () => {};
  try {
    const other = await otherContext.newPage();
    await login(other, { independent: true });
    await other.goto(original);
    await expect(titleField(other)).toBeVisible();
    let announce = () => {};
    const intercepted = new Promise<void>((resolve) => {
      announce = resolve;
    });
    const held = new Promise<void>((resolve) => {
      release = resolve;
    });
    await other.route('**/rpc/workspace/saveCanvas', async (route) => {
      announce();
      await held;
      await route.continue();
    });
    await titleField(other).fill('Minha variacao do desenho');
    await intercepted;
    await saveTitle(page, 'Versao principal do desenho');
    release();
    await expect(other.getByRole('button', { name: 'Salvar meu rascunho como cópia', exact: true })).toBeVisible();
    await other.getByRole('button', { name: 'Salvar meu rascunho como cópia', exact: true }).click();
    await expect(other).not.toHaveURL(original);
    await expect(titleField(other)).toHaveValue('Minha variacao do desenho — cópia');
    expect((await exportDrawing(other)).data.elements).toEqual(scene);
    await page.reload();
    await expect(titleField(page)).toHaveValue('Versao principal do desenho');
    await other.screenshot({ path: info.outputPath('canvas-conflito-copia.png'), fullPage: true });
  } finally {
    release();
    await otherContext.unrouteAll({ behavior: 'ignoreErrors' });
    await otherContext.close();
  }
});

test('unsupported media import preserves the open drawing and its editable export', async ({ page }, info) => {
  await login(page);
  const title = `Sem imagens ${info.project.name} ${Date.now()}`;
  const original = await createCanvas(page, title);
  await drawRectangle(page);
  const before = await exportDrawing(page);
  await page.getByLabel('Importar arquivo Excalidraw').setInputFiles({
    name: 'imagem.excalidraw',
    mimeType: 'application/json',
    buffer: Buffer.from(
      JSON.stringify({ type: 'excalidraw', version: 2, elements: [{ id: 'image', type: 'image' }], files: {} }),
    ),
  });
  await expect(page.getByRole('alert').filter({ hasText: /\S/ }).first()).toBeVisible();
  await expect(page).toHaveURL(original);
  await expect(titleField(page)).toHaveValue(title);
  expect((await exportDrawing(page)).data.elements).toEqual(before.data.elements);
});

test('expired session keeps the canvas draft through login and retry', async ({ page, context }, info) => {
  await login(page);
  await createCanvas(page, `Sessao ${info.project.name} ${Date.now()}`);
  await context.clearCookies();
  await titleField(page).fill('Desenho preservado durante novo login');
  const dialog = page.getByRole('dialog', { name: 'Vamos continuar?' });
  await expect(dialog).toBeVisible();
  await expect(titleField(page)).toHaveValue('Desenho preservado durante novo login');
  await dialog.getByLabel('Sua senha').fill(E2E_PASSWORD);
  await dialog.getByRole('button', { name: 'Entrar no Tinyfold' }).click();
  await expect(dialog).not.toBeVisible();
  await page.getByRole('button', { name: 'Tentar salvar', exact: true }).click();
  await expect(page.getByText('Salvo', { exact: true })).toBeVisible();
  await page.reload();
  await expect(titleField(page)).toHaveValue('Desenho preservado durante novo login');
});

test('a duplicated canvas tab keeps its own failed draft after the original saves', async ({ page, context }, info) => {
  await login(page);
  const original = await createCanvas(page, `Abas ${info.project.name} ${Date.now()}`);
  const inherited = await page.evaluate(() => Object.fromEntries(Object.entries(sessionStorage)));
  const duplicate = await context.newPage();
  await duplicate.goto('/health');
  await duplicate.evaluate((values) => {
    for (const [key, value] of Object.entries(values)) sessionStorage.setItem(key, value);
  }, inherited);
  await duplicate.goto(original);
  await expect(titleField(duplicate)).toBeVisible();
  await duplicate.route('**/rpc/workspace/saveCanvas', (route) => route.abort('failed'));
  await titleField(duplicate).fill('Rascunho exclusivo da aba de desenho');
  await expect(duplicate.getByText('Não salvo', { exact: true })).toBeVisible();
  await saveTitle(page, 'Desenho confirmado na aba original');
  await duplicate.reload();
  await expect(titleField(duplicate)).toHaveValue('Rascunho exclusivo da aba de desenho');
  await expect(titleField(page)).toHaveValue('Desenho confirmado na aba original');
  await duplicate.unrouteAll({ behavior: 'ignoreErrors' });
  await duplicate.close({ runBeforeUnload: false });
});

test('a remote deletion leaves the local draft available for recovery as a copy', async ({ page, context }, info) => {
  await login(page);
  const original = await createCanvas(page, `Exclusao remota ${info.project.name} ${Date.now()}`);
  await drawRectangle(page);
  const scene = (await exportDrawing(page)).data.elements;
  await page.route('**/rpc/workspace/saveCanvas', (route) => route.abort('failed'));
  await titleField(page).fill('Rascunho mantido apos exclusao remota');
  await expect(page.getByText('Não salvo', { exact: true })).toBeVisible();
  const other = await context.newPage();
  await other.goto(original);
  await expect(titleField(other)).toBeVisible();
  await moveToTrash(other, 'desenho');
  await expect(other).toHaveURL(overviewAddress);
  await page.unroute('**/rpc/workspace/saveCanvas');
  await page.reload();
  await expect(titleField(page)).toHaveValue('Rascunho mantido apos exclusao remota');
  await page.getByRole('button', { name: 'Salvar meu rascunho como cópia', exact: true }).click();
  await expect(page).not.toHaveURL(original);
  await expect(titleField(page)).toHaveValue('Rascunho mantido apos exclusao remota — cópia');
  expect((await exportDrawing(page)).data.elements).toEqual(scene);
  await other.close();
});
