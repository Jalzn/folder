import type { Project } from '../../domain/project-models.js';
import { workspaceErrors } from '../errors.js';
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
    const others = (await repo.listProjects(false)).filter((item) => item.id !== project.id);
    const index =
      input.beforeProjectId === null ? others.length : others.findIndex((item) => item.id === input.beforeProjectId);
    if (index < 0) throw workspaceErrors.staleProjectReference();
    const ordered = others.toSpliced(index, 0, project);
    for (const [position, item] of ordered.entries())
      if (item.position !== position) await repo.setProjectPosition(item.id, position);
    return ordered.map((item, position) => ({ ...item, position }));
  });
}
