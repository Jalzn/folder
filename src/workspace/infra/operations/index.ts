import type { Database } from '@tinyfold/core/infra';
import type { NavigationContext } from '../../application/navigation/ports.js';
import type { WorkspaceContext } from '../../application/ports/context.js';
import type { ReadingContext } from '../../application/reading/ports.js';
import { type TimeZoneSource, utc } from '../calendar.js';
import { workspaceContext } from '../context.js';
import { navigationContext } from '../navigation-context.js';
import { readingContext } from '../reading-context.js';
import { canvasOperations } from './canvases.js';
import { columnOperations } from './columns.js';
import { documentOperations } from './documents.js';
import { embedOperations } from './embeds.js';
import { folderOperations } from './folders.js';
import { labelOperations } from './labels.js';
import { moveOperations } from './moves.js';
import { navigationOperations } from './navigation.js';
import { pinOperations } from './pins.js';
import { projectOperations } from './projects.js';
import { taskOperations } from './tasks.js';
import { trashOperations } from './trash.js';

export type { Operation } from './operation.js';
export function operationsFrom(ctx: WorkspaceContext, navigation: NavigationContext, reading: ReadingContext) {
  return {
    ...projectOperations(ctx),
    ...folderOperations(ctx),
    ...documentOperations(ctx),
    ...canvasOperations(ctx),
    ...taskOperations(ctx),
    ...columnOperations(ctx),
    ...labelOperations(ctx),
    ...trashOperations(ctx, navigation),
    ...pinOperations(ctx),
    ...moveOperations(ctx),
    ...navigationOperations(navigation, reading),
    ...embedOperations(reading),
  };
}

export function workspaceOperations(
  db: Database,
  clock = () => new Date(),
  timeZone: TimeZoneSource = utc,
  mutationClock = clock,
) {
  return operationsFrom(
    workspaceContext(db, clock, timeZone, mutationClock),
    navigationContext(db, clock, timeZone),
    readingContext(db, clock, timeZone),
  );
}
export type WorkspaceOperations = ReturnType<typeof operationsFrom>;
