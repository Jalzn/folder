import { Plugin, PluginKey } from '@tiptap/pm/state';
import type { AnyBlockEditor } from '../types';
import { isEmbedSelected } from './embed-selection';

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
export function embedTyping(editor: AnyBlockEditor) {
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
        if (isEmbedSelected(view.state) && types(event)) writeAfter();
        return false;
      },
      handleDOMEvents: {
        compositionstart: (view) => {
          if (isEmbedSelected(view.state)) writeAfter();
          return false;
        },
      },
    },
  });
}
