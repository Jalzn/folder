import { ArrowRight, CircleCheck, Ellipsis, Link2, RotateCcw, Trash2, X } from 'lucide-react';
import type { ReactNode } from 'react';
import { Button as AriaButton } from 'react-aria-components';
import { TASK_STATUSES, type Task, type TaskStatus, taskStatusLabels } from '../../lib/types';
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

/** The columns in board order, as radios with the task's own checked. */
const columnItems = TASK_STATUSES.map((status) => (
  <MenuItem key={status} id={status}>
    {taskStatusLabels[status]}
  </MenuItem>
));

/**
 * The drawer's 52 px header (docs/interface/visual.md, "Gaveta da tarefa"): the column ring, which opens
 * "Mover para…", the title, then Concluir or Reabrir, the ⋯ and ✕. An archived project's task shows the
 * ring, the title and ✕.
 */
export function TaskDrawerHeader({
  task,
  title,
  editable,
  onMove,
  onToggleDone,
  onCopyLink,
  onTrash,
  onClose,
}: {
  task: Task;
  /** The title field. */
  title: ReactNode;
  editable: boolean;
  onMove: (status: TaskStatus) => void;
  onToggleDone: () => void;
  onCopyLink: () => void;
  onTrash: () => void;
  onClose: () => void;
}) {
  const done = task.status === 'done';
  const index = TASK_STATUSES.indexOf(task.status);
  const ring = <ColumnRing index={index} count={TASK_STATUSES.length} size={16} />;
  const state = done ? 'Concluída' : taskStatusLabels[task.status];
  return (
    <header className="task-drawer__head">
      {editable ? (
        <MenuTrigger>
          <AriaButton className="task-drawer__state" aria-label={`Estado: ${state}. Mover para…`}>
            {ring}
          </AriaButton>
          <Menu
            aria-label="Mover para"
            placement="bottom start"
            selectionMode="single"
            selectedKeys={[task.status]}
            onAction={(key) => key !== task.status && onMove(key as TaskStatus)}
          >
            {columnItems}
          </Menu>
        </MenuTrigger>
      ) : (
        <span className="task-drawer__state" role="img" aria-label={`Estado: ${state}`}>
          {ring}
        </span>
      )}
      {title}
      <div className="task-drawer__actions">
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
                  selectedKeys={[task.status]}
                  onAction={(key) => key !== task.status && onMove(key as TaskStatus)}
                >
                  {columnItems}
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
