import type { Database } from '@tinyfold/core/infra';
import { workspaceContext } from '../context.js';
import { navigationContext } from '../navigation-context.js';
import { readingContext } from '../reading-context.js';
import { canvasOperations } from './canvases.js';
import { documentOperations } from './documents.js';
import { navigationOperations } from './navigation.js';
import { pinOperations } from './pins.js';
import { projectOperations } from './projects.js';
import { taskOperations } from './tasks.js';
import { trashOperations } from './trash.js';

export type { Operation } from './operation.js';

/** Every workspace operation, by aggregate, over one database. */
export function workspaceOperations(db: Database, clock = () => new Date()) {
  const ctx = workspaceContext(db, clock);
  const navigation = navigationContext(db);
  return {
    ...projectOperations(ctx),
    ...documentOperations(ctx),
    ...canvasOperations(ctx),
    ...taskOperations(ctx),
    ...trashOperations(ctx, navigation),
    ...pinOperations(ctx),
    ...navigationOperations(navigation, readingContext(db)),
  };
}
