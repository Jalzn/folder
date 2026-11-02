import { withoutHidden } from '@tinyfold/core/domain';
import type { AgentTool, AgentToolContent } from './types.js';

const withoutHiddenIn = (block: AgentToolContent): AgentToolContent =>
  block.type === 'text' ? { ...block, text: withoutHidden(block.text) } : block;

/**
 * Drops from every text a tool returns what draws nothing where it is (withoutHidden), by the rules
 * names and titles follow when stored: stray tags, joiners and selectors, zero-width spaces, word
 * joiners and BOMs. They can carry a text an agent reads while the interface shows none. Names and
 * titles stored before those rules could hold them, in header lines and in every JSON item, and
 * document content still may. Spaces and line breaks stay; a flag, an emoji sequence and the joiners
 * of Persian or Sinhala too.
 */
export function withoutHiddenText<Schema extends AgentTool['inputSchema']>(tool: AgentTool<Schema>): AgentTool<Schema> {
  return {
    ...tool,
    handler: async (input) => {
      const result = await tool.handler(input);
      return { ...result, content: result.content.map(withoutHiddenIn) };
    },
  };
}
