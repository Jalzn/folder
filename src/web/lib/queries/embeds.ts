import { keepPreviousData, useQuery } from '@tanstack/react-query';
import type { EmbeddedDrawing, EmbeddedTask } from '#workspace/domain';
import { api } from '../api';
import { keys } from './keys';

/** The states of embedded items, as the domain declares them and resolveEmbeds answers. */
export type {
  EmbeddedDrawing,
  EmbeddedItems,
  EmbeddedTask,
  EmbedPreview,
  EmbedProject,
} from '#workspace/domain';
export type LiveTask = Extract<EmbeddedTask, { state: 'live' }>;
export type LiveDrawing = Extract<EmbeddedDrawing, { state: 'live' }>;

/** Every embeds query: the writes that change what an embed shows refresh them (decision 11). */
export const embedsKey = keys.embeds();

/**
 * The states of a document's embeds, in one read (docs/etapas/11-documento-desenho.md, decision 11): the IDs
 * in the editor, saved or not, sorted so that moving a block asks nothing new. Every workspace write refreshes
 * it, and so does coming back to the tab; the previous answer stays while the next one comes.
 */
export function useEmbeds(documentId: string, ids: { taskIds: readonly string[]; canvasIds: readonly string[] }) {
  const taskIds = [...ids.taskIds].sort();
  const canvasIds = [...ids.canvasIds].sort();
  return useQuery({
    queryKey: keys.embeds(documentId, { taskIds, canvasIds }),
    queryFn: () => api.workspace.resolveEmbeds({ taskIds, canvasIds }),
    enabled: taskIds.length + canvasIds.length > 0,
    placeholderData: keepPreviousData,
    staleTime: 0,
  });
}
