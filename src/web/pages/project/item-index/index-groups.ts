import type { IndexFolder } from '../../../router/paths';
import type { IndexRow } from './index-rows';

/** A folder as the Índice names it: its id and name, in the project's manual order. */
export interface IndexFolderEntry {
  id: string;
  name: string;
}

/** One group of the table: a folder, or the root as "Sem pasta", with its rows in the table's order. */
export interface IndexGroup {
  key: string;
  folder: IndexFolderEntry | null;
  label: string;
  rows: IndexRow[];
}

/** The root's name in the Índice: its filter option, its group and the summary. */
export const NO_FOLDER = 'Sem pasta';

/**
 * The `pasta` filter the address asks for, if the project still has it: "raiz" or an active folder. An
 * unknown or deleted folder is no filter, and the page shows Todas.
 */
export function knownFolderFilter(pasta: IndexFolder | undefined, folders: readonly IndexFolderEntry[]) {
  if (pasta === undefined || pasta === 'raiz') return pasta;
  return folders.some((folder) => folder.id === pasta) ? pasta : undefined;
}

/** The folder an item is in, if it is among the active ones; anything else is the root. */
const placeOf = (row: IndexRow, known: ReadonlySet<string>) =>
  row.folderId !== null && known.has(row.folderId) ? row.folderId : null;

/** The rows of the `pasta` filter: every row, the root's ("raiz") or one folder's. */
export function filterByFolder(
  rows: readonly IndexRow[],
  pasta: IndexFolder | undefined,
  folders: readonly IndexFolderEntry[],
): IndexRow[] {
  if (pasta === undefined) return [...rows];
  const known = new Set(folders.map((folder) => folder.id));
  const wanted = pasta === 'raiz' ? null : pasta;
  return rows.filter((row) => placeOf(row, known) === wanted);
}

/**
 * The rows in groups, one per folder in the manual order and "Sem pasta" last, each keeping the table's
 * order. A folder with no row is left out.
 */
export function indexGroups(rows: readonly IndexRow[], folders: readonly IndexFolderEntry[]): IndexGroup[] {
  const known = new Set(folders.map((folder) => folder.id));
  const byPlace = new Map<string | null, IndexRow[]>();
  for (const row of rows) {
    const place = placeOf(row, known);
    byPlace.set(place, [...(byPlace.get(place) ?? []), row]);
  }
  const groups: IndexGroup[] = folders.map((folder) => ({
    key: `folder:${folder.id}`,
    folder,
    label: folder.name,
    rows: byPlace.get(folder.id) ?? [],
  }));
  groups.push({ key: 'root', folder: null, label: NO_FOLDER, rows: byPlace.get(null) ?? [] });
  return groups.filter((group) => group.rows.length > 0);
}

/** The name of a row's folder for the Pasta column: the folder's, or "Sem pasta". */
export function folderNameOf(row: IndexRow, folders: readonly IndexFolderEntry[]) {
  return folders.find((folder) => folder.id === row.folderId)?.name ?? NO_FOLDER;
}

/** The filter's name for the summary: "Sem pasta" or the folder's. */
export function folderFilterName(pasta: IndexFolder | undefined, folders: readonly IndexFolderEntry[]) {
  if (pasta === undefined) return undefined;
  if (pasta === 'raiz') return NO_FOLDER;
  return folders.find((folder) => folder.id === pasta)?.name;
}
