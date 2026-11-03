import type { IsoInstant } from '@tinyfold/core/domain';
import { DomainError } from '@tinyfold/core/domain';
import { type ItemType, ITEM_TYPES as SEARCH_ITEM_TYPES } from './items.js';

const invalidCursor = () => new DomainError('Cursor inválido. Repita a consulta sem cursor.');

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
export { ITEM_TYPES as SEARCH_ITEM_TYPES } from './items.js';

export type SearchItemType = ItemType;

/**
 * Lists page by keyset: a cursor holds the sort key of the last item shown, so edits elsewhere in
 * the list never repeat or skip the items that follow it. The board is the exception: moving a
 * task renumbers the positions around it, so a board cursor also pins the board revision.
 */
export interface SearchKey {
  /** How many query words the title lacks; title matches come first. */
  titleRank: number;
  updatedAt: IsoInstant;
  /** The index of the item's type in SEARCH_ITEM_TYPES. */
  typeRank: number;
  id: string;
}

export interface ProjectKey {
  updatedAt: IsoInstant;
  id: string;
}

const isoDate = String.raw`\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z`;
const uuid = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}';
const searchCursorPattern = new RegExp(`^s~(\\d{1,3})~(${isoDate})~(\\d{1,2})~(${uuid})$`, 'u');

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
    updatedAt: match[2] as IsoInstant,
    typeRank: rankIn(match[3], SEARCH_ITEM_TYPES.length),
    id: match[4] as string,
  };
}

export function projectCursor(key: ProjectKey): string {
  return `p~${key.updatedAt}~${key.id}`;
}

export function readProjectCursor(cursor: string): ProjectKey {
  const match = projectCursorPattern.exec(cursor);
  if (!match) throw invalidCursor();
  return { updatedAt: match[1] as IsoInstant, id: match[2] as string };
}
