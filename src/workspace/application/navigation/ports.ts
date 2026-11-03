import type { CivilDate, IsoInstant } from '@tinyfold/core/domain';
import type { Column } from '../../domain/columns.js';
import type { NavItem, NavItemType } from '../../domain/navigation.js';
import type { Project } from '../../domain/project-models.js';
import type { Task } from '../../domain/task-models.js';
import type { Calendar } from '../calendar.js';
import type { TrashItemType } from '../schemas/trash.js';

/** Queries the interface uses to find its way around one project. Archived projects answer too. */
export interface NavigationReader {
  /** The project, archived or not. */
  findProject(projectId: string): Promise<Project | undefined>;
  /** Every live document or drawing of the project: few enough for the sidebar to sort in memory. */
  navItems(projectId: string, type: NavItemType): Promise<NavItem[]>;
  /** The project's active folders, in manual order. */
  folders(projectId: string): Promise<{ id: string; name: string; position: number; version: number }[]>;
  /** How many of the project's live tasks are outside the done column. */
  openTaskCount(projectId: string): Promise<number>;
  /** The active columns in board order. */
  columns(): Promise<Column[]>;
  /** The project's live tasks outside the done column, in board order, with their sources. */
  openTasks(projectId: string): Promise<Task[]>;
  /** How many of the project's live tasks are due before `today` outside the done column. */
  overdueCount(projectId: string, today: CivilDate): Promise<number>;
  /** The project's live tasks completed since `since`, the most recent first: the first `limit` and how many. */
  doneTasks(projectId: string, since: IsoInstant, limit: number): Promise<{ items: Task[]; total: number }>;
  /** The live documents and drawings edited last, with an excerpt of their text. */
  recentItems(projectId: string, limit: number): Promise<RecentItem[]>;
  /** Items of every type in the project's trash. */
  trashCount(projectId: string): Promise<number>;
  /** The first `limit` items of the project's trash, of every type, the most recently deleted first. */
  trashItems(projectId: string, limit: number): Promise<TrashItem[]>;
}

export interface NavigationContext {
  /** The owner's time zone and today in it. */
  calendar(): Promise<Calendar>;
  read<T>(work: (reader: NavigationReader) => Promise<T>): Promise<T>;
}

export interface RecentItem {
  type: NavItemType;
  id: string;
  title: string;
  updatedAt: IsoInstant;
  /**
   * On one line: a document's first text that is not a heading, or its headings when it has only
   * those; the start of a drawing's texts, separated by commas.
   */
  excerpt: string;
  /** The folder it is in, or null at the project's root. */
  folder: { id: string; name: string } | null;
}

export interface TrashItem {
  type: TrashItemType;
  id: string;
  title: string;
  /** What restoring or deleting the item for good must expect. */
  version: number;
  deletedAt: IsoInstant;
  /** The folder a document or drawing was in, even one deleted since; null for tasks and the root. */
  folder: { id: string; name: string; deleted: boolean } | null;
}
