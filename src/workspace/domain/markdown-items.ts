import type { JsonValue } from './models.js';

export type Mark = 'bold' | 'italic' | 'strike';
/** Nesting order, outermost first, when marks start and end together. */
export const MARKS: readonly Mark[] = ['bold', 'italic', 'strike'];

/** Characters escaped with a backslash wherever they appear in text. */
export const ESCAPED_ANYWHERE = /[\\`*_[\]$~]/u;

export type Inline =
  | { kind: 'text'; text: string; marks: Mark[]; code: boolean }
  | { kind: 'link'; href: string; content: Inline[] }
  | { kind: 'math'; source: string }
  | { kind: 'break' };

const record = (value: unknown): value is { [key: string]: JsonValue } =>
  value !== null && typeof value === 'object' && !Array.isArray(value);
const sameMarks = (a: readonly Mark[], b: readonly Mark[]) =>
  a.length === b.length && a.every((mark) => b.includes(mark));

/**
 * BlockNote inline content as pieces with Markdown-representable formatting: text split at line
 * breaks, neighbors with the same formatting merged. Headings read breaks as spaces.
 */
export function inlineItems(content: JsonValue | undefined, breaksAsSpaces: boolean): Inline[] {
  const items: Inline[] = [];
  const pushText = (text: string, textMarks: Mark[], code: boolean) => {
    for (const [index, line] of text.split(/\r\n?|\n/u).entries()) {
      if (index > 0 && !breaksAsSpaces) items.push({ kind: 'break' });
      const piece = index > 0 && breaksAsSpaces ? ` ${line}` : line;
      const previous = items.at(-1);
      if (previous?.kind === 'text' && previous.code === code && sameMarks(previous.marks, textMarks))
        previous.text += piece;
      else if (piece) items.push({ kind: 'text', text: piece, marks: textMarks, code });
    }
  };
  if (typeof content === 'string') pushText(content, [], false);
  for (const item of Array.isArray(content) ? content : []) {
    if (!record(item)) continue;
    if (item.type === 'text' && typeof item.text === 'string') {
      const styles = record(item.styles) ? item.styles : {};
      pushText(
        item.text,
        MARKS.filter((mark) => styles[mark] === true),
        styles.code === true,
      );
    } else if (item.type === 'link' && typeof item.href === 'string') {
      items.push({ kind: 'link', href: item.href, content: inlineItems(item.content, breaksAsSpaces) });
    } else if (item.type === 'math' && typeof item.content === 'string') {
      items.push({ kind: 'math', source: item.content });
    }
  }
  // A hard break at either end of a block would be read as a literal backslash.
  while (items[0]?.kind === 'break') items.shift();
  while (items.at(-1)?.kind === 'break') items.pop();
  return items;
}
