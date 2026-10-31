import { api, queryClient } from '../../lib/api';
import { useProjects } from '../../lib/queries';
import type { ItemType } from '../../lib/types';
import { useAction } from '../../lib/use-action';
import { useToast } from '../../ui';
import { moveItem } from './move-item';

/**
 * Moves a document or drawing to another project, through its open editor when it has one. The toast
 * "“X” foi para Y." offers Desfazer, which moves it back and pins it again when the project has room.
 */
export function useMoveItem() {
  const projects = useProjects(true).data ?? [];
  const action = useAction();
  const toast = useToast();
  async function move(type: ItemType, id: string, from: string, to: string) {
    if (to === from) return;
    const moved = await action.run(() => moveItem(type, id, to));
    if (!moved) return;
    void queryClient.invalidateQueries({ queryKey: ['workspace', type === 'document' ? 'document' : 'canvas', id] });
    const destination = projects.find((project) => project.id === to)?.name ?? 'outro projeto';
    toast(`“${moved.title || 'Sem título'}” foi para ${destination}.`, {
      action: {
        label: 'Desfazer',
        onAction: () =>
          void action.run(async () => {
            await moveItem(type, id, from);
            // A full project keeps the item unpinned.
            if (moved.pinned) await api.workspace.pinItem({ type, id }).catch(() => undefined);
          }),
      },
    });
  }
  return { busy: action.busy, move };
}
