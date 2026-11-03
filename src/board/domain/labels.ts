import type { IsoInstant } from '#core/domain';
import { firstUnused } from '#core/domain';
/** A label, the same for every project. A deleted label keeps its row and its links to tasks. */
export interface Label {
  id: string;
  name: string;
  color: LabelColor;
  version: number;
  createdAt: IsoInstant;
  updatedAt: IsoInstant;
  deletedAt: IsoInstant | null;
}

/** The label colors, the keys of the --label-<color> tokens. */
export const LABEL_COLORS = ['blue', 'slate', 'purple', 'teal', 'amber', 'coral', 'lime'] as const;

export type LabelColor = (typeof LABEL_COLORS)[number];

/** Bounds of labels: the name and the active labels. A task has up to TASK_LIMITS.labels. */
export const LABEL_LIMITS = { nameChars: 30, active: 100 } as const;

/** A new label's color: the first no active label uses, or the first again once all are taken. */
export function nextLabelColor(active: readonly Pick<Label, 'color'>[]): LabelColor {
  return firstUnused(
    LABEL_COLORS,
    active.map((label) => label.color),
  );
}

/** Labels in alphabetical order, as Portuguese sorts them, IDs breaking ties. */
const names = new Intl.Collator('pt-BR');
export const byLabelName = (a: Pick<Label, 'id' | 'name'>, b: Pick<Label, 'id' | 'name'>) =>
  names.compare(a.name, b.name) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
