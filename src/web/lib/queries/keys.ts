import type { NavSort } from '#workspace/domain';
import type { ItemType } from '../types';

const root = ['workspace'] as const;

/**
 * Every query key of the app, made in one place (WF-2): a segment renamed here changes every query, update and
 * invalidation at once, where an array written by hand would miss in silence. A key without its last
 * arguments is the prefix of every query below it, for an invalidation.
 */
export const keys = {
  /** Everything the workspace serves: refreshed after every write, dropped at sign-out. */
  all: root,
  session: ['session'] as const,
  documents: (options?: object) =>
    options ? ([...root, 'documents', options] as const) : ([...root, 'documents'] as const),
  document: (id: string) => [...root, 'document', id] as const,
  canvases: (options?: object) =>
    options ? ([...root, 'canvases', options] as const) : ([...root, 'canvases'] as const),
  canvas: (id: string) => [...root, 'canvas', id] as const,
  /** An open item's own query: "drawing" in the contract, "canvas" in the key. */
  item: (type: ItemType, id: string) => (type === 'document' ? keys.document(id) : keys.canvas(id)),
  projects: (includeArchived: boolean) => [...root, 'projects', includeArchived] as const,
  navigation: (projectId?: string | null, sort?: NavSort) =>
    projectId === undefined
      ? ([...root, 'navigation'] as const)
      : sort === undefined
        ? ([...root, 'navigation', projectId] as const)
        : ([...root, 'navigation', projectId, sort] as const),
  overview: (projectId?: string) =>
    projectId === undefined ? ([...root, 'overview'] as const) : ([...root, 'overview', projectId] as const),
  search: (input?: object) => (input ? ([...root, 'search', input] as const) : ([...root, 'search'] as const)),
  /** Every task list, or the one of these options: `{}` for all of them. */
  tasks: (options?: object) => (options ? ([...root, 'tasks', options] as const) : ([...root, 'tasks'] as const)),
  task: (id: string) => [...root, 'task', id] as const,
  board: (projectId?: string) =>
    projectId === undefined ? ([...root, 'board'] as const) : ([...root, 'board', projectId] as const),
  completed: (projectId: string) => [...root, 'completed', projectId] as const,
  columns: [...root, 'columns'] as const,
  labels: [...root, 'labels'] as const,
  /** A project's folders, or with 'all' every project's. */
  folders: (projectId: string) => [...root, 'folders', projectId] as const,
  trash: (projectId: string) => [...root, 'trash', projectId] as const,
  embeds: (documentId?: string, ids?: { taskIds: readonly string[]; canvasIds: readonly string[] }) =>
    documentId === undefined || !ids
      ? ([...root, 'embeds'] as const)
      : ([...root, 'embeds', documentId, ids.taskIds, ids.canvasIds] as const),
};
