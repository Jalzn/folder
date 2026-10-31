import { AppError } from '@tinyfold/core/application';
import { exceedsPreviewLimits, MAX_PREVIEW_BYTES, MAX_PREVIEW_SIDE } from '../domain/canvas-preview.js';
import { hasValidRowFilters, readPngInfo } from '../domain/png.js';
import { sceneFingerprint } from '../domain/scene-fingerprint.js';
import type { PngImageData, WorkspaceContext } from './ports.js';
import type { SaveCanvasPreviewInput } from './schemas/canvases.js';

export interface CanvasPreviewAck {
  stored: boolean;
  previewVersion: number | null;
}

/**
 * Stores the PNG the browser rendered for a saved scene version. A preview is derived data: it
 * never changes the drawing's version or dates, an outdated upload is ignored without error, and
 * repeating an upload is safe, so it keeps no request record.
 *
 * An upload is current when it shows the current scene. With `sceneFingerprint`, that is what it
 * says, whatever the version: a move, a rename or a trip to the trash raise the version without
 * changing the scene. Without it, only an upload for the current version is. Either way, a preview
 * never replaces one stored for a later version.
 */
export async function saveCanvasPreview(
  ctx: WorkspaceContext,
  imageData: PngImageData,
  input: SaveCanvasPreviewInput,
): Promise<CanvasPreviewAck> {
  const tooLarge = new AppError(
    'VALIDATION',
    `A prévia passa de ${MAX_PREVIEW_SIDE.toLocaleString('pt-BR')} px no lado maior ou de ${MAX_PREVIEW_BYTES / 1024} KiB.`,
  );
  // Cheapest checks first: the size, the container, the sides, and only then the image data.
  if (input.png.byteLength > MAX_PREVIEW_BYTES) throw tooLarge;
  const notPng = new AppError('VALIDATION', 'A prévia precisa ser uma imagem PNG.');
  const info = readPngInfo(input.png);
  if (!info) throw notPng;
  if (exceedsPreviewLimits(info, input.png.byteLength)) throw tooLarge;
  const inflated = imageData.inflate(info.imageData, info.inflatedSize);
  if (!inflated || !hasValidRowFilters(info, inflated)) throw notPng;
  return ctx.writeWithoutRequestRecord(async (repo) => {
    const canvas = await repo.findCanvas(input.id);
    if (!canvas || canvas.deletedAt) throw new AppError('NOT_FOUND', 'O desenho não está disponível.');
    if (input.version > canvas.version)
      throw new AppError('VALIDATION', 'A prévia é de uma versão que o desenho ainda não tem.');
    const previewVersion = (await repo.canvasPreview(input.id))?.sceneVersion ?? null;
    const fingerprint = sceneFingerprint(canvas.scene);
    const showsCurrentScene =
      input.sceneFingerprint === undefined ? input.version === canvas.version : input.sceneFingerprint === fingerprint;
    if (!showsCurrentScene || (previewVersion !== null && previewVersion > input.version))
      return { stored: false, previewVersion };
    await repo.saveCanvasPreview({
      canvasId: input.id,
      sceneVersion: input.version,
      sceneFingerprint: fingerprint,
      png: input.png,
      width: info.width,
      height: info.height,
      createdAt: ctx.now(),
    });
    return { stored: true, previewVersion: input.version };
  });
}
