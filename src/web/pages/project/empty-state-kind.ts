import type { Project } from '../../lib/types';

/**
 * The empty state of `/projetos`: "Comece um projeto" with no project at all, "Nenhum projeto ativo" when
 * every project is archived, and none while an active project exists.
 */
export function emptyStateKind(projects: Project[]): 'first-project' | 'all-archived' | null {
  if (projects.length === 0) return 'first-project';
  return projects.every((project) => project.archivedAt) ? 'all-archived' : null;
}
