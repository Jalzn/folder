import { Fragment, type Node, Slice } from '@tiptap/pm/model';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { validEmbed } from '../../lib/files/sanitize-embeds';
import { isEmbedType } from './embed-blocks';

/** Whether a node is an embed's content with an ID the server refuses. */
const forged = (node: Node) =>
  isEmbedType(node.type.name) && !validEmbed({ type: node.type.name, props: { ...node.attrs } });

/**
 * The fragment without the blocks of such embeds, at every depth, as sanitizeEmbeds leaves a document: what a
 * forged embed's block held comes out in its place (review Sec R4); null when nothing changed.
 */
function withoutForged(fragment: Fragment): Fragment | null {
  let changed = false;
  const kept: Node[] = [];
  fragment.forEach((node) => {
    if (forged(node)) {
      changed = true;
      return;
    }
    if (node.type.name === 'blockContainer' && node.firstChild && forged(node.firstChild)) {
      changed = true;
      // The block's group of children, after its content, if any.
      const group = node.childCount > 1 ? node.child(1) : null;
      if (group) kept.push(...childrenOf(withoutForged(group.content) ?? group.content));
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

const childrenOf = (fragment: Fragment) => {
  const nodes: Node[] = [];
  fragment.forEach((node) => {
    nodes.push(node);
  });
  return nodes;
};

/**
 * A paste or a drop in a document never brings an embed with an ID the server refuses (Sec R1). Any page can
 * put BlockNote's own `blocknote/html` on the clipboard, which BlockNote reads first, with any text as the
 * item's ID: the document would no longer save, and the list of its embeds would no longer resolve. Such a
 * block goes, and what it held stays in its place; valid embeds paste as always.
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
