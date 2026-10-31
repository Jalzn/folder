import { describe, expect, it } from 'vitest';
import { mcpAddCommand } from './mcp-command';

const token = `tf_mcp_${'A'.repeat(43)}`;

describe('mcpAddCommand', () => {
  it('registers the same-origin endpoint for every folder with the bearer header', () => {
    expect(mcpAddCommand('https://tinyfold.example.com', token)).toBe(
      `claude mcp add --transport http --scope user tinyfold https://tinyfold.example.com/mcp --header "Authorization: Bearer ${token}"`,
    );
  });

  it('keeps the port of a local origin and ignores any trailing slash', () => {
    expect(mcpAddCommand('http://localhost:5170/', token)).toContain(' http://localhost:5170/mcp ');
  });
});
