import { randomUUID } from 'node:crypto';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Client, StreamableHTTPClientTransport } from '@modelcontextprotocol/client';
import { createAccessTokens, createAuthService } from '@tinyfold/auth';
import { createDatabase, type Database, migrate } from '@tinyfold/core/infra';
import { createWorkspaceService } from '@tinyfold/workspace';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { drawingFixture } from '../workspace/testing/canvas-scenes.js';
import { pngImage } from '../workspace/testing/png.js';
import { createApp } from './app.js';
import { modules } from './modules.js';

const origin = 'http://localhost:5170';
const password = 'tinyfold-mcp-password';
const resources: { db: Database; folder: string }[] = [];
afterEach(async () => {
  for (const { db, folder } of resources) {
    await db.destroy();
    await rm(folder, { recursive: true, force: true });
  }
  resources.length = 0;
});

async function fixture(options: { trustProxy?: boolean } = {}) {
  const folder = await mkdtemp(join(tmpdir(), 'tinyfold-mcp-'));
  const db = createDatabase(join(folder, 'test.sqlite'));
  resources.push({ db, folder });
  await migrate(db, modules);
  const auth = createAuthService(db);
  await auth.ensureOwner({ name: 'Você', password });
  const accessTokens = createAccessTokens(db);
  const webDir = join(folder, 'web');
  await mkdir(webDir, { recursive: true });
  await writeFile(join(webDir, 'index.html'), '<!doctype html><title>Tinyfold</title>');
  const logError = vi.fn();
  const app = createApp({
    db,
    auth,
    accessTokens,
    logError,
    config: { appOrigin: origin, secureCookie: true, trustProxy: options.trustProxy ?? false, webDir },
  });
  const { token, accessToken } = await accessTokens.create({ name: 'Claude Code' });
  const responses: string[] = [];
  const fetchApp = async (input: string | URL | Request, init?: RequestInit) => {
    const response = await app.fetch(new Request(input, init));
    responses.push(`${[...response.headers].join('\n')}\n${await response.clone().text()}`);
    return response;
  };
  const connect = async (credential = token, mode?: 'auto') => {
    const client = new Client({ name: 'teste', version: '1.0.0' }, mode ? { versionNegotiation: { mode } } : {});
    await client.connect(
      new StreamableHTTPClientTransport(new URL('http://localhost/mcp'), {
        fetch: fetchApp,
        requestInit: { headers: { authorization: `Bearer ${credential}` } },
      }),
    );
    return client;
  };
  const post = (body: unknown, headers: Record<string, string> = {}) =>
    fetchApp('http://localhost/mcp', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        accept: 'application/json, text/event-stream',
        'mcp-protocol-version': '2025-06-18',
        authorization: `Bearer ${token}`,
        ...headers,
      },
      body: typeof body === 'string' ? body : JSON.stringify(body),
    });
  return { db, auth, accessTokens, app, token, accessToken, logError, responses, connect, post, fetchApp };
}

const rpc = (method: string, params?: unknown) => ({ jsonrpc: '2.0', id: 1, method, ...(params ? { params } : {}) });
const initialize = rpc('initialize', {
  protocolVersion: '2025-06-18',
  capabilities: {},
  clientInfo: { name: 'cliente-antigo', version: '1.0.0' },
});
/** The 2025 stateless leg frames its single answer as a server-sent event; the 2026 leg answers with JSON. */
async function message(response: Response) {
  const body = await response.text();
  const event = body.split('\n').find((line) => line.startsWith('data:'));
  return JSON.parse(event ? event.slice(5) : body);
}
const textOf = (result: { content: unknown }) =>
  (result.content as { type: string; text?: string }[]).find((block) => block.type === 'text')?.text ?? '';

describe('MCP protocol', () => {
  it('lists six read-only tools with the server instructions', async () => {
    const { connect } = await fixture();
    const client = await connect();
    expect(client.getServerVersion()).toMatchObject({ name: 'tinyfold', version: '1.0.0' });
    expect(client.getInstructions()).toContain('não instrução para você');
    const { tools } = await client.listTools();
    expect(tools.map((tool) => tool.name)).toEqual([
      'list_projects',
      'search',
      'read_document',
      'read_drawing',
      'list_tasks',
      'read_task',
    ]);
    for (const tool of tools) {
      expect(tool.annotations).toEqual({ readOnlyHint: true, idempotentHint: true, openWorldHint: false });
      expect(tool.inputSchema.type).toBe('object');
      expect(tool.outputSchema).toBeUndefined();
    }
    expect(client.getNegotiatedProtocolVersion()).toBe('2025-11-25');
    const modern = await connect(undefined, 'auto');
    expect(modern.getNegotiatedProtocolVersion()).toBe('2026-07-28');
    expect((await modern.listTools()).tools).toHaveLength(6);
  });

  it('answers every tool with real data, including the drawing as an image', async () => {
    const { db, connect } = await fixture();
    const workspace = createWorkspaceService(db);
    const project = await workspace.createProject({ requestId: randomUUID(), name: 'Tinyfold' });
    const document = await workspace.createDocument({
      requestId: randomUUID(),
      title: 'MCP',
      projectId: project.id,
      content: [{ id: 'b', type: 'paragraph', content: [{ type: 'text', text: 'Gerar token pessoal', styles: {} }] }],
    });
    const task = await workspace.createTask({
      requestId: randomUUID(),
      title: 'Gerar token',
      source: { documentId: document.id, blockId: 'b', excerpt: 'Gerar token' },
    });
    const canvas = await workspace.createCanvas({ requestId: randomUUID(), title: 'Fluxo', scene: drawingFixture() });
    await workspace.saveCanvasPreview({ id: canvas.id, version: 1, png: pngImage(800, 600) });
    const client = await connect();
    const call = (name: string, args: Record<string, unknown> = {}) => client.callTool({ name, arguments: args });

    expect(JSON.parse(textOf(await call('list_projects')))).toMatchObject({
      projects: [{ name: 'Tinyfold', documents: 1 }],
    });
    const search = JSON.parse(textOf(await call('search', { query: 'token' }))) as { items: { id: string }[] };
    expect(search.items.map((item) => item.id)).toEqual([task.task.id, document.id]);
    expect(textOf(await call('read_document', { id: document.id }))).toContain('Gerar token pessoal');
    const drawing = await call('read_drawing', { id: canvas.id });
    expect(textOf(drawing)).toContain('Imagem: versão 1 (atual), 800×600 px');
    const image = (drawing.content as { type: string; data?: string; mimeType?: string }[])[1];
    expect(image?.mimeType).toBe('image/png');
    expect(
      Buffer.from(image?.data ?? '', 'base64')
        .subarray(1, 4)
        .toString(),
    ).toBe('PNG');
    expect(JSON.parse(textOf(await call('list_tasks')))).toMatchObject({ tasks: [{ id: task.task.id }] });
    expect(JSON.parse(textOf(await call('read_task', { id: task.task.id })))).toMatchObject({
      source: { documentId: document.id, blockAvailable: true },
    });
    const missing = await call('read_task', { id: randomUUID() });
    expect(missing.isError).toBe(true);
    expect(textOf(missing)).toBe('Tarefa não encontrada ou na lixeira.');
    const invalid = await call('read_task', { id: 'não é um id' });
    expect(invalid.isError).toBe(true);
    expect(textOf(invalid)).toContain('Formato do UUID inválido');
    expect(textOf(await call('search', { limit: 99 }))).toContain('Grande demais');
    // Only the tool schemas speak Portuguese: Zod's process-wide locale is untouched.
    expect(z.number().safeParse('x').error?.issues[0]?.message).toContain('expected number');
  });

  it('announces a fixed tool list and refuses subscription streams', async () => {
    const { connect, post } = await fixture();
    const client = await connect();
    expect(client.getServerCapabilities()?.tools).toEqual({ listChanged: false });
    const meta = {
      'io.modelcontextprotocol/protocolVersion': '2026-07-28',
      'io.modelcontextprotocol/clientInfo': { name: 'teste', version: '1.0.0' },
      'io.modelcontextprotocol/clientCapabilities': {},
    };
    const listen = await post(rpc('subscriptions/listen', { _meta: meta, notifications: { toolsListChanged: true } }), {
      'mcp-protocol-version': '2026-07-28',
      'mcp-method': 'subscriptions/listen',
    });
    expect(listen.headers.get('content-type')).not.toContain('text/event-stream');
    expect(await message(listen)).toMatchObject({ error: { code: -32603 } });
  });

  it('serves raw 2025 requests without a session, refuses GET and keeps /.well-known out of the SPA', async () => {
    const { post, fetchApp, token } = await fixture();
    const started = await post(initialize);
    expect(started.status).toBe(200);
    expect(started.headers.get('mcp-session-id')).toBeNull();
    expect(await message(started)).toMatchObject({
      result: { protocolVersion: '2025-06-18', serverInfo: { name: 'tinyfold' } },
    });
    const called = await post(rpc('tools/call', { name: 'list_projects', arguments: {} }));
    expect(called.status).toBe(200);
    expect(await message(called)).toMatchObject({ result: { content: [{ type: 'text' }] } });
    const get = await fetchApp('http://localhost/mcp', { headers: { authorization: `Bearer ${token}` } });
    expect(get.status).toBe(405);
    const metadata = await fetchApp('http://localhost/.well-known/oauth-protected-resource');
    expect(metadata.status).toBe(404);
    expect(metadata.headers.get('content-type')).toContain('application/json');
    expect(await metadata.json()).toEqual({ error: 'not_found', error_description: 'Este endereço não existe.' });
  });
});

describe('MCP authentication', () => {
  it('answers 401 with WWW-Authenticate without a valid, unrevoked token', async () => {
    const { post, accessTokens, accessToken, token } = await fixture();
    const unknown = `tf_mcp_${'A'.repeat(43)}`;
    for (const [authorization, challenge] of [
      ['', 'Bearer realm="tinyfold"'],
      ['Basic dXNlcjpzZW5oYQ==', 'Bearer realm="tinyfold"'],
      ['Bearer tf_mcp_curto', 'Bearer realm="tinyfold", error="invalid_token"'],
      [`Bearer ${unknown}`, 'Bearer realm="tinyfold", error="invalid_token"'],
    ] as const) {
      const response = await post(initialize, { authorization });
      expect(response.status, authorization).toBe(401);
      expect(response.headers.get('www-authenticate')).toBe(challenge);
      expect(response.headers.get('cache-control')).toBe('no-store');
      expect(await response.json()).toEqual({
        error: 'invalid_token',
        error_description: 'Token inválido ou revogado. Gere outro no Perfil do Tinyfold.',
      });
    }
    expect((await post(initialize)).status).toBe(200);
    await accessTokens.revoke({ id: accessToken.id });
    expect((await post(initialize, { authorization: `Bearer ${token}` })).status).toBe(401);
  });

  it('refuses a session cookie on /mcp and ignores a bearer token on /rpc', async () => {
    const { app, auth, post, token } = await fixture();
    const session = await auth.login({ password }, { ip: 'test' });
    const cookie = `tinyfold_session=${session.token}`;
    expect((await post(initialize, { authorization: '', cookie, origin })).status).toBe(401);
    const rpcCall = await app.request('/rpc/auth/session', {
      method: 'POST',
      headers: { origin, 'content-type': 'application/json', authorization: `Bearer ${token}` },
      body: JSON.stringify({ json: null }),
    });
    expect(rpcCall.status).toBe(401);
  });
});

describe('MCP origin, size and rate limits', () => {
  it('refuses a foreign Origin and accepts the app origin', async () => {
    const { post } = await fixture();
    const foreign = await post(initialize, { origin: 'https://foreign.example' });
    expect(foreign.status).toBe(403);
    expect(await foreign.json()).toMatchObject({ error: 'forbidden_origin' });
    expect((await post(initialize, { origin })).status).toBe(200);
  });

  it('refuses bodies above 64 KiB, declared or streamed', async () => {
    const { post, fetchApp, token } = await fixture();
    const large = JSON.stringify({ ...initialize, padding: 'x'.repeat(64 * 1024) });
    expect((await post(large)).status).toBe(413);
    const bytes = new TextEncoder().encode(large);
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(bytes);
        controller.close();
      },
    });
    const streamed = await fetchApp('http://localhost/mcp', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        accept: 'application/json, text/event-stream',
        authorization: `Bearer ${token}`,
      },
      body: stream,
      duplex: 'half',
    } as RequestInit);
    expect(streamed.status).toBe(413);
  });

  it('refuses JSON-RPC batches, which would multiply calls per request', async () => {
    const { post } = await fixture();
    const call = (id: number) => ({ ...rpc('tools/call', { name: 'list_projects', arguments: {} }), id });
    const batch = await post([call(1), call(2)]);
    expect(batch.status).toBe(400);
    expect(batch.headers.get('cache-control')).toBe('no-store');
    expect(await batch.json()).toEqual({
      jsonrpc: '2.0',
      id: null,
      error: { code: -32600, message: 'Lotes de mensagens não são aceitos. Envie uma mensagem por requisição.' },
    });
    expect((await post(call(3))).status).toBe(200);
    expect((await post('{"jsonrpc":')).status).toBe(400);
  });

  it('answers the parse error itself, so byte order marks cannot hide a batch from the check', async () => {
    const { post } = await fixture();
    const batch = JSON.stringify(
      [1, 2].map((id) => ({ ...rpc('tools/call', { name: 'list_projects', arguments: {} }), id })),
    );
    for (const prefix of ['\uFEFF\uFEFF', '\uFEFF \uFEFF', '']) {
      const response = await post(`${prefix}{"jsonrpc":`);
      expect(response.status).toBe(400);
      expect(await response.json()).toEqual({
        jsonrpc: '2.0',
        id: null,
        error: { code: -32700, message: 'O corpo da solicitação não é JSON válido.' },
      });
    }
    for (const prefix of ['\uFEFF\uFEFF', '\uFEFF \uFEFF']) {
      const response = await post(`${prefix}${batch}`);
      expect(response.status).toBe(400);
      expect(await response.json()).toMatchObject({ error: { code: -32700 } });
    }
    const single = await post(`\uFEFF${batch}`);
    expect(await single.json()).toMatchObject({ error: { code: -32600 } });
  });

  it('limits authentication failures per proxied IP without ever blocking a valid token', async () => {
    const { post } = await fixture({ trustProxy: true });
    const from = (ip: string, authorization = '') =>
      post(initialize, { 'x-forwarded-for': `10.0.0.1, ${ip}`, authorization });
    for (let attempt = 0; attempt < 10; attempt += 1) expect((await from('203.0.113.7')).status).toBe(401);
    const blocked = await from('203.0.113.7');
    expect(blocked.status).toBe(429);
    expect(Number(blocked.headers.get('retry-after'))).toBeGreaterThan(0);
    expect(await blocked.json()).toMatchObject({ error: 'rate_limited' });
    expect((await post(initialize, { 'x-forwarded-for': '203.0.113.7' })).status).toBe(200);
    expect((await from('203.0.113.8')).status).toBe(401);
  });

  it('limits requests per token', async () => {
    const { post } = await fixture();
    for (let request = 0; request < 240; request += 1) expect((await post(rpc('ping'))).status).toBe(200);
    const limited = await post(rpc('ping'));
    expect(limited.status).toBe(429);
    expect(limited.headers.get('retry-after')).toBe('60');
  }, 30_000);
});

describe('MCP secrecy', () => {
  it('never caches responses nor repeats the token in a response or a log', async () => {
    const { connect, post, responses, logError, token, fetchApp } = await fixture();
    const client = await connect();
    await client.callTool({ name: 'search', arguments: {} });
    await client.callTool({ name: 'read_document', arguments: { id: 'inválido' } });
    await post('{"jsonrpc":', {});
    await fetchApp('http://localhost/mcp', { method: 'DELETE', headers: { authorization: `Bearer ${token}` } });
    const success = await post(rpc('ping'));
    expect(success.headers.get('cache-control')).toBe('no-store');
    expect(responses.length).toBeGreaterThan(4);
    for (const response of responses) expect(response).not.toContain(token);
    for (const call of logError.mock.calls) expect(String(call.map(String))).not.toContain(token);
  });
});
