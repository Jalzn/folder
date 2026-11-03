import type { TrashPorts } from '../ports/context.js';
import type { ItemRemoval } from './removal.js';

type CanvasPurgePorts = Pick<TrashPorts, 'findCanvas' | 'deleteCanvasRow'>;

/** The drawing's preview goes with it. */
export const canvasRemoval: ItemRemoval<CanvasPurgePorts> = {
  find: (repo, id) => repo.findCanvas(id),
  remove: (repo, canvas) => repo.deleteCanvasRow(canvas.id),
  missing: 'O desenho não foi encontrado.',
};
