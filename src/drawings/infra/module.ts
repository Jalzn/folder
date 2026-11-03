import type { RuntimeModule } from '@tinyfold/core/application';
import { bindOperation, type EventSource, type TransactionScope } from '@tinyfold/core/application';
import { createEventChannel, type EventChannel, type SqliteUnitOfWork } from '@tinyfold/core/infra';
import type { DrawingEvent } from '../application/contracts/events.js';
import type { DrawingOrganization, DrawingsPorts, PngImageData } from '../application/ports.js';
import { type DrawingsOperations, operationsFrom, queriesFrom } from './operations.js';
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

interface DrawingRuntime {
  options: DrawingsModuleOptions;
  channel: EventChannel<DrawingEvent>;
  ports(scope: TransactionScope): DrawingsPorts;
  operations: DrawingsOperations;
}
const runtimes = new WeakMap<DrawingsModule, DrawingRuntime>();

/** The module's public facade; the server connects its ports through the composition entry. */
export class DrawingsModule implements RuntimeModule<object, object, DrawingEvent> {
  readonly id = 'drawings';
  readonly commands;
  readonly queries;
  readonly events: EventSource<DrawingEvent>;

  constructor(options: DrawingsModuleOptions) {
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
    this.commands = {
      create: bindOperation(operations.createCanvas),
      save: bindOperation(operations.saveCanvas),
      trash: bindOperation(operations.deleteCanvas),
      restore: bindOperation(operations.restoreCanvas),
      storePreview: bindOperation(operations.saveCanvasPreview),
      purge: bindOperation(operations.purgeCanvas),
    };
    this.queries = {
      list: (input: Parameters<typeof operations.listCanvases.run>[0] = {}) =>
        bindOperation(operations.listCanvases)(input),
      get: bindOperation(operations.getCanvas),
      previewImage: queries.previewImage,
      readForAgent: bindOperation(queries.readForAgent),
    };
    this.events = channel.source;
    runtimes.set(this, { options, channel, ports, operations });
  }
}

/** Only the composition entry reexports access to a module's transaction participants. */
export function drawingRuntime(module: DrawingsModule): DrawingRuntime {
  const runtime = runtimes.get(module);
  if (!runtime) throw new Error('Unknown drawings module.');
  return runtime;
}
