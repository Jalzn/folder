import type { Project } from '../../domain/project-models.js';
import { workspaceErrors } from '../errors.js';
import type { ProjectsRepository } from '../ports/context.js';
import type { ProjectRepository } from '../ports/projects.js';

/**
 * The project, archived or not, or NOT_FOUND. Writes look it up in the repository; navigation
 * queries in their reader, which finds projects the same way.
 */
export async function requireProject(source: Pick<ProjectRepository, 'findProject'>, id: string): Promise<Project> {
  const project = await source.findProject(id);
  if (!project) throw workspaceErrors.projectMissing();
  return project;
}

/** Items are only added to an existing project that is not archived. */
export async function requireActiveProject(repo: ProjectsRepository, id: string): Promise<Project> {
  const project = await requireProject(repo, id);
  if (project.archivedAt) throw workspaceErrors.projectArchived();
  return project;
}

/** The project an edited item ends up in. Leaving it out keeps the current one; another must be active. */
export async function projectForEditedItem(
  repo: ProjectsRepository,
  current: string,
  requested: string | undefined,
): Promise<string> {
  if (requested === undefined || requested === current) return current;
  return (await requireActiveProject(repo, requested)).id;
}
