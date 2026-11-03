import { READING_LIMITS } from '../../domain/reading-limits.js';
import type { AgentToolResult } from './types.js';

export const textResult = (text: string): AgentToolResult => ({ content: [{ type: 'text', text }] });

/** Lists go out as compact JSON: indentation would only spend tokens. */
export const compactJson = (value: unknown): string => JSON.stringify(value);

/**
 * Renders as many leading items as fit the output budget. The caller's `render` receives the items
 * that fit and points the next cursor at the first one left out.
 */
export function fitItems<T>(items: readonly T[], render: (shown: readonly T[]) => string): string {
  let count = items.length;
  let text = render(items);
  const budget = READING_LIMITS.toolTextChars;
  while (text.length > budget && count > 1) {
    count = Math.max(1, Math.min(count - 1, Math.floor((count * budget) / text.length)));
    text = render(items.slice(0, count));
  }
  return text;
}
