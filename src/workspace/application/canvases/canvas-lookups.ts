import type { Canvas } from '../../domain/canvas/index.js';
import { workspaceErrors } from '../errors.js';
import type { WorkspaceRepository } from '../ports/context.js';

export async function requireCanvas(repo: WorkspaceRepository, id: string, includeDeleted = false): Promise<Canvas> {
  const canvas = await repo.findCanvas(id);
  if (!canvas || (!includeDeleted && canvas.deletedAt)) throw workspaceErrors.drawingMissing();
  return canvas;
}
