import { bindOperation, defineModule, type TransactionScope } from '#core/application';
import { createEventChannel, type SqliteUnitOfWork } from '#core/infra';
import type { DrawingEvent } from '../application/contracts/events.js';
import type { DrawingOrganization, DrawingsPorts, PngImageData } from '../application/ports.js';
import { operationsFrom, queriesFrom } from './operations.js';
import { zlibImageData } from './png-image-data.js';
import { drawingsRepository } from './repository/index.js';

export interface DrawingsModuleOptions {
  unit: SqliteUnitOfWork;
  organization(scope: TransactionScope): DrawingOrganization;
  clock?: () => Date;
  newId?: () => string;
  logError?: (error: unknown) => void;
  imageData?: PngImageData;
}

function runtime(options: DrawingsModuleOptions) {
  const channel = createEventChannel<DrawingEvent>(options.logError ? { logError: options.logError } : {});
  const ports = (scope: TransactionScope): DrawingsPorts => ({
    ...drawingsRepository(
      options.unit.connection(scope),
      (event) => options.unit.emit(scope, channel, event),
      () => options.unit.assertWritable(scope),
    ),
    ...options.organization(scope),
  });
  const context = options.unit.context(ports, options);
  const operations = operationsFrom(context, options.imageData ?? zlibImageData);
  const queries = queriesFrom(context);
  return { options, channel, ports, operations, queries };
}

const definition = defineModule({
  id: 'drawings',
  setup: runtime,
  api: ({ operations, queries, channel }) => ({
    commands: {
      create: bindOperation(operations.createCanvas),
      save: bindOperation(operations.saveCanvas),
      trash: bindOperation(operations.deleteCanvas),
      restore: bindOperation(operations.restoreCanvas),
      storePreview: bindOperation(operations.saveCanvasPreview),
      purge: bindOperation(operations.purgeCanvas),
    },
    queries: {
      list: (input: Parameters<typeof operations.listCanvases.run>[0] = {}) =>
        bindOperation(operations.listCanvases)(input),
      get: bindOperation(operations.getCanvas),
      previewImage: queries.previewImage,
      readForAgent: bindOperation(queries.readForAgent),
    },
    events: channel.source,
  }),
});

/** The module's public facade; the server connects its ports through the composition entry. */
export class DrawingsModule extends definition.Module {}

/** Only the composition entry reexports access to a module's transaction participants. */
export function drawingRuntime(module: DrawingsModule) {
  return definition.stateOf(module);
}
