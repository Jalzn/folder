import { defaultProjectColor } from '../../domain/project.js';
import type { Project } from '../../domain/project-models.js';
import type { WorkspaceContext } from '../ports/context.js';
import type { CreateProjectInput } from '../schemas/projects.js';
import { endOfSelector } from './project-order.js';

/** A new project joins the end of the selector, in the first colour no active project uses. */
export function createProject(ctx: WorkspaceContext, input: CreateProjectInput) {
  return ctx.write('workspace.createProject', input, async (repo) => {
    const active = await repo.listProjects(false);
    const now = ctx.now();
    const project: Project = {
      id: ctx.newId(),
      name: input.name,
      color: input.color ?? defaultProjectColor(active.map((item) => item.color)),
      position: endOfSelector(active),
      version: 1,
      archivedAt: null,
      createdAt: now,
      updatedAt: now,
    };
    await repo.insertProject(project);
    return project;
  });
}
