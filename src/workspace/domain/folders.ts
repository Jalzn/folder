import type { IsoInstant } from '@tinyfold/core/domain';
import { displayName, nameKey } from './names.js';

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
  createdAt: IsoInstant;
  updatedAt: IsoInstant;
  deletedAt: IsoInstant | null;
}

/** A folder's name as stored: see displayName. The web's folder field still reads it by this name. */
export const folderName = displayName;

/** What makes two names the same folder: see nameKey. The web's folder field still reads it by this name. */
export const folderNameKey = nameKey;
