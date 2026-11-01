import { ArrowRight, CircleCheck, Ellipsis, Link2, RotateCcw, Trash2, X } from 'lucide-react';
import type { ReactNode } from 'react';
import { Button as AriaButton } from 'react-aria-components';
import { inBoardOrder } from '../../lib/board-order';
import type { ColumnSummary } from '../../lib/queries';
import {
  Button,
  ColumnRing,
  IconButton,
  Menu,
  MenuItem,
  MenuSeparator,
  MenuTrigger,
  SubmenuTrigger,
  Tooltip,
  TooltipTrigger,
} from '../../ui';

import { columnMenuItems } from './TaskProperties';

/**
 * The drawer's 52 px header (docs/interface/visual.md, "Gaveta da tarefa"): the column ring, which opens
 * "Mover para…", the title, then Concluir or Reabrir, the ⋯ and ✕. An archived project's task shows the
 * ring, the title and ✕.
 */
export function TaskDrawerHeader({
  columnId,
  columns,
  title,
  editable,
  saveState,
  moveOpen,
  onMoveOpenChange,
  onMove,
  onToggleDone,
  onCopyLink,
  onTrash,
  onClose,
}: {
  columnId: string;
  columns: readonly ColumnSummary[];
  /** The title field. */
  title: ReactNode;
  editable: boolean;
  /** "Salvo", "Salvando…" or "Não salvou" with "Tentar de novo". */
  saveState?: ReactNode;
  /** The ring's "Mover para", which ⌘K's "Mover para coluna…" opens too. */
  moveOpen?: boolean;
  onMoveOpenChange?: (open: boolean) => void;
  onMove: (columnId: string, name: string) => void;
  onToggleDone: () => void;
  onCopyLink: () => void;
  onTrash: () => void;
  onClose: () => void;
}) {
  const ordered = inBoardOrder(columns);
  const index = ordered.findIndex((column) => column.id === columnId);
  const column = ordered[index];
  const done = Boolean(column?.isDone);
  const ring = <ColumnRing index={index} count={ordered.length} isDone={done} size={16} />;
  const state = done ? 'Concluída' : (column?.name ?? '');
  const move = (key: unknown) => {
    const chosen = ordered.find((each) => each.id === key);
    if (chosen && chosen.id !== columnId) onMove(chosen.id, chosen.name);
  };
  return (
    <header className="task-drawer__head">
      {editable ? (
        <MenuTrigger
          {...(moveOpen === undefined ? {} : { isOpen: moveOpen })}
          {...(onMoveOpenChange ? { onOpenChange: onMoveOpenChange } : {})}
        >
          <AriaButton className="task-drawer__state" aria-label={`Estado: ${state}. Mover para…`}>
            {ring}
          </AriaButton>
          <Menu
            aria-label="Mover para"
            placement="bottom start"
            selectionMode="single"
            selectedKeys={[columnId]}
            onAction={move}
          >
            {columnMenuItems(ordered)}
          </Menu>
        </MenuTrigger>
      ) : (
        <span className="task-drawer__state" role="img" aria-label={`Estado: ${state}`}>
          {ring}
        </span>
      )}
      {title}
      <div className="task-drawer__actions">
        {saveState}
        {editable && (
          <TooltipTrigger delay={600} closeDelay={0}>
            <Button
              icon={done ? <RotateCcw size={16} /> : <CircleCheck size={16} />}
              aria-keyshortcuts="Meta+Enter Control+Enter"
              onPress={onToggleDone}
            >
              {done ? 'Reabrir' : 'Concluir'}
            </Button>
            <Tooltip>{done ? 'Reabrir · ⌘↵' : 'Concluir · ⌘↵'}</Tooltip>
          </TooltipTrigger>
        )}
        <MenuTrigger>
          <IconButton label="Mais ações da tarefa">
            <Ellipsis size={16} />
          </IconButton>
          <Menu aria-label="Mais ações da tarefa">
            <MenuItem id="copy-link" icon={<Link2 size={16} />} onAction={onCopyLink}>
              Copiar link
            </MenuItem>
            {editable && (
              <SubmenuTrigger>
                <MenuItem id="move" icon={<ArrowRight size={16} />}>
                  Mover para
                </MenuItem>
                <Menu
                  aria-label="Mover para"
                  placement="end top"
                  selectionMode="single"
                  selectedKeys={[columnId]}
                  onAction={move}
                >
                  {columnMenuItems(ordered)}
                </Menu>
              </SubmenuTrigger>
            )}
            {editable && <MenuSeparator />}
            {editable && (
              <MenuItem id="trash" icon={<Trash2 size={16} />} danger onAction={onTrash}>
                Mover para a lixeira
              </MenuItem>
            )}
          </Menu>
        </MenuTrigger>
        <IconButton label="Fechar a gaveta" shortcut={['Esc']} onPress={onClose}>
          <X size={16} />
        </IconButton>
      </div>
    </header>
  );
}
