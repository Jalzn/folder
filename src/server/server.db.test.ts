import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { isProcedure, type RouterClient } from '@orpc/server';
import { createAccessTokens } from '@tinyfold/auth';
import { createWorkspace } from '@tinyfold/workspace';
import { emptyCanvasScene, sceneFingerprint } from '@tinyfold/workspace/domain';
import { sql } from 'kysely';
import { describe, expect, it } from 'vitest';
import { pngImage } from '../workspace/testing/png.js';
import { readConfig } from './config.js';
import { type AppRouter, createRouter } from './router.js';
import { useAppFixture } from './testing/app.js';

const origin = 'http://localhost:5170';
const password = 'tinyfold-server-password';
const appFixture = useAppFixture(password, origin);
async function fixture(clock = () => new Date()) {
  return appFixture({ clock });
}
/** Every item belongs to a project, and a new database has none. */
const newProject = (client: RouterClient<AppRouter>) =>
  client.workspace.createProject({ requestId: randomUUID(), name: 'Projeto de teste' });

const paths = (router: object, prefix: string[] = []): string[][] =>
  Object.entries(router).flatMap(([key, value]) =>
    isProcedure(value) ? [[...prefix, key]] : paths(value as object, [...prefix, key]),
  );

describe('server boundaries', () => {
  it('uses the injected clock for RPC writes and their retry records', async () => {
    const instant = '2025-02-03T04:05:06.000Z';
    const { db, browser } = await fixture(() => new Date(instant));
    const { client } = browser();
    await client.auth.login({ password });
    const requestId = randomUUID();
    const input = { requestId, name: 'Relógio compartilhado' };
    const project = await client.workspace.createProject(input);
    expect(project.createdAt).toBe(instant);
    expect(project.updatedAt).toBe(instant);
    const record = await sql<{
      created_at: string;
    }>`select created_at from core_mutations where request_id = ${requestId}`.execute(db);
    expect(record.rows).toEqual([{ created_at: instant }]);
    expect(await client.workspace.createProject(input)).toEqual(project);
  });
  it('requires authentication on every content and account operation', async () => {
    const { db, auth, browser } = await fixture();
    const { client } = browser();
    for (const path of paths(
      createRouter(auth, createAccessTokens(db), createWorkspace(db, { timeZone: () => auth.timeZone() }).router),
    )) {
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
  it('refuses a null project with VALIDATION, except for a task from an excerpt', async () => {
    const { browser } = await fixture();
    const { client } = browser();
    await client.auth.login({ password });
    const project = await newProject(client);
    const document = await client.workspace.createDocument({
      requestId: randomUUID(),
      projectId: project.id,
      content: [{ id: 'b', type: 'paragraph', content: [{ type: 'text', text: 'Texto do trecho', styles: {} }] }],
    });
    // What a tab still running the interface from before every item had a project may send.
    const none = null as unknown as string;
    for (const call of [
      () => client.workspace.createDocument({ requestId: randomUUID(), projectId: none }),
      () =>
        client.workspace.moveItem({
          requestId: randomUUID(),
          type: 'document',
          id: document.id,
          projectId: none,
          expectedVersion: 1,
        }),
      () => client.workspace.listTasks({ projectId: none }),
      () => client.workspace.createTask({ requestId: randomUUID(), title: 'Solta', projectId: null }),
    ])
      await expect(call()).rejects.toMatchObject({ status: 400, data: { code: 'VALIDATION' } });
    const fromExcerpt = await client.workspace.createTask({
      requestId: randomUUID(),
      title: 'Do trecho',
      projectId: null,
      source: { documentId: document.id, blockId: 'b', excerpt: 'Texto' },
    });
    expect(fromExcerpt.projectId).toBe(project.id);
    // An older client may still send the project with a save: it is dropped, and the document stays put.
    const other = await newProject(client);
    await client.workspace.saveDocument({
      requestId: randomUUID(),
      id: document.id,
      expectedVersion: 1,
      title: 'Salvo',
      content: [],
      ...({ projectId: other.id } as object),
    });
    expect(await client.workspace.getDocument({ id: document.id })).toMatchObject({
      projectId: project.id,
      version: 2,
    });
  });
  it("refuses a key the task writes do not know, as a tab from before B6 sends status and updateTask's title", async () => {
    const { browser } = await fixture();
    const { client } = browser();
    await client.auth.login({ password });
    const project = await newProject(client);
    const task = await client.workspace.createTask({ requestId: randomUUID(), title: 'Tarefa', projectId: project.id });
    const legacy = (input: object) => input as never;
    for (const call of [
      () =>
        client.workspace.createTask(
          legacy({ requestId: randomUUID(), title: 'Antiga', projectId: project.id, status: 'done' }),
        ),
      () =>
        client.workspace.updateTask(
          legacy({ requestId: randomUUID(), id: task.id, expectedVersion: 1, status: 'done' }),
        ),
      () =>
        client.workspace.updateTask(
          legacy({ requestId: randomUUID(), id: task.id, expectedVersion: 1, title: 'Nova' }),
        ),
      () =>
        client.workspace.moveTask(
          legacy({ requestId: randomUUID(), id: task.id, expectedVersion: 1, status: 'doing' }),
        ),
      () =>
        client.workspace.saveTaskText(
          legacy({ requestId: randomUUID(), id: task.id, expectedTextVersion: 1, title: 'T', description: [], x: 1 }),
        ),
    ])
      await expect(call()).rejects.toMatchObject({ status: 400, data: { code: 'VALIDATION' } });
    expect(await client.workspace.getTask({ id: task.id })).toMatchObject({
      title: 'Tarefa',
      version: 1,
      textVersion: 1,
    });
    expect((await client.workspace.listTasks({ projectId: project.id })).tasks).toHaveLength(1);
  });

  it('refuses a folder name with a NUL or another control character with VALIDATION, not a 500', async () => {
    const { browser } = await fixture();
    const { client } = browser();
    await client.auth.login({ password });
    const project = await newProject(client);
    const refused = {
      status: 400,
      message: 'Use só letras, números, espaços e símbolos no nome da pasta.',
      data: { code: 'VALIDATION' },
    };
    for (const name of ['\u{0000}x', 'a\u{0000}b', '\u{0001}'])
      await expect(
        client.workspace.createFolder({ requestId: randomUUID(), projectId: project.id, name }),
      ).rejects.toMatchObject(refused);
    const folder = await client.workspace.createFolder({ requestId: randomUUID(), projectId: project.id, name: 'MCP' });
    await expect(
      client.workspace.renameFolder({
        requestId: randomUUID(),
        id: folder.id,
        expectedVersion: 1,
        name: '\u{0000}MCP',
      }),
    ).rejects.toMatchObject(refused);
    // Project names and titles have no length CHECK, so a NUL there is stored as sent, never a 500.
    const named = await client.workspace.createProject({ requestId: randomUUID(), name: '\u{0000}Projeto' });
    const titled = await client.workspace.createDocument({
      requestId: randomUUID(),
      projectId: named.id,
      title: '\u{0000}Título',
    });
    expect([named.name, (await client.workspace.getDocument({ id: titled.id })).title]).toEqual([
      '\u{0000}Projeto',
      '\u{0000}Título',
    ]);
  });

  it("answers a validation error with the schema's sentence for the person when it has one, and the generic text otherwise", async () => {
    const { browser } = await fixture();
    const { client } = browser();
    await client.auth.login({ password });
    const project = await newProject(client);
    const embed = { id: 'e', type: 'taskEmbed', props: { taskId: randomUUID() }, content: [], children: [] };
    await expect(
      client.workspace.createDocument({ requestId: randomUUID(), projectId: project.id, content: [embed] }),
    ).rejects.toMatchObject({
      status: 400,
      message: 'Um item incorporado não tem texto.',
      data: { code: 'VALIDATION' },
    });
    await expect(
      client.workspace.createCanvas({
        requestId: randomUUID(),
        projectId: project.id,
        scene: { elements: [{ id: 'bad', type: 'image' }] },
      }),
    ).rejects.toMatchObject({ status: 400, message: 'A cena do desenho é inválida.' });
    await expect(client.workspace.createDocument({ requestId: randomUUID(), projectId: 'x' })).rejects.toMatchObject({
      status: 400,
      message: 'Revise os dados enviados e tente de novo.',
      data: { code: 'VALIDATION' },
    });
    // The task schemas' own sentences reach the person too (decision 4, widened).
    await expect(
      client.workspace.createTask({ requestId: randomUUID(), title: 'Sem projeto', projectId: null }),
    ).rejects.toMatchObject({ status: 400, message: 'Escolha o projeto da tarefa.' });
    const task = { requestId: randomUUID(), projectId: project.id };
    await expect(client.workspace.createTask({ ...task, title: ' ' })).rejects.toMatchObject({
      status: 400,
      message: 'Escreva um título.',
    });
    await expect(client.workspace.createTask({ ...task, title: 'Prazo', dueOn: '2026-02-30' })).rejects.toMatchObject({
      status: 400,
      message: 'Use uma data válida, no formato AAAA-MM-DD.',
    });
    await expect(client.workspace.resolveEmbeds({ taskIds: ['X'], canvasIds: [] })).rejects.toMatchObject({
      status: 400,
      message: 'Identificador de item inválido.',
    });
    // Zod's own messages are for developers: a missing title answers the generic text.
    await expect(client.workspace.createTask({ ...task } as never)).rejects.toMatchObject({
      status: 400,
      message: 'Revise os dados enviados e tente de novo.',
    });
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
    expect((await client.workspace.search({ query: 'Atualizado', types: ['drawing'] })).items[0]?.id).toBe(canvas.id);
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
    // With the fingerprint of the scene it shows, a preview of another scene is not stored.
    expect(
      await client.workspace.saveCanvasPreview({ id: created.id, version: 1, sceneFingerprint: 'abc', png }),
    ).toEqual({ stored: false, previewVersion: 1 });
    expect(
      await client.workspace.saveCanvasPreview({
        id: created.id,
        version: 1,
        sceneFingerprint: sceneFingerprint(emptyCanvasScene()),
        png,
      }),
    ).toEqual({ stored: true, previewVersion: 1 });
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
