import type { Node } from '@tiptap/pm/model';

/** A block's content in the ProseMirror document: the block's ID and type, and where its content node sits. */
export interface BlockPlace {
  id: string;
  type: string;
  from: number;
  to: number;
}

/** Every block's content in reading order, a block before its children, as the arrows go through them. */
export function blockPlaces(doc: Node): BlockPlace[] {
  const places: BlockPlace[] = [];
  doc.descendants((node, pos, parent) => {
    if (!node.type.isInGroup('blockContent')) return true;
    const id = parent?.attrs.id;
    if (typeof id === 'string') places.push({ id, type: node.type.name, from: pos, to: pos + node.nodeSize });
    return false;
  });
  return places;
}

/** The first block whose content starts at `pos` or after it: what ↓ and → go to. */
export const blockAfter = (doc: Node, pos: number) => blockPlaces(doc).find((place) => place.from >= pos) ?? null;

/** The last block whose content ends at `pos` or before it: what ↑ and ← go to. */
export const blockBefore = (doc: Node, pos: number) => blockPlaces(doc).findLast((place) => place.to <= pos) ?? null;
