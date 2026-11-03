import type { CivilDate } from '@tinyfold/core/domain';
import { type RefObject, useState } from 'react';
import { api, errorMessage, refreshWorkspace } from '../../lib/api';
import { openEditor } from '../../lib/autosave/save-registry';
import { useRequest } from '../../lib/writes/use-request';
import { type DrawerContent, useTaskDrawer } from '../../shell/state';
import { useToast } from '../../ui';

type TaskDraft = {
  title: string;
  projectId: string;
  chosenColumn: string | undefined;
  dueOn: CivilDate | null;
  labelIds: string[];
};

/** Creates from the current draft, retaining the request identity across retries (WP-9). */
export function useTaskCreation({
  content,
  draft,
  columnName,
  projectName,
  field,
}: {
  content: Extract<DrawerContent, { mode: 'new' }>;
  draft: TaskDraft;
  columnName: string | undefined;
  projectName: string | undefined;
  field: RefObject<HTMLTextAreaElement | null>;
}) {
  const { title, projectId, chosenColumn, dueOn, labelIds } = draft;
  const drawer = useTaskDrawer();
  const request = useRequest();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // "Incorporar no documento" (docs/etapas/11-documento-desenho.md, decision 15): only while the excerpt's
  // document is open in this tab, whose editor puts the card in; checked to begin with.
  const sourceDocument = content.source?.documentId;
  const embedHost = () => (sourceDocument ? openEditor('document', sourceDocument)?.insertEmbedAfter : undefined);
  const canEmbed = Boolean(content.embedAfter && embedHost());
  const [embed, setEmbed] = useState(true);
  async function create() {
    if (busy) return;
    const name = title.trim();
    if (!name) {
      setError('Dê um título à tarefa.');
      field.current?.focus();
      return;
    }
    const source = content.source && {
      documentId: content.source.documentId,
      excerpt: content.source.excerpt,
      ...(content.source.blockId === undefined ? {} : { blockId: content.source.blockId }),
      ...(content.source.expectedVersion === undefined ? {} : { expectedVersion: content.source.expectedVersion }),
    };
    const input = {
      title: name,
      projectId,
      ...(chosenColumn ? { columnId: chosenColumn } : {}),
      ...(dueOn ? { dueOn } : {}),
      ...(labelIds.length ? { labelIds } : {}),
      ...(source ? { source } : {}),
    };
    setBusy(true);
    setError(null);
    try {
      const created = await api.workspace.createTask({ ...input, requestId: request.for(input) });
      request.clear();
      await refreshWorkspace();
      drawer.showTask({ id: created.id, projectId: created.projectId, title: name });
      content.onCreated?.({ id: created.id, projectId: created.projectId });
      // The document may have closed meanwhile: then the task stays without its card.
      const insert = canEmbed && embed && content.embedAfter ? embedHost() : undefined;
      const embedded = Boolean(insert && content.embedAfter && insert(content.embedAfter, created.id));
      toast(
        embedded
          ? 'Tarefa criada. O card entrou abaixo do parágrafo.'
          : `Tarefa criada em ${columnName ?? 'o quadro'} · ${projectName ?? 'o projeto'}.`,
      );
    } catch (failure) {
      setError(errorMessage(failure));
      await refreshWorkspace();
    } finally {
      setBusy(false);
    }
  }
  return { create, busy, error, setError, canEmbed, embed, setEmbed };
}
