import { withoutStrayTags } from '../../domain/visible-text.js';
import type { AgentTool, AgentToolContent } from './types.js';

const withoutTags = (block: AgentToolContent): AgentToolContent =>
  block.type === 'text' ? { ...block, text: withoutStrayTags(block.text) } : block;

/**
 * Drops from every text a tool returns the tag characters outside a flag (withoutStrayTags). They
 * draw nothing in the interface but spell a text to an agent: names and titles stored before
 * visibleText could hold them, in header lines and in every JSON item, and document content still
 * may. A flag's tags stay.
 */
export function withoutHiddenTags<Schema extends AgentTool['inputSchema']>(tool: AgentTool<Schema>): AgentTool<Schema> {
  return {
    ...tool,
    handler: async (input) => {
      const result = await tool.handler(input);
      return { ...result, content: result.content.map(withoutTags) };
    },
  };
}
