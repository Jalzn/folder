import type { ItemType } from '../lib/types';

/** The app's addresses, in Portuguese (docs/etapas/08-fundacao.md, "Rotas"). */

/** The `tipo` filter of the Índice. */
export type IndexType = 'documentos' | 'desenhos';

const encode = encodeURIComponent;

export const paths = {
  start: '/',
  noProject: '/projetos',
  login: '/entrar',
  profile: '/perfil',
  overview: (projectId: string) => `/projetos/${encode(projectId)}`,
  board: (projectId: string) => `/projetos/${encode(projectId)}/quadro`,
  index: (projectId: string, type?: IndexType) => `/projetos/${encode(projectId)}/indice${type ? `?tipo=${type}` : ''}`,
  trash: (projectId: string) => `/projetos/${encode(projectId)}/lixeira`,
  document: (projectId: string, documentId: string, block?: string) =>
    `/projetos/${encode(projectId)}/documentos/${encode(documentId)}${block ? `?bloco=${encode(block)}` : ''}`,
  drawing: (projectId: string, canvasId: string) => `/projetos/${encode(projectId)}/desenhos/${encode(canvasId)}`,
  /** The board with a task's dialog open. */
  task: (projectId: string, taskId: string) => `/projetos/${encode(projectId)}/quadro?tarefa=${encode(taskId)}`,
  item: (projectId: string, type: ItemType, id: string) =>
    type === 'document' ? paths.document(projectId, id) : paths.drawing(projectId, id),
} as const;

export interface ProjectPath {
  projectId: string;
  /** The item a document or drawing address opens. */
  item: { type: ItemType; id: string } | null;
}

const itemSegments: Record<string, ItemType> = { documentos: 'document', desenhos: 'drawing' };
const projectPages = new Set(['quadro', 'indice', 'lixeira']);

/** Reads an address inside a project, or null for any other address. Search and hash are ignored. */
export function parseProjectPath(path: string): ProjectPath | null {
  const pathname = path.split(/[?#]/, 1)[0] ?? '';
  const segments = pathname.split('/').slice(1);
  if (segments[0] !== 'projetos' || !segments[1]) return null;
  const projectId = decodeURIComponent(segments[1]);
  const rest = segments.slice(2).filter(Boolean);
  if (rest.length === 0) return { projectId, item: null };
  if (rest.length === 1 && projectPages.has(rest[0] ?? '')) return { projectId, item: null };
  const type = itemSegments[rest[0] ?? ''];
  if (rest.length === 2 && type) return { projectId, item: { type, id: decodeURIComponent(rest[1] ?? '') } };
  return null;
}

/**
 * An item's address under its project. Every item has a project; until the server stops typing it as
 * nullable, an item without one goes through its old address, which redirects.
 */
export function itemPath(type: ItemType, item: { id: string; projectId: string | null }, block?: string) {
  if (type === 'document') {
    const query = block ? `?bloco=${encode(block)}` : '';
    return item.projectId ? paths.document(item.projectId, item.id, block) : `/documentos/${encode(item.id)}${query}`;
  }
  return item.projectId ? paths.drawing(item.projectId, item.id) : `/desenhos/${encode(item.id)}`;
}
