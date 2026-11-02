import type { EmbeddedItems } from '../../domain/embed-items.js';

export type {
  EmbeddedDrawing,
  EmbeddedItems,
  EmbeddedTask,
  EmbedPreview,
  EmbedProject,
} from '../../domain/embed-items.js';

/** The states of embedded items, one per distinct ID asked, in the order asked, in one read. */
export interface EmbedReader {
  embeds(ids: { taskIds: readonly string[]; canvasIds: readonly string[] }): Promise<EmbeddedItems>;
}

export interface EmbedContext {
  read<T>(work: (reader: EmbedReader) => Promise<T>): Promise<T>;
}
