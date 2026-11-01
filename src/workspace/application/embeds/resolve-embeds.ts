import type { ResolveEmbedsInput } from '../schemas/embeds.js';
import type { EmbedContext, EmbeddedItems } from './ports.js';

/**
 * The state of each task and drawing a document embeds, for the editor: one read per document, with
 * the IDs the editor has, saved or not. A read: no request record.
 */
export function resolveEmbeds(ctx: EmbedContext, input: ResolveEmbedsInput): Promise<EmbeddedItems> {
  return ctx.read((reader) => reader.embeds(input));
}
