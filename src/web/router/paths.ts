import type { ItemType } from '../lib/types';

/** The app's addresses, in Portuguese (docs/etapas/08-fundacao.md, "Rotas"). */

/** The `tipo` filter of the Índice. */
export type IndexType = 'documentos' | 'desenhos';
/** The `pasta` filter of the Índice: a folder's id, or "raiz" for the items at the project's root. */
export type IndexFolder = 'raiz' | (string & {});

/** The Índice's filters, as its address keeps them. */
export interface IndexSearch {
  tipo?: IndexType;
  pasta?: IndexFolder;
}

const encode = encodeURIComponent;

export const paths = {
  start: '/',
  noProject: '/projetos',
  login: '/entrar',
  profile: '/perfil',
  overview: (projectId: string) => `/projetos/${encode(projectId)}`,
  board: (projectId: string) => `/projetos/${encode(projectId)}/quadro`,
  index: (projectId: string, { tipo, pasta }: IndexSearch = {}) => {
    const search = new URLSearchParams({ ...(tipo ? { tipo } : {}), ...(pasta ? { pasta } : {}) }).toString();
    return `/projetos/${encode(projectId)}/indice${search ? `?${search}` : ''}`;
  },
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

/** A percent-encoded segment as text, or null when its encoding is broken (`%E0%A4%A`). */
export function safeDecode(segment: string): string | null {
  try {
    return decodeURIComponent(segment);
  } catch {
    return null;
  }
}

/**
 * Whether an address is one of the app's own paths: one leading "/" (not "//"), no backslash, and a
 * path its routes know. A stored or pasted value that fails this never reaches navigation, which would
 * otherwise follow a scheme or a host to another origin.
 */
export function isAppPath(path: string): boolean {
  if (!path.startsWith('/') || path.startsWith('//') || path.includes('\\')) return false;
  const pathname = path.split(/[?#]/, 1)[0] ?? '';
  return (
    pathname === paths.start ||
    pathname === paths.noProject ||
    pathname === paths.profile ||
    parseProjectPath(path) !== null
  );
}

/**
 * Reads an address inside a project, or null for any other address: one that does not start with
 * "/projetos/", has a broken encoding, or names a page the routes do not have. Search and hash are ignored.
 */
export function parseProjectPath(path: string): ProjectPath | null {
  const pathname = path.split(/[?#]/, 1)[0] ?? '';
  if (!pathname.startsWith('/projetos/') || pathname.includes('\\')) return null;
  const segments = pathname.split('/').slice(1);
  const projectId = safeDecode(segments[1] ?? '');
  if (!projectId) return null;
  const rest = segments.slice(2).filter(Boolean);
  if (rest.length === 0) return { projectId, item: null };
  if (rest.length === 1 && projectPages.has(rest[0] ?? '')) return { projectId, item: null };
  const type = itemSegments[rest[0] ?? ''];
  const id = rest.length === 2 && type ? safeDecode(rest[1] ?? '') : null;
  return type && id ? { projectId, item: { type, id } } : null;
}
