import './tree/tree.css';
import type { NavTree } from '@tinyfold/workspace/domain';
import { FolderTree } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { countOf, formatCount } from '../../lib/count';
import type { Project } from '../../lib/types';
import { IconButton, Popover, PopoverTrigger, returnFocus } from '../../ui';
import { ItemsTree, type TreeHandle } from './tree/ItemsTree';
import { useItemsTree } from './tree/use-items-tree';

/**
 * Itens on the collapsed rail: one button, with the dot of unsaved items, that opens the sidebar's tree in a
 * 280 px popover, without its "+" and "⋯". Choosing an item, even the one already open, closes it, and the
 * page's title takes the focus. On a document, a drawing or the Índice, the button shows as the current place.
 */
export function ItemsPopover({ project, tree, on }: { project: Project; tree: NavTree | undefined; on: boolean }) {
  const items = useItemsTree(project, tree);
  const pending = items.pending.length;
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
        <IconButton
          label={pending > 0 ? `Itens, ${countOf(pending, 'item não salvo', 'itens não salvos')}` : 'Itens'}
          className="rail__button"
          data-on={on ? 'true' : undefined}
          ref={trigger}
        >
          <FolderTree size={16} />
        </IconButton>
        {pending > 0 && <span className="rail__pending" aria-hidden="true" />}
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
