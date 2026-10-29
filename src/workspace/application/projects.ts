import { assertProjectAssignment, assertVersion, requireProject } from './helpers.js';
import type { WorkspaceContext } from './ports.js';
import type { CreateProjectInput, ListProjectsInput, UpdateProjectInput } from './schemas.js';

export function listProjects(ctx: WorkspaceContext, input: ListProjectsInput) {
  return ctx.read((repo) => repo.listProjects(input.includeArchived ?? false));
}

export function createProject(ctx: WorkspaceContext, input: CreateProjectInput) {
  return ctx.write('workspace.createProject', input, async (repo) => {
    const now = ctx.now();
    const project = { id: ctx.newId(), name: input.name, version: 1, archivedAt: null, createdAt: now, updatedAt: now };
    await repo.insertProject(project);
    return project;
  });
}

export function updateProject(ctx: WorkspaceContext, input: UpdateProjectInput) {
  return ctx.write('workspace.updateProject', input, async (repo) => {
    const project = await requireProject(repo, input.id);
    assertVersion(project.version, input.expectedVersion);
    const now = ctx.now();
    const changed = {
      ...project,
      name: input.name ?? project.name,
      archivedAt:
        input.archived === undefined ? project.archivedAt : input.archived ? (project.archivedAt ?? now) : null,
      version: project.version + 1,
      updatedAt: now,
    };
    await repo.saveProject(changed, project.version);
    return changed;
  });
}

export { assertProjectAssignment };
