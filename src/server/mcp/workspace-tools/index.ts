import { withToolErrors } from './errors.js';
import { withoutHiddenText } from './hidden-text.js';
import { listProjectsTool } from './list-projects.js';
import { listTasksTool } from './list-tasks.js';
import { withTextCeiling } from './output-ceiling.js';
import type { AgentQueries } from './queries.js';
import { readDocumentTool } from './read-document.js';
import { readDrawingTool } from './read-drawing.js';
import { readTaskTool } from './read-task.js';
import { searchTool } from './search.js';
import type { AgentTool } from './types.js';

export type { AgentTool, AgentToolAnnotations, AgentToolContent, AgentToolResult } from './types.js';
export function toolsFromQueries(
  queries: AgentQueries,
  logError: (error: unknown) => void = console.error,
): AgentTool[] {
  const tools: AgentTool[] = [
    listProjectsTool(queries),
    searchTool(queries),
    readDocumentTool(queries),
    readDrawingTool(queries),
    listTasksTool(queries),
    readTaskTool(queries),
  ];
  return tools.map((tool) => withTextCeiling(withoutHiddenText(withToolErrors(tool, logError))));
}
