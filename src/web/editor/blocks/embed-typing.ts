import type { BlockNoteEditor } from '@blocknote/core';
import { type EditorState, Plugin, PluginKey } from '@tiptap/pm/state';

// biome-ignore lint/suspicious/noExplicitAny: the plugin serves any schema that has the embeds.
type AnyEditor = BlockNoteEditor<any, any, any>;

/** A key that types: a character, a dead key that starts an accent, or one an input method takes. */
const types = (event: KeyboardEvent) =>
  !event.ctrlKey &&
  !event.metaKey &&
  (event.key.length === 1 || event.key === 'Dead' || event.key === 'Process' || event.keyCode === 229);

/**
 * Typing on an embed selected as a node (review B4): a new paragraph right after the embed takes the caret
 * before the key goes on, so the letter, the accent a dead key starts or an input method's composition lands
 * there, never in the text above the embed. The embed stays as it was.
 */
export function embedTyping(editor: AnyEditor, selected: (state: EditorState) => boolean) {
  const writeAfter = () => {
    const block = editor.getTextCursorPosition().block;
    editor.transact(() => {
      const [paragraph] = editor.insertBlocks([{ type: 'paragraph' }], block, 'after');
      if (paragraph) editor.setTextCursorPosition(paragraph, 'start');
    });
  };
  return new Plugin({
    key: new PluginKey('embedTyping'),
    props: {
      handleKeyDown: (view, event) => {
        if (selected(view.state) && types(event)) writeAfter();
        return false;
      },
      handleDOMEvents: {
        compositionstart: (view) => {
          if (selected(view.state)) writeAfter();
          return false;
        },
      },
    },
  });
}
