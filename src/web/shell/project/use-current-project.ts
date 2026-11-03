import { useProjects } from '../../lib/queries';
import type { Project } from '../../lib/types';
import { useCurrentProjectId } from '../../navigation/current-project';
import { useApp } from '../AppProvider';

/**
 * The project of the current page, archived ones included, or null where there is none: `/projetos` without
 * an active project, or an address of a project that does not exist.
 */
export function useCurrentProject(): { project: Project | null; projects: Project[] } {
  const app = useApp();
  const projectId = useCurrentProjectId(app.owner.installationId);
  const projects = useProjects(true).data ?? [];
  return { project: projects.find((project) => project.id === projectId) ?? null, projects };
}
