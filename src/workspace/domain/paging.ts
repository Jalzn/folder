import { DomainError } from '@tinyfold/core/domain';

const invalidCursor = () => new DomainError('Cursor inválido. Repita a consulta sem cursor.');

export interface TextPage {
  text: string;
  /** One-based. */
  number: number;
  count: number;
  nextOffset: number | null;
}

/**
 * The page of `text` starting at `offset`. Pages end after the last line break that falls in their
 * final 20%; without one, the cut is exact, never inside a surrogate pair.
 */
export function pageText(text: string, offset: number, maxChars: number): TextPage {
  const starts = [0];
  let start = 0;
  while (text.length - start > maxChars) {
    let end = start + maxChars;
    const lineBreak = text.lastIndexOf('\n', end - 1);
    const highSurrogate = text.charCodeAt(end - 1) >= 0xd800 && text.charCodeAt(end - 1) <= 0xdbff;
    if (lineBreak >= start + maxChars * 0.8) end = lineBreak + 1;
    else if (highSurrogate) end -= 1;
    starts.push(end);
    start = end;
  }
  const index = starts.indexOf(offset);
  if (index < 0) throw invalidCursor();
  return {
    text: text.slice(offset, starts[index + 1] ?? text.length),
    number: index + 1,
    count: starts.length,
    nextOffset: starts[index + 1] ?? null,
  };
}

/** A document page cursor pins the version, so a later page never mixes two versions. */
export function documentCursor(version: number, offset: number): string {
  return `${version}:${offset}`;
}

export function readDocumentCursor(cursor: string): { version: number; offset: number } {
  const match = /^(\d{1,15}):(\d{1,15})$/u.exec(cursor);
  if (!match) throw invalidCursor();
  return { version: Number(match[1]), offset: Number(match[2]) };
}

/** List cursors are plain offsets, bounded so a deep page never scans the whole table. */
export function offsetCursor(offset: number): string {
  return `o:${offset}`;
}

export function readOffsetCursor(cursor: string | undefined, maxOffset: number): number {
  if (cursor === undefined) return 0;
  const match = /^o:(\d{1,15})$/u.exec(cursor);
  if (!match) throw invalidCursor();
  const offset = Number(match[1]);
  if (offset > maxOffset)
    throw new DomainError('A consulta passou do limite de páginas. Use filtros mais específicos.');
  return offset;
}
