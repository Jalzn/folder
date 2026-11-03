import { DomainError, type IsoInstant } from '#core/domain';
import { COLUMN_LIMITS } from './columns.js';

const invalidCursor = () => new DomainError('Cursor inválido. Repita a consulta sem cursor.');
const isoDate = String.raw`\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z`;
const uuid = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}';
const completedCursorPattern = new RegExp(`^c~(${isoDate})~(${uuid})$`, 'u');
export interface CompletedKey {
  completedAt: IsoInstant;
  id: string;
}

export function completedCursor(key: CompletedKey): string {
  return `c~${key.completedAt}~${key.id}`;
}

export function readCompletedCursor(cursor: string): CompletedKey {
  const match = completedCursorPattern.exec(cursor);
  if (!match) throw invalidCursor();
  return { completedAt: match[1] as IsoInstant, id: match[2] as string };
}

export function documentCursor(textPrint: string, offset: number): string {
  return `${textPrint}:${offset}`;
}

export function readDocumentCursor(cursor: string): { textPrint: string; offset: number } {
  const match = /^([0-9a-f]{1,16}):(\d{1,15})$/u.exec(cursor);
  if (!match?.[1]) throw invalidCursor();
  return { textPrint: match[1], offset: Number(match[2]) };
}

export interface BoardKey {
  /** The position of the task's column among the active ones: from 0 to COLUMN_LIMITS.active − 1. */
  columnRank: number;
  position: number;
  id: string;
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

const boardCursorPattern = new RegExp(`^t~(\\d{1,15})~(\\d{1,2})~(\\d{1,15})~(${uuid})$`, 'u');
/** A rank read from a cursor, which must index one of `count` values. */
function rankIn(text: string | undefined, count: number): number {
  const rank = Number(text);
  if (!(rank < count)) throw invalidCursor();
  return rank;
}
