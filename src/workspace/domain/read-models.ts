import type { CivilDate, IsoInstant } from '@tinyfold/core/domain';

/** Column metadata used to order and group the workspace's aggregate task projections. */
export interface BoardColumn {
  id: string;
  name: string;
  position: number;
  isDone: boolean;
}

/** Persisted color tokens presented by embedded and aggregate task views. */
export type BoardLabelColor = 'blue' | 'slate' | 'purple' | 'teal' | 'amber' | 'coral' | 'lime';

/** Source metadata resolved with the owner's visibility for workspace navigation. */
export interface BoardTaskSource {
  documentId: string | null;
  blockId: string | null;
  excerpt: string;
  documentTitle: string;
  available: boolean;
  blockAvailable: boolean;
}

/** Task summary returned by the project's aggregate overview, without description content. */
export interface BoardTask {
  id: string;
  title: string;
  projectId: string;
  columnId: string;
  position: number;
  version: number;
  textVersion: number;
  dueOn: CivilDate | null;
  completedAt: IsoInstant | null;
  labelIds: string[];
  checklist: { done: number; total: number } | null;
  createdAt: IsoInstant;
  updatedAt: IsoInstant;
  source: BoardTaskSource | null;
}
