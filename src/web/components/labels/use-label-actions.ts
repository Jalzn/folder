import type { LabelColor } from '@tinyfold/workspace/domain';
import { api, requestId } from '../../lib/api';
import { onceMoreIfLost } from '../../lib/lost-answer';
import type { LabelSummary } from '../../lib/queries/labels';
import type { WriteRunner } from '../../lib/use-action';
import { useAnnounce } from '../../shell/announcer';
import { useUndoableChange } from '../../shell/use-undoable-change';
import { useToast } from '../../ui';
import {
  LABEL_CHANGED,
  labelColorText,
  labelCreatedText,
  labelDeletedText,
  labelRenamedText,
  labelRestoredText,
} from './label-text';
import { useCreateLabel } from './use-create-label';

/**
 * The label writes of "Etiquetas" (docs/etapas/10-quadro-tarefa.md, "Etiquetas" and "Desfazer"): create with
 * the server's next color, rename, recolor, and delete at once, with Desfazer and ⌘Z while its toast is on
 * screen (user decision 1). Labels are the same for every project. Each intent keeps its request ID for the
 * one retry of a lost answer, the undo's included.
 */
export function useLabelActions(action: WriteRunner) {
  const toast = useToast();
  const announce = useAnnounce();
  const createLabel = useCreateLabel(action);
  const change = useUndoableChange(action);

  /** Creates a label with the next color; resolves to its ID. */
  async function create(name: string) {
    const created = await createLabel(name);
    if (created) announce(labelCreatedText(name));
    return created;
  }

  async function rename(label: LabelSummary, name: string) {
    const input = { requestId: requestId(), id: label.id, expectedVersion: label.version, name };
    const renamed = await action.run(() => onceMoreIfLost(() => api.workspace.updateLabel(input)));
    if (!renamed) return false;
    announce(labelRenamedText(name));
    return true;
  }

  async function recolor(label: LabelSummary, color: LabelColor) {
    const input = { requestId: requestId(), id: label.id, expectedVersion: label.version, color };
    const recolored = await action.run(() => onceMoreIfLost(() => api.workspace.updateLabel(input)));
    if (!recolored) return false;
    announce(labelColorText(label.name, color));
    return true;
  }

  /**
   * Deletes a label, its links to tasks kept (decision 16). Desfazer gives it back to all of them, but the tasks
   * that reached 20 labels since; `undone` follows, once the workspace read again. Resolves to the answer, or
   * undefined when it failed.
   */
  function remove(label: LabelSummary, undone?: () => void) {
    const input = { requestId: requestId(), id: label.id, expectedVersion: label.version };
    const restoring = requestId();
    return change(
      `label:${label.id}`,
      () => onceMoreIfLost(() => api.workspace.deleteLabel(input)),
      (deleted) => ({
        text: labelDeletedText(label.name, deleted.tasks),
        changed: LABEL_CHANGED,
        undo: async () => {
          const back = { requestId: restoring, id: label.id, expectedVersion: deleted.version };
          const restored = await onceMoreIfLost(() => api.workspace.restoreLabel(back));
          toast(labelRestoredText(label.name, restored.skipped));
        },
        undone,
      }),
    );
  }

  return { busy: action.busy, create, rename, recolor, remove };
}
