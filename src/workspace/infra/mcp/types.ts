import type { z } from 'zod';

/**
 * A tool an agent can call, independent of any MCP SDK: the server adapts it. Results carry only
 * `content`; Claude Code drops content blocks, images included, when structured content exists.
 */
export interface AgentTool<Schema extends z.ZodType = z.ZodType> {
  name: string;
  title: string;
  description: string;
  inputSchema: Schema;
  annotations: AgentToolAnnotations;
  handler(input: z.output<Schema>): Promise<AgentToolResult>;
}

export interface AgentToolAnnotations {
  readOnlyHint: boolean;
  idempotentHint: boolean;
  openWorldHint: boolean;
}

export type AgentToolContent = { type: 'text'; text: string } | { type: 'image'; data: string; mimeType: 'image/png' };

export interface AgentToolResult {
  content: AgentToolContent[];
  isError?: boolean;
}

export const readOnlyAnnotations: AgentToolAnnotations = {
  readOnlyHint: true,
  idempotentHint: true,
  openWorldHint: false,
};

/** Keeps each tool's handler typed by its own schema. */
export const defineTool = <Schema extends z.ZodType>(tool: AgentTool<Schema>): AgentTool<Schema> => tool;
