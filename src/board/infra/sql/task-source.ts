import type { IsoInstant } from '#core/domain';
import type { DocumentBlock } from '#rich-text/domain';
import { excerptPresent } from '#rich-text/domain';
import type { TaskSource } from '../../domain/task-models.js';

interface SourceInput {
  documentId: string | null;
  keptTitle: string;
  blockId: string | null;
  excerpt: string;
  document: { title: string; deletedAt: IsoInstant | null; content: DocumentBlock[]; plainText: string } | undefined;
}
type AgentSource = Omit<TaskSource, 'documentTitle'> & { documentTitle: string | null };
export function hydrateTaskSource(input: SourceInput, audience: 'owner'): TaskSource;
export function hydrateTaskSource(input: SourceInput, audience: 'agent'): AgentSource;
/** Owners retain a trashed source's title; agents see that source as unavailable. */
export function hydrateTaskSource(
  { documentId, keptTitle, blockId, excerpt, document }: SourceInput,
  audience: 'owner' | 'agent',
): AgentSource {
  const available = Boolean(document && document.deletedAt === null);
  const documentTitle =
    audience === 'owner'
      ? (document?.title ?? keptTitle)
      : documentId === null
        ? keptTitle
        : available
          ? (document?.title ?? null)
          : null;
  return {
    documentId,
    documentTitle,
    blockId,
    excerpt,
    available,
    blockAvailable: Boolean(available && document && excerptPresent(document, blockId, excerpt)),
  };
}
export const taskChecklist = (row: { checklist_done: number; checklist_total: number }) =>
  row.checklist_total ? { done: row.checklist_done, total: row.checklist_total } : null;
