import { AppError } from '@tinyfold/core/application';
import { outlineCanvasScene } from '../../domain/canvas-outline.js';
import type { ReadingContext, StoredPreview } from './ports.js';
import type { ReadDrawingInput } from './schemas.js';

/** What the agent gets as the drawing's image: the stored preview, possibly of an older version, or why there is none. */
export type DrawingImage =
  | { state: 'empty' }
  | { state: 'missing' }
  | ({ state: 'stored'; current: boolean } & StoredPreview);

/**
 * A drawing's metadata with, on request, its image and its structure. The structure always comes
 * from the current scene; the image is the last preview the browser rendered.
 */
export async function readDrawing(ctx: ReadingContext, input: ReadDrawingInput) {
  const canvas = await ctx.read((reader) => reader.canvasForReading(input.id));
  if (!canvas) throw new AppError('NOT_FOUND', 'Desenho não encontrado ou na lixeira.');
  const { scene, preview, ...drawing } = canvas;
  const empty = !scene.elements.some((element) => !element.isDeleted);
  const image: DrawingImage = empty
    ? { state: 'empty' }
    : preview
      ? { state: 'stored', current: preview.sceneVersion === drawing.version, ...preview }
      : { state: 'missing' };
  return {
    drawing,
    image: input.image ? image : null,
    outline: input.structure ? outlineCanvasScene(scene) : null,
  };
}
