import type { Project } from '../lib/types';
import { type IndexType, paths, safeDecode } from './paths';

/** The addresses before stage 08, which keep working by redirecting (docs/etapas/08-fundacao.md). */
export type LegacyAddress =
  | { kind: 'login' }
  | { kind: 'list'; target: 'documents' | 'drawings' | 'board' | 'trash' }
  | { kind: 'document'; id: string; block: string | null }
  | { kind: 'drawing'; id: string };

/** Reads an address of the old navigation, or null; a broken encoding is not one. The `q` of the old lists is dropped. */
export function parseLegacyAddress(pathname: string, search: Record<string, unknown> = {}): LegacyAddress | null {
  const segments = pathname.replace(/\/+$/, '').split('/').slice(1);
  const [first, second, ...rest] = segments;
  if (rest.length) return null;
  if (first === 'login' && !second) return { kind: 'login' };
  if (first === 'kanban' && !second) return { kind: 'list', target: 'board' };
  if (first === 'lixeira' && !second) return { kind: 'list', target: 'trash' };
  if (first === 'documentos') {
    if (!second) return { kind: 'list', target: 'documents' };
    const id = safeDecode(second);
    return id ? { kind: 'document', id, block: typeof search.bloco === 'string' ? search.bloco : null } : null;
  }
  if (first === 'desenhos') {
    if (!second) return { kind: 'list', target: 'drawings' };
    const id = safeDecode(second);
    return id ? { kind: 'drawing', id } : null;
  }
  return null;
}

/**
 * The project an old list address opens: the last one, even archived, because an archived project's trash
 * and Índice are valid; without it, the first active project of the switcher; otherwise none.
 */
export function listRedirectProject(projects: Project[], lastProjectId: string | null): string | null {
  if (lastProjectId && projects.some((project) => project.id === lastProjectId)) return lastProjectId;
  return projects.find((project) => !project.archivedAt)?.id ?? null;
}

const listTargets: Record<'documents' | 'drawings', IndexType> = { documents: 'documentos', drawings: 'desenhos' };

/** Where an old list address goes, given the project `listRedirectProject` chose. */
export function listRedirectPath(target: 'documents' | 'drawings' | 'board' | 'trash', projectId: string | null) {
  if (!projectId) return paths.noProject;
  if (target === 'board') return paths.board(projectId);
  if (target === 'trash') return paths.trash(projectId);
  return paths.index(projectId, listTargets[target]);
}

/** Where an old item address goes, once the item's project is known. */
export function itemRedirectPath(address: Extract<LegacyAddress, { kind: 'document' | 'drawing' }>, projectId: string) {
  return address.kind === 'document'
    ? paths.document(projectId, address.id, address.block ?? undefined)
    : paths.drawing(projectId, address.id);
}
