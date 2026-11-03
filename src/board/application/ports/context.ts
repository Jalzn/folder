import type { ModuleContext } from '#core/application';
import type { Calendar } from '../calendar.js';
import type { BoardRepository } from './board.js';
import type { ColumnRepository } from './columns.js';
import type { BoardExternalPorts } from './external.js';
import type { LabelRepository } from './labels.js';
import type { TaskRecord, TaskRepository } from './tasks.js';

export interface TaskRemovalRepository {
  keepTitleInSources(documentId: string, title: string): Promise<void>;
  deleteTaskRow(id: string): Promise<void>;
}

export interface BoardChanges {
  taskFieldsUpdated(task: Pick<TaskRecord, 'id' | 'projectId' | 'version'>, fields: readonly string[]): void;
}

export type BoardRepositories = TaskRepository &
  ColumnRepository &
  LabelRepository &
  BoardRepository &
  TaskRemovalRepository &
  BoardExternalPorts &
  BoardChanges;

export interface BoardContext extends ModuleContext<BoardRepositories> {
  calendar(): Promise<Calendar>;
}
