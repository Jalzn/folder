import type { Node } from '@tiptap/pm/model';
import type { EditorState } from '@tiptap/pm/state';
import { type BlockPlace, blockAfter, blockBefore, blockPlaces } from './embed-places';
import { embedBeside, embedSelectionOf } from './embed-selection';

/**
 * Where an embed key takes the selection, worked out from the editor's state alone; embed-keys.ts applies it:
 * - `to`: the caret at a block's start or end, or the block selected as a node when it is an embed, by the
 *   editor's API, scrolled into view;
 * - `select`: a block selected as the editor's API does it, without scrolling (⌫'s first step);
 * - `range`: a text selection between two positions, scrolled into view;
 * - `remove`: the block taken out with the document's "Remover";
 * - `consume`: the key does nothing, and nothing else gets it;
 * - null: the key is not the embeds', and ProseMirror and BlockNote go on.
 */
export type EmbedTarget =
  | { to: string; side: 'start' | 'end' }
  | { select: string }
  | { range: { anchor: number; head: number } }
  | { remove: string }
  | 'consume'
  | null;

/** Where a text's own content starts and ends, inside its content node; an embed's edges otherwise. */
const textStart = (place: BlockPlace) => place.from + 1;
const textEnd = (place: BlockPlace) => place.to - 1;

/** A range's head on the block `to`, the whole of it: its end going down, its start going up. */
function headOn(doc: Node, to: BlockPlace, forward: boolean) {
  const textual = doc.nodeAt(to.from)?.isTextblock ?? false;
  if (forward) return textual ? textEnd(to) : to.to;
  return textual ? textStart(to) : to.from;
}

/**
 * The arrows through embeds (review A2), a block at a time and never through ProseMirror's gap cursor, whose
 * invisible stops sent ↓ back to the top of the document and made ↑ skip embeds: from an embed selected as a
 * node, or a gap cursor, the next block in reading order (↓ →) or the one before (↑ ←), an embed selected as a
 * node and a text with the caret at its start or end. ← at the start of a text and → at its end select the
 * embed next to it. Up and down from a text stay ProseMirror's, which selects the embed next to it. At the
 * document's edge, nothing to go to, ProseMirror's own way stays: it makes room to write there.
 */
export function stepTarget(state: EditorState, forward: boolean, vertical: boolean): EmbedTarget {
  const { doc } = state;
  const selection = embedSelectionOf(state);
  let target: BlockPlace | null;
  if (selection.kind === 'embed')
    target = forward ? blockAfter(doc, selection.embed.to) : blockBefore(doc, selection.embed.from);
  else if (selection.kind === 'gap')
    target = forward ? blockAfter(doc, selection.pos) : blockBefore(doc, selection.pos);
  else target = vertical ? null : embedBeside(state, forward);
  return target ? { to: target.id, side: forward ? 'start' : 'end' } : null;
}

/**
 * ⇧↓ and ⇧↑ from an embed (reviews B-f and B-j), a block at a time. On an embed selected as a node: a range
 * from the embed to the end of the block after it, or from the start of the block before it. On a range that
 * grows from an embed: its head goes a block further down or up, and back on the embed the embed is selected
 * again. The browser would extend from where Chrome keeps the DOM's selection, the document's first text for
 * an embed between embeds, or from the text the range ends in, which dropped the embeds. At the document's
 * edge the key does nothing.
 */
export function extendTarget(state: EditorState, forward: boolean): EmbedTarget {
  const { doc } = state;
  const selection = embedSelectionOf(state);
  if (selection.kind === 'embed') {
    const { embed } = selection;
    const next = forward ? blockAfter(doc, embed.to) : blockBefore(doc, embed.from);
    if (!next) return 'consume';
    return { range: { anchor: forward ? embed.from : embed.to, head: headOn(doc, next, forward) } };
  }
  if (selection.kind !== 'range-from-embed') return null;
  const { embed, anchor, head } = selection;
  // The block the head is in, or at the edge of, on the range's side.
  const places = blockPlaces(doc);
  const last = head > anchor ? places.findLast((place) => place.from < head) : places.find((place) => place.to > head);
  if (!last) return 'consume';
  const next = forward ? blockAfter(doc, last.to) : blockBefore(doc, last.from);
  if (!next) return 'consume';
  if (next.id === embed.id) return { to: embed.id, side: 'start' };
  const down = next.from > embed.from;
  return { range: { anchor: down ? embed.from : embed.to, head: headOn(doc, next, down) } };
}

/**
 * ⌘↓ and ⌘↑ (Ctrl+End and Ctrl+Home off Apple platforms) on an embed selected as a node (review B-i): the end
 * of the document's last block or the start of its first. Chrome's own move started from where it keeps the
 * DOM's selection, and from the last embed of a run it went nowhere.
 */
export function edgeTarget(state: EditorState, forward: boolean): EmbedTarget {
  if (embedSelectionOf(state).kind !== 'embed') return null;
  const places = blockPlaces(state.doc);
  const target = forward ? places.at(-1) : places[0];
  return target ? { to: target.id, side: forward ? 'end' : 'start' } : null;
}

/** Page Up and Page Down on an embed selected as a node do nothing: Chrome would page from the document's top. */
export const pageTarget = (state: EditorState): EmbedTarget =>
  embedSelectionOf(state).kind === 'embed' ? 'consume' : null;

/**
 * ⌫ and Delete (review M1): never an embed in one key. With the caret at the start of a text after an embed,
 * ⌫ selects the embed, and Delete does at the end of a text before one; a second ⌫ or Delete takes the
 * selected embed out with the document's "Remover", whose toast offers Desfazer. An empty line goes as
 * BlockNote takes it, selecting the embed above, and a heading or a list item first becomes a paragraph:
 * ⌫ is the embeds' only from a paragraph with text.
 */
export function deleteTarget(state: EditorState, forward: boolean): EmbedTarget {
  const selection = embedSelectionOf(state);
  if (selection.kind === 'embed') return { remove: selection.embed.id };
  const { parent } = state.selection.$from;
  const fromParagraphWithText = parent.type.name === 'paragraph' && parent.content.size > 0;
  if (!forward && !fromParagraphWithText) return null;
  const beside = embedBeside(state, forward);
  return beside ? { select: beside.id } : null;
}
