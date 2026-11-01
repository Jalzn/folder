import { useQuery } from '@tanstack/react-query';
import { api } from '../api';

export type ProjectBoard = Awaited<ReturnType<typeof api.workspace.projectBoard>>;

export const boardKey = (projectId: string) => ['workspace', 'board', projectId] as const;

/**
 * A project's board (docs/etapas/10-quadro-tarefa.md, "Dados"): its live tasks in board order, the done column's
 * only from the last 14 days in the owner's time zone, with how many came before, today there and the revision.
 */
export function useProjectBoard(projectId: string) {
  return useQuery({ queryKey: boardKey(projectId), queryFn: () => api.workspace.projectBoard({ projectId }) });
}
