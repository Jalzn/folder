import type { RestoreAck } from '../../domain/items.js';
import { restoreItem } from '../items/lifecycle.js';
import type { WorkspaceContext } from '../ports/context.js';
import type { RestoreCanvasInput } from '../schemas/canvases.js';

export function restoreCanvas(ctx: WorkspaceContext, input: RestoreCanvasInput): Promise<RestoreAck> {
  return ctx.write('workspace.restoreCanvas', input, (repo) => restoreItem(repo, 'drawing', input, () => ctx.now()));
}
