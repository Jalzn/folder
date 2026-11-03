import { readFile } from 'node:fs/promises';
import { expect, type Page } from '@playwright/test';
import { test } from './fixtures.js';
import { newDocument } from './support/items.js';
import { answers } from './support/rpc.js';
import { login } from './support/session.js';

const sourceInput = (page: Page) => page.locator('.bn-preview-with-source-popup[data-open="true"] code[aria-label]');

async function startDocument(page: Page, title: string) {
  await login(page);
  await newDocument(page);
  await page.getByRole('textbox', { name: 'Título do documento' }).fill(title);
  await expect(page.getByText('Salvo', { exact: true })).toBeVisible();
}

/**
 * Replaces the open source. The popup puts the editor's caret at the end of the source as it opens, and the
 * editor settles its selection in a later frame; a fill that selected the old text before that would be
 * collapsed to the end and append. So the fill waits for the caret to be in the source, and is done again if
 * the editor still moved it.
 */
async function editFormula(page: Page, latex: string) {
  await expect(sourceInput(page)).toBeVisible();
  await expect
    .poll(() =>
      sourceInput(page).evaluate((code) => {
        const selection = document.getSelection();
        return Boolean(selection?.anchorNode && code.contains(selection.anchorNode));
      }),
    )
    .toBe(true);
  const saved = page.waitForResponse(
    (response) => answers(response, 'workspace/saveDocument') && response.status() === 200,
  );
  await expect(async () => {
    await sourceInput(page).fill(latex);
    await expect(sourceInput(page)).toHaveText(latex, { timeout: 1000 });
  }).toPass();
  await page.getByRole('button', { name: 'OK', exact: true }).click();
  await saved;
  await expect(page.getByText('Salvo', { exact: true })).toBeVisible();
}

async function exportMarkdown(page: Page) {
  await page.getByRole('button', { name: 'Opções do documento' }).click();
  const downloaded = page.waitForEvent('download');
  await page.getByRole('menuitem', { name: 'Exportar Markdown' }).click();
  const path = await (await downloaded).path();
  if (!path) throw new Error('Markdown download was not saved.');
  return readFile(path, 'utf8');
}

test('insert a display equation from the menu, recover invalid LaTeX and edit after reload', async ({ page }, info) => {
  const policyErrors: string[] = [];
  page.on('console', (message) => {
    if (message.text().includes('Content Security Policy')) policyErrors.push(message.text());
  });
  await startDocument(page, `Equações ${info.project.name}`);
  await page.getByTestId('document-content').pressSequentially('/equacao');
  await page
    .getByRole('option')
    .filter({ has: page.getByText('Equação', { exact: true }) })
    .click();
  await expect(sourceInput(page)).toBeVisible();
  await editFormula(page, '\\frac{a}{b} + \\sqrt{x}');
  const block = page.locator('[data-content-type="mathBlock"]');
  await expect(block.locator('.katex')).toBeVisible();
  await page.reload();
  await expect(block.locator('.katex')).toBeVisible();
  await block.locator('.bn-preview-container').click();
  await expect(sourceInput(page)).toHaveText('\\frac{a}{b} + \\sqrt{x}');
  await editFormula(page, '\\frac{');
  await expect(page.getByText('Equação inválida (clique para editar)', { exact: true })).toBeVisible();
  await page.reload();
  await page.getByText('Equação inválida (clique para editar)', { exact: true }).click();
  await expect(sourceInput(page)).toHaveText('\\frac{');
  await editFormula(page, '\\int_0^1 x^2\\,dx = \\frac{1}{3}');
  await expect(block.locator('.katex')).toBeVisible();
  await page.screenshot({ path: info.outputPath('equacao-bloco.png'), fullPage: true });
  expect(await exportMarkdown(page)).toContain('$$\n\\int_0^1 x^2\\,dx = \\frac{1}{3}\n$$');
  expect(policyErrors).toEqual([]);
});

test('insert inline math, replace its source with the keyboard and cancel safely', async ({ page }, info) => {
  await startDocument(page, `Matemática em linha ${info.project.name}`);
  const editor = page.getByTestId('document-content');
  await editor.pressSequentially('A energia pode ser descrita assim: /equacao');
  await page
    .getByRole('option')
    .filter({ has: page.getByText('Equação em linha', { exact: true }) })
    .click();
  const popup = page.getByRole('dialog', { name: 'Equação em linha' });
  const input = page.getByRole('textbox', { name: 'Código LaTeX' });
  await expect(popup).toBeVisible();
  await expect(input).toBeFocused();
  const bounds = await popup.boundingBox();
  expect(bounds).not.toBeNull();
  expect((bounds?.x ?? -1) >= 0).toBe(true);
  expect((bounds?.x ?? 0) + (bounds?.width ?? 0)).toBeLessThanOrEqual(page.viewportSize()?.width ?? 0);
  await input.fill('E = mc^2');
  await page.getByRole('button', { name: 'Salvar equação' }).click();
  await expect(popup).not.toBeVisible();
  await expect(page.getByText('Salvo', { exact: true })).toBeVisible();
  await page.reload();
  await expect(editor.locator('.katex')).toBeVisible();
  await expect(editor).toContainText('A energia pode ser descrita assim:');
  await editor.locator('[data-inline-content-type="math"] .bn-preview-container').click();
  await expect(input).toHaveValue('E = mc^2');
  const reopenedBounds = await popup.boundingBox();
  expect(reopenedBounds).not.toBeNull();
  expect((reopenedBounds?.x ?? 0) + (reopenedBounds?.width ?? 0)).toBeLessThanOrEqual(page.viewportSize()?.width ?? 0);
  await input.press('ControlOrMeta+A');
  await input.pressSequentially('E = mc^{2}', { delay: 40 });
  await expect(input).toHaveValue('E = mc^{2}');
  await page.screenshot({ path: info.outputPath('equacao-linha-dialogo.png'), fullPage: true, animations: 'disabled' });
  await page.getByRole('button', { name: 'Salvar equação' }).click();
  await expect(page.getByText('Salvo', { exact: true })).toBeVisible();
  await page.reload();
  await editor.getByRole('button', { name: 'Editar equação em linha' }).click();
  await expect(input).toHaveValue('E = mc^{2}');
  await input.fill('discard this draft');
  await page.getByRole('button', { name: 'Cancelar' }).click();
  expect(await exportMarkdown(page)).toContain('$E = mc^{2}$');
  await page.screenshot({ path: info.outputPath('equacao-linha.png'), fullPage: true });
  await editor.getByRole('button', { name: 'Editar equação em linha' }).click();
  await input.fill(`\\underbrace{${'a+'.repeat(60)}b}_{\\text{long formula}}`);
  await page.getByRole('button', { name: 'Salvar equação' }).click();
  await expect(page.getByText('Salvo', { exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
    page.viewportSize()?.width ?? 0,
  );
  await editor.press(process.platform === 'darwin' ? 'Meta+ArrowDown' : 'Control+End');
  await editor.press('Enter');
  await editor.pressSequentially('Atalho $x^2$ e texto.', { delay: 20 });
  await expect(editor.locator('[data-inline-content-type="math"]')).toHaveCount(2);
  await expect(editor).toContainText(' e texto.');
  await expect(page.getByText('Salvo', { exact: true })).toBeVisible();
  await page.reload();
  const shortcutEquation = editor.locator('[data-inline-content-type="math"]').filter({
    has: page.locator('annotation[encoding="application/x-tex"]').filter({ hasText: /^x\^2\s*$/ }),
  });
  await expect(shortcutEquation).toHaveCount(1);
  await shortcutEquation.getByRole('button', { name: 'Editar equação em linha' }).click();
  await expect(input).toHaveValue(/x\^2\s*/);
  await input.fill('\\frac{');
  await page.getByRole('button', { name: 'Salvar equação' }).click();
  await expect(page.getByText('Salvo', { exact: true })).toBeVisible();
  await page.reload();
  await editor
    .getByRole('button', { name: 'Editar equação em linha' })
    .filter({ hasText: 'Equação inválida (clique para editar)' })
    .click();
  await expect(input).toHaveValue('\\frac{');
  await page.getByRole('button', { name: 'Cancelar' }).click();
  expect(await exportMarkdown(page)).toContain('$\\frac{$');
});

test('Markdown math round-trips without converting code or dropping invalid source', async ({ page }, info) => {
  await startDocument(page, `Importação ${info.project.name}`);
  const markdown = String.raw`# Matemática

Fórmula em linha: $e^{i\pi} + 1 = 0$.

$$
\begin{pmatrix}1 & 2 \\ 3 & 4\end{pmatrix}
$$

$$
\frac{
$$

~~~text
$nao_e_equacao$
~~~
`;
  await page.getByLabel('Importar arquivo Markdown').setInputFiles({
    name: 'Matematica.md',
    mimeType: 'text/markdown',
    buffer: Buffer.from(markdown),
  });
  await expect(page.getByRole('textbox', { name: 'Título do documento' })).toHaveValue('Matematica');
  const editor = page.getByTestId('document-content');
  await expect(editor.locator('.katex')).toHaveCount(2);
  await expect(editor.getByText('Equação inválida (clique para editar)', { exact: true })).toBeVisible();
  await expect(editor.locator('[data-content-type="codeBlock"]')).toContainText('$nao_e_equacao$');
  await page.reload();
  await expect(editor.locator('.katex')).toHaveCount(2);
  const exported = await exportMarkdown(page);
  expect(exported).toContain('$e^{i\\pi} + 1 = 0$');
  expect(exported).toContain('\\begin{pmatrix}1 & 2 \\\\ 3 & 4\\end{pmatrix}');
  expect(exported).toContain('$$\n\\frac{\n$$');
  await page.getByLabel('Importar arquivo Markdown').setInputFiles({
    name: 'Reimportado.md',
    mimeType: 'text/markdown',
    buffer: Buffer.from(exported),
  });
  await expect(page.getByRole('textbox', { name: 'Título do documento' })).toHaveValue('Reimportado');
  await expect(editor.locator('.katex')).toHaveCount(2);
  await page.screenshot({ path: info.outputPath('equacoes-markdown.png'), fullPage: true });
});
