import { type EditorState, type NodeSelection, TextSelection } from '@tiptap/pm/state';
import { isEmbedType } from './embed-blocks';
import { type BlockPlace, blockAfter, blockBefore, blockPlaces } from './embed-places';

/**
 * What the selection is, as the embed keys read it (docs/etapas/11-documento-desenho.md, "Teclado e Esc"):
 * - `embed`: an embed selected as a node, the only time most of the keys are the embed's;
 * - `range-from-embed`: a range ⇧↓ or ⇧↑ grew from an embed, its anchor on the embed's edge;
 * - `gap`: ProseMirror's gap cursor, between two blocks without text;
 * - `text`: anything else, a caret or a range in the text.
 */
export type EmbedSelection =
  | { kind: 'embed'; embed: BlockPlace }
  | { kind: 'range-from-embed'; embed: BlockPlace; anchor: number; head: number }
  | { kind: 'gap'; pos: number }
  | { kind: 'text' };

/** Whether the state has an embed selected as a node. */
export function isEmbedSelected({ selection }: EditorState) {
  return 'node' in selection && isEmbedType((selection as NodeSelection).node.type.name);
}

/**
 * The embed a range grows from, as ⇧↓ and ⇧↑ made it: its anchor at the embed's start with the head below,
 * or at its end with the head above. Null for any other selection, a text's own included.
 */
function rangeFromEmbed({ selection, doc }: EditorState) {
  if (!(selection instanceof TextSelection) || selection.empty) return null;
  const { anchor, head } = selection;
  const embed = blockPlaces(doc).find((place) => (head > anchor ? place.from : place.to) === anchor);
  return embed && isEmbedType(embed.type) ? embed : null;
}

export function embedSelectionOf(state: EditorState): EmbedSelection {
  const { selection, doc } = state;
  if (isEmbedSelected(state)) {
    const embed = blockPlaces(doc).find((place) => place.from === selection.from);
    if (embed) return { kind: 'embed', embed };
  }
  if (selection.toJSON().type === 'gapcursor') return { kind: 'gap', pos: selection.from };
  const embed = rangeFromEmbed(state);
  if (embed) return { kind: 'range-from-embed', embed, anchor: selection.anchor, head: selection.head };
  return { kind: 'text' };
}

/**
 * The embed next to a caret at the edge of a text: after its end (`forward`) or before its start, in reading
 * order; null when the caret is elsewhere or the block beside it is not an embed.
 */
export function embedBeside({ selection, doc }: EditorState, forward: boolean) {
  const { $from } = selection;
  const edge = forward ? $from.parent.content.size : 0;
  if (!selection.empty || !$from.parent.isTextblock || $from.parentOffset !== edge) return null;
  const beside = forward ? blockAfter(doc, $from.after()) : blockBefore(doc, $from.before());
  return beside && isEmbedType(beside.type) ? beside : null;
}
