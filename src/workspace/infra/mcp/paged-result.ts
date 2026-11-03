import type { TextPage } from '../../domain/paging.js';
import { READING_LIMITS } from '../../domain/reading-limits.js';
import { compactJson, fitItems, textResult } from './format.js';
export function pagedMarkdownResult(input: {
  page: TextPage;
  nextCursor: string | null;
  id: string;
  tool: string;
  headerChars: number;
  header: (empty: boolean, room: number) => string;
}) {
  const { page, nextCursor } = input;
  const parts: string[] = [];
  if (page.text.trim()) parts.push(page.text.replace(/\n+$/u, ''));
  if (page.count > 1) {
    const next = nextCursor && ` Continue com ${input.tool} ${JSON.stringify({ id: input.id, cursor: nextCursor })}.`;
    parts.push(`---\nPágina ${page.number} de ${page.count}.${next ?? ''}`);
  }
  if (page.number === 1) {
    const room = READING_LIMITS.toolTextChars - parts.join('\n\n').length - '\n\n---\n\n'.length;
    parts.unshift(input.header(!page.text.trim(), Math.min(input.headerChars, room)), '---');
  }
  return textResult(parts.join('\n\n'));
}
export const keysetJsonResult = <T>(items: readonly T[], render: (shown: readonly T[]) => unknown) =>
  textResult(fitItems(items, (shown) => compactJson(render(shown))));
