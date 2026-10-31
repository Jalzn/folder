import { randomUUID } from 'node:crypto';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createORPCClient } from '@orpc/client';
import { RPCLink } from '@orpc/client/fetch';
import { isProcedure, type RouterClient } from '@orpc/server';
import { createAccessTokens, createAuthService } from '@tinyfold/auth';
import { createDatabase, type Database, migrate } from '@tinyfold/core/infra';
import { afterEach, describe, expect, it } from 'vitest';
import { pngImage } from '../workspace/testing/png.js';
import { createApp } from './app.js';
import { readConfig } from './config.js';
import { modules } from './modules.js';
import { type AppRouter, createRouter } from './router.js';

const resources: { db: Database; folder: string }[] = [];
const origin = 'http://localhost:5170';
const password = 'tinyfold-server-password';
async function fixture() {
  const folder = await mkdtemp(join(tmpdir(), 'tinyfold-server-'));
  const db = createDatabase(join(folder, 'test.sqlite'));
  resources.push({ db, folder });
  await migrate(db, modules);
  const auth = createAuthService(db);
  await auth.ensureOwner({ name: 'Você', password });
  const webDir = join(folder, 'web');
  await mkdir(join(webDir, 'assets'), { recursive: true });
  await writeFile(join(webDir, 'index.html'), '<!doctype html><title>Tinyfold</title>');
  await writeFile(join(webDir, 'assets', 'test.js'), '/* built asset */');
  const app = createApp({ db, auth, config: { appOrigin: origin, secureCookie: true, trustProxy: false, webDir } });
  function browser(requestOrigin = origin) {
    const state = { cookie: undefined as string | undefined, setCookies: [] as string[] };
    const client = createORPCClient<RouterClient<AppRouter>>(
      new RPCLink({
        url: 'http://localhost/rpc',
        headers: () => ({ origin: requestOrigin, ...(state.cookie ? { cookie: state.cookie } : {}) }),
        fetch: async (request) => {
          const response = await app.fetch(request);
          state.setCookies = response.headers.getSetCookie();
          for (const header of state.setCookies) {
            const pair = header.split(';')[0];
            if (pair) state.cookie = pair.endsWith('=') ? undefined : pair;
          }
          return response;
        },
      }),
    );
    return { client, state };
  }
  return { db, auth, app, browser };
}
afterEach(async () => {
  for (const { db, folder } of resources) {
    await db.destroy();
    await rm(folder, { recursive: true, force: true });
  }
  resources.length = 0;
});
/** Every item belongs to a project, and a new database has none. */
const newProject = (client: RouterClient<AppRouter>) =>
  client.workspace.createProject({ requestId: randomUUID(), name: 'Projeto de teste' });

const paths = (router: object, prefix: string[] = []): string[][] =>
  Object.entries(router).flatMap(([key, value]) =>
    isProcedure(value) ? [[...prefix, key]] : paths(value as object, [...prefix, key]),
  );

describe('server boundaries', () => {
  it('requires authentication on every content and account operation', async () => {
    const { db, auth, browser } = await fixture();
    const { client } = browser();
    for (const path of paths(createRouter(db, auth, createAccessTokens(db)))) {
      if (path.join('.') === 'auth.login') continue;
      let call: unknown = client;
      for (const part of path) call = (call as Record<string, unknown>)[part];
      await expect((call as (input: unknown) => Promise<unknown>)(undefined), path.join('.')).rejects.toMatchObject({
        status: 401,
        data: { code: 'UNAUTHENTICATED' },
      });
    }
  });
  it('rejects a foreign origin and malformed payloads, and sets secure session cookies', async () => {
    const { browser } = await fixture();
    await expect(browser('https://foreign.example').client.auth.login({ password })).rejects.toMatchObject({
      status: 403,
    });
    const { client, state } = browser();
    await expect(client.auth.login({ password: '' })).rejects.toMatchObject({
      status: 400,
      data: { code: 'VALIDATION' },
    });
    await client.auth.login({ password });
    expect(state.setCookies[0]).toContain('HttpOnly');
    expect(state.setCookies[0]).toContain('SameSite=Strict');
    expect(state.setCookies[0]).toContain('Secure');
    expect((await client.auth.session()).owner.name).toBe('Você');
    await client.auth.logout();
    expect(state.cookie).toBeUndefined();
  });
  it('saves a document above the old 64KiB limit and rejects excessive request size', async () => {
    const { browser, app } = await fixture();
    const { client } = browser();
    await client.auth.login({ password });
    const text = 'Conteúdo longo. '.repeat(6000);
    const project = await newProject(client);
    const document = await client.workspace.createDocument({
      requestId: randomUUID(),
      projectId: project.id,
      title: 'Longo',
      content: [
        { id: 'paragraph', type: 'paragraph', props: {}, content: [{ type: 'text', text, styles: {} }], children: [] },
      ],
    });
    expect((await client.workspace.getDocument({ id: document.id })).title).toBe('Longo');
    const response = await app.request('/rpc/auth/login', {
      method: 'POST',
      headers: { origin, 'content-type': 'application/json' },
      body: JSON.stringify({ json: { password: 'x'.repeat(2 * 1024 * 1024) } }),
    });
    expect(response.status).toBe(413);
  });
  it('persists authenticated canvas RPC calls and rejects malformed canvas data', async () => {
    const { browser } = await fixture();
    const { client } = browser();
    await client.auth.login({ password });
    const project = await newProject(client);
    const created = await client.workspace.createCanvas({
      requestId: randomUUID(),
      projectId: project.id,
      title: 'Fluxo',
    });
    const canvas = await client.workspace.getCanvas({ id: created.id });
    expect(canvas.scene.elements).toEqual([]);
    const input = {
      requestId: randomUUID(),
      id: canvas.id,
      expectedVersion: canvas.version,
      title: 'Atualizado',
      scene: canvas.scene,
    };
    const ack = await client.workspace.saveCanvas(input);
    expect(await client.workspace.saveCanvas(input)).toEqual(ack);
    expect((await client.workspace.listCanvases({ query: 'Atualizado' }))[0]?.id).toBe(canvas.id);
    await expect(client.workspace.saveCanvas({ ...input, requestId: randomUUID() })).rejects.toMatchObject({
      status: 409,
      data: { code: 'VERSION_CONFLICT' },
    });
    await expect(
      client.workspace.createCanvas({
        requestId: randomUUID(),
        projectId: project.id,
        scene: { ...canvas.scene, elements: [{ id: 'bad', type: 'image' }] },
      }),
    ).rejects.toMatchObject({ status: 400, data: { code: 'VALIDATION' } });
  });
  it('manages personal access tokens over RPC without listing the secret', async () => {
    const { browser } = await fixture();
    const { client } = browser();
    await client.auth.login({ password });
    const created = await client.auth.createAccessToken({ name: 'Claude Code' });
    expect(created.token).toMatch(/^tf_mcp_[\w-]{43}$/);
    expect(created.accessToken).toMatchObject({
      name: 'Claude Code',
      prefix: created.token.slice(0, 13),
      lastUsedAt: null,
    });
    const listed = await client.auth.listAccessTokens();
    expect(listed).toEqual([created.accessToken]);
    expect(JSON.stringify(listed)).not.toContain(created.token);
    await expect(client.auth.createAccessToken({ name: '' })).rejects.toMatchObject({
      status: 422,
      data: { code: 'DOMAIN_RULE' },
    });
    expect(await client.auth.revokeAccessToken({ id: created.accessToken.id })).toEqual({ ok: true });
    expect(await client.auth.listAccessTokens()).toEqual([]);
  });
  it('uploads a drawing preview as a file without changing the drawing', async () => {
    const { browser } = await fixture();
    const { client } = browser();
    await client.auth.login({ password });
    const project = await newProject(client);
    const created = await client.workspace.createCanvas({
      requestId: randomUUID(),
      projectId: project.id,
      title: 'Fluxo',
    });
    const png = new File([pngImage(800, 600).slice()], 'preview.png', { type: 'image/png' });
    expect(await client.workspace.saveCanvasPreview({ id: created.id, version: created.version, png })).toEqual({
      stored: true,
      previewVersion: 1,
    });
    expect(await client.workspace.getCanvas({ id: created.id })).toMatchObject({ version: 1, previewVersion: 1 });
    const notPng = new File(['<svg/>'], 'preview.png', { type: 'image/png' });
    await expect(client.workspace.saveCanvasPreview({ id: created.id, version: 1, png: notPng })).rejects.toMatchObject(
      { status: 400, data: { code: 'VALIDATION' } },
    );
  });
  it('serves SPA routes without serving HTML for missing assets', async () => {
    const { app } = await fixture();
    const route = await app.request('/documentos/example');
    expect(route.status).toBe(200);
    expect(await route.text()).toContain('Tinyfold');
    expect(route.headers.get('cache-control')).toBe('no-cache');
    expect(route.headers.get('content-security-policy')).toContain("frame-ancestors 'none'");
    const asset = await app.request('/assets/test.js');
    expect(asset.headers.get('cache-control')).toContain('immutable');
    expect((await app.request('/assets/missing.js')).status).toBe(404);
    expect((await app.request('/ready')).status).toBe(200);
  });
  it('validates production origin and resolves database paths independent of process working directory', () => {
    expect(() => readConfig({ NODE_ENV: 'production', APP_ORIGIN: origin })).toThrow('HTTPS');
    const config = readConfig({ DATABASE_PATH: 'data/another.sqlite' });
    expect(config.databasePath).toBe(fileURLToPath(new URL('../../data/another.sqlite', import.meta.url)));
    expect(
      readConfig({ NODE_ENV: 'production', APP_ORIGIN: 'https://tinyfold.example', COOKIE_SECURE: 'false' })
        .secureCookie,
    ).toBe(true);
  });
});
