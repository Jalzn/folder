import { type DocumentBlock, EMBED_TYPES, type EmbedBlockType, type EmbedKind } from '@tinyfold/workspace/domain';

/**
 * Each embed block's item kind and its one property, the item's ID: the names a document's blocks, the editor's
 * nodes and the clipboard use for an embed (docs/etapas/11-documento-desenho.md, "Blocos"). The domain's
 * EMBED_KINDS and EMBED_PROPS say the same, and replace this table when the domain exports them (B3.1).
 */
export const EMBED_BLOCKS = {
  taskEmbed: { kind: 'task', prop: 'taskId' },
  drawingEmbed: { kind: 'drawing', prop: 'canvasId' },
} as const satisfies Record<EmbedBlockType, { kind: EmbedKind; prop: string }>;

const embedTypes: ReadonlySet<string> = new Set(EMBED_TYPES);

/** Whether a block or node type is an embed's. */
export const isEmbedType = (type: string): type is EmbedBlockType => embedTypes.has(type);

/** The block type of an item kind: `taskEmbed` for a task, `drawingEmbed` for a drawing. */
export const embedBlockType = (kind: EmbedKind): EmbedBlockType => (kind === 'task' ? 'taskEmbed' : 'drawingEmbed');

/** A new embed block of an item, as the editor inserts it. */
export function embedBlock(kind: EmbedKind, id: string) {
  const type = embedBlockType(kind);
  return { type, props: { [EMBED_BLOCKS[type].prop]: id } } as
    | { type: 'taskEmbed'; props: { taskId: string } }
    | { type: 'drawingEmbed'; props: { canvasId: string } };
}

/** The item an embed block or an editor's embed node names; null for any other block. */
export function embedOf(
  block: Pick<DocumentBlock, 'type' | 'props'> | { type: { name: string }; attrs: Record<string, unknown> },
): { kind: EmbedKind; id: string } | null {
  const type = typeof block.type === 'string' ? block.type : block.type.name;
  if (!isEmbedType(type)) return null;
  const props: Record<string, unknown> = 'attrs' in block ? block.attrs : (block.props ?? {});
  const { kind, prop } = EMBED_BLOCKS[type];
  return { kind, id: String(props[prop] ?? '') };
}

/** Embed blocks in BlockNote's own clipboard HTML. */
export const EMBED_CLIPBOARD_MARK = new RegExp(`data-content-type="(?:${EMBED_TYPES.join('|')})"`);
