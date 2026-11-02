import { EMBED_TYPES } from '@tinyfold/workspace/domain';
import { Fragment, type Node, Slice } from '@tiptap/pm/model';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { validEmbed } from '../../lib/sanitize-embeds';

const embedTypes: ReadonlySet<string> = new Set(EMBED_TYPES);

/** Whether a node is an embed's content with an ID the server refuses. */
const forged = (node: Node) =>
  embedTypes.has(node.type.name) && !validEmbed({ type: node.type.name, props: { ...node.attrs } });

/** The fragment without the blocks of such embeds, at every depth; null when nothing changed. */
function withoutForged(fragment: Fragment): Fragment | null {
  let changed = false;
  const kept: Node[] = [];
  fragment.forEach((node) => {
    if (forged(node) || (node.type.name === 'blockContainer' && node.firstChild && forged(node.firstChild))) {
      changed = true;
      return;
    }
    const inner = node.isLeaf ? null : withoutForged(node.content);
    if (!inner) kept.push(node);
    else {
      changed = true;
      // A group left with no block goes with its blocks.
      if (node.type.name !== 'blockGroup' || inner.childCount) kept.push(node.copy(inner));
    }
  });
  return changed ? Fragment.fromArray(kept) : null;
}

/**
 * A paste or a drop in a document never brings an embed with an ID the server refuses (Sec R1). Any page can
 * put BlockNote's own `blocknote/html` on the clipboard, which BlockNote reads first, with any text as the
 * item's ID: the document would no longer save, and the list of its embeds would no longer resolve. Such a
 * block goes, with what it held; valid embeds paste as always.
 */
export function embedPaste() {
  return new Plugin({
    key: new PluginKey('embedPaste'),
    props: {
      transformPasted: (slice) => {
        const content = withoutForged(slice.content);
        if (!content) return slice;
        return content.childCount ? new Slice(content, slice.openStart, slice.openEnd) : Slice.empty;
      },
    },
  });
}
