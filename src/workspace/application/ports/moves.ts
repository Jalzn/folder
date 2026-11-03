import type { NavItemType } from '../../domain/navigation.js';

/** Documents and drawings moving between projects. */
export interface MoveRepository {
  /**
   * Sets the project, at the expected version, at its root and unpinned: a folder belongs to one
   * project. The version goes up and the dates stay.
   */
  moveItem(type: NavItemType, id: string, projectId: string, expectedVersion: number): Promise<void>;
}
