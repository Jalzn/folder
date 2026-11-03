import { LABEL_LIMITS, type Label } from '../../domain/labels.js';
import { workspaceErrors } from '../errors.js';
import { namedCollection } from '../named-collection.js';
import type { LabelRepository } from '../ports/labels.js';

/** An active label: a deleted one is in no read, and only a restore brings it back. */
export async function requireActiveLabel(repo: Pick<LabelRepository, 'findLabel'>, id: string): Promise<Label> {
  const label = await repo.findLabel(id);
  if (!label || label.deletedAt) throw workspaceErrors.labelMissing();
  return label;
}
const collection = namedCollection({
  thing: 'etiqueta',
  maxChars: LABEL_LIMITS.nameChars,
  limit: LABEL_LIMITS.active,
  fullMessage: `Máximo de ${LABEL_LIMITS.active} etiquetas.`,
});
export const readLabelName = collection.readName;
export const assertLabelNameFree = collection.assertNameFree;
export const assertRoomForLabel = collection.assertRoom;
