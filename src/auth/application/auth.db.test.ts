import { copyFile, mkdtemp, readdir, rm } from 'node:fs/promises';
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
const password = 'tinyfold-test-password';
async function fixture() {
  const folder = await mkdtemp(join(tmpdir(), 'tinyfold-auth-'));
  const db = createDatabase(join(folder, 'test.sqlite'));
  resources.push({ db, folder });
  await migrate(db, [coreModule, authModule]);
  let now = new Date('2026-10-29T12:00:00Z');
  const auth = createAuthService(db, { clock: () => now });
  const owner = await auth.ensureOwner({ name: 'Pessoa', password });
  return {
    db,
    auth,
    owner,
    advance(days: number) {
      now = new Date(now.getTime() + days * 86_400_000);
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

describe('owner authentication', () => {
  it('stores only password and session hashes, and ignores bootstrap password after creation', async () => {
    const { db, auth, owner } = await fixture();
    expect(await auth.ensureOwner({ name: 'Other', password: 'different-setup-password' })).toEqual(owner);
    const result = await auth.login({ password }, { ip: 'test', userAgent: 'Chrome/130 Macintosh' });
    const rows = await sql<{
      password_hash: string;
      digest: string;
    }>`select password_hash, digest from auth_owner cross join auth_sessions`.execute(db);
    expect(rows.rows[0]?.password_hash).not.toContain(password);
    expect(rows.rows[0]?.digest).not.toBe(result.token);
    expect((await auth.authenticate(result.token))?.owner.installationId).toBe(owner.installationId);
    expect((await auth.listSessions(result.sessionId))[0]?.deviceLabel).toBe('Chrome · macOS');
  });
  it("passes the owner's name through the visible text rule, cut at 100 code points (decision 7)", async () => {
    const folder = await mkdtemp(join(tmpdir(), 'tinyfold-auth-'));
    const db = createDatabase(join(folder, 'test.sqlite'));
    resources.push({ db, folder });
    await migrate(db, [coreModule, authModule]);
    const auth = createAuthService(db);
    // An invisible character first, and an emoji as the 100th code point once it is gone.
    const name = ` \u{200B}Ana${'a'.repeat(96)}😀 de Souza`;
    expect((await auth.ensureOwner({ name, password })).name).toBe(`Ana${'a'.repeat(96)}😀`);
  });

  it('renews active sessions and expires inactive sessions', async () => {
    const { auth, advance } = await fixture();
    const result = await auth.login({ password }, { ip: 'test' });
    expect((await auth.authenticate(result.token))?.renewed).toBe(false);
    advance(2);
    expect((await auth.authenticate(result.token))?.renewed).toBe(true);
    advance(31);
    expect(await auth.authenticate(result.token)).toBeUndefined();
  });
  it('changes password only with valid current password and revokes other devices', async () => {
    const { auth } = await fixture();
    const first = await auth.login({ password }, { ip: 'first' });
    const second = await auth.login({ password }, { ip: 'second' });
    await expect(
      auth.changePassword(first.sessionId, { currentPassword: 'wrong', newPassword: 'new-tinyfold-password' }),
    ).rejects.toMatchObject({ code: 'VALIDATION' });
    await auth.changePassword(first.sessionId, { currentPassword: password, newPassword: 'new-tinyfold-password' });
    expect(await auth.authenticate(first.token)).toBeDefined();
    expect(await auth.authenticate(second.token)).toBeUndefined();
    await expect(auth.login({ password }, { ip: 'first' })).rejects.toMatchObject({ code: 'UNAUTHENTICATED' });
    await expect(auth.login({ password: 'new-tinyfold-password' }, { ip: 'first' })).resolves.toHaveProperty('token');
    await auth.resetPassword('terminal-reset-password');
    expect(await auth.authenticate(first.token)).toBeUndefined();
  });
  it('rate limits failed logins and refuses malformed session tokens', async () => {
    const { auth } = await fixture();
    for (let i = 0; i < 10; i++)
      await expect(auth.login({ password: 'wrong' }, { ip: 'same' })).rejects.toMatchObject({
        code: 'UNAUTHENTICATED',
      });
    await expect(auth.login({ password }, { ip: 'same' })).rejects.toMatchObject({ code: 'RATE_LIMITED' });
    expect(await auth.authenticate('not-a-token')).toBeUndefined();
  });
  it('allows revocation/logout without exposing stored digests', async () => {
    const { auth } = await fixture();
    const first = await auth.login({ password }, { ip: 'one' });
    const second = await auth.login({ password }, { ip: 'two' });
    expect((await auth.listSessions(first.sessionId))[0]).not.toHaveProperty('digest');
    await expect(auth.revokeSession(first.sessionId, first.sessionId)).rejects.toMatchObject({ code: 'VALIDATION' });
    await auth.revokeSession(first.sessionId, second.sessionId);
    expect(await auth.authenticate(second.token)).toBeUndefined();
    await auth.logout(first.sessionId);
    expect(await auth.authenticate(first.token)).toBeUndefined();
  });
  it('resets the password from the terminal and revokes every session and access token together', async () => {
    const { db, auth } = await fixture();
    const session = await auth.login({ password }, { ip: 'test' });
    const tokens = createAccessTokens(db);
    const first = await tokens.create({ name: 'Claude Code' });
    const second = await tokens.create({ name: 'Claude Code — notebook' });
    await auth.resetPassword('tinyfold-new-password');
    expect(await auth.authenticate(session.token)).toBeUndefined();
    expect(await tokens.authenticate(first.token)).toBeUndefined();
    expect(await tokens.authenticate(second.token)).toBeUndefined();
    expect(await tokens.list()).toEqual([]);
  });

  it('leaves password, sessions and tokens unchanged when the reset fails midway', async () => {
    const { db, auth } = await fixture();
    const session = await auth.login({ password }, { ip: 'test' });
    const tokens = createAccessTokens(db);
    const created = await tokens.create({ name: 'Claude Code' });
    await sql`create trigger refuse_revocation before delete on auth_access_tokens begin select raise(abort, 'disk full'); end`.execute(
      db,
    );
    await expect(auth.resetPassword('tinyfold-new-password')).rejects.toThrow('disk full');
    expect(await auth.authenticate(session.token)).toBeDefined();
    expect(await tokens.authenticate(created.token)).toBeDefined();
    await expect(auth.login({ password }, { ip: 'test' })).resolves.toHaveProperty('token');
  });

  it('keeps the owner time zone, refusing one Intl does not know, and answers UTC until there is one', async () => {
    const { auth } = await fixture();
    expect(await auth.timeZone()).toBe('UTC');
    expect(await auth.setTimeZone('America/Sao_Paulo')).toEqual({ timeZone: 'America/Sao_Paulo' });
    expect(await auth.setTimeZone('America/Sao_Paulo')).toEqual({ timeZone: 'America/Sao_Paulo' });
    await expect(auth.setTimeZone('Mars/Olympus')).rejects.toMatchObject({
      code: 'VALIDATION',
      message: 'Fuso horário desconhecido.',
    });
    expect(await auth.timeZone()).toBe('America/Sao_Paulo');
    const { token } = await auth.login({ password }, { ip: 'test' });
    expect((await auth.authenticate(token))?.owner).toMatchObject({ timeZone: 'America/Sao_Paulo' });
  });

  it('stores the canonical name of a zone in any spelling, and refuses fixed offsets', async () => {
    const { db, auth } = await fixture();
    const stored = async () =>
      (await sql<{ time_zone: string | null }>`select time_zone from auth_owner`.execute(db)).rows;
    expect(await auth.setTimeZone('AMERICA/SAO_PAULO')).toEqual({ timeZone: 'America/Sao_Paulo' });
    expect(await stored()).toEqual([{ time_zone: 'America/Sao_Paulo' }]);
    expect(await auth.setTimeZone('Etc/UTC')).toEqual({ timeZone: 'UTC' });
    for (const offset of ['+03:00', '-14:00', '+0300'])
      await expect(auth.setTimeZone(offset)).rejects.toMatchObject({
        code: 'VALIDATION',
        message: 'Use o nome de um fuso horário, como America/Sao_Paulo, e não um deslocamento.',
      });
    expect(await stored()).toEqual([{ time_zone: 'UTC' }]);
  });

  it('reads a zone stored in another spelling by its canonical name, and an offset as none', async () => {
    const { db } = await fixture();
    const warn = vi.fn();
    const auth = createAuthService(db, { warn });
    // As SQL, or the code before this, could have stored them.
    await sql`update auth_owner set time_zone = 'america/sao_paulo'`.execute(db);
    expect(await auth.timeZone()).toBe('America/Sao_Paulo');
    const { token } = await auth.login({ password }, { ip: 'test' });
    expect((await auth.authenticate(token))?.owner).toMatchObject({ timeZone: 'America/Sao_Paulo' });
    await sql`update auth_owner set time_zone = '+03:00'`.execute(db);
    expect(await auth.timeZone()).toBe('UTC');
    expect(await auth.timeZone()).toBe('UTC');
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn).toHaveBeenCalledWith(
      'The owner\'s stored time zone "+03:00" is not a zone name Intl knows; dates use UTC until it is set again.',
    );
  });

  it('reads a stored zone Intl does not know as none: UTC for dates, null for the web, one warning', async () => {
    const { db } = await fixture();
    const warn = vi.fn();
    const auth = createAuthService(db, { warn });
    // Written by SQL, or a zone an ICU update stopped knowing: setTimeZone refuses it.
    await sql`update auth_owner set time_zone = 'Mars/Olympus'`.execute(db);
    expect(await auth.timeZone()).toBe('UTC');
    expect(await auth.timeZone()).toBe('UTC');
    const { token } = await auth.login({ password }, { ip: 'test' });
    expect((await auth.authenticate(token))?.owner).toMatchObject({ timeZone: null });
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn).toHaveBeenCalledWith(
      'The owner\'s stored time zone "Mars/Olympus" is not a zone name Intl knows; dates use UTC until it is set again.',
    );
    // The web sends the browser's zone again, and it holds.
    await auth.setTimeZone('America/Sao_Paulo');
    expect(await auth.timeZone()).toBe('America/Sao_Paulo');
    expect(warn).toHaveBeenCalledTimes(1);
  });

  it('adds the time zone, null, to an owner created with migrations 001 and 002', async () => {
    const folder = await mkdtemp(join(tmpdir(), 'tinyfold-auth-003-'));
    const migrations = await mkdtemp(join(folder, 'migrations-'));
    const db = createDatabase(join(folder, 'test.sqlite'));
    resources.push({ db, folder });
    for (const name of (await readdir(authModule.migrations)).filter((file) => Number(file.slice(0, 3)) <= 2))
      await copyFile(new URL(name, authModule.migrations), join(migrations, name));
    await migrate(db, [coreModule, { ...authModule, migrations: pathToFileURL(`${migrations}/`) }]);
    await sql`insert into auth_owner (id, name, installation_id, password_hash, password_changed_at)
      values (1, 'Pessoa', 'instalacao', 'hash', '2026-10-01T00:00:00.000Z')`.execute(db);
    expect(await migrate(db, [coreModule, authModule])).toEqual([
      { module: 'auth', version: 3, name: 'owner_time_zone' },
    ]);
    expect((await sql`select name, time_zone from auth_owner`.execute(db)).rows).toEqual([
      { name: 'Pessoa', time_zone: null },
    ]);
    await expect(sql`update auth_owner set time_zone = ${'x'.repeat(65)}`.execute(db)).rejects.toThrow(
      'CHECK constraint failed',
    );
  });
});
