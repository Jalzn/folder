import { AppError } from '@tinyfold/core/application';
import { exceedsPreviewLimits, readPngInfo } from '../domain/canvas-preview.js';
import type { WorkspaceContext } from './ports.js';
import type { SaveCanvasPreviewInput } from './schemas.js';

export interface CanvasPreviewAck {
  stored: boolean;
  previewVersion: number | null;
}

/**
 * Stores the PNG the browser rendered for a saved scene version. A preview is derived data: it
 * never changes the drawing's version or dates, an outdated upload is ignored without error, and
 * repeating an upload is safe, so it keeps no request record.
 */
export async function saveCanvasPreview(
  ctx: WorkspaceContext,
  input: SaveCanvasPreviewInput,
): Promise<CanvasPreviewAck> {
  const info = readPngInfo(input.png);
  if (!info) throw new AppError('VALIDATION', 'A prévia precisa ser uma imagem PNG.');
  if (exceedsPreviewLimits(info, input.png.byteLength))
    throw new AppError('VALIDATION', 'A prévia passa de 1.568 px no lado maior ou de 256 KiB.');
  return ctx.repeatableWrite(async (repo) => {
    const canvas = await repo.canvasState(input.id);
    if (!canvas || canvas.deletedAt) throw new AppError('NOT_FOUND', 'O desenho não está disponível.');
    if (input.version > canvas.version)
      throw new AppError('VALIDATION', 'A prévia é de uma versão que o desenho ainda não tem.');
    const previewVersion = await repo.canvasPreviewVersion(input.id);
    if (input.version < canvas.version || (previewVersion !== null && previewVersion > input.version))
      return { stored: false, previewVersion };
    await repo.saveCanvasPreview({
      canvasId: input.id,
      sceneVersion: input.version,
      png: input.png,
      width: info.width,
      height: info.height,
      createdAt: ctx.now(),
    });
    return { stored: true, previewVersion: input.version };
  });
}
