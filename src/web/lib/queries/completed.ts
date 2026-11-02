import { useInfiniteQuery } from '@tanstack/react-query';
import { api } from '../api';

export type CompletedTasksPage = Awaited<ReturnType<typeof api.workspace.listCompletedTasks>>;
export type CompletedTask = CompletedTasksPage['items'][number];

/** How many completed tasks a page of Concluídas brings at a time. */
const COMPLETED_PAGE_SIZE = 50;

export const completedKey = (projectId: string) => ['workspace', 'completed', projectId] as const;

/**
 * A project's completed tasks (docs/etapas/10-quadro-tarefa.md, "Concluídas"): the most recently completed
 * first, 50 at a time by `listCompletedTasks`'s cursor, with the project's total on each page. A refresh of the
 * workspace reads every loaded page again from the first, so a task reopened meanwhile leaves the list.
 */
export function useCompletedTasks(projectId: string) {
  return useInfiniteQuery({
    queryKey: completedKey(projectId),
    queryFn: ({ pageParam }) =>
      api.workspace.listCompletedTasks({
        projectId,
        limit: COMPLETED_PAGE_SIZE,
        ...(pageParam ? { cursor: pageParam } : {}),
      }),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.nextCursor,
  });
}
