import { countOf } from '../../lib/count';
import { matchesAllWords, queryWords } from '../../lib/highlight';
import type { Project } from '../../lib/types';
import type { PaletteRowData } from './palette-types';

/** The Pastas group shows at most this many folders. */
export const PALETTE_FOLDERS = 6;

/** An active folder as listFolders gives it, from every project. */
export interface PaletteFolder {
  id: string;
  projectId: string;
  name: string;
  items: number;
}

/**
 * The Pastas group (docs/etapas/09-pastas.md, "Onde as pastas aparecem"): only with typed text, the first
 * six folders whose name holds every word, "MCP · pasta · 12 itens" with the project on the right. A folder
 * of an archived project is marked, as its items are.
 */
export function folderRows(
  query: string,
  folders: readonly PaletteFolder[],
  projects: readonly Project[],
): PaletteRowData[] {
  if (!queryWords(query).length) return [];
  const byId = new Map(projects.map((project) => [project.id, project]));
  return folders
    .filter((folder) => byId.has(folder.projectId) && matchesAllWords(folder.name, query))
    .slice(0, PALETTE_FOLDERS)
    .map((folder) => {
      const project = byId.get(folder.projectId);
      return {
        key: `folder:${folder.id}`,
        label: folder.name,
        note: `pasta · ${countOf(folder.items, 'item', 'itens')}`,
        action: { kind: 'folder', id: folder.id, projectId: folder.projectId },
        archived: Boolean(project?.archivedAt),
        project: { id: folder.projectId, name: project?.name ?? '' },
      };
    });
}
