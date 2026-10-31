import { describe, expect, it } from 'vitest';
import { pageMarkdown } from './markdown-pages.js';

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
  it('leaves pages without code untouched', () => {
    const markdown = `${'ab '.repeat(50)}\n`;
    expect(pageMarkdown(markdown, 0, 100).text).toBe(markdown.slice(0, 100));
  });
});
