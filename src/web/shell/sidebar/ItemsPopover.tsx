import './tree/tree.css';
import type { NavTree } from '@tinyfold/workspace/domain';
import { FolderTree } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { formatCount } from '../../lib/count';
import type { Project } from '../../lib/types';
import { IconButton, Popover, PopoverTrigger, returnFocus } from '../../ui';
import { ItemsTree, type TreeHandle } from './tree/ItemsTree';
import { useItemsTree } from './tree/use-items-tree';

/**
 * Itens on the collapsed rail: one button, with the dot of unsaved items, that opens the sidebar's tree in a
 * 280 px popover, without its "+" and "⋯". Choosing an item, even the one already open, closes it, and the
 * page's title takes the focus.
 */
export function ItemsPopover({ project, tree }: { project: Project; tree: NavTree | undefined }) {
  const items = useItemsTree(project, tree);
  const [isOpen, setOpen] = useState(false);
  const handle = useRef<TreeHandle>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!isOpen) return;
    // The open item's row, or the first, takes the focus as the popover opens.
    requestAnimationFrame(() => handle.current?.focusEntry());
  }, [isOpen]);
  return (
    <PopoverTrigger isOpen={isOpen} onOpenChange={setOpen}>
      <span className="rail__items">
        <IconButton label="Itens" className="rail__button" ref={trigger}>
          <FolderTree size={16} />
        </IconButton>
        {items.pending.length > 0 && <span className="rail__pending" aria-hidden="true" />}
      </span>
      <Popover aria-label={`Itens de ${project.name}`} placement="right top" className="rail-popover">
        <div className="rail-popover__head">
          <span>Itens</span>
          <span className="rail-popover__count">{items.total === undefined ? '' : formatCount(items.total)}</span>
        </div>
        {tree && (
          <ItemsTree
            project={project}
            rows={items.rows}
            expanded={items.expanded}
            handleRef={handle}
            onChoose={() => {
              setOpen(false);
              returnFocus(null, { from: trigger.current });
            }}
          />
        )}
      </Popover>
    </PopoverTrigger>
  );
}
