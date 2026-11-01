import { ChevronRight, Folder, FolderOpen } from 'lucide-react';
import type { ReactNode } from 'react';
import { countOf, formatCount } from '../../../lib/count';
import type { FolderNode } from './tree-rows';

/**
 * A folder of the tree: chevron, icon, name, the dot of unsaved items inside and the count. While it is
 * renamed, `field` takes the name's place; `tools` ("+" and "⋯") take the count's on hover or focus.
 */
export function FolderRow({
  node,
  expanded,
  field,
  tools,
}: {
  node: Pick<FolderNode, 'folder' | 'pending'>;
  expanded: boolean;
  field?: ReactNode;
  tools?: ReactNode;
}) {
  const Icon = expanded ? FolderOpen : Folder;
  return (
    <>
      <div className="tree-row__body" data-editing={field ? true : undefined}>
        <ChevronRight className="tree-row__chevron" size={12} aria-hidden="true" />
        <Icon size={16} aria-hidden="true" />
        {field ?? <span className="tree-row__name">{node.folder.name}</span>}
        {!field && node.pending > 0 && (
          <span
            className="tree-row__pending"
            title={countOf(node.pending, 'item não salvo', 'itens não salvos')}
            aria-hidden="true"
          />
        )}
        {!field && node.folder.total > 0 && <span className="tree-row__count">{formatCount(node.folder.total)}</span>}
      </div>
      {!field && tools}
    </>
  );
}
