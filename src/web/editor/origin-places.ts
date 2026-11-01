import { excerptEnd } from '@tinyfold/workspace/domain';
import type { Node as ProseNode } from '@tiptap/pm/model';

/** A task born in the document, as its marker shows it. */
export interface OriginMarker {
  taskId: string;
  title: string;
  /** The column's name, or "Concluída". */
  status: string;
  /** The ring of the task's column: its place among the columns, and whether it is the done one. */
  ring: { index: number; count: number; done: boolean };
  blockId: string;
  excerpt: string;
}

/** Where a marker goes: after the excerpt in its block, or at the block's end once the excerpt changed. */
export interface MarkerPlace {
  marker: OriginMarker;
  /** The position the widget sits at. */
  at: number;
  /** The excerpt's range, for the underline on hover; null when the block no longer has it. */
  excerpt: { from: number; to: number } | null;
}

/** The document position of a character offset in a text block, counting what its inline nodes read as text. */
function positionAt(content: ProseNode, start: number, offset: number) {
  let remaining = offset;
  let found: number | undefined;
  content.forEach((child, childOffset) => {
    if (found !== undefined) return;
    const length = child.isText ? (child.text ?? '').length : child.textContent.length;
    if (remaining <= length) found = start + childOffset + (child.isText ? remaining : child.nodeSize);
    else remaining -= length;
  });
  return found ?? start + content.content.size;
}

/**
 * Where an excerpt starts, given where it ends (excerptEnd): the shortest tail of the text up to the end that
 * still holds the whole excerpt, with whitespace runs matched as one space as excerptEnd does.
 */
function excerptStart(text: string, excerpt: string, end: number) {
  for (let start = end - 1; start >= 0; start -= 1)
    if (excerptEnd(text.slice(start, end), excerpt) === end - start) return start;
  return undefined;
}

/**
 * The places of the markers in a document (docs/etapas/11-documento-desenho.md, decision 8): each in the block
 * its task came from, right after the excerpt (`excerptEnd`), or at the block's end when the excerpt changed;
 * none when the block is gone. Several from one excerpt sit side by side, in the order given.
 */
export function markerPlaces(doc: ProseNode, markers: readonly OriginMarker[], hovered: string | null = null) {
  const byBlock = new Map<string, OriginMarker[]>();
  for (const marker of markers) byBlock.set(marker.blockId, [...(byBlock.get(marker.blockId) ?? []), marker]);
  const places: MarkerPlace[] = [];
  doc.descendants((node, pos) => {
    if (node.type.name !== 'blockContainer') return true;
    const own = byBlock.get(String(node.attrs.id));
    const content = node.firstChild;
    if (own && content?.isTextblock) {
      const start = pos + 2;
      const text = content.textContent;
      for (const marker of own) {
        const end = excerptEnd(text, marker.excerpt);
        const begin =
          end === undefined || marker.taskId !== hovered ? undefined : excerptStart(text, marker.excerpt, end);
        places.push({
          marker,
          at: end === undefined ? start + content.content.size : positionAt(content, start, end),
          excerpt:
            begin === undefined || end === undefined
              ? null
              : { from: positionAt(content, start, begin), to: positionAt(content, start, end) },
        });
      }
    }
    return true;
  });
  return places;
}
