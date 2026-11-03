import type { Column } from '../../domain/columns.js';
import type { TaskRecord } from './tasks.js';

/** Board columns, the same for every project. */
export interface ColumnRepository {
  /** The active columns in board order. */
  activeColumns(): Promise<Column[]>;
  findColumn(id: string): Promise<Column | undefined>;
  /** The live tasks of every project in each active column. */
  columnTaskCounts(): Promise<Map<string, number>>;
  insertColumn(column: Column): Promise<void>;
  saveColumn(column: Column, expectedVersion: number): Promise<void>;
  /** The order is not an edit: version and dates stay. */
  setColumnPosition(id: string, position: number): Promise<void>;
  /**
   * Makes the column the done one at `at`, its update date; the version stays. The migration's
   * triggers hand the role over and set the completions of both columns' tasks.
   */
  makeDoneColumn(id: string, at: string): Promise<void>;
  /** Every task of the column, live and trashed, of every project, by project and board order. */
  tasksOfColumn(columnId: string): Promise<TaskRecord[]>;
  /** Sets one task's completion without editing it. */
  setTaskCompletion(input: { taskId: string; completedAt: string | null }): Promise<void>;
}
