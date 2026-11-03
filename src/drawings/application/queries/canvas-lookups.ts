import type { Canvas } from '../../domain/canvas/index.js';
import { drawingErrors } from '../errors.js';
import type { DrawingsPorts } from '../ports.js';

export async function requireCanvas(repo: DrawingsPorts, id: string, includeDeleted = false): Promise<Canvas> {
  const canvas = await repo.findCanvas(id);
  if (!canvas || (!includeDeleted && canvas.deletedAt)) throw drawingErrors.drawingMissing();
  return canvas;
}
