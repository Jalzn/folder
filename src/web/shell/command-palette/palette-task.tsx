import { ArrowRight, CircleCheck, Link2, RotateCcw, Trash2 } from 'lucide-react';
import { useDrawerContent, useTaskDrawer } from '../task-drawer-state';
import type { RunnableHereAction } from './use-here-actions';

/**
 * "Nesta tarefa" (docs/etapas/10-quadro-tarefa.md, "Pastas e tarefas"): with a task open in the drawer, ⌘K
 * offers Concluir or Reabrir, Mover para coluna…, Copiar link and Mover para a lixeira, as its editor has them;
 * an archived project's task, only Copiar link.
 */
export function useTaskHereActions(): RunnableHereAction[] {
  const content = useDrawerContent();
  const drawer = useTaskDrawer();
  const commands = drawer.taskCommands.current;
  if (content?.mode !== 'task' || !commands) return [];
  const actions: RunnableHereAction[] = [];
  if (commands.toggleDone)
    actions.push({
      id: 'task-done',
      label: commands.done ? 'Reabrir' : 'Concluir',
      icon: commands.done ? <RotateCcw size={16} /> : <CircleCheck size={16} />,
      shortcut: ['mod', '↵'],
      run: commands.toggleDone,
    });
  if (commands.moveToColumn)
    actions.push({
      id: 'task-move',
      label: 'Mover para coluna…',
      icon: <ArrowRight size={16} />,
      run: commands.moveToColumn,
    });
  actions.push({ id: 'task-link', label: 'Copiar link', icon: <Link2 size={16} />, run: commands.copyLink });
  if (commands.trash)
    actions.push({ id: 'task-trash', label: 'Mover para a lixeira', icon: <Trash2 size={16} />, run: commands.trash });
  return actions;
}
