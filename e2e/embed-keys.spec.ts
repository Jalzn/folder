import { expect, type Page, test } from '@playwright/test';
import { clickText, documentEditor } from './support/document.js';
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
const textOf = (block: Block) =>
  Array.isArray(block.content) ? block.content.map((each: { text?: string }) => each.text ?? '').join('') : '';

/** A task of the project, made over RPC. */
const task = async (page: Page, projectId: string, title: string) =>
  (await rpc<{ id: string }>(page, 'workspace/createTask', { requestId: crypto.randomUUID(), projectId, title })).id;

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
