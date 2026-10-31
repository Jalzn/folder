import { DomainError } from '@tinyfold/core/domain';
import { TASK_STATUSES } from './task-status.js';

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

/** Item types in the order search lists them when the title rank and the edit time tie. */
export const SEARCH_ITEM_TYPES = ['document', 'drawing', 'task'] as const;

export type SearchItemType = (typeof SEARCH_ITEM_TYPES)[number];

/**
 * Lists page by keyset: a cursor holds the sort key of the last item shown, so edits elsewhere in
 * the list never repeat or skip the items that follow it. The board is the exception: moving a
 * task renumbers the positions around it, so a board cursor also pins the board revision.
 */
export interface SearchKey {
  /** How many query words the title lacks; title matches come first. */
  titleRank: number;
  updatedAt: string;
  /** The index of the item's type in SEARCH_ITEM_TYPES. */
  typeRank: number;
  id: string;
}

export interface ProjectKey {
  updatedAt: string;
  id: string;
}

export interface BoardKey {
  /** The index of the task's column in TASK_STATUSES. */
  columnRank: number;
  position: number;
  id: string;
}

const isoDate = String.raw`\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z`;
const uuid = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}';
const searchCursorPattern = new RegExp(`^s~(\\d{1,3})~(${isoDate})~(\\d{1,2})~(${uuid})$`, 'u');
const boardCursorPattern = new RegExp(`^t~(\\d{1,15})~(\\d{1,2})~(\\d{1,15})~(${uuid})$`, 'u');

/** A rank read from a cursor, which must index one of `count` values. */
function rankIn(text: string | undefined, count: number): number {
  const rank = Number(text);
  if (!(rank < count)) throw invalidCursor();
  return rank;
}
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
    typeRank: rankIn(match[3], SEARCH_ITEM_TYPES.length),
    id: match[4] as string,
  };
}

export function boardCursor(revision: number, key: BoardKey): string {
  return `t~${revision}~${key.columnRank}~${key.position}~${key.id}`;
}

export function readBoardCursor(cursor: string): { revision: number; key: BoardKey } {
  const match = boardCursorPattern.exec(cursor);
  if (!match) throw invalidCursor();
  return {
    revision: Number(match[1]),
    key: { columnRank: rankIn(match[2], TASK_STATUSES.length), position: Number(match[3]), id: match[4] as string },
  };
}

export function projectCursor(key: ProjectKey): string {
  return `p~${key.updatedAt}~${key.id}`;
}

export function readProjectCursor(cursor: string): ProjectKey {
  const match = projectCursorPattern.exec(cursor);
  if (!match) throw invalidCursor();
  return { updatedAt: match[1] as string, id: match[2] as string };
}
