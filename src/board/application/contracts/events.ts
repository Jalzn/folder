import type { ModuleEvent } from '@tinyfold/core/application';

type TaskChange = {
  projectId: string;
  version: number;
};

export type BoardEvent =
  | ModuleEvent<'task.created', TaskChange>
  | ModuleEvent<'task.updated', TaskChange & { fields: readonly string[] }>
  | ModuleEvent<'task.textSaved', { textVersion: number; projectId: string }>
  | ModuleEvent<'task.trashed', TaskChange>
  | ModuleEvent<'task.restored', TaskChange>
  | ModuleEvent<'task.purged', Record<string, never>>
  | ModuleEvent<
      'board.changed',
      { revision: number; scope: 'tasks' | 'columns' | 'labels' | 'sources'; reason: string }
    >;
