import { previewShowsScene } from '../../domain/canvas/preview.js';
import type { GetCanvasInput } from '../contracts/schemas.js';
import type { DrawingsContext } from '../ports.js';
import { requireCanvas } from '../queries/canvas-lookups.js';
/**
 * Reading a trashed scene lets the editor recover a local draft or save it as a copy.
 * `previewVersion` is the scene version of the stored PNG preview, and `previewCurrent` says whether
 * it still shows the scene, which a rename or a trip to the trash does not change.
 */
export function getCanvas(ctx: DrawingsContext, input: GetCanvasInput) {
  return ctx.read(async (repo) => {
    const canvas = await requireCanvas(repo, input.id, true);
    const preview = await repo.canvasPreview(input.id);
    return {
      ...canvas,
      previewVersion: preview?.sceneVersion ?? null,
      previewCurrent: preview ? previewShowsScene(preview, canvas) : false,
    };
  });
}
