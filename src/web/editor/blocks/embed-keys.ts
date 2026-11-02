import { createExtension } from '@blocknote/core';
import type { AnyBlockEditor } from '../types';
import { embedClipboard } from './embed-clipboard';
import { type EmbedKeyActions, embedShortcuts, holdsKey } from './embed-keymap';
import { embedPaste } from './embed-paste';
import { isEmbedSelected } from './embed-selection';
import { embedTyping } from './embed-typing';
import { selectionDriftGuard } from './selection-drift';

export type { EmbedKeyActions } from './embed-keymap';

/**
 * The keys of a document's embeds (docs/etapas/11-documento-desenho.md, "Teclado e Esc"), one extension per
 * editor: the table of embed-keymap.ts, whose targets embed-targets.ts works out, with the guard against
 * Chrome's drift for the keys the table holds (selection-drift.ts). ↵ on an embed selected as a node opens it
 * as a click would, ⌫ and Delete select an embed beside the caret and then take it out, the arrows go through
 * embeds a block at a time, and Tab and ⇧Tab keep blocks out of them. Never in a field, and the suggestion
 * menus take ↵ first. ⌘C and ⌘X copy a selected embed as its block and as its link (embed-clipboard.ts), a
 * paste never brings an embed the server would refuse (embed-paste.ts), and typing on one writes in a new
 * paragraph after it (embed-typing.ts).
 */
export const createEmbedKeys = (actions: EmbedKeyActions) =>
  createExtension(({ editor }: { editor: AnyBlockEditor }) => ({
    key: 'embedKeys',
    // Before BlockNote's keys of a selected node, which swallow a typed letter.
    runsBefore: ['nodeSelectionKeyboard'],
    prosemirrorPlugins: [
      selectionDriftGuard({ isEmbedSelected, holdsKey }),
      embedClipboard(actions),
      embedPaste(),
      embedTyping(editor),
    ],
    keyboardShortcuts: embedShortcuts(actions),
  }))();
