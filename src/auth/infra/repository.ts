import { type Database, tables } from '@tinyfold/core/infra';
import type { AuthRepository, StoredOwner, StoredSession } from '../application/ports.js';

interface OwnerRow {
  id: number;
  name: string;
  installation_id: string;
  password_hash: string;
  password_changed_at: string;
}
interface SessionRow {
  id: string;
  digest: string;
  device_label: string;
  created_at: string;
  last_used_at: string;
  expires_at: string;
}
const session = (row: SessionRow): StoredSession => ({
  id: row.id,
  digest: row.digest,
  deviceLabel: row.device_label,
  createdAt: row.created_at,
  lastUsedAt: row.last_used_at,
  expiresAt: row.expires_at,
});

export function authRepository(db: Database): AuthRepository {
  const store = tables<{ auth_owner: OwnerRow; auth_sessions: SessionRow }>(db);
  return {
    async owner() {
      const row = await store.selectFrom('auth_owner').selectAll().where('id', '=', 1).executeTakeFirst();
      return (
        row && {
          name: row.name,
          installationId: row.installation_id,
          passwordHash: row.password_hash,
          passwordChangedAt: row.password_changed_at,
        }
      );
    },
    async createOwner(owner: StoredOwner) {
      await store
        .insertInto('auth_owner')
        .values({
          id: 1,
          name: owner.name,
          installation_id: owner.installationId,
          password_hash: owner.passwordHash,
          password_changed_at: owner.passwordChangedAt,
        })
        .execute();
    },
    async updatePassword(hash, changedAt) {
      await store
        .updateTable('auth_owner')
        .set({ password_hash: hash, password_changed_at: changedAt })
        .where('id', '=', 1)
        .execute();
    },
    async session(digest) {
      const row = await store.selectFrom('auth_sessions').selectAll().where('digest', '=', digest).executeTakeFirst();
      return row && session(row);
    },
    async createSession(value) {
      await store
        .insertInto('auth_sessions')
        .values({
          id: value.id,
          digest: value.digest,
          device_label: value.deviceLabel,
          created_at: value.createdAt,
          last_used_at: value.lastUsedAt,
          expires_at: value.expiresAt,
        })
        .execute();
    },
    async renewSession(id, usedAt, expiresAt) {
      await store
        .updateTable('auth_sessions')
        .set({ last_used_at: usedAt, expires_at: expiresAt })
        .where('id', '=', id)
        .execute();
    },
    async deleteSession(id) {
      await store.deleteFrom('auth_sessions').where('id', '=', id).execute();
    },
    async deleteSessionsExcept(id) {
      let query = store.deleteFrom('auth_sessions');
      if (id) query = query.where('id', '!=', id);
      await query.execute();
    },
    async listSessions(now) {
      return (
        await store
          .selectFrom('auth_sessions')
          .selectAll()
          .where('expires_at', '>', now)
          .orderBy('last_used_at', 'desc')
          .execute()
      ).map(session);
    },
    async deleteExpiredSessions(now) {
      await store.deleteFrom('auth_sessions').where('expires_at', '<=', now).execute();
    },
  };
}
