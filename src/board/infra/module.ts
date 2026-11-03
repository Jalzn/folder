import type { EventDraft, TransactionScope } from '#core/application';
import { bindOperation, defineModule, operation } from '#core/application';
import { createEventChannel, type SqliteUnitOfWork } from '#core/infra';
import type { Calendar } from '../application/calendar.js';
import type { BoardEvent } from '../application/contracts/events.js';
import type { BoardContext, BoardRepositories } from '../application/ports/context.js';
import type { BoardExternalPorts } from '../application/ports/external.js';
import { listTasks as listTasksForAgent } from '../application/reading/list-tasks.js';
import type { BoardReadingContext } from '../application/reading/ports.js';
import { readTask } from '../application/reading/read-task.js';
import { ListTasksInput, ReadTaskInput } from '../application/reading/schemas.js';
import { boardApi, operationsFrom } from './operations/index.js';
import { boardReader as createBoardReader } from './reader.js';
import { boardRepository } from './repository/board.js';
import { columnRepository } from './repository/columns.js';
import { labelRepository } from './repository/labels.js';
import { taskRemovalRepository } from './repository/removal.js';
import { taskRepository } from './repository/tasks.js';

export interface BoardDependencies {
  unit: SqliteUnitOfWork;
  external(scope: TransactionScope): BoardExternalPorts;
  calendar(): Promise<Calendar>;
  clock?: () => Date;
  newId?: () => string;
  logError?: (error: unknown) => void;
}

const mutations = new Set<keyof BoardRepositories>([
  'insertTask',
  'saveTaskFields',
  'saveTaskText',
  'insertSource',
  'setTaskPosition',
  'setTaskLabels',
  'insertColumn',
  'saveColumn',
  'setColumnPosition',
  'makeDoneColumn',
  'setTaskCompletion',
  'insertLabel',
  'saveLabel',
  'unlinkTasksAtLimit',
  'bumpRevision',
  'keepTitleInSources',
  'deleteTaskRow',
  'taskFieldsUpdated',
]);

function runtime(dependencies: BoardDependencies) {
  const { unit } = dependencies;
  const channel = createEventChannel<BoardEvent>({
    ...(dependencies.logError ? { logError: dependencies.logError } : {}),
  });
  function repository(scope: TransactionScope): BoardRepositories {
    const external = dependencies.external(scope);
    const connection = unit.connection(scope);
    const tasks = taskRepository(connection, external);
    const columns = columnRepository(connection);
    const labels = labelRepository(connection);
    const board = boardRepository(connection);
    const removal = taskRemovalRepository(connection);
    const emit = (event: EventDraft<BoardEvent>) => unit.emit(scope, channel, event);
    const changed = async (area: 'tasks' | 'columns' | 'labels' | 'sources', revision?: number) => {
      emit({
        type: 'board.changed',
        entityId: 'board',
        payload: {
          scope: area,
          revision: revision ?? (await board.revision()),
          reason: unit.operation(scope) ?? 'write',
        },
      });
    };
    const ports: BoardRepositories = {
      ...external,
      ...tasks,
      ...columns,
      ...labels,
      ...board,
      ...removal,
      async insertTask(task) {
        await tasks.insertTask(task);
        emit({
          type: 'task.created',
          entityId: task.id,
          payload: { projectId: task.projectId, version: task.version },
        });
      },
      async saveTaskFields(task, expectedVersion) {
        const previous = await tasks.findTask(task.id);
        await tasks.saveTaskFields(task, expectedVersion);
        const type =
          task.deletedAt && !previous?.deletedAt
            ? 'task.trashed'
            : !task.deletedAt && previous?.deletedAt
              ? 'task.restored'
              : undefined;
        if (type) emit({ type, entityId: task.id, payload: { projectId: task.projectId, version: task.version } });
      },
      taskFieldsUpdated(task, fields) {
        emit({
          type: 'task.updated',
          entityId: task.id,
          payload: { projectId: task.projectId, version: task.version, fields },
        });
      },
      async saveTaskText(task, expectedTextVersion) {
        await tasks.saveTaskText(task, expectedTextVersion);
        emit({
          type: 'task.textSaved',
          entityId: task.id,
          payload: { projectId: task.projectId, textVersion: task.textVersion },
        });
      },
      async deleteTaskRow(id) {
        await removal.deleteTaskRow(id);
        emit({ type: 'task.purged', entityId: id, payload: {} });
      },
      async keepTitleInSources(documentId, title) {
        await removal.keepTitleInSources(documentId, title);
        await changed('sources');
      },
      async bumpRevision() {
        const revision = await board.bumpRevision();
        const operation = unit.operation(scope) ?? '';
        await changed(operation.includes('Column') ? 'columns' : 'tasks', revision);
        return revision;
      },
      async saveColumn(column, expectedVersion) {
        const previous = await columns.findColumn(column.id);
        await columns.saveColumn(column, expectedVersion);
        if (previous?.deletedAt === column.deletedAt && previous?.name !== column.name) await changed('columns');
      },
      async insertLabel(label) {
        await labels.insertLabel(label);
        await changed('labels');
      },
      async saveLabel(label, expectedVersion) {
        await labels.saveLabel(label, expectedVersion);
        await changed('labels');
      },
    };
    const writable = new Proxy(ports, {
      get(target, key, receiver) {
        const member: unknown = Reflect.get(target, key, receiver);
        if (typeof member === 'function' && mutations.has(key as keyof BoardRepositories))
          return (...args: unknown[]) => {
            unit.assertWritable(scope);
            return Reflect.apply(member, target, args);
          };
        return member;
      },
    });
    return unit.bind(scope, writable);
  }
  const options = {
    ...(dependencies.clock ? { clock: dependencies.clock } : {}),
    ...(dependencies.newId ? { newId: dependencies.newId } : {}),
  };
  const context: BoardContext = { ...unit.context(repository, options), calendar: dependencies.calendar };
  const operations = operationsFrom(context);
  const reader = (scope: TransactionScope) =>
    unit.bind(scope, createBoardReader(unit.connection(scope), dependencies.external(scope)));
  const reading: BoardReadingContext = {
    read: (work) => unit.read((scope) => work(reader(scope))),
    calendar: dependencies.calendar,
  };
  const agentQueries = {
    listForAgent: bindOperation(operation(ListTasksInput, (input) => listTasksForAgent(reading, input))),
    readForAgent: bindOperation(operation(ReadTaskInput, (input) => readTask(reading, input))),
  };
  return {
    channel,
    operations,
    reader,
    agentQueries,
    participant(scope: TransactionScope) {
      const bound: BoardContext = {
        ...unit.participantContext(scope, repository, options),
        calendar: dependencies.calendar,
      };
      const operations = operationsFrom(bound);
      return {
        repository: repository(scope),
        reader: reader(scope),
        context: bound,
        operations,
        ...boardApi(operations),
      };
    },
  };
}

const definition = defineModule({
  id: 'board',
  setup: runtime,
  api: (state) => {
    const api = boardApi(state.operations);
    return {
      commands: api.commands,
      queries: { ...api.queries, tasks: { ...api.queries.tasks, ...state.agentQueries } },
      events: state.channel.source,
    };
  },
});

export class BoardModule extends definition.Module {}

export const boardParticipant = (module: BoardModule, scope: TransactionScope) =>
  definition.stateOf(module).participant(scope);
export const boardOperations = (module: BoardModule) => definition.stateOf(module).operations;
export const disposeBoard = (module: BoardModule) => definition.stateOf(module).channel.dispose();
export const boardReader = (module: BoardModule, scope: TransactionScope) => definition.stateOf(module).reader(scope);
