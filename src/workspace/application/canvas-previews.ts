import { isCanvasId } from '../domain/canvas.js';
import { exceedsPreviewLimits, MAX_PREVIEW_BYTES } from '../domain/canvas-preview.js';
import { hasValidRowFilters, readPngInfo } from '../domain/png.js';
import { sceneFingerprint } from '../domain/scene-fingerprint.js';
import { workspaceErrors } from './errors.js';
import type { PngImageData } from './ports/canvases.js';
import type { WorkspaceContext } from './ports/context.js';
import type { SaveCanvasPreviewInput } from './schemas/canvases.js';

/** A live drawing's stored preview, as the document's figure loads it. */
export interface CanvasPreviewImage {
  png: Uint8Array;
  /** A strong ETag that changes with the scene the image shows. */
  etag: string;
}

/**
 * The stored preview of a drawing out of the trash, for GET /arquivos/desenhos/:id/previa.png, or
 * undefined when the drawing is in the trash, deleted, never existed or has no preview. The tag is
 * the scene's fingerprint, or the version a preview from before fingerprints was made at, so the
 * browser revalidates and never shows an older scene once a newer preview is stored.
 */
export function readCanvasPreviewImage(ctx: WorkspaceContext, id: string): Promise<CanvasPreviewImage | undefined> {
  if (!isCanvasId(id)) throw workspaceErrors.invalidDrawingId();
  return ctx.read(async (repo) => {
    const preview = await repo.liveCanvasPreviewImage(id);
    return preview && { png: preview.png, etag: `"${preview.sceneFingerprint ?? `v${preview.sceneVersion}`}"` };
  });
}

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
  const tooLarge = workspaceErrors.previewTooLarge();
  // Cheapest checks first: the size, the container, the sides, and only then the image data.
  if (input.png.byteLength > MAX_PREVIEW_BYTES) throw tooLarge;
  const notPng = workspaceErrors.previewMustBePng();
  const info = readPngInfo(input.png);
  if (!info) throw notPng;
  if (exceedsPreviewLimits(info, input.png.byteLength)) throw tooLarge;
  const inflated = imageData.inflate(info.imageData, info.inflatedSize);
  if (!inflated || !hasValidRowFilters(info, inflated)) throw notPng;
  return ctx.writeWithoutRequestRecord(async (repo) => {
    const canvas = await repo.findCanvas(input.id);
    if (!canvas || canvas.deletedAt) throw workspaceErrors.drawingMissing();
    if (input.version > canvas.version) throw workspaceErrors.futurePreview();
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
