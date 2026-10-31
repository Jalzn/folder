import { AppError } from '@tinyfold/core/application';
import type { Document, Project } from '../domain/models.js';
import type { TaskRecord, WorkspaceRepository } from './ports.js';

export function assertVersion(actual: number, expected: number): void {
  if (actual !== expected)
    throw new AppError(
      'VERSION_CONFLICT',
      'Este item mudou em outro dispositivo. Atualize os dados antes de continuar.',
    );
}

export async function requireProject(repo: WorkspaceRepository, id: string): Promise<Project> {
  const project = await repo.findProject(id);
  if (!project) throw new AppError('NOT_FOUND', 'O projeto não foi encontrado.');
  return project;
}

/** Items are only added to an existing project that is not archived. */
export async function requireActiveProject(repo: WorkspaceRepository, id: string): Promise<Project> {
  const project = await requireProject(repo, id);
  if (project.archivedAt) throw new AppError('VALIDATION', 'Desarquive o projeto antes de adicionar conteúdo a ele.');
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

export async function requireTask(repo: WorkspaceRepository, id: string): Promise<TaskRecord> {
  const task = await repo.findTask(id);
  if (!task || task.deletedAt) throw new AppError('NOT_FOUND', 'A tarefa não foi encontrada.');
  return task;
}
