import { AppError } from '@tinyfold/core/application';
import { outlineCanvasScene } from '../../domain/canvas-outline.js';
import type { ReadingContext } from './ports.js';
import type { ReadDrawingInput } from './schemas.js';

/** A drawing's metadata and, on request, its structure, always derived from the current scene. */
export async function readDrawing(ctx: ReadingContext, input: ReadDrawingInput) {
  const canvas = await ctx.read((reader) => reader.canvasForReading(input.id));
  if (!canvas) throw new AppError('NOT_FOUND', 'Desenho não encontrado ou na lixeira.');
  const { scene, ...drawing } = canvas;
  return {
    drawing,
    empty: !scene.elements.some((element) => !element.isDeleted),
    outline: input.structure ? outlineCanvasScene(scene) : null,
  };
}
