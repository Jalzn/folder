/**
 * The Claude Code command shown once with a new token. User scope makes Tinyfold available in
 * every folder; the endpoint is on the same origin as the app.
 */
export function mcpAddCommand(origin: string, token: string): string {
  const endpoint = new URL('/mcp', origin).href;
  return `claude mcp add --transport http --scope user tinyfold ${endpoint} --header "Authorization: Bearer ${token}"`;
}
