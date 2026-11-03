import { sql } from 'kysely';
import { expect, it, vi } from 'vitest';
import { useAppFixture } from './testing/app.js';

const fixture = useAppFixture('tinyfold-lifecycle-password');

it('waits for an accepted handler after its client disconnects and refuses new requests during disposal', async () => {
  const { app, db } = await fixture({ web: false });
  const started = Promise.withResolvers<void>();
  const release = Promise.withResolvers<void>();
  const client = new AbortController();
  app.get('/lifecycle-request', async (c) => {
    started.resolve();
    await release.promise;
    const result = await sql<{ value: number }>`select 1 as value`.execute(db);
    return c.json({ value: result.rows[0]?.value, disconnected: c.req.raw.signal.aborted });
  });
  const request = app.request('/lifecycle-request', { signal: client.signal });
  await started.promise;
  client.abort();
  const disposal = app.dispose();
  let disposed = false;
  void disposal.then(() => {
    disposed = true;
  });
  try {
    expect((await app.request('/ready')).status).toBe(503);
    expect(disposed).toBe(false);
    expect(app.dispose()).toBe(disposal);
    release.resolve();
    expect(await (await request).json()).toEqual({ value: 1, disconnected: true });
    await disposal;
    expect(disposed).toBe(true);
    // The composition owns its observers; the caller still owns the database handle.
    expect((await sql<{ value: number }>`select 2 as value`.execute(db)).rows).toEqual([{ value: 2 }]);
  } finally {
    release.resolve();
    await app.dispose();
  }
});

it.each(['legacy', 'modern'] as const)(
  'waits for a running %s MCP tool after the transport has answered or disconnected',
  async (protocol) => {
    const logError = vi.fn();
    const { app, auth, accessTokens } = await fixture({ web: false, logError });
    const { token } = await accessTokens.create({ name: 'Lifecycle' });
    const started = Promise.withResolvers<void>();
    const release = Promise.withResolvers<void>();
    const timeZone = vi.spyOn(auth, 'timeZone').mockImplementation(async () => {
      started.resolve();
      await release.promise;
      return 'UTC';
    });
    const client = new AbortController();
    const modern = protocol === 'modern';
    const request = app.request('/mcp', {
      method: 'POST',
      signal: client.signal,
      headers: {
        authorization: `Bearer ${token}`,
        'content-type': 'application/json',
        accept: 'application/json, text/event-stream',
        'mcp-protocol-version': modern ? '2026-07-28' : '2025-06-18',
        ...(modern ? { 'mcp-method': 'tools/call', 'mcp-name': 'list_tasks' } : {}),
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/call',
        params: {
          name: 'list_tasks',
          arguments: {},
          ...(modern
            ? {
                _meta: {
                  'io.modelcontextprotocol/protocolVersion': '2026-07-28',
                  'io.modelcontextprotocol/clientInfo': { name: 'lifecycle', version: '1.0.0' },
                  'io.modelcontextprotocol/clientCapabilities': {},
                },
              }
            : {}),
        },
      }),
    });
    try {
      await started.promise;
      if (modern) client.abort();
      const response = await request;
      if (modern) expect(response.status).toBe(499);
      else expect(response.headers.get('content-type')).toContain('text/event-stream');
      client.abort();
      let disposed = false;
      const disposal = app.dispose().then(() => {
        disposed = true;
      });
      expect((await app.request('/ready')).status).toBe(503);
      await new Promise<void>((resolve) => setImmediate(resolve));
      expect(disposed).toBe(false);
      release.resolve();
      await disposal;
      expect(disposed).toBe(true);
      expect(logError).not.toHaveBeenCalled();
    } finally {
      client.abort();
      release.resolve();
      await app.dispose();
      timeZone.mockRestore();
    }
  },
);
