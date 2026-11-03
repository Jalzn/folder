import { bindOperation, operation } from '@tinyfold/core/application';
import type { BoardContext } from '../../application/ports/context.js';
import { PurgeTaskInput } from '../../application/schemas/purge.js';
import { purgeTask } from '../../application/tasks/purge-task.js';
import { columnOperations } from './columns.js';
import { labelOperations } from './labels.js';
import { taskOperations } from './tasks.js';

export function operationsFrom(context: BoardContext) {
  return {
    ...taskOperations(context),
    ...columnOperations(context),
    ...labelOperations(context),
    purgeTask: operation(PurgeTaskInput, (input) => purgeTask(context, input)),
  };
}

export function boardApi(ops: ReturnType<typeof operationsFrom>) {
  return {
    commands: {
      tasks: {
        create: bindOperation(ops.createTask),
        update: bindOperation(ops.updateTask),
        saveText: bindOperation(ops.saveTaskText),
        trash: bindOperation(ops.deleteTask),
        restore: bindOperation(ops.restoreTask),
        move: bindOperation(ops.moveTask),
        purge: bindOperation(ops.purgeTask),
      },
      columns: {
        create: bindOperation(ops.createColumn),
        rename: bindOperation(ops.renameColumn),
        move: bindOperation(ops.moveColumn),
        trash: bindOperation(ops.deleteColumn),
        restore: bindOperation(ops.restoreColumn),
        setDone: bindOperation(ops.setDoneColumn),
      },
      labels: {
        create: bindOperation(ops.createLabel),
        update: bindOperation(ops.updateLabel),
        trash: bindOperation(ops.deleteLabel),
        restore: bindOperation(ops.restoreLabel),
      },
    },
    queries: {
      tasks: {
        list: bindOperation(ops.listTasks),
        get: bindOperation(ops.getTask),
        projectBoard: bindOperation(ops.projectBoard),
        completed: bindOperation(ops.listCompletedTasks),
      },
      columns: { list: bindOperation(ops.listColumns) },
      labels: { list: bindOperation(ops.listLabels) },
    },
  };
}
