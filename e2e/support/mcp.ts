import { Client, StreamableHTTPClientTransport } from '@modelcontextprotocol/client';

/** A text or image block of a tool result, as the official client returns it. */
export type ToolBlock = { type: 'text'; text: string } | { type: 'image'; data: string; mimeType: string };
export interface ToolResult {
  content: ToolBlock[];
  isError?: boolean;
}

const endpoint = (baseURL: string) => new URL('/mcp', baseURL);

/**
 * The official MCP client in the test process, like Claude Code: a bearer token and no Origin
 * header, straight to the app origin under test.
 */
export async function connectMcp(baseURL: string, token: string) {
  const client = new Client({ name: 'tinyfold-e2e', version: '1.0.0' });
  await client.connect(
    new StreamableHTTPClientTransport(endpoint(baseURL), {
      requestInit: { headers: { authorization: `Bearer ${token}` } },
    }),
  );
  return {
    async call(name: string, args: Record<string, unknown> = {}): Promise<ToolResult> {
      return (await client.callTool({ name, arguments: args })) as ToolResult;
    },
    close: () => client.close(),
  };
}

export const textOf = (result: ToolResult) =>
  result.content.flatMap((block) => (block.type === 'text' ? [block.text] : [])).join('\n');

export const jsonOf = <T>(result: ToolResult) => JSON.parse(textOf(result)) as T;

/** The HTTP status of a bare `tools/list`, to check what the endpoint answers a given token. */
export async function mcpStatus(baseURL: string, token: string): Promise<number> {
  const response = await fetch(endpoint(baseURL), {
    method: 'POST',
    headers: {
      authorization: `Bearer ${token}`,
      'content-type': 'application/json',
      accept: 'application/json, text/event-stream',
      'mcp-protocol-version': '2025-06-18',
    },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/list' }),
  });
  await response.body?.cancel();
  return response.status;
}
