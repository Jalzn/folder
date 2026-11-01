import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { api } from '../api';

export type EmbeddedItems = Awaited<ReturnType<typeof api.workspace.resolveEmbeds>>;
export type EmbeddedTask = EmbeddedItems['tasks'][number];
export type EmbeddedDrawing = EmbeddedItems['drawings'][number];
export type LiveTask = Extract<EmbeddedTask, { state: 'live' }>;
export type LiveDrawing = Extract<EmbeddedDrawing, { state: 'live' }>;
export type EmbedProject = LiveTask['project'];

/** Every embeds query: the writes that change what an embed shows refresh them (decision 11). */
export const embedsKey = ['workspace', 'embeds'] as const;

/**
 * The states of a document's embeds, in one read (docs/etapas/11-documento-desenho.md, decision 11): the IDs
 * in the editor, saved or not, sorted so that moving a block asks nothing new. Every workspace write refreshes
 * it, and so does coming back to the tab; the previous answer stays while the next one comes.
 */
export function useEmbeds(documentId: string, ids: { taskIds: readonly string[]; canvasIds: readonly string[] }) {
  const taskIds = [...ids.taskIds].sort();
  const canvasIds = [...ids.canvasIds].sort();
  return useQuery({
    queryKey: [...embedsKey, documentId, taskIds, canvasIds],
    queryFn: () => api.workspace.resolveEmbeds({ taskIds, canvasIds }),
    enabled: taskIds.length + canvasIds.length > 0,
    placeholderData: keepPreviousData,
    staleTime: 0,
  });
}
