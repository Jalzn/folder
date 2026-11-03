import type { TransactionScope } from '@tinyfold/core/application';
import type { DrawingOrganization } from '../application/ports.js';
import { type DrawingsModule, drawingRuntime } from './module.js';
import { operationsFrom, queriesFrom } from './operations.js';
import { zlibImageData } from './png-image-data.js';

export type { DrawingsRepository } from '../application/ports.js';
export type { DrawingOrganization };

export const drawingsOperations = (module: DrawingsModule) => drawingRuntime(module).operations;

export function drawingsParticipant(module: DrawingsModule, scope: TransactionScope) {
  const { options, ports } = drawingRuntime(module);
  const context = options.unit.participantContext(scope, ports, options);
  const repository = options.unit.bind(scope, ports(scope));
  return {
    repository,
    context,
    operations: operationsFrom(context, options.imageData ?? zlibImageData),
    queries: queriesFrom(context),
  };
}

export const disposeDrawings = (module: DrawingsModule) => drawingRuntime(module).channel.dispose();
