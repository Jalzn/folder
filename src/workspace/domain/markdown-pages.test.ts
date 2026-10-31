import { describe, expect, it } from 'vitest';
import { pageMarkdown } from './markdown-pages.js';

function pagesOf(markdown: string, maxChars: number): string[] {
  const pages = [pageMarkdown(markdown, 0, maxChars)];
  for (let page = pages[0]; page?.nextOffset != null; page = pages.at(-1))
    pages.push(pageMarkdown(markdown, page.nextOffset, maxChars));
  return pages.map((page) => page.text);
}

const fenceLines = (page: string, fence: string) => page.split('\n').filter((line) => line.trim() === fence);
const paragraphs = (count: number) => Array.from({ length: count }, (_, index) => `Parágrafo ${index}.`).join('\n\n');

describe('Markdown pages', () => {
  it('closes a code block cut by the page and reopens it on the next one', () => {
    const code = Array.from({ length: 30 }, (_, index) => `linha ${index}`).join('\n');
    const markdown = `Antes\n\n\`\`\`ts\n${code}\n\`\`\`\n\nDepois do código\n`;
    const pages = [pageMarkdown(markdown, 0, 100)];
    for (let page = pages[0]; page?.nextOffset != null; page = pages.at(-1))
      pages.push(pageMarkdown(markdown, page.nextOffset, 100));
    expect(pages.length).toBeGreaterThan(2);
    expect(pages[0]?.text.endsWith('linha 9\n```\n')).toBe(true);
    expect(pages[1]?.text.startsWith('```ts\nlinha 10\n')).toBe(true);
    for (const page of pages)
      expect(page.text.split('\n').filter((line) => line.startsWith('```')).length % 2, page.text).toBe(0);
    expect(pages.at(-1)?.text).toContain('Depois do código');
  });
  it('treats backticks inside a display formula as part of it', () => {
    const pages = pagesOf(`Antes\n\n$$\na\n\`\`\`\nb\n$$\n\n${paragraphs(30)}\n`, 100);
    expect(pages.length).toBeGreaterThan(2);
    expect(fenceLines(pages[0] ?? '', '```')).toHaveLength(1);
    for (const page of pages.slice(1)) expect(page).not.toContain('```');
  });
  it('closes a long formula cut by the page and reopens it on the next one', () => {
    const formula = Array.from({ length: 30 }, (_, index) => `x_{${index}} + y`).join('\n');
    const pages = pagesOf(`Antes\n\n$$\n${formula}\n$$\n\ndepois\n`, 100);
    expect(pages.length).toBeGreaterThan(2);
    expect(pages[0]?.endsWith('\n$$\n')).toBe(true);
    expect(pages[1]?.startsWith('$$\nx_{')).toBe(true);
    for (const page of pages) expect(fenceLines(page, '$$').length % 2, page).toBe(0);
    const last = (pages.at(-1) ?? '').split('\n');
    expect(last.indexOf('depois')).toBeGreaterThan(last.lastIndexOf('$$'));
  });
  it('reopens a code block nested in a list at column 0, with its lines on that page dedented', () => {
    const code = Array.from({ length: 30 }, (_, index) => `    linha ${index}`).join('\n');
    const pages = pagesOf(`- a\n  - b\n\n    \`\`\`sh\n${code}\n    \`\`\`\n\n- c\n`, 100);
    expect(pages.length).toBeGreaterThan(2);
    expect(pages[0]?.endsWith('\n    ```\n')).toBe(true);
    expect(pages[1]?.startsWith('```sh\nlinha ')).toBe(true);
    expect(pages[1]?.endsWith('\n```\n')).toBe(true);
    const last = pages.at(-1) ?? '';
    expect(last.startsWith('```sh\n')).toBe(true);
    expect(last.split('\n').filter((line) => line.startsWith(' '))).toEqual([]);
    expect(last.endsWith('```\n\n- c\n')).toBe(true);
  });
  it('keeps the rest of a code line cut mid-line as it was', () => {
    // The 87 x's fill the first page up to offset 100, a hard cut inside the long line.
    const markdown = `- a\n\n  \`\`\`\n  ${'x'.repeat(87)}  y\n  \`\`\`\n`;
    expect(pagesOf(markdown, 100)).toEqual([`- a\n\n  \`\`\`\n  ${'x'.repeat(87)}\n  \`\`\`\n`, '```\n  y\n```\n']);
  });
  it('leaves pages without code untouched', () => {
    const markdown = `${'ab '.repeat(50)}\n`;
    expect(pageMarkdown(markdown, 0, 100).text).toBe(markdown.slice(0, 100));
  });
});
