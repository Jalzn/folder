import { assertVersion } from '@tinyfold/core/application';
import type { CanvasAck, CanvasRestoreAck } from '../../domain/index.js';
import type { DeleteCanvasInput, PurgeCanvasInput, RestoreCanvasInput } from '../contracts/schemas.js';
import { drawingErrors } from '../errors.js';
import type { DrawingsContext } from '../ports.js';
import { requireCanvas } from '../queries/canvas-lookups.js';

export function deleteCanvas(ctx: DrawingsContext, input: DeleteCanvasInput): Promise<CanvasAck> {
  return ctx.write('workspace.deleteCanvas', input, async (repo) => {
    const canvas = await requireCanvas(repo, input.id, true);
    assertVersion(canvas.version, input.expectedVersion);
    const updatedAt = ctx.now();
    await repo.trashCanvas({ id: canvas.id, at: updatedAt, expectedVersion: canvas.version });
    return { id: canvas.id, version: canvas.version + 1, updatedAt };
  });
}

export function restoreCanvas(ctx: DrawingsContext, input: RestoreCanvasInput): Promise<CanvasRestoreAck> {
  return ctx.write('workspace.restoreCanvas', input, async (repo) => {
    const canvas = await requireCanvas(repo, input.id, true);
    assertVersion(canvas.version, input.expectedVersion);
    const folder = canvas.folderId === null ? undefined : await repo.findFolder(canvas.folderId);
    const folderGone = canvas.folderId !== null && (!folder || folder.deletedAt !== null);
    const updatedAt = ctx.now();
    await repo.restoreCanvas({
      id: canvas.id,
      place: { folderId: folderGone ? null : canvas.folderId, pinnedAt: canvas.pinnedAt },
      at: updatedAt,
      expectedVersion: canvas.version,
    });
    return { id: canvas.id, version: canvas.version + 1, updatedAt, folderGone };
  });
}

export function purgeCanvas(ctx: DrawingsContext, input: PurgeCanvasInput): Promise<{ id: string }> {
  return ctx.write('workspace.purgeCanvas', input, async (repo) => {
    const canvas = await repo.findCanvas(input.id);
    if (!canvas) throw drawingErrors.drawingPurgeMissing();
    assertVersion(canvas.version, input.expectedVersion);
    if (!canvas.deletedAt) throw drawingErrors.itemNotTrashed();
    await repo.deleteCanvasRow(canvas.id);
    return { id: canvas.id };
  });
}
