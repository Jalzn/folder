import type { RuntimeModule } from '@tinyfold/core/application';
import { bindOperation, type EventDraft, operation, type TransactionScope } from '@tinyfold/core/application';
import { createEventChannel, type SqliteUnitOfWork } from '@tinyfold/core/infra';
import type { z } from 'zod';
import type { Calendar } from '../application/calendar.js';
import type { WorkspaceEvent } from '../application/contracts/events.js';
import {
  createTaskFromDocument,
  type SourceTaskAck,
  type SourceTaskInput,
  type SourceTaskRawInput,
} from '../application/flows/source-task.js';
import { deleteFolder } from '../application/folders/delete-folder.js';
import { restoreFolder } from '../application/folders/restore-folder.js';
import type { NavigationContext } from '../application/navigation/ports.js';
import type { WorkspaceFlowContext, WorkspaceFlowPorts } from '../application/ports/context.js';
import { listProjects as listProjectsForAgent } from '../application/reading/list-projects.js';
import type { ReadingContext } from '../application/reading/ports.js';
import { readDocument } from '../application/reading/read-document.js';
import {
  ListProjectsInput as AgentProjectsInput,
  ReadDocumentInput,
  SearchInput,
} from '../application/reading/schemas.js';
import { search as searchForAgent } from '../application/reading/search.js';
import { DeleteFolderInput, RestoreFolderInput } from '../application/schemas/folders.js';
import { embedOperations } from './operations/embeds.js';
import { moveOperations } from './operations/moves.js';
import { navigationOperations } from './operations/navigation.js';
import { pinOperations } from './operations/pins.js';
import { trashOperations } from './operations/trash.js';

export interface WorkspaceDependencies {
  unit: SqliteUnitOfWork;
  ports(scope: TransactionScope): WorkspaceFlowPorts;
  sourceTaskInput: z.ZodType<SourceTaskInput, SourceTaskRawInput>;
  sourceTask(scope: TransactionScope, input: SourceTaskInput): Promise<SourceTaskAck>;
  navigation: NavigationContext;
  reading: ReadingContext;
  calendar(): Promise<Calendar>;
  clock?: () => Date;
  newId?: () => string;
  logError?: (error: unknown) => void;
}

/** Inputs have already passed their schemas; only routing identifiers enter event metadata. */
function flowChange(name: string, input: object, result: unknown): EventDraft<WorkspaceEvent> | undefined {
  const fields = input as { id?: string; projectId?: string };
  if ((name === 'workspace.deleteFolder' || name === 'workspace.restoreFolder') && fields.id)
    return {
      type: 'workspace.changed',
      entityId: fields.id,
      payload: { reason: name, scope: { kind: 'folder', folderId: fields.id } },
    };
  if (name === 'workspace.purgeDocument' && fields.id)
    return {
      type: 'workspace.changed',
      entityId: fields.id,
      payload: { reason: name, scope: { kind: 'document', documentId: fields.id } },
    };
  if (
    name === 'workspace.emptyTrash' &&
    fields.projectId &&
    typeof result === 'object' &&
    result !== null &&
    'purged' in result &&
    typeof result.purged === 'number' &&
    result.purged > 0
  )
    return {
      type: 'workspace.changed',
      entityId: fields.projectId,
      payload: { reason: name, scope: { kind: 'trash', projectId: fields.projectId } },
    };
  return undefined;
}

function build(deps: WorkspaceDependencies) {
  const { unit } = deps;
  const channel = createEventChannel<WorkspaceEvent>({ ...(deps.logError ? { logError: deps.logError } : {}) });
  const options = { ...(deps.clock ? { clock: deps.clock } : {}), ...(deps.newId ? { newId: deps.newId } : {}) };
  const ports = (scope: TransactionScope): WorkspaceFlowPorts => {
    const bound = deps.ports(scope);
    const moved = (input: { id: string; type: 'document' | 'drawing' }) => {
      if (unit.operation(scope) === 'workspace.moveItem')
        unit.emit(scope, channel, {
          type: 'workspace.changed',
          entityId: input.id,
          payload: {
            reason: 'workspace.moveItem',
            scope: { kind: 'item', itemType: input.type, itemId: input.id },
          },
        });
    };
    return {
      ...bound,
      async moveItem(input) {
        await bound.moveItem(input);
        moved(input);
      },
      async placeItem(input) {
        await bound.placeItem(input);
        moved(input);
      },
      async setPinnedAt(input) {
        await bound.setPinnedAt(input);
        unit.emit(scope, channel, {
          type: 'workspace.changed',
          entityId: input.id,
          payload: {
            reason: input.pinnedAt ? 'workspace.pinItem' : 'workspace.unpinItem',
            scope: { kind: 'item', itemType: input.type, itemId: input.id },
          },
        });
      },
    };
  };
  const base = unit.context(ports, options);
  const context: WorkspaceFlowContext = {
    ...base,
    write: (name, input, work) =>
      unit.write(name, input, async (scope) => {
        const result = await work(unit.bind(scope, ports(scope)));
        const event = flowChange(name, input, result);
        if (event) unit.emit(scope, channel, event);
        return result;
      }),
  };
  const sourceContext = unit.context(
    (scope) => ({
      async createSourceTask(input: SourceTaskInput) {
        const result = await deps.sourceTask(scope, input);
        if (input.source)
          unit.emit(scope, channel, {
            type: 'workspace.changed',
            entityId: result.id,
            payload: {
              reason: 'workspace.createTask',
              scope: {
                kind: 'task',
                taskId: result.id,
                projectId: result.projectId,
                documentId: input.source.documentId,
              },
            },
          });
        return result;
      },
    }),
    options,
  );
  const sourceTaskOperation = operation(deps.sourceTaskInput, (input) => createTaskFromDocument(sourceContext, input));
  const operations = {
    deleteFolder: operation(DeleteFolderInput, (input) => deleteFolder(context, input)),
    restoreFolder: operation(RestoreFolderInput, (input) => restoreFolder(context, input)),
    ...trashOperations(context, deps.navigation),
    ...moveOperations(context),
    ...pinOperations(context),
    ...navigationOperations(deps.navigation, deps.reading),
    ...embedOperations(deps.reading),
  };
  return { channel, operations, sourceTaskOperation };
}

const instances = new WeakMap<WorkspaceModule, ReturnType<typeof build>>();

export class WorkspaceModule implements RuntimeModule<object, object, WorkspaceEvent> {
  readonly id = 'workspace';
  readonly commands;
  readonly queries;
  readonly events;

  constructor(deps: WorkspaceDependencies) {
    const built = build(deps);
    instances.set(this, built);
    this.events = built.channel.source;
    const op = built.operations;
    this.commands = {
      createTaskFromDocument: bindOperation(built.sourceTaskOperation),
      deleteFolder: bindOperation(op.deleteFolder),
      restoreFolder: bindOperation(op.restoreFolder),
      moveItem: bindOperation(op.moveItem),
      pinItem: bindOperation(op.pinItem),
      unpinItem: bindOperation(op.unpinItem),
      purgeDocument: bindOperation(op.purgeDocument),
      emptyTrash: bindOperation(op.emptyTrash),
    };
    this.queries = {
      readDocument: bindOperation(operation(ReadDocumentInput, (input) => readDocument(deps.reading, input))),
      listProjectsForAgent: bindOperation(
        operation(AgentProjectsInput, (input) => listProjectsForAgent(deps.reading, input)),
      ),
      searchForAgent: bindOperation(operation(SearchInput, (input) => searchForAgent(deps.reading, input))),
      projectNavigation: bindOperation(op.projectNavigation),
      projectOverview: bindOperation(op.projectOverview),
      search: bindOperation(op.search),
      resolveEmbeds: bindOperation(op.resolveEmbeds),
      listTrash: bindOperation(op.listTrash),
    };
  }
}

function runtime(module: WorkspaceModule) {
  const value = instances.get(module);
  if (!value) throw new Error('Unknown workspace module.');
  return value;
}

export const workspaceOperationsFrom = (module: WorkspaceModule) => runtime(module).operations;
export const workspaceSourceTaskOperation = (module: WorkspaceModule) => runtime(module).sourceTaskOperation;
export const disposeWorkspace = (module: WorkspaceModule) => runtime(module).channel.dispose();
