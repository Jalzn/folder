import './tree/tree.css';
import type { NavTree } from '@tinyfold/workspace/domain';
import { FolderTree } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { formatCount } from '../../lib/count';
import type { Project } from '../../lib/types';
import { IconButton, Popover, PopoverTrigger, returnFocus } from '../../ui';
import { ItemsTree } from './tree/ItemsTree';
import { useItemsTree } from './tree/use-items-tree';

/**
 * Itens on the collapsed rail: one button, with the dot of unsaved items, that opens the sidebar's tree in a
 * 280 px popover, without its "+" and "⋯". Choosing an item, even the one already open, closes it, and the
 * page's title takes the focus.
 */
export function ItemsPopover({ project, tree }: { project: Project; tree: NavTree | undefined }) {
  const items = useItemsTree(project, tree);
  const [isOpen, setOpen] = useState(false);
  const treeRef = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLElement | null>(null);
  useEffect(() => {
    if (!isOpen) return;
    // The open item's row, or the first, takes the focus as the popover opens.
    requestAnimationFrame(() => {
      const rows = treeRef.current?.querySelectorAll<HTMLElement>('[role="row"]');
      const current = treeRef.current?.querySelector<HTMLElement>('.is-current');
      (current ?? rows?.[0])?.focus();
    });
  }, [isOpen]);
  return (
    <PopoverTrigger isOpen={isOpen} onOpenChange={setOpen}>
      <span className="rail__items" ref={trigger}>
        <IconButton label="Itens" className="rail__button">
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
            variant="popover"
            treeRef={treeRef}
            onChoose={() => {
              const button = trigger.current?.querySelector('button') ?? null;
              setOpen(false);
              returnFocus(null, { from: button });
            }}
          />
        )}
      </Popover>
    </PopoverTrigger>
  );
}
