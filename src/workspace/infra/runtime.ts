import type { Database } from '@tinyfold/core/infra';
import { type TimeZoneSource, utc } from './calendar.js';
import { workspaceContext } from './context.js';
import { filesFromContext } from './files.js';
import { toolsFromContext } from './mcp/index.js';
import { navigationContext } from './navigation-context.js';
import { operationsFrom } from './operations/index.js';
import { readingContext } from './reading-context.js';
import { routerFromOperations } from './rpc.js';
import { serviceFromOperations } from './service.js';
export interface WorkspaceOptions {
  clock?: () => Date;
  timeZone?: TimeZoneSource;
  logError?: (error: unknown) => void;
}
/** One workspace runtime: all entry points share its contexts, clock and operation registry. */
export function createWorkspace(
  db: Database,
  { clock = () => new Date(), timeZone = utc, logError = console.error }: WorkspaceOptions = {},
) {
  const context = workspaceContext(db, clock, timeZone);
  const reading = readingContext(db, clock, timeZone);
  const navigation = navigationContext(db, clock, timeZone);
  const operations = operationsFrom(context, navigation, reading);
  return {
    router: routerFromOperations(operations),
    service: serviceFromOperations(operations),
    tools: toolsFromContext(reading, logError),
    files: filesFromContext(context),
  };
}
export type Workspace = ReturnType<typeof createWorkspace>;
