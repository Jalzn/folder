import type { RefObject } from 'react';
import { useCommandSlot } from '../../lib/react/use-command-slot';
import type { Task } from '../../lib/types';
import { paths } from '../../navigation/paths';
import { useTaskDrawer } from '../../shell/state';
import { useToast } from '../../ui';
import { type DrawerCommands, EMPTY_DRAWER_COMMANDS } from './drawer-commands';

export function useTaskEditorCommands({
  commands,
  task,
  editable,
  done,
  toggleDone,
  move,
  trash,
}: {
  commands: RefObject<DrawerCommands>;
  task: Task;
  editable: boolean;
  done: boolean;
  toggleDone: () => unknown;
  move: () => void;
  trash: () => void;
}) {
  const drawer = useTaskDrawer();
  const toast = useToast();
  async function copyLink() {
    const link = paths.permanent(paths.task(task.projectId, task.id));
    try {
      await navigator.clipboard.writeText(link);
      toast('Link da tarefa copiado.');
    } catch {
      toast('Não foi possível copiar o link.', 'error');
    }
  }

  // Both slots publish in passive effects; read-only tasks expose no editing commands.
  useCommandSlot(commands, { primary: editable ? () => void toggleDone() : undefined }, EMPTY_DRAWER_COMMANDS);
  useCommandSlot(
    drawer.taskCommands,
    {
      done,
      copyLink: () => void copyLink(),
      ...(editable ? { toggleDone: () => void toggleDone(), moveToColumn: move, trash } : {}),
    },
    null,
  );
  return { copyLink };
}
