import { AppError } from '@tinyfold/core/application';
import { type Canvas, type CanvasAck, canvasPlainText, emptyCanvasScene } from '../domain/canvas.js';
import { previewShowsScene } from '../domain/canvas-preview.js';
import { assertProjectAssignment, assertVersion } from './helpers.js';
import type { WorkspaceContext, WorkspaceRepository } from './ports.js';
import type {
  CreateCanvasInput,
  DeleteCanvasInput,
  GetCanvasInput,
  ListCanvasesInput,
  RestoreCanvasInput,
  SaveCanvasInput,
} from './schemas/canvases.js';

async function requireCanvas(repo: WorkspaceRepository, id: string, includeDeleted = false): Promise<Canvas> {
  const canvas = await repo.findCanvas(id);
  if (!canvas || (!includeDeleted && canvas.deletedAt))
    throw new AppError('NOT_FOUND', 'O desenho não está disponível.');
  return canvas;
}
export function listCanvases(ctx: WorkspaceContext, input: ListCanvasesInput) {
  return ctx.read((repo) => repo.listCanvases(input));
}
/**
 * Reading a trashed scene lets the editor recover a local draft or save it as a copy.
 * `previewVersion` is the scene version of the stored PNG preview, and `previewCurrent` says whether
 * it still shows the scene, which a rename or a trip to the trash does not change.
 */
export function getCanvas(ctx: WorkspaceContext, input: GetCanvasInput) {
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
export function createCanvas(ctx: WorkspaceContext, input: CreateCanvasInput): Promise<CanvasAck> {
  return ctx.write('workspace.createCanvas', input, async (repo) => {
    const projectId = input.projectId ?? null;
    await assertProjectAssignment(repo, projectId);
    const now = ctx.now();
    const scene = input.scene ?? emptyCanvasScene();
    const canvas: Canvas = {
      id: ctx.newId(),
      title: input.title || 'Sem título',
      projectId,
      scene,
      plainText: canvasPlainText(scene),
      formatVersion: 1,
      version: 1,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    };
    await repo.insertCanvas(canvas);
    return { id: canvas.id, version: canvas.version, updatedAt: now };
  });
}
export function saveCanvas(ctx: WorkspaceContext, input: SaveCanvasInput): Promise<CanvasAck> {
  const plainText = canvasPlainText(input.scene);
  return ctx.write('workspace.saveCanvas', input, async (repo) => {
    const canvas = await requireCanvas(repo, input.id);
    assertVersion(canvas.version, input.expectedVersion);
    const projectId = input.projectId === undefined ? canvas.projectId : input.projectId;
    if (projectId !== canvas.projectId) await assertProjectAssignment(repo, projectId);
    const updatedAt = ctx.now();
    const version = canvas.version + 1;
    await repo.saveCanvas(
      { ...canvas, projectId, title: input.title || 'Sem título', scene: input.scene, plainText, version, updatedAt },
      canvas.version,
    );
    return { id: canvas.id, version, updatedAt };
  });
}
function setDeleted(
  ctx: WorkspaceContext,
  input: DeleteCanvasInput | RestoreCanvasInput,
  deleted: boolean,
): Promise<CanvasAck> {
  return ctx.write(deleted ? 'workspace.deleteCanvas' : 'workspace.restoreCanvas', input, async (repo) => {
    const canvas = await requireCanvas(repo, input.id, true);
    assertVersion(canvas.version, input.expectedVersion);
    const updatedAt = ctx.now();
    const version = canvas.version + 1;
    await repo.saveCanvas({ ...canvas, deletedAt: deleted ? updatedAt : null, version, updatedAt }, canvas.version);
    return { id: canvas.id, version, updatedAt };
  });
}
export const deleteCanvas = (ctx: WorkspaceContext, input: DeleteCanvasInput) => setDeleted(ctx, input, true);
export const restoreCanvas = (ctx: WorkspaceContext, input: RestoreCanvasInput) => setDeleted(ctx, input, false);
