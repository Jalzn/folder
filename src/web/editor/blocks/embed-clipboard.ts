import type { EmbedKind } from '@tinyfold/workspace/domain';
import { type EditorState, NodeSelection, Plugin, PluginKey } from '@tiptap/pm/state';
import type { EditorView } from '@tiptap/pm/view';
import { embedOf } from './embed-blocks';
import type { EmbedText } from './embed-text';

/** What copying an embed asks of the document: the item's words and link, and taking the block out on a cut. */
export interface EmbedClipboardActions {
  describe: (kind: EmbedKind, id: string) => EmbedText;
  remove: (blockId: string) => void;
}

const escapeHtml = (text: string) =>
  text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** The embed as HTML for other apps: a paragraph with the link, or the unavailable words. */
const htmlOf = ({ link, plain }: EmbedText) =>
  link ? `<p><a href="${escapeHtml(link.href)}">${escapeHtml(link.label)}</a></p>` : `<p>${escapeHtml(plain)}</p>`;

/**
 * ⌘C and ⌘X on an embed selected as a node (review B2). The clipboard gets the block as BlockNote writes it, so
 * a paste in a document brings the embed back with its item's ID; other apps get "Tarefa: título (coluna)" or
 * "Desenho: título" as text, and the link to the item, as the exported file has it, as HTML and Markdown. A cut
 * takes the block out with the document's "Remover", whose toast offers Desfazer.
 */
export function embedClipboard(selected: (state: EditorState) => boolean, actions: EmbedClipboardActions) {
  const write = (view: EditorView, event: ClipboardEvent, cut: boolean) => {
    const { selection, doc } = view.state;
    if (!selected(view.state) || !event.clipboardData || !(selection instanceof NodeSelection)) return false;
    const embed = embedOf(selection.node);
    if (!embed) return false;
    const text = actions.describe(embed.kind, embed.id);
    // The embed's block, the content's parent, as BlockNote copies a block without text.
    const block = NodeSelection.create(doc, selection.from - 1);
    const internal = view.serializeForClipboard(block.content()).dom.innerHTML;
    event.preventDefault();
    event.clipboardData.clearData();
    event.clipboardData.setData('blocknote/html', internal);
    event.clipboardData.setData('text/html', htmlOf(text));
    event.clipboardData.setData('text/plain', text.plain);
    event.clipboardData.setData('text/markdown', text.markdown);
    if (cut) actions.remove(String(block.node.attrs.id));
    return true;
  };
  return new Plugin({
    key: new PluginKey('embedClipboard'),
    props: {
      handleDOMEvents: {
        copy: (view, event) => write(view, event, false),
        cut: (view, event) => write(view, event, true),
      },
    },
  });
}
