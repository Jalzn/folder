import type { WorkspaceContext } from '../ports/context.js';
import type { UpdateLabelInput } from '../schemas/labels.js';
import { assertVersion } from '../version.js';
import { assertLabelNameFree, readLabelName, requireActiveLabel } from './label-rules.js';

/** Renames or recolors an active label, with a new version. */
export function updateLabel(ctx: WorkspaceContext, input: UpdateLabelInput) {
  return ctx.write('workspace.updateLabel', input, async (repo) => {
    const label = await requireActiveLabel(repo, input.id);
    assertVersion(label.version, input.expectedVersion);
    const name = input.name === undefined ? label.name : readLabelName(input.name);
    if (input.name !== undefined) assertLabelNameFree(await repo.activeLabels(), name, label.id);
    const version = label.version + 1;
    await repo.saveLabel(
      { ...label, name, color: input.color ?? label.color, version, updatedAt: ctx.now() },
      label.version,
    );
    return { id: label.id, version };
  });
}
