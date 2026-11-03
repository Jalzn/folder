import { nextLabelColor } from '../../domain/labels.js';
import type { WorkspaceContext } from '../ports/context.js';
import type { CreateLabelInput } from '../schemas/labels.js';
import { assertLabelNameFree, assertRoomForLabel, readLabelName } from './label-rules.js';

/** A new label, for every project, with the color asked for or the first no active label uses. */
export function createLabel(ctx: WorkspaceContext, input: CreateLabelInput) {
  return ctx.write('workspace.createLabel', input, async (repo) => {
    const name = readLabelName(input.name);
    const labels = await repo.activeLabels();
    assertLabelNameFree(labels, name);
    assertRoomForLabel(labels);
    const now = ctx.now();
    const label = {
      id: ctx.newId(),
      name,
      color: input.color ?? nextLabelColor(labels),
      version: 1,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    };
    await repo.insertLabel(label);
    return { id: label.id, version: label.version, color: label.color };
  });
}
