import { AppError } from '#core/application';
import { DomainError } from '#core/domain';
import type { AgentTool, AgentToolResult } from './types.js';

const toolError = (message: string): AgentToolResult => ({
  content: [{ type: 'text', text: message }],
  isError: true,
});

/**
 * Known failures reach the agent as error results with their own message. Anything else is logged
 * and replaced by a generic message, so internal details never reach the agent.
 */
export function withToolErrors<Schema extends AgentTool['inputSchema']>(
  tool: AgentTool<Schema>,
  logError: (error: unknown) => void,
): AgentTool<Schema> {
  return {
    ...tool,
    async handler(input) {
      try {
        return await tool.handler(input);
      } catch (error) {
        if (error instanceof AppError || error instanceof DomainError) return toolError(error.message);
        logError(error);
        return toolError('Falha interna ao consultar o Tinyfold. Tente de novo.');
      }
    },
  };
}
