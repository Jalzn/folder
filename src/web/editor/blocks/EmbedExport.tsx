import type { EmbedKind } from '@tinyfold/rich-text/domain';
import { embedText } from './embed-text';
import { useEmbedsContext } from './embeds-context';

/**
 * An embed in the HTML another app gets when text around it is copied (review B2): a paragraph with the item's
 * link, as the exported file has it, or "Item indisponível". The card and the figure stay in the editor.
 */
export function EmbedExport({ kind, id }: { kind: EmbedKind; id: string }) {
  const embeds = useEmbedsContext();
  const state = kind === 'task' ? embeds?.tasks.get(id) : embeds?.drawings.get(id);
  const text = embedText(kind, id, state, window.location.origin);
  return <p>{text.link ? <a href={text.link.href}>{text.link.label}</a> : text.plain}</p>;
}
