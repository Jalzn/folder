import { TextSelection } from '@tiptap/pm/state';
import type { AnyBlockEditor } from '../types';
import { isEmbedType } from './embed-blocks';
import type { EmbedClipboardActions } from './embed-clipboard';
import { isEmbedSelected } from './embed-selection';
import { deleteTarget, type EmbedTarget, edgeTarget, extendTarget, pageTarget, stepTarget } from './embed-targets';
import { syncSelectionFromDom } from './selection-drift';

/**
 * What the keys ask of the document: an embed's block out, as "Remover" takes it, with Desfazer, and the
 * words and link of a copied one (embed-clipboard.ts).
 */
export type EmbedKeyActions = EmbedClipboardActions;

interface EmbedKeyContext {
  editor: AnyBlockEditor;
  event: KeyboardEvent;
  actions: EmbedKeyActions;
}

/** What a key of the table is for (docs/etapas/11-documento-desenho.md, "Teclado e Esc"). */
export type EmbedKeyIntent = 'open' | 'select-or-remove' | 'step' | 'extend' | 'to-edge' | 'stay' | 'keep-out';

export interface EmbedKey {
  /** The key as BlockNote's and ProseMirror's keymaps name it, one modifier at most: `Shift-ArrowDown`. */
  key: string;
  intent: EmbedKeyIntent;
  /** Whether the guard against Chrome's drift holds the selection from its keydown (selection-drift.ts). */
  holds: boolean;
  /** True when the key was the embeds', and nothing else gets it. */
  run: (context: EmbedKeyContext) => boolean;
}

/** Takes the selection where `target` says, by the editor's API; false when the key is not the embeds'. */
function apply({ editor, actions }: EmbedKeyContext, target: EmbedTarget) {
  if (target === null) return false;
  if (target === 'consume') return true;
  if ('remove' in target) actions.remove(target.remove);
  else if ('select' in target) editor.setTextCursorPosition(target.select);
  else
    editor.transact((tr) => {
      if ('range' in target) tr.setSelection(TextSelection.create(tr.doc, target.range.anchor, target.range.head));
      else editor.setTextCursorPosition(target.to, target.side);
      tr.scrollIntoView();
    });
  return true;
}

/** ↵: what a click on the embed does, the card's drawer or the figure's drawing. */
function open({ editor }: EmbedKeyContext) {
  if (!isEmbedSelected(editor.prosemirrorState)) return false;
  const selection = editor.prosemirrorState.selection;
  const dom = editor.prosemirrorView?.nodeDOM(selection.from);
  const target = dom instanceof HTMLElement ? dom.querySelector<HTMLElement>('.embed-card, .embed-figure') : null;
  target?.click();
  return true;
}

const deletes = (forward: boolean) => (context: EmbedKeyContext) => {
  syncSelectionFromDom(context.editor.prosemirrorView, context.event);
  return apply(context, deleteTarget(context.editor.prosemirrorState, forward));
};

const steps = (forward: boolean, vertical: boolean) => (context: EmbedKeyContext) =>
  !context.event.isComposing && apply(context, stepTarget(context.editor.prosemirrorState, forward, vertical));

const extends_ = (forward: boolean) => (context: EmbedKeyContext) =>
  apply(context, extendTarget(context.editor.prosemirrorState, forward));

const toEdge = (forward: boolean) => (context: EmbedKeyContext) =>
  apply(context, edgeTarget(context.editor.prosemirrorState, forward));

const stays = (context: EmbedKeyContext) => apply(context, pageTarget(context.editor.prosemirrorState));

/**
 * Tab and ⇧Tab never put a block under an embed, nor take one out and hand it the blocks below as children:
 * the server refuses an embed with blocks inside. Tab does nothing when the block above the first one selected
 * is an embed, and neither key moves an embed; elsewhere they nest and lift as always.
 */
function nests({ editor }: EmbedKeyContext) {
  if (isEmbedSelected(editor.prosemirrorState)) return true;
  const first = editor.getSelection()?.blocks[0] ?? editor.getTextCursorPosition().block;
  const above = editor.getPrevBlock(first);
  return Boolean(above && isEmbedType(above.type));
}
function lifts({ editor }: EmbedKeyContext) {
  if (isEmbedSelected(editor.prosemirrorState)) return true;
  return Boolean(editor.getSelection()?.blocks.some((block) => isEmbedType(block.type)));
}

/**
 * The keys of a document's embeds, one table for the keymap and for the keys the drift guard holds: every key
 * that moves the selection from an embed holds it, so a key added here without `holds` is a choice, never an
 * oversight (review WP-1). Tab and ⇧Tab only keep blocks out of embeds and never move the selection.
 */
export const EMBED_KEYS: readonly EmbedKey[] = [
  { key: 'Enter', intent: 'open', holds: true, run: open },
  { key: 'Backspace', intent: 'select-or-remove', holds: true, run: deletes(false) },
  { key: 'Delete', intent: 'select-or-remove', holds: true, run: deletes(true) },
  { key: 'Tab', intent: 'keep-out', holds: false, run: nests },
  { key: 'Shift-Tab', intent: 'keep-out', holds: false, run: lifts },
  { key: 'ArrowDown', intent: 'step', holds: true, run: steps(true, true) },
  { key: 'ArrowUp', intent: 'step', holds: true, run: steps(false, true) },
  { key: 'ArrowRight', intent: 'step', holds: true, run: steps(true, false) },
  { key: 'ArrowLeft', intent: 'step', holds: true, run: steps(false, false) },
  { key: 'Shift-ArrowDown', intent: 'extend', holds: true, run: extends_(true) },
  { key: 'Shift-ArrowUp', intent: 'extend', holds: true, run: extends_(false) },
  { key: 'PageDown', intent: 'stay', holds: true, run: stays },
  { key: 'PageUp', intent: 'stay', holds: true, run: stays },
  { key: 'Meta-ArrowDown', intent: 'to-edge', holds: true, run: toEdge(true) },
  { key: 'Meta-ArrowUp', intent: 'to-edge', holds: true, run: toEdge(false) },
  { key: 'Ctrl-End', intent: 'to-edge', holds: true, run: toEdge(true) },
  { key: 'Ctrl-Home', intent: 'to-edge', holds: true, run: toEdge(false) },
];

/** The table as BlockNote's keyboard shortcuts, with the document's actions. */
export const embedShortcuts = (actions: EmbedKeyActions) =>
  Object.fromEntries(
    EMBED_KEYS.map(({ key, run }) => [
      key,
      ({ editor, event }: { editor: AnyBlockEditor; event: KeyboardEvent }) => run({ editor, event, actions }),
    ]),
  );

type KeyFacts = Pick<KeyboardEvent, 'key' | 'altKey' | 'ctrlKey' | 'metaKey' | 'shiftKey' | 'isComposing'>;

/**
 * A key event's name as ProseMirror's keymap builds it, with the modifiers in its order (Shift, Meta, Ctrl,
 * Alt), so the table's names and the events meet whatever order the modifiers went down in.
 */
export function keyName(event: KeyFacts) {
  let name = event.key === ' ' ? 'Space' : event.key;
  if (event.altKey) name = `Alt-${name}`;
  if (event.ctrlKey) name = `Ctrl-${name}`;
  if (event.metaKey) name = `Meta-${name}`;
  if (event.shiftKey) name = `Shift-${name}`;
  return name;
}

const HELD = new Set(EMBED_KEYS.filter((each) => each.holds).map((each) => each.key));

/** Whether the drift guard holds the selection for this key: one of the table's, and never in a composition. */
export const holdsKey = (event: KeyFacts) => !event.isComposing && HELD.has(keyName(event));
