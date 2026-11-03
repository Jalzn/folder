import { ArrowRight, CircleCheck, Ellipsis, PanelBottomOpen, RotateCcw, Trash2 } from 'lucide-react';
import type { ColumnSummary } from '../../lib/queries';
import { KEYS } from '../../shell/keyboard';
import { IconButton, Menu, MenuItem, MenuSeparator, MenuTrigger, SubmenuTrigger } from '../../ui';
import { type MoveChoice, moveChoice, moveTaskSections } from './MoveTaskMenu';

/**
 * A card's ⋯ (docs/etapas/10-quadro-tarefa.md, "⋯ do card"), also opened by ⇧F10 or the Menu key: Abrir, Mover
 * para ▸, Concluir or Reabrir, and Mover para a lixeira. Its button stays out of the Tab order: the card's
 * title is the board's stop.
 */
export function CardMenu({
  title,
  columns,
  columnId,
  done,
  open,
  onOpenChange,
  onOpen,
  onMove,
  onToggleDone,
  onTrash,
}: {
  title: string;
  columns: readonly ColumnSummary[];
  columnId: string;
  done: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onOpen: () => void;
  onMove: (choice: MoveChoice) => void;
  onToggleDone: () => void;
  onTrash: () => void;
}) {
  return (
    <MenuTrigger isOpen={open} onOpenChange={onOpenChange}>
      <IconButton label={`Opções de ${title}`} size="sm" className="task-card__more" excludeFromTabOrder>
        <Ellipsis size={14} />
      </IconButton>
      <Menu
        aria-label={title}
        autoFocus="first"
        onAction={(key) => {
          if (key === 'open') onOpen();
          else if (key === 'toggle') onToggleDone();
          else if (key === 'trash') onTrash();
        }}
      >
        <MenuItem id="open" icon={<PanelBottomOpen size={16} />} shortcut={KEYS.activate}>
          Abrir
        </MenuItem>
        <SubmenuTrigger>
          <MenuItem id="move" icon={<ArrowRight size={16} />} shortcut={KEYS.move}>
            Mover para
          </MenuItem>
          <Menu
            aria-label="Mover para"
            placement="end top"
            onAction={(key) => {
              const choice = moveChoice(key);
              if (choice) onMove(choice);
            }}
          >
            {moveTaskSections(columns, columnId)}
          </Menu>
        </SubmenuTrigger>
        <MenuItem
          id="toggle"
          icon={done ? <RotateCcw size={16} /> : <CircleCheck size={16} />}
          shortcut={KEYS.toggleDone}
        >
          {done ? 'Reabrir' : 'Concluir'}
        </MenuItem>
        <MenuSeparator />
        <MenuItem id="trash" icon={<Trash2 size={16} />} danger>
          Mover para a lixeira
        </MenuItem>
      </Menu>
    </MenuTrigger>
  );
}
