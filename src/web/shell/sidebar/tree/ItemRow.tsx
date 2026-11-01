import { Link } from '@tanstack/react-router';
import { FileText, PinOff, Shapes } from 'lucide-react';
import type { MouseEvent, PointerEvent } from 'react';
import { Button as AriaButton } from 'react-aria-components';
import { displayTitle, type ItemType } from '../../../lib/types';
import { itemLabel } from './tree-labels';
import type { ItemNode } from './tree-rows';

const icons: Record<ItemType, typeof FileText> = { document: FileText, drawing: Shapes };

export const modifiedClick = (event: { metaKey: boolean; ctrlKey: boolean; shiftKey: boolean; altKey: boolean }) =>
  event.metaKey || event.ctrlKey || event.shiftKey || event.altKey;

/**
 * A document or drawing in the tree. The row's action opens it; the link inside keeps a real `<a>` for the
 * middle click, ⌘-click and the browser's menu, and leaves a plain click to the row, so one click is one
 * entry in the history. A pinned item shows "Desafixar" on hover.
 */
export function ItemRow({
  node,
  href,
  onPointerDown,
  onUnpin,
}: {
  node: ItemNode;
  href: string;
  onPointerDown: (event: PointerEvent) => void;
  onUnpin?: (() => void) | undefined;
}) {
  const Icon = icons[node.item.type];
  const title = displayTitle(node.item.title);
  return (
    <>
      <Link
        to={href}
        tabIndex={-1}
        draggable={false}
        className="tree-row__body"
        aria-label={itemLabel(node)}
        aria-current={node.current ? 'page' : undefined}
        onPointerDown={onPointerDown}
        onClick={(event: MouseEvent) => {
          if (event.button === 0 && !modifiedClick(event)) event.preventDefault();
        }}
      >
        <Icon size={16} aria-hidden="true" />
        <span className="tree-row__name">{title}</span>
        {node.pending && <span className="tree-row__pending" aria-hidden="true" />}
      </Link>
      {node.item.pinnedAt && onUnpin && (
        <AriaButton className="tree-row__unpin" aria-label={`Desafixar ${title}`} excludeFromTabOrder onPress={onUnpin}>
          <PinOff size={14} aria-hidden="true" />
        </AriaButton>
      )}
    </>
  );
}
