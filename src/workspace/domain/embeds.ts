import type { DocumentBlock } from './models.js';

/**
 * Tasks and drawings embedded in a document: a block with the item's ID, resolved at each read, with
 * no foreign key or reverse index (stage 11, decision 1). Only documents take them; a task's
 * description does not.
 */
export const EMBED_TYPES = ['taskEmbed', 'drawingEmbed'] as const;

export type EmbedBlockType = (typeof EMBED_TYPES)[number];

/** The item an embed shows, as the serializer and the resolver name it. */
export type EmbedKind = 'task' | 'drawing';

/** The one prop of each embed block, the item's ID. */
export const EMBED_PROPS = { taskEmbed: 'taskId', drawingEmbed: 'canvasId' } as const;

export const EMBED_KINDS: Record<EmbedBlockType, EmbedKind> = { taskEmbed: 'task', drawingEmbed: 'drawing' };

/** One resolver query per document, and the MCP's Markdown in a few pages (decision 2). */
export const EMBED_LIMITS = { perDocument: 200 } as const;

/**
 * A UUID of the RFC 9562 layout in lowercase, as the item IDs are stored: what embed blocks and the
 * resolver's input accept. SQLite compares IDs as text, so an uppercase spelling would resolve as
 * missing and count as a second item; refusing it keeps the validator a check that never rewrites
 * a document, and the server only hands out lowercase IDs.
 */
export const EMBED_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u;

export const isEmbedType = (type: string): type is EmbedBlockType => (EMBED_TYPES as readonly string[]).includes(type);

/** Every block in reading order: each one, then its children. */
function* eachBlock(blocks: readonly DocumentBlock[]): Generator<DocumentBlock> {
  for (const block of blocks) {
    yield block;
    if (block.children) yield* eachBlock(block.children);
  }
}

/** The kind and item ID of an embed block, or undefined for any other block. */
export function embedOf(block: DocumentBlock): { kind: EmbedKind; id: string } | undefined {
  if (!isEmbedType(block.type)) return undefined;
  const id = block.props?.[EMBED_PROPS[block.type]];
  return typeof id === 'string' ? { kind: EMBED_KINDS[block.type], id } : undefined;
}

/** The IDs a document embeds, each once, in reading order: what the resolver is asked for. */
export function embedIds(blocks: readonly DocumentBlock[]): { taskIds: string[]; canvasIds: string[] } {
  const taskIds = new Set<string>();
  const canvasIds = new Set<string>();
  for (const block of eachBlock(blocks)) {
    const embed = embedOf(block);
    if (embed) (embed.kind === 'task' ? taskIds : canvasIds).add(embed.id);
  }
  return { taskIds: [...taskIds], canvasIds: [...canvasIds] };
}

/**
 * The number of each drawing's figure, by block ID: drawings count from 1 in reading order, the
 * unavailable ones included, as the prototype's figNum does, so the numbers follow the blocks.
 */
export function figureNumbers(blocks: readonly DocumentBlock[]): Map<string, number> {
  const numbers = new Map<string, number>();
  let count = 0;
  for (const block of eachBlock(blocks)) {
    if (block.type !== 'drawingEmbed') continue;
    count += 1;
    if (block.id !== undefined) numbers.set(block.id, count);
  }
  return numbers;
}
