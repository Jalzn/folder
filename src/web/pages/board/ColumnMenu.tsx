import { ArrowLeft, ArrowRight, CircleCheck, Ellipsis, Pencil, Trash2 } from 'lucide-react';
import { KEYS } from '../../shell/keyboard';
import { IconButton, Menu, MenuItem, MenuSeparator, MenuTrigger } from '../../ui';

export type ColumnCommand = 'rename' | 'left' | 'right' | 'done' | 'delete';

/** "Marque outra coluna como conclusão antes." */
export const DONE_STAYS = 'Marque outra coluna como conclusão antes.';

/**
 * A column's ⋯ (docs/etapas/10-quadro-tarefa.md, "Menu ⋯ da coluna"), also opened by ⇧F10 or the Menu key on
 * its name: Renomear, the moves left and right, which the edges disable, Marcar como conclusão, and Excluir…,
 * which the done column cannot.
 */
export function ColumnMenu({
  name,
  isDone,
  first,
  last,
  open,
  onOpenChange,
  onCommand,
}: {
  name: string;
  isDone: boolean;
  first: boolean;
  last: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCommand: (command: ColumnCommand) => void;
}) {
  const disabled = [first && 'left', last && 'right', isDone && 'done', isDone && 'delete'].filter(
    (key): key is ColumnCommand => Boolean(key),
  );
  return (
    <MenuTrigger isOpen={open} onOpenChange={onOpenChange}>
      <IconButton label={`Opções da coluna ${name}`} size="sm" className="board-column__more" excludeFromTabOrder>
        <Ellipsis size={14} />
      </IconButton>
      <Menu
        aria-label={`Coluna ${name}`}
        autoFocus="first"
        disabledKeys={disabled}
        onAction={(key) => onCommand(key as ColumnCommand)}
      >
        <MenuItem id="rename" icon={<Pencil size={16} />} shortcut={KEYS.activate}>
          Renomear
        </MenuItem>
        <MenuItem id="left" icon={<ArrowLeft size={16} />} shortcut={KEYS.shiftLeft}>
          Mover para a esquerda
        </MenuItem>
        <MenuItem id="right" icon={<ArrowRight size={16} />} shortcut={KEYS.shiftRight}>
          Mover para a direita
        </MenuItem>
        <MenuItem id="done" icon={<CircleCheck size={16} />}>
          {isDone ? 'É a coluna de conclusão' : 'Marcar como conclusão'}
        </MenuItem>
        <MenuSeparator />
        <MenuItem
          id="delete"
          icon={<Trash2 size={16} />}
          danger={!isDone}
          {...(isDone ? { description: DONE_STAYS } : {})}
        >
          Excluir…
        </MenuItem>
      </Menu>
    </MenuTrigger>
  );
}
