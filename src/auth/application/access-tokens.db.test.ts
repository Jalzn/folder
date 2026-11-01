import { copyFile, mkdir, mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { coreModule, createDatabase, type Database, migrate } from '@tinyfold/core/infra';
import { sql } from 'kysely';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createAccessTokens } from '../infra/access-tokens.js';
import { createAuthService } from '../infra/context.js';
import { authModule } from '../infra/module.js';

const resources: { db: Database; folder: string }[] = [];
async function fixture() {
  const folder = await mkdtemp(join(tmpdir(), 'tinyfold-tokens-'));
  const path = join(folder, 'test.sqlite');
  const db = createDatabase(path);
  resources.push({ db, folder });
  await migrate(db, [coreModule, authModule]);
  let now = new Date('2026-10-31T12:00:00Z');
  const logError = vi.fn();
  const tokens = createAccessTokens(db, { clock: () => now, logError });
  return {
    db,
    path,
    folder,
    tokens,
    logError,
    advance(ms: number) {
      now = new Date(now.getTime() + ms);
    },
  };
}
afterEach(async () => {
  for (const { db, folder } of resources) {
    await db.destroy();
    await rm(folder, { recursive: true, force: true });
  }
  resources.length = 0;
});

describe('personal access tokens', () => {
  it('creates, lists newest first and revokes tokens, cutting access on the next call', async () => {
    const { tokens, advance } = await fixture();
    const first = await tokens.create({ name: '  Claude Code — notebook ' });
    advance(1000);
    const second = await tokens.create({ name: 'Claude Code' });
    expect(first.accessToken).toEqual({
      id: expect.any(String),
      name: 'Claude Code — notebook',
      prefix: first.token.slice(0, 13),
      createdAt: '2026-10-31T12:00:00.000Z',
      lastUsedAt: null,
    });
    expect((await tokens.list()).map((token) => token.id)).toEqual([second.accessToken.id, first.accessToken.id]);
    expect(await tokens.authenticate(first.token)).toEqual({ id: first.accessToken.id, scope: 'read' });
    expect(await tokens.revoke({ id: first.accessToken.id })).toEqual({ ok: true });
    expect(await tokens.revoke({ id: first.accessToken.id })).toEqual({ ok: true });
    expect(await tokens.authenticate(first.token)).toBeUndefined();
    expect(await tokens.authenticate(second.token)).toBeDefined();
    expect((await tokens.list()).map((token) => token.id)).toEqual([second.accessToken.id]);
  });

  it('never writes the plain token to the database files', async () => {
    const { db, path, tokens } = await fixture();
    const created = await tokens.create({ name: 'Claude Code' });
    await tokens.authenticate(created.token);
    const [digest] = (await sql<{ digest: string }>`select digest from auth_access_tokens`.execute(db)).rows;
    const files = Buffer.concat([await readFile(path), await readFile(`${path}-wal`).catch(() => Buffer.alloc(0))]);
    expect(files.includes(digest?.digest ?? 'missing')).toBe(true);
    expect(files.includes(created.token)).toBe(false);
    expect(files.includes(created.token.slice(13))).toBe(false);
  });

  it('records the last use at most once per minute', async () => {
    const { tokens, advance } = await fixture();
    const { token } = await tokens.create({ name: 'Claude Code' });
    const lastUse = async () => (await tokens.list())[0]?.lastUsedAt;
    await tokens.authenticate(token);
    expect(await lastUse()).toBe('2026-10-31T12:00:00.000Z');
    advance(59_999);
    await tokens.authenticate(token);
    expect(await lastUse()).toBe('2026-10-31T12:00:00.000Z');
    advance(1);
    await tokens.authenticate(token);
    expect(await lastUse()).toBe('2026-10-31T12:01:00.000Z');
  });

  it('keeps a valid token working when the last use cannot be recorded', async () => {
    const { db, tokens, logError } = await fixture();
    const created = await tokens.create({ name: 'Claude Code' });
    await sql`create trigger refuse_touch before update on auth_access_tokens begin select raise(abort, 'disk full'); end`.execute(
      db,
    );
    expect(await tokens.authenticate(created.token)).toEqual({ id: created.accessToken.id, scope: 'read' });
    expect(logError).toHaveBeenCalledTimes(1);
    expect(JSON.stringify(logError.mock.calls)).not.toContain(created.token);
  });

  it('refuses malformed and unknown tokens, and an eleventh active token', async () => {
    const { tokens } = await fixture();
    for (const candidate of [undefined, '', 'tf_mcp_short', `tf_mcp_${'a'.repeat(43)}`])
      expect(await tokens.authenticate(candidate)).toBeUndefined();
    const created = await Promise.all(Array.from({ length: 10 }, () => tokens.create({ name: 'Claude Code' })));
    await expect(tokens.create({ name: 'Claude Code' })).rejects.toMatchObject({
      name: 'DomainError',
      message: 'Você já tem 10 tokens. Revogue um para gerar outro.',
    });
    await expect(tokens.create({ name: ' ' })).rejects.toMatchObject({ name: 'DomainError' });
    await tokens.revoke({ id: created[0]?.accessToken.id ?? '' });
    await expect(tokens.create({ name: 'Claude Code' })).resolves.toHaveProperty('token');
    expect(await tokens.list()).toHaveLength(10);
  });

  it('adds the token table to a database that only has the first auth migration', async () => {
    const { folder } = await fixture();
    const oldMigrations = join(folder, 'old-auth');
    await mkdir(oldMigrations);
    await copyFile(new URL('../infra/migrations/001_auth.sql', import.meta.url), join(oldMigrations, '001_auth.sql'));
    const db = createDatabase(join(folder, 'upgrade.sqlite'));
    resources.push({ db, folder });
    await migrate(db, [coreModule, { ...authModule, migrations: pathToFileURL(`${oldMigrations}/`) }]);
    const auth = createAuthService(db);
    await auth.ensureOwner({ name: 'Pessoa', password: 'tinyfold-test-password' });
    const session = await auth.login({ password: 'tinyfold-test-password' }, { ip: 'test' });
    expect(await migrate(db, [coreModule, authModule])).toEqual([
      { module: 'auth', version: 2, name: 'access_tokens' },
      { module: 'auth', version: 3, name: 'owner_time_zone' },
    ]);
    expect((await auth.authenticate(session.token))?.sessionId).toBe(session.sessionId);
    const tokens = createAccessTokens(db);
    const created = await tokens.create({ name: 'Claude Code' });
    expect(await tokens.authenticate(created.token)).toBeDefined();
  });
});
