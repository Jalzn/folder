import type { ListCanvasesInput } from '../contracts/schemas.js';
import type { DrawingsContext } from '../ports.js';
export function listCanvases(ctx: DrawingsContext, input: ListCanvasesInput) {
  return ctx.read((repo) => repo.listCanvases(input));
}
