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

/**
 * Lists page by keyset: a cursor holds the sort key of the last item shown, so edits elsewhere in
 * the list never repeat or skip the items that follow it.
 */
export interface SearchKey {
  /** How many query words the title lacks; title matches come first. */
  titleRank: number;
  updatedAt: string;
  typeRank: number;
  id: string;
}

export interface ProjectKey {
  updatedAt: string;
  id: string;
}

export interface BoardKey {
  columnRank: number;
  position: number;
  id: string;
}

const isoDate = String.raw`\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z`;
const uuid = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}';
const searchCursorPattern = new RegExp(`^s~(\\d{1,3})~(${isoDate})~([0-2])~(${uuid})$`, 'u');
const boardCursorPattern = new RegExp(`^t~([0-2])~(\\d{1,15})~(${uuid})$`, 'u');
const projectCursorPattern = new RegExp(`^p~(${isoDate})~(${uuid})$`, 'u');

export function searchCursor(key: SearchKey): string {
  return `s~${key.titleRank}~${key.updatedAt}~${key.typeRank}~${key.id}`;
}

export function readSearchCursor(cursor: string): SearchKey {
  const match = searchCursorPattern.exec(cursor);
  if (!match) throw invalidCursor();
  return {
    titleRank: Number(match[1]),
    updatedAt: match[2] as string,
    typeRank: Number(match[3]),
    id: match[4] as string,
  };
}

export function boardCursor(key: BoardKey): string {
  return `t~${key.columnRank}~${key.position}~${key.id}`;
}

export function readBoardCursor(cursor: string): BoardKey {
  const match = boardCursorPattern.exec(cursor);
  if (!match) throw invalidCursor();
  return { columnRank: Number(match[1]), position: Number(match[2]), id: match[3] as string };
}

export function projectCursor(key: ProjectKey): string {
  return `p~${key.updatedAt}~${key.id}`;
}

export function readProjectCursor(cursor: string): ProjectKey {
  const match = projectCursorPattern.exec(cursor);
  if (!match) throw invalidCursor();
  return { updatedAt: match[1] as string, id: match[2] as string };
}
