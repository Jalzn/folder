import { workspaceErrors } from '../errors.js';
import type { ProjectFacts, ProjectLookup } from '../ports/context.js';

/**
 * The project, archived or not, or NOT_FOUND. Writes look it up in the repository; navigation
 * queries in their reader, which finds projects the same way.
 */
export async function requireProject<Project extends ProjectFacts>(
  source: ProjectLookup<Project>,
  id: string,
): Promise<Project> {
  const project = await source.findProject(id);
  if (!project) throw workspaceErrors.projectMissing();
  return project;
}

/** Items are only added to an existing project that is not archived. */
export async function requireActiveProject<Project extends ProjectFacts>(
  repo: ProjectLookup<Project>,
  id: string,
): Promise<Project> {
  const project = await requireProject(repo, id);
  if (project.archivedAt) throw workspaceErrors.projectArchived();
  return project;
}

/** The project an edited item ends up in. Leaving it out keeps the current one; another must be active. */
export async function projectForEditedItem(
  repo: ProjectLookup,
  current: string,
  requested: string | undefined,
): Promise<string> {
  if (requested === undefined || requested === current) return current;
  return (await requireActiveProject(repo, requested)).id;
}
