import type { WorkspaceContext } from '../ports/context.js';
import type { PurgeItemInput } from '../schemas/trash.js';
import { type ItemRemoval, purgeTrashedItem } from './removal.js';

/** The drawing's preview goes with it. */
export const canvasRemoval: ItemRemoval = {
  find: (repo, id) => repo.findCanvas(id),
  remove: (repo, canvas) => repo.deleteCanvasRow(canvas.id),
  missing: 'O desenho não foi encontrado.',
};

export const purgeCanvas = (ctx: WorkspaceContext, input: PurgeItemInput) =>
  purgeTrashedItem(ctx, 'workspace.purgeCanvas', canvasRemoval, input);
