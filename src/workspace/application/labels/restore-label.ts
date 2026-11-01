import { AppError } from '@tinyfold/core/application';
import { assertVersion } from '../helpers.js';
import type { WorkspaceContext } from '../ports.js';
import type { RestoreLabelInput } from '../schemas/labels.js';
import { assertLabelNameFree, assertRoomForLabel } from './label-rules.js';

/** Undoes deleteLabel: the label comes back, with its links, unless another active one took the name. */
export function restoreLabel(ctx: WorkspaceContext, input: RestoreLabelInput) {
  return ctx.write('workspace.restoreLabel', input, async (repo) => {
    const label = await repo.findLabel(input.id);
    if (!label) throw new AppError('NOT_FOUND', 'A etiqueta não está disponível.');
    assertVersion(label.version, input.expectedVersion);
    if (!label.deletedAt) throw new AppError('DOMAIN_RULE', 'Esta etiqueta não foi excluída.');
    const labels = await repo.activeLabels();
    assertLabelNameFree(labels, label.name, label.id, ' Renomeie-a antes de desfazer.');
    assertRoomForLabel(labels);
    const version = label.version + 1;
    await repo.saveLabel({ ...label, version, updatedAt: ctx.now(), deletedAt: null }, label.version);
    return { id: label.id, version };
  });
}
