import { assertVersion } from '#core/application';
import type { Project } from '../../domain/project-models.js';
import type { ProjectsContext } from '../ports/context.js';
import type { UpdateProjectInput } from '../schemas/projects.js';
import { requireProject } from './project-lookups.js';
import { endOfSelector } from './project-order.js';

/**
 * Renames, recolours, archives or unarchives a project. Any project can be archived, the last
 * active one too. An unarchived project returns at the end of the selector.
 */
export function updateProject(ctx: ProjectsContext, input: UpdateProjectInput) {
  return ctx.write('workspace.updateProject', input, async (repo) => {
    const project = await requireProject(repo, input.id);
    assertVersion(project.version, input.expectedVersion);
    const now = ctx.now();
    const unarchived = input.archived === false && project.archivedAt !== null;
    const changed: Project = {
      ...project,
      name: input.name ?? project.name,
      color: input.color ?? project.color,
      archivedAt:
        input.archived === undefined ? project.archivedAt : input.archived ? (project.archivedAt ?? now) : null,
      position: unarchived ? endOfSelector(await repo.listProjects(false)) : project.position,
      version: project.version + 1,
      updatedAt: now,
    };
    await repo.saveProject(changed, project.version);
    return changed;
  });
}
