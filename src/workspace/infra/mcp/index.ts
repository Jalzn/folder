import type { Database } from '@tinyfold/core/infra';
import { readingContext } from '../reading-context.js';
import { withToolErrors } from './errors.js';
import { withoutHiddenText } from './hidden-text.js';
import { listProjectsTool } from './list-projects.js';
import { listTasksTool } from './list-tasks.js';
import { withTextCeiling } from './output-ceiling.js';
import { readDocumentTool } from './read-document.js';
import { readDrawingTool } from './read-drawing.js';
import { readTaskTool } from './read-task.js';
import { searchTool } from './search.js';
import type { AgentTool } from './types.js';

export type { AgentTool, AgentToolAnnotations, AgentToolContent, AgentToolResult } from './types.js';

export interface WorkspaceToolOptions {
  /** Receives unexpected failures; the agent only sees a generic message. */
  logError?: (error: unknown) => void;
}

/**
 * The read-only tools agents use to consult the workspace; no text result passes the output ceiling
 * or carries characters that draw nothing where they are.
 */
export function createWorkspaceTools(db: Database, options: WorkspaceToolOptions = {}): AgentTool[] {
  const reading = readingContext(db);
  const logError = options.logError ?? console.error;
  const tools: AgentTool[] = [
    listProjectsTool(reading),
    searchTool(reading),
    readDocumentTool(reading),
    readDrawingTool(reading),
    listTasksTool(reading),
    readTaskTool(reading),
  ];
  return tools.map((tool) => withTextCeiling(withoutHiddenText(withToolErrors(tool, logError))));
}
