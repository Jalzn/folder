import type { IsoInstant } from '@tinyfold/core/domain';
import { type Database, tables } from '@tinyfold/core/infra';
import type { AccessTokenRecord, AccessTokenRepository } from '../application/access-tokens/ports.js';
import type { AccessTokenScope } from '../domain/access-token.js';

interface AccessTokenRow {
  id: string;
  name: string;
  digest: string;
  prefix: string;
  scope: AccessTokenScope;
  created_at: IsoInstant;
  last_used_at: IsoInstant | null;
}

const record = (row: Omit<AccessTokenRow, 'digest'>): AccessTokenRecord => ({
  id: row.id,
  name: row.name,
  prefix: row.prefix,
  scope: row.scope,
  createdAt: row.created_at,
  lastUsedAt: row.last_used_at,
});
const columns = ['id', 'name', 'prefix', 'scope', 'created_at', 'last_used_at'] as const;

export function accessTokenRepository(db: Database): AccessTokenRepository {
  const store = tables<{ auth_access_tokens: AccessTokenRow }>(db);
  return {
    async insert(token, digest) {
      await store
        .insertInto('auth_access_tokens')
        .values({
          id: token.id,
          name: token.name,
          digest,
          prefix: token.prefix,
          scope: token.scope,
          created_at: token.createdAt,
          last_used_at: token.lastUsedAt,
        })
        .execute();
    },
    async findByDigest(digest) {
      const row = await store
        .selectFrom('auth_access_tokens')
        .select(columns)
        .where('digest', '=', digest)
        .executeTakeFirst();
      return row && record(row);
    },
    async list() {
      const rows = await store
        .selectFrom('auth_access_tokens')
        .select(columns)
        .orderBy('created_at', 'desc')
        .orderBy('id', 'desc')
        .execute();
      return rows.map(record);
    },
    async countActive() {
      const row = await store
        .selectFrom('auth_access_tokens')
        .select(({ fn }) => fn.countAll<number>().as('count'))
        .executeTakeFirstOrThrow();
      return Number(row.count);
    },
    async touch(id, usedAt) {
      await store.updateTable('auth_access_tokens').set({ last_used_at: usedAt }).where('id', '=', id).execute();
    },
    async delete(id) {
      await store.deleteFrom('auth_access_tokens').where('id', '=', id).execute();
    },
    async deleteAll() {
      await store.deleteFrom('auth_access_tokens').execute();
    },
  };
}
