import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createAccessTokens, createAuthService } from '@tinyfold/auth';
import { createDatabase, migrate } from '@tinyfold/core/infra';
import { expect, it } from 'vitest';
import { resetOwnerPassword } from './account-recovery.js';
import { modules } from './modules.js';

it('resets the password from the terminal and revokes every session and access token', async () => {
  const folder = await mkdtemp(join(tmpdir(), 'tinyfold-recovery-'));
  const db = createDatabase(join(folder, 'test.sqlite'));
  try {
    await migrate(db, modules);
    const auth = createAuthService(db);
    await auth.ensureOwner({ name: 'Pessoa', password: 'tinyfold-old-password' });
    const session = await auth.login({ password: 'tinyfold-old-password' }, { ip: 'test' });
    const tokens = createAccessTokens(db);
    const first = await tokens.create({ name: 'Claude Code' });
    const second = await tokens.create({ name: 'Claude Code — notebook' });
    await resetOwnerPassword(db, 'tinyfold-new-password');
    expect(await auth.authenticate(session.token)).toBeUndefined();
    expect(await tokens.authenticate(first.token)).toBeUndefined();
    expect(await tokens.authenticate(second.token)).toBeUndefined();
    expect(await tokens.list()).toEqual([]);
    await expect(auth.login({ password: 'tinyfold-new-password' }, { ip: 'test' })).resolves.toHaveProperty('token');
  } finally {
    await db.destroy();
    await rm(folder, { recursive: true, force: true });
  }
});
