import { randomUUID } from 'node:crypto';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createAccessTokens, createAuthService } from '@tinyfold/auth';
import { createDatabase, type Database, migrate } from '@tinyfold/core/infra';
import { createWorkspaceService } from '@tinyfold/workspace';
import { afterEach, describe, expect, it } from 'vitest';
import { drawingFixture } from '../workspace/testing/canvas-scenes.js';
import { pngImage } from '../workspace/testing/png.js';
import { createApp } from './app.js';
import { modules } from './modules.js';

const origin = 'http://localhost:5170';
const password = 'tinyfold-files-password';
const resources: { db: Database; folder: string }[] = [];
afterEach(async () => {
  for (const { db, folder } of resources) {
    await db.destroy();
    await rm(folder, { recursive: true, force: true });
  }
  resources.length = 0;
});

async function fixture() {
  const folder = await mkdtemp(join(tmpdir(), 'tinyfold-files-'));
  const db = createDatabase(join(folder, 'test.sqlite'));
  resources.push({ db, folder });
  await migrate(db, modules);
  const auth = createAuthService(db);
  await auth.ensureOwner({ name: 'Você', password });
  const webDir = join(folder, 'web');
  await mkdir(webDir, { recursive: true });
  await writeFile(join(webDir, 'index.html'), '<!doctype html><title>Tinyfold</title>');
  const accessTokens = createAccessTokens(db);
  const app = createApp({
    db,
    auth,
    accessTokens,
    config: { appOrigin: origin, secureCookie: true, trustProxy: false, webDir },
  });
  const login = await app.request('/rpc/auth/login', {
    method: 'POST',
    headers: { origin, 'content-type': 'application/json' },
    body: JSON.stringify({ json: { password } }),
  });
  const cookie = login.headers.getSetCookie()[0]?.split(';')[0] ?? '';
  const workspace = createWorkspaceService(db);
  const project = await workspace.createProject({ requestId: randomUUID(), name: 'Tinyfold' });
  const preview = (id: string, headers: Record<string, string> = {}) =>
    app.request(`/arquivos/desenhos/${id}/previa.png`, { headers: { cookie, ...headers } });
  return { app, accessTokens, workspace, project, cookie, preview };
}

describe('GET /arquivos/desenhos/:id/previa.png', () => {
  it("serves a live drawing's preview with its ETag, private and revalidated, and 304 when it matches", async () => {
    const { workspace, project, preview } = await fixture();
    const scene = drawingFixture();
    const canvas = await workspace.createCanvas({
      requestId: randomUUID(),
      projectId: project.id,
      title: 'Fluxo',
      scene,
    });
    const png = pngImage(800, 600);
    await workspace.saveCanvasPreview({ id: canvas.id, version: 1, png });
    const response = await preview(canvas.id);
    expect(response.status).toBe(200);
    expect(new Uint8Array(await response.arrayBuffer())).toEqual(png);
    const etag = response.headers.get('etag') ?? '';
    expect(etag).toMatch(/^"[^"]+"$/u);
    expect(
      Object.fromEntries(
        ['content-type', 'cache-control', 'x-content-type-options'].map((name) => [name, response.headers.get(name)]),
      ),
    ).toEqual({
      'content-type': 'image/png',
      'cache-control': 'private, no-cache',
      'x-content-type-options': 'nosniff',
    });
    for (const ifNoneMatch of [etag, `W/${etag}`, `"outra", ${etag}`]) {
      const cached = await preview(canvas.id, { 'if-none-match': ifNoneMatch });
      expect(cached.status).toBe(304);
      expect(await cached.text()).toBe('');
      expect(cached.headers.get('etag')).toBe(etag);
    }
    expect((await preview(canvas.id, { 'if-none-match': '"outra"' })).status).toBe(200);

    // A preview of another scene has another tag; a rename keeps the scene and the tag.
    const edited = {
      ...scene,
      elements: scene.elements.map((element, index) => (index ? element : { ...element, x: 999 })),
    };
    await workspace.saveCanvas({
      requestId: randomUUID(),
      id: canvas.id,
      expectedVersion: 1,
      title: 'Fluxo',
      scene: edited,
    });
    await workspace.saveCanvasPreview({ id: canvas.id, version: 2, png: pngImage(400, 300) });
    const newer = await preview(canvas.id, { 'if-none-match': etag });
    expect(newer.status).toBe(200);
    const newerTag = newer.headers.get('etag');
    expect(newerTag).not.toBe(etag);
    await workspace.saveCanvas({
      requestId: randomUUID(),
      id: canvas.id,
      expectedVersion: 2,
      title: 'Renomeado',
      scene: edited,
    });
    expect((await preview(canvas.id, { 'if-none-match': newerTag ?? '' })).status).toBe(304);
  });

  it('answers 404 for a drawing in the trash, deleted for good, never there or without a preview, and 400 for a bad ID', async () => {
    const { workspace, project, preview } = await fixture();
    const create = (title: string) => workspace.createCanvas({ requestId: randomUUID(), projectId: project.id, title });
    const [binned, purged, bare] = [await create('Lixeira'), await create('Apagado'), await create('Sem prévia')];
    for (const canvas of [binned, purged])
      await workspace.saveCanvasPreview({ id: canvas.id, version: 1, png: pngImage(100, 100) });
    await workspace.deleteCanvas({ requestId: randomUUID(), id: binned.id, expectedVersion: 1 });
    await workspace.deleteCanvas({ requestId: randomUUID(), id: purged.id, expectedVersion: 1 });
    await workspace.purgeCanvas({ requestId: randomUUID(), id: purged.id, expectedVersion: 2 });
    for (const id of [binned.id, purged.id, bare.id, randomUUID()]) {
      const response = await preview(id);
      expect(response.status).toBe(404);
      expect(await response.json()).toEqual({ message: 'A prévia do desenho não está disponível.' });
    }
    for (const id of ['nao-e-um-id', '..%2F..%2Fetc%2Fpasswd', bare.id.toUpperCase()]) {
      const response = await preview(id);
      expect(response.status).toBe(400);
      expect(await response.json()).toEqual({ message: 'Identificador de desenho inválido.' });
    }
  });

  it('needs the session cookie: no cookie, an expired one or an MCP bearer are 401', async () => {
    const { app, accessTokens, workspace, project } = await fixture();
    const canvas = await workspace.createCanvas({ requestId: randomUUID(), projectId: project.id, title: 'Fluxo' });
    await workspace.saveCanvasPreview({ id: canvas.id, version: 1, png: pngImage(100, 100) });
    const { token } = await accessTokens.create({ name: 'Claude Code' });
    const path = `/arquivos/desenhos/${canvas.id}/previa.png`;
    for (const headers of [{}, { authorization: `Bearer ${token}` }, { cookie: 'tinyfold_session=invalido' }]) {
      const response = await app.request(path, { headers });
      expect(response.status).toBe(401);
      expect(response.headers.get('content-type')).not.toBe('image/png');
    }
    // An unknown session cookie is cleared, as /rpc does.
    const stale = await app.request(path, { headers: { cookie: 'tinyfold_session=invalido' } });
    expect(stale.headers.get('set-cookie')).toContain('Max-Age=0');
  });

  it('is served before the SPA fallback, which still serves pages but no other files', async () => {
    const { app, cookie } = await fixture();
    const missing = await app.request(`/arquivos/desenhos/${randomUUID()}/previa.png`, { headers: { cookie } });
    expect(missing.headers.get('content-type')).toContain('application/json');
    expect((await app.request('/desenhos/qualquer', { headers: { cookie } })).headers.get('content-type')).toContain(
      'text/html',
    );
    expect((await app.request(`/arquivos/desenhos/${randomUUID()}/outra.png`, { headers: { cookie } })).status).toBe(
      404,
    );
  });
});
