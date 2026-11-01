import { visibleText, withoutInvisible } from './visible-text.js';

/** Bounds of folders: the name, the active folders of a project, and the items a restore takes back. */
export const FOLDER_LIMITS = {
  nameChars: 100,
  perProject: 200,
  /** Items a deletion lists, and a restore takes back, in each of its two lists. */
  restoredItems: 1_000,
} as const;

/**
 * A folder groups documents and drawings of one project, on one level. A deleted folder keeps its
 * row, named as the origin of trashed items, until a restore brings it back.
 */
export interface Folder {
  id: string;
  projectId: string;
  name: string;
  /** Manual order among the project's active folders, from 0; a deleted folder keeps its last one. */
  position: number;
  version: number;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

/**
 * A folder's name as stored: without characters that draw nothing (visibleText), with every run of
 * spaces, line breaks included, as one space, and no edge spaces. Empty when nothing visible is left.
 */
export function folderName(raw: string): string {
  return visibleText(raw).replace(/\s+/gu, ' ');
}

/** Compatibility forms (full width, ligatures) as their plain letters, without marks nor invisibles. */
const fold = (text: string) => withoutInvisible(text.normalize('NFKD'));

/**
 * What makes two names the same folder: case, accents, compatibility forms and characters that draw
 * nothing aside, so "Ａｃｏｅｓ" and "Aç\u200Bões" are "Ações". Folded again after lowercasing, which
 * can bring marks back ("İ").
 */
export function folderNameKey(name: string): string {
  return fold(fold(folderName(name)).toLocaleLowerCase('pt-BR'))
    .replace(/\s+/gu, ' ')
    .trim();
}

/**
 * The order of `ids` with `id` moved before `beforeId`, or to the end when `beforeId` is null.
 * Undefined when either is not in the list, or when they are the same.
 */
export function folderOrder(ids: readonly string[], id: string, beforeId: string | null): string[] | undefined {
  if (!ids.includes(id) || id === beforeId) return undefined;
  const others = ids.filter((other) => other !== id);
  const index = beforeId === null ? others.length : others.indexOf(beforeId);
  if (index < 0) return undefined;
  return [...others.slice(0, index), id, ...others.slice(index)];
}

/** Where a restored folder goes back: the position it had, or the end when fewer folders remain. */
export function restoredPosition(position: number, activeFolders: number): number {
  return Math.min(Math.max(position, 0), activeFolders);
}
