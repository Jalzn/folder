import { AppError } from '@tinyfold/core/application';
import { defaultProjectColor } from '../domain/project.js';
import type { Project } from '../domain/project-models.js';
import { assertVersion, requireProject } from './helpers.js';
import type { WorkspaceContext } from './ports/context.js';
import type {
  CreateProjectInput,
  ListProjectsInput,
  MoveProjectInput,
  UpdateProjectInput,
} from './schemas/projects.js';

/** The position after every active project in the selector. */
const endOfSelector = (active: readonly Project[]) => Math.max(-1, ...active.map((project) => project.position)) + 1;

/** The projects, each with its overdue tasks in the owner's time zone, which the selector shows. */
export async function listProjects(ctx: WorkspaceContext, input: ListProjectsInput) {
  const { today } = await ctx.calendar();
  return ctx.read(async (repo) => {
    const overdue = await repo.overdueCounts(today);
    return (await repo.listProjects(input.includeArchived ?? false)).map((project) => ({
      ...project,
      overdueTasks: overdue.get(project.id) ?? 0,
    }));
  });
}

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

/**
 * Renames, recolours, archives or unarchives a project. Any project can be archived, the last
 * active one too. An unarchived project returns at the end of the selector.
 */
export function updateProject(ctx: WorkspaceContext, input: UpdateProjectInput) {
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

/**
 * Places an active project before another one, or at the end, and numbers the selector again. The
 * order is not an edit: versions and dates stay, and the last move wins.
 */
export function moveProject(ctx: WorkspaceContext, input: MoveProjectInput): Promise<Project[]> {
  return ctx.write('workspace.moveProject', input, async (repo) => {
    const project = await requireProject(repo, input.id);
    if (project.archivedAt) throw new AppError('DOMAIN_RULE', 'Desarquive o projeto antes de mudar a ordem.');
    if (input.beforeProjectId === project.id)
      throw new AppError('VALIDATION', 'Escolha outro projeto como referência.');
    const others = (await repo.listProjects(false)).filter((item) => item.id !== project.id);
    const index =
      input.beforeProjectId === null ? others.length : others.findIndex((item) => item.id === input.beforeProjectId);
    if (index < 0)
      throw new AppError(
        'VERSION_CONFLICT',
        'O projeto de referência não está mais entre os ativos. Atualize a lista.',
      );
    const ordered = others.toSpliced(index, 0, project);
    for (const [position, item] of ordered.entries())
      if (item.position !== position) await repo.setProjectPosition(item.id, position);
    return ordered.map((item, position) => ({ ...item, position }));
  });
}
