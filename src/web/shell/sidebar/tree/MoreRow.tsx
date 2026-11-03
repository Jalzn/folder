import { ChevronRight } from 'lucide-react';
import { formatCount } from '../../../lib/text/count';
import type { MoreNode } from './tree-rows';

/** "Ver todos · n" of a folder, or "Ver todos na raiz · n": the rest of that level in the Índice. */
export function MoreRow({ node }: { node: MoreNode }) {
  return (
    <div className="tree-row__body tree-row__body--more">
      <ChevronRight size={16} aria-hidden="true" />
      <span className="tree-row__name">{node.folderId === null ? 'Ver todos na raiz' : 'Ver todos'}</span>
      <span className="tree-row__count">{formatCount(node.count)}</span>
    </div>
  );
}
