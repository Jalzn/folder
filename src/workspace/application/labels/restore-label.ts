import { AppError } from '@tinyfold/core/application';
import { TASK_LIMITS } from '../../domain/tasks.js';
import { assertVersion } from '../helpers.js';
import type { WorkspaceContext } from '../ports.js';
import type { RestoreLabelInput } from '../schemas/labels.js';
import { assertLabelNameFree, assertRoomForLabel } from './label-rules.js';

/**
 * Undoes deleteLabel: the label comes back, with its links, unless another active one took the name.
 * A task that reached TASK_LIMITS.labels active labels meanwhile stays without it: its link is
 * dropped, and `skipped` counts those tasks, live and trashed, for the toast.
 */
export function restoreLabel(ctx: WorkspaceContext, input: RestoreLabelInput) {
  return ctx.write('workspace.restoreLabel', input, async (repo) => {
    const label = await repo.findLabel(input.id);
    if (!label) throw new AppError('NOT_FOUND', 'A etiqueta não está disponível.');
    assertVersion(label.version, input.expectedVersion);
    if (!label.deletedAt) throw new AppError('DOMAIN_RULE', 'Esta etiqueta não foi excluída.');
    const labels = await repo.activeLabels();
    assertLabelNameFree(labels, label.name, label.id, ' Renomeie-a antes de desfazer.');
    assertRoomForLabel(labels);
    const skipped = await repo.unlinkTasksAtLimit(label.id, TASK_LIMITS.labels);
    const version = label.version + 1;
    await repo.saveLabel({ ...label, version, updatedAt: ctx.now(), deletedAt: null }, label.version);
    return { id: label.id, version, skipped };
  });
}
