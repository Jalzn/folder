import { AppError } from '@tinyfold/core/application';
import { LABEL_LIMITS, type Label } from '../../domain/labels.js';
import { assertNameFree, readName } from '../name-rules.js';
import type { LabelRepository } from '../ports.js';

/** An active label: a deleted one is in no read, and only a restore brings it back. */
export async function requireActiveLabel(repo: Pick<LabelRepository, 'findLabel'>, id: string): Promise<Label> {
  const label = await repo.findLabel(id);
  if (!label || label.deletedAt) throw new AppError('NOT_FOUND', 'A etiqueta não está disponível.');
  return label;
}

/** A label's name as stored: see readName. */
export const readLabelName = (raw: string): string => readName(raw, 'etiqueta', LABEL_LIMITS.nameChars);

/** Refuses a name another active label has, by its key; `except` is the label being renamed. */
export const assertLabelNameFree = (labels: readonly Label[], name: string, except?: string, suffix = ''): void =>
  assertNameFree(labels, name, 'etiqueta', { ...(except ? { except } : {}), suffix });

/** Refuses the label after the last one there may be. */
export function assertRoomForLabel(labels: readonly Label[]): void {
  if (labels.length >= LABEL_LIMITS.active)
    throw new AppError('DOMAIN_RULE', `Máximo de ${LABEL_LIMITS.active} etiquetas.`);
}
