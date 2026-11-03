import type { WorkspaceContext } from '../ports/context.js';
import type { ListCanvasesInput } from '../schemas/canvases.js';
export function listCanvases(ctx: WorkspaceContext, input: ListCanvasesInput) {
  return ctx.read((repo) => repo.listCanvases(input));
}
