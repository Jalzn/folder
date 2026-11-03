import { outlineCanvasScene } from '../../domain/canvas/outline.js';
import { previewShowsScene } from '../../domain/canvas/preview.js';
import type { ReadDrawingInput } from '../contracts/schemas.js';
import { drawingErrors } from '../errors.js';
import type { DrawingsContext, StoredPreview } from '../ports.js';

export type DrawingImage =
  | { state: 'empty' }
  | { state: 'missing' }
  | ({ state: 'stored'; current: boolean } & StoredPreview);

/** Captures the scene, preview and organization metadata in one consistent read. */
export async function readDrawing(ctx: DrawingsContext, input: ReadDrawingInput) {
  const found = await ctx.read(async (repo) => {
    const canvas = await repo.findCanvas(input.id);
    if (!canvas || canvas.deletedAt) return undefined;
    const project = await repo.findProject(canvas.projectId);
    if (!project) return undefined;
    const folder = canvas.folderId ? await repo.findFolder(canvas.folderId) : undefined;
    const preview = await repo.storedPreview(canvas.id);
    return { canvas, project, folder, preview };
  });
  if (!found) throw drawingErrors.drawingUnreadable();
  const { canvas, project, folder, preview } = found;
  const empty = !canvas.scene.elements.some((element) => !element.isDeleted);
  const image: DrawingImage = empty
    ? { state: 'empty' }
    : preview
      ? { state: 'stored', current: previewShowsScene(preview, canvas), ...preview }
      : { state: 'missing' };
  return {
    drawing: {
      id: canvas.id,
      title: canvas.title,
      projectId: project.id,
      projectName: project.name,
      projectArchived: project.archivedAt !== null,
      folder: folder ? { id: folder.id, name: folder.name } : null,
      version: canvas.version,
      updatedAt: canvas.updatedAt,
    },
    image: input.image ? image : null,
    outline: input.structure ? outlineCanvasScene(canvas.scene) : null,
  };
}
