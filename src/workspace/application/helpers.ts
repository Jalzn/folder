import { AppError } from '@tinyfold/core/application';
import type { Canvas } from '../domain/canvas.js';
import type { Document } from '../domain/document-models.js';
import type { NavItemType } from '../domain/navigation.js';
import type { Project } from '../domain/project-models.js';
import type { WorkspaceRepository } from './ports/context.js';
import type { ProjectRepository } from './ports/projects.js';
import type { TaskRecord } from './ports/tasks.js';

/** The one answer to a stale version, whether the write sees it before or during its UPDATE. */
export const versionConflict = () =>
  new AppError('VERSION_CONFLICT', 'Este item mudou em outro dispositivo. Atualize os dados antes de continuar.');

export function assertVersion(actual: number, expected: number): void {
  if (actual !== expected) throw versionConflict();
}

/**
 * The project, archived or not, or NOT_FOUND. Writes look it up in the repository; navigation
 * queries in their reader, which finds projects the same way.
 */
export async function requireProject(source: Pick<ProjectRepository, 'findProject'>, id: string): Promise<Project> {
  const project = await source.findProject(id);
  if (!project) throw new AppError('NOT_FOUND', 'O projeto não foi encontrado.');
  return project;
}

/** Items are only added to an existing project that is not archived. */
export async function requireActiveProject(repo: WorkspaceRepository, id: string): Promise<Project> {
  const project = await requireProject(repo, id);
  if (project.archivedAt) throw new AppError('DOMAIN_RULE', 'Desarquive o projeto antes de adicionar conteúdo a ele.');
  return project;
}

/** The project an edited item ends up in. Leaving it out keeps the current one; another must be active. */
export async function projectForEditedItem(
  repo: WorkspaceRepository,
  current: string,
  requested: string | undefined,
): Promise<string> {
  if (requested === undefined || requested === current) return current;
  return (await requireActiveProject(repo, requested)).id;
}

export async function requireDocument(
  repo: WorkspaceRepository,
  id: string,
  includeDeleted = false,
): Promise<Document> {
  const document = await repo.findDocument(id);
  if (!document || (!includeDeleted && document.deletedAt))
    throw new AppError('NOT_FOUND', 'O documento não está disponível.');
  return document;
}

const missingItem = { document: 'O documento não está disponível.', drawing: 'O desenho não está disponível.' };

/** A live document or drawing, the items that can be pinned or moved between projects. */
export async function requireLiveItem(
  repo: WorkspaceRepository,
  type: NavItemType,
  id: string,
): Promise<Document | Canvas> {
  const item = type === 'document' ? await repo.findDocument(id) : await repo.findCanvas(id);
  if (!item || item.deletedAt) throw new AppError('NOT_FOUND', missingItem[type]);
  return item;
}

export async function requireTask(repo: WorkspaceRepository, id: string): Promise<TaskRecord> {
  const task = await repo.findTask(id);
  if (!task || task.deletedAt) throw new AppError('NOT_FOUND', 'A tarefa não foi encontrada.');
  return task;
}
