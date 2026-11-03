import type { CanvasAck } from '../../domain/canvas.js';
import { trashItem } from '../items/lifecycle.js';
import type { WorkspaceContext } from '../ports/context.js';
import type { DeleteCanvasInput } from '../schemas/canvases.js';
export function deleteCanvas(ctx: WorkspaceContext, input: DeleteCanvasInput): Promise<CanvasAck> {
  return ctx.write('workspace.deleteCanvas', input, (repo) => trashItem(repo, 'drawing', input, () => ctx.now()));
}
