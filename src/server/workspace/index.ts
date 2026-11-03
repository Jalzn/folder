import type { Database } from '@tinyfold/core/infra';
import type { TimeZoneSource } from '@tinyfold/workspace/composition';
import { toolsFromQueries } from '../mcp/workspace-tools/index.js';
import { composeWorkspace } from './operations.js';
import { routerFromOperations } from './rpc.js';
import { serviceFromOperations } from './service.js';

export { composeWorkspace } from './operations.js';
export { createWorkspaceRouter } from './rpc.js';
export { createWorkspaceService, type WorkspaceService } from './service.js';
export interface WorkspaceOptions {
  clock?: () => Date;
  timeZone?: TimeZoneSource;
  logError?: (error: unknown) => void;
}
export function createWorkspace(db: Database, options: WorkspaceOptions = {}) {
  const composed = composeWorkspace(db, options);
  return {
    ...composed,
    router: routerFromOperations(composed.operations),
    service: serviceFromOperations(composed.operations),
    files: { canvasPreview: composed.modules.drawings.queries.previewImage },
    tools: toolsFromQueries(
      {
        readDrawing: composed.modules.drawings.queries.readForAgent,
        readDocument: composed.modules.workspace.queries.readDocument,
        readTask: composed.modules.board.queries.tasks.readForAgent,
        listTasks: composed.modules.board.queries.tasks.listForAgent,
        listProjects: composed.modules.workspace.queries.listProjectsForAgent,
        search: composed.modules.workspace.queries.searchForAgent,
      },
      options.logError,
    ),
  };
}
export type Workspace = ReturnType<typeof createWorkspace>;

export function createWorkspaceTools(db: Database, options: WorkspaceOptions = {}) {
  return createWorkspace(db, options).tools;
}
export type { AgentTool, AgentToolResult } from '../mcp/workspace-tools/index.js';
export type CanvasPreviewImage = Awaited<ReturnType<Workspace['files']['canvasPreview']>>;
export type WorkspaceFiles = Workspace['files'];
