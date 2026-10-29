import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { coreModule, createDatabase, type Database, migrate } from '@tinyfold/core/infra';
import { sql } from 'kysely';
import { afterEach, describe, expect, it } from 'vitest';
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
});
