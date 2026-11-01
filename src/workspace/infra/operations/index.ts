import type { Database } from '@tinyfold/core/infra';
import { type TimeZoneSource, utc } from '../calendar.js';
import { workspaceContext } from '../context.js';
import { navigationContext } from '../navigation-context.js';
import { readingContext } from '../reading-context.js';
import { canvasOperations } from './canvases.js';
import { columnOperations } from './columns.js';
import { documentOperations } from './documents.js';
import { folderOperations } from './folders.js';
import { labelOperations } from './labels.js';
import { moveOperations } from './moves.js';
import { navigationOperations } from './navigation.js';
import { pinOperations } from './pins.js';
import { projectOperations } from './projects.js';
import { taskOperations } from './tasks.js';
import { trashOperations } from './trash.js';

export type { Operation } from './operation.js';

/** Every workspace operation, by aggregate, over one database. */
export function workspaceOperations(db: Database, clock = () => new Date(), timeZone: TimeZoneSource = utc) {
  const ctx = workspaceContext(db, clock, timeZone);
  const navigation = navigationContext(db, clock, timeZone);
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
    ...navigationOperations(navigation, readingContext(db, clock, timeZone)),
  };
}
