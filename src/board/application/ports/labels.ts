import type { Label } from '../../domain/labels.js';

/** A label as lists show it, with the live tasks that use it. */
export interface LabelSummary {
  id: string;
  name: string;
  color: Label['color'];
  version: number;
  taskCount: number;
}

/** Labels, the same for every project. */
export interface LabelRepository {
  /** The labels with these IDs, active or deleted. */
  findLabels(ids: readonly string[]): Promise<Label[]>;
  findLabel(id: string): Promise<Label | undefined>;
  /** The active labels, in alphabetical order. */
  activeLabels(): Promise<Label[]>;
  /** The active labels with the live tasks that use each, in alphabetical order. */
  labelSummaries(): Promise<LabelSummary[]>;
  /** The live tasks linked to the label. */
  liveTasksWithLabel(labelId: string): Promise<number>;
  /**
   * Drops the label's links to the tasks, live and trashed, that already have `limit` active labels,
   * and says how many it dropped: restoring the label would put them past the limit.
   */
  unlinkTasksAtLimit(labelId: string, limit: number): Promise<number>;
  insertLabel(label: Label): Promise<void>;
  saveLabel(label: Label, expectedVersion: number): Promise<void>;
}
