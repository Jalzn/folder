import { DomainError } from '@tinyfold/core/domain';
import { COLUMN_LIMITS } from './columns.js';

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

/**
 * A document page cursor pins the text it pages, by its fingerprint, so a later page never mixes
 * two texts. A move, a rename or a pin change the version, not the text, and leave it valid.
 */
export function documentCursor(textPrint: string, offset: number): string {
  return `${textPrint}:${offset}`;
}

export function readDocumentCursor(cursor: string): { textPrint: string; offset: number } {
  const match = /^([0-9a-f]{1,16}):(\d{1,15})$/u.exec(cursor);
  if (!match?.[1]) throw invalidCursor();
  return { textPrint: match[1], offset: Number(match[2]) };
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
  /** The position of the task's column among the active ones: from 0 to COLUMN_LIMITS.active − 1. */
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
const completedCursorPattern = new RegExp(`^c~(${isoDate})~(${uuid})$`, 'u');

/** Completed tasks, the most recently completed first, IDs breaking ties. */
export interface CompletedKey {
  completedAt: string;
  id: string;
}

export function completedCursor(key: CompletedKey): string {
  return `c~${key.completedAt}~${key.id}`;
}

export function readCompletedCursor(cursor: string): CompletedKey {
  const match = completedCursorPattern.exec(cursor);
  if (!match) throw invalidCursor();
  return { completedAt: match[1] as string, id: match[2] as string };
}

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
    key: { columnRank: rankIn(match[2], COLUMN_LIMITS.active), position: Number(match[3]), id: match[4] as string },
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
