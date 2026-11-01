import { api, queryClient } from '../../lib/api';
import { useProjects } from '../../lib/queries';
import { displayTitle, type ItemType } from '../../lib/types';
import { useAction } from '../../lib/use-action';
import { useRequest } from '../../lib/use-request';
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
  // A retried move sends the same request, so the server replays it instead of refusing a stale version.
  const request = useRequest();
  /** Resolves true once the item moved. */
  async function move(type: ItemType, id: string, from: string, to: string) {
    if (to === from) return false;
    const moved = await action.run(() => moveItem(type, id, to, request.for));
    if (!moved) return false;
    request.clear();
    void queryClient.invalidateQueries({ queryKey: ['workspace', type === 'document' ? 'document' : 'canvas', id] });
    const destination = projects.find((project) => project.id === to)?.name ?? 'outro projeto';
    toast(`“${displayTitle(moved.title)}” foi para ${destination}.`, {
      action: {
        label: 'Desfazer',
        onAction: () =>
          action.run(async () => {
            await moveItem(type, id, from, request.for);
            request.clear();
            // A full project keeps the item unpinned.
            if (moved.pinned) await api.workspace.pinItem({ type, id }).catch(() => undefined);
          }),
      },
    });
    return true;
  }
  return { busy: action.busy, move };
}
