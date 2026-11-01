import { expect, type Page, test } from '@playwright/test';
import { documentEditor, embedFigure, pickEmbed, slash } from './support/document.js';
import { newDocument } from './support/items.js';
import { createProject } from './support/navigation.js';
import { answers, rpc } from './support/rpc.js';
import { login } from './support/session.js';

// The `/` menu and the figure's hover need a desktop; narrow.spec.ts has the phone.
test.skip(({ isMobile }) => isMobile, 'Desktop: the keys and the hover of the figure.');

/** A scene with one rectangle, as Excalidraw saves it. */
const scene = {
  appState: { viewBackgroundColor: '#ffffff' },
  elements: [
    {
      id: 'box',
      type: 'rectangle',
      x: 10,
      y: 20,
      width: 160,
      height: 80,
      angle: 0,
      strokeColor: '#1e1e1e',
      backgroundColor: 'transparent',
      fillStyle: 'hachure',
      strokeWidth: 1,
      strokeStyle: 'solid',
      roughness: 1,
      opacity: 100,
      groupIds: [],
      frameId: null,
      index: 'a0',
      roundness: { type: 3 },
      seed: 42,
      version: 1,
      versionNonce: 100,
      isDeleted: false,
      boundElements: null,
      updated: 1793275200000,
      link: null,
      locked: false,
    },
  ],
};

/** A drawing with the rectangle and no preview yet, as one made on another device whose tab closed early. */
async function rpcDrawing(page: Page, projectId: string, title: string) {
  return rpc<{ id: string }>(page, 'workspace/createCanvas', {
    requestId: crypto.randomUUID(),
    projectId,
    title,
    scene,
  });
}

/** Embeds a drawing by its title in a new document. */
async function embedInNewDocument(page: Page, filter: string, title: string) {
  await newDocument(page);
  await documentEditor(page).click();
  await page.keyboard.type('Arquitetura.');
  await pickEmbed(page, await slash(page, 'desenho'), filter, title);
  return embedFigure(page, title);
}

const isPreview = (url: string, id: string) => new URL(url).pathname === `/arquivos/desenhos/${id}/previa.png`;

test('a figure without a current preview makes one, shows it from the route and revalidates it by its tag', async ({
  page,
}) => {
  test.setTimeout(90_000);
  await login(page);
  const here = await createProject(page, `Prévias ${Date.now()}`);
  const drawing = await rpcDrawing(page, here, 'Fluxo do autosave');
  const uploaded = page.waitForResponse(
    (response) => answers(response, 'workspace/saveCanvasPreview') && response.status() === 200,
    { timeout: 30_000 },
  );
  const figure = await embedInNewDocument(page, 'autosave', 'Fluxo do autosave');
  await expect(figure).toContainText('Figura 1 — Fluxo do autosave');
  await uploaded;
  const image = figure.locator('img');
  await expect(image).toBeVisible();
  await expect.poll(() => image.evaluate((element: HTMLImageElement) => element.naturalWidth)).toBeGreaterThan(0);
  expect(new URL(await image.evaluate((element: HTMLImageElement) => element.src)).pathname).toBe(
    `/arquivos/desenhos/${drawing.id}/previa.png`,
  );
  expect((await rpc<{ previewCurrent: boolean }>(page, 'workspace/getCanvas', { id: drawing.id })).previewCurrent).toBe(
    true,
  );

  // Opened again, the browser asks with the tag it holds, and the figure keeps its image.
  const asked = page.waitForRequest((request) => isPreview(request.url(), drawing.id));
  await page.reload();
  const request = await asked;
  expect((await request.allHeaders())['if-none-match']).toBeTruthy();
  await expect(embedFigure(page, 'Fluxo do autosave').locator('img')).toBeVisible();
});

test('the figure turns with the dark theme, and a middle click opens the drawing in another tab', async ({
  page,
  context,
}) => {
  test.setTimeout(90_000);
  await page.emulateMedia({ colorScheme: 'dark' });
  await login(page);
  const here = await createProject(page, `Figura no escuro ${Date.now()}`);
  const drawing = await rpcDrawing(page, here, 'Planta do escritório');
  const figure = await embedInNewDocument(page, 'planta', 'Planta do escritório');
  const image = figure.locator('img');
  await expect(image).toBeVisible({ timeout: 30_000 });
  expect(await image.evaluate((element) => getComputedStyle(element).filter)).toContain('invert');

  const opened = context.waitForEvent('page');
  await figure.click({ button: 'middle' });
  const tab = await opened;
  await tab.waitForLoadState();
  expect(new URL(tab.url()).pathname).toBe(`/projetos/${here}/desenhos/${drawing.id}`);
  await tab.close();
  // The document stays where it was.
  await expect(figure).toBeVisible();
});
