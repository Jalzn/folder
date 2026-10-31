import type { Task, TaskStatus } from '../../domain/models.js';
import type { NavItem, NavItemType } from '../../domain/navigation.js';
import type { TrashItemType } from '../schemas/trash.js';

/** Queries the interface uses to find its way around one project. Archived projects answer too. */
export interface NavigationReader {
  /** Whether the project exists, archived or not. */
  hasProject(projectId: string): Promise<boolean>;
  /** Every live document or drawing of the project: few enough for the sidebar to sort in memory. */
  navItems(projectId: string, type: NavItemType): Promise<NavItem[]>;
  /** The project's live tasks in each column. */
  taskCounts(projectId: string): Promise<Record<TaskStatus, number>>;
  /** The first `limit` live tasks of one column, in board order, with their sources. */
  tasksInColumn(projectId: string, status: TaskStatus, limit: number): Promise<Task[]>;
  /** The live documents and drawings edited last, with an excerpt of their text. */
  recentItems(projectId: string, limit: number): Promise<RecentItem[]>;
  /** Items of every type in the project's trash. */
  trashCount(projectId: string): Promise<number>;
  /** The first `limit` items of the project's trash, of every type, the most recently deleted first. */
  trashItems(projectId: string, limit: number): Promise<TrashItem[]>;
}

export interface NavigationContext {
  read<T>(work: (reader: NavigationReader) => Promise<T>): Promise<T>;
}

export interface RecentItem {
  type: NavItemType;
  id: string;
  title: string;
  updatedAt: string;
  /** The start of the text, on one line. */
  excerpt: string;
}

export interface TrashItem {
  type: TrashItemType;
  id: string;
  title: string;
  /** What restoring or deleting the item for good must expect. */
  version: number;
  deletedAt: string;
}
