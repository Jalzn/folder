import { operation } from '#core/application';
import { resolveEmbeds } from '../../application/embeds/resolve-embeds.js';
import type { ReadingContext } from '../../application/reading/ports.js';
import { ResolveEmbedsInput } from '../../application/schemas/embeds.js';

/** The editor's read of what its document embeds, with the SQL the MCP reads them by. */
export const embedOperations = (reading: ReadingContext) => ({
  resolveEmbeds: operation(ResolveEmbedsInput, (input) => resolveEmbeds(reading, input)),
});
