import { READING_LIMITS } from '../../domain/reading-limits.js';
import type { AgentTool, AgentToolContent, AgentToolResult } from './types.js';

const ceiling = READING_LIMITS.toolTextChars;
const cutNote = `\n\n… resposta cortada em ${ceiling.toLocaleString('pt-BR')} caracteres.`;

/** The first `count` UTF-16 units of `text`, one fewer where the cut would split a surrogate pair. */
function codePointPrefix(text: string, count: number): string {
  const code = text.charCodeAt(count - 1);
  return text.slice(0, code >= 0xd800 && code <= 0xdbff ? count - 1 : count);
}

/**
 * Keeps the text blocks of a result within READING_LIMITS.toolTextChars together, cutting the one
 * that passes it and dropping later text. Images are kept: Claude Code does not count them.
 */
export function withinTextCeiling(result: AgentToolResult): AgentToolResult {
  let room: number = ceiling;
  const content: AgentToolContent[] = [];
  for (const block of result.content) {
    if (block.type !== 'text') content.push(block);
    else if (block.text.length <= room) {
      content.push(block);
      room -= block.text.length;
    } else if (room > cutNote.length) {
      content.push({ type: 'text', text: `${codePointPrefix(block.text, room - cutNote.length)}${cutNote}` });
      room = 0;
    }
  }
  return { ...result, content };
}

/**
 * Applies the ceiling to every result of the tool. The tools' own budgets keep within it; this is
 * the last guard, for content such as a code fence thousands of backticks long.
 */
export function withTextCeiling<Schema extends AgentTool['inputSchema']>(tool: AgentTool<Schema>): AgentTool<Schema> {
  return { ...tool, handler: async (input) => withinTextCeiling(await tool.handler(input)) };
}
