import type { IsoInstant } from '@tinyfold/core/domain';
import type { ProjectColor } from './project.js';

export interface Project {
  id: string;
  name: string;
  color: ProjectColor;
  /** The place in the project selector; only active projects are ordered by it. */
  position: number;
  version: number;
  archivedAt: IsoInstant | null;
  createdAt: IsoInstant;
  updatedAt: IsoInstant;
}
