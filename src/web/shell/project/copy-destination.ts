import type { Project } from '../../lib/types';
import type { NavState } from '../../router/last-location';
import { activeProjects } from './project-order';

export interface CopyDestination {
  project: Project;
  /** The item's own project was archived or gone, so the copy goes elsewhere and says so. */
  redirected: boolean;
}

/**
 * Where a copy or an import of an item goes: the item's project while it is active; otherwise the active
 * project this device opened last, or the first of the selector. None without an active project.
 */
export function copyDestination(projects: Project[], ownProjectId: string, nav: NavState): CopyDestination | null {
  const active = activeProjects(projects);
  const own = active.find((project) => project.id === ownProjectId);
  if (own) return { project: own, redirected: false };
  const visitedAt = (project: Project) => nav.projects[project.id]?.at ?? '';
  const visited = active.filter(visitedAt).sort((a, b) => visitedAt(b).localeCompare(visitedAt(a)));
  const project = visited[0] ?? active[0];
  return project ? { project, redirected: true } : null;
}

/** "Cópia criada em Geral, porque Site pessoal está arquivado.", or "Importado em …" for an import. */
export function redirectedCopyText(destination: string, archived: string | undefined, done = 'Cópia criada') {
  return archived ? `${done} em ${destination}, porque ${archived} está arquivado.` : `${done} em ${destination}.`;
}

/**
 * The folder a copy or an import made on an item's page goes into (decision 15): the item's own, when it
 * stays in the item's project; the root (none) when it goes to another project.
 */
export function copyFolder(item: { projectId: string; folderId: string | null }, destination: CopyDestination) {
  return !destination.redirected && destination.project.id === item.projectId
    ? (item.folderId ?? undefined)
    : undefined;
}
