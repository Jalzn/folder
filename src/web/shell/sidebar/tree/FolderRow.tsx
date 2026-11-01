import { ChevronRight, Folder, FolderOpen } from 'lucide-react';
import { countOf, formatCount } from '../../../lib/count';
import type { FolderNode } from './tree-rows';

/** A folder of the tree: chevron, icon, name, the dot of unsaved items inside and the count. */
export function FolderRow({ node, expanded }: { node: FolderNode; expanded: boolean }) {
  const Icon = expanded ? FolderOpen : Folder;
  return (
    <div className="tree-row__body">
      <ChevronRight className="tree-row__chevron" size={12} aria-hidden="true" />
      <Icon size={16} aria-hidden="true" />
      <span className="tree-row__name">{node.folder.name}</span>
      {node.pending > 0 && (
        <span
          className="tree-row__pending"
          title={countOf(node.pending, 'item não salvo', 'itens não salvos')}
          aria-hidden="true"
        />
      )}
      {node.folder.total > 0 && <span className="tree-row__count">{formatCount(node.folder.total)}</span>}
    </div>
  );
}
