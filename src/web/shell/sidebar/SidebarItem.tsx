import { Link } from '@tanstack/react-router';
import type { NavItem } from '@tinyfold/workspace/domain';
import { FileText, PinOff, Shapes } from 'lucide-react';
import { type KeyboardEvent, useRef, useState } from 'react';
import type { ItemType } from '../../lib/types';
import { paths } from '../../router/paths';
import { focusPageTitle } from '../../ui';
import { MoveToProjectMenu } from '../project/MoveToProjectMenu';

const icons: Record<ItemType, typeof FileText> = { document: FileText, drawing: Shapes };
const nouns: Record<ItemType, string> = { document: 'documento', drawing: 'desenho' };

/**
 * A document or drawing of a sidebar section. With focus on it, P pins or unpins it and M opens "Mover
 * para projeto…"; a pinned one shows "Desafixar" on hover.
 */
export function SidebarItem({
  type,
  item,
  projectId,
  current,
  pending,
  onPin,
  onUnpin,
}: {
  type: ItemType;
  item: NavItem;
  projectId: string;
  current: boolean;
  pending: boolean;
  onPin: () => void;
  onUnpin: () => void;
}) {
  const row = useRef<HTMLAnchorElement>(null);
  const [moving, setMoving] = useState(false);
  // The row that takes the focus when this one leaves the list: the next, or the previous for the last.
  const neighbour = useRef<HTMLElement | null>(null);
  const Icon = icons[type];
  const pinned = item.pinnedAt !== null;
  function keyDown(event: KeyboardEvent<HTMLAnchorElement>) {
    if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    const key = event.key.toLowerCase();
    if (key === 'p') {
      event.preventDefault();
      if (pinned) onUnpin();
      else onPin();
    } else if (key === 'm') {
      event.preventDefault();
      const rows = [...(event.currentTarget.closest('ul')?.querySelectorAll<HTMLElement>('[data-roving]') ?? [])];
      const at = rows.indexOf(event.currentTarget);
      neighbour.current = rows[at + 1] ?? rows[at - 1] ?? null;
      setMoving(true);
    }
  }
  return (
    <li className="sidebar-item" data-pinned={pinned || undefined}>
      <Link
        ref={row}
        to={paths.item(projectId, type, item.id)}
        activeOptions={{ exact: true, includeSearch: false }}
        className="sidebar-row"
        data-roving
        tabIndex={-1}
        aria-current={current ? 'page' : undefined}
        aria-label={`${item.title || 'Sem título'}, ${nouns[type]}${pinned ? ', fixado' : ''}${pending ? ', não salvo' : ''}`}
        onKeyDown={keyDown}
      >
        <Icon size={16} />
        <span className="sidebar-row__name">{item.title || 'Sem título'}</span>
        {pending && <span className="sidebar-row__pending" aria-hidden="true" />}
      </Link>
      {pinned && (
        <button
          type="button"
          className="sidebar-item__unpin"
          tabIndex={-1}
          aria-label={`Desafixar ${item.title || 'Sem título'}`}
          title="Desafixar · P"
          onClick={onUnpin}
        >
          <PinOff size={14} />
        </button>
      )}
      {moving && (
        <MoveToProjectMenu
          type={type}
          id={item.id}
          projectId={projectId}
          triggerRef={row}
          isOpen={moving}
          onOpenChange={setMoving}
          onMoved={() => {
            const next = neighbour.current;
            if (next?.isConnected) {
              next.tabIndex = 0;
              next.focus();
            } else focusPageTitle();
          }}
        />
      )}
    </li>
  );
}
