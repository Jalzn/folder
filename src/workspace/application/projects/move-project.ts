import { reorderById } from '../../domain/order.js';
import type { Project } from '../../domain/project-models.js';
import { workspaceErrors } from '../errors.js';
import { renumber } from '../named-collection.js';
import type { WorkspaceContext } from '../ports/context.js';
import type { MoveProjectInput } from '../schemas/projects.js';
import { requireProject } from './project-lookups.js';

/**
 * Places an active project before another one, or at the end, and numbers the selector again. The
 * order is not an edit: versions and dates stay, and the last move wins.
 */
export function moveProject(ctx: WorkspaceContext, input: MoveProjectInput): Promise<Project[]> {
  return ctx.write('workspace.moveProject', input, async (repo) => {
    const project = await requireProject(repo, input.id);
    if (project.archivedAt) throw workspaceErrors.projectOrderArchived();
    if (input.beforeProjectId === project.id) throw workspaceErrors.sameProjectReference();
    const ordered = reorderById(await repo.listProjects(false), project.id, input.beforeProjectId);
    if (!ordered) throw workspaceErrors.staleProjectReference();
    await renumber(ordered, (id, position) => repo.setProjectPosition(id, position));
    return ordered.map((item, position) => ({ ...item, position }));
  });
}
