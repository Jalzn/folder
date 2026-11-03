import { createHash } from 'node:crypto';
import type { IsoInstant } from '@tinyfold/core/domain';
import { AppError } from '../application/index.js';
import { toIsoInstant } from '../domain/instant.js';
import { type Database, type DatabaseTransaction, tables, writeTransaction } from './db.js';

interface Mutation {
  request_id: string;
  operation: string;
  fingerprint: string;
  response: string;
  created_at: IsoInstant;
}

function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value !== null && typeof value === 'object')
    return `{${Object.entries(value)
      .filter(([, item]) => item !== undefined)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, item]) => `${JSON.stringify(key)}:${canonical(item)}`)
      .join(',')}}`;
  return JSON.stringify(value) ?? 'null';
}

export async function idempotentWrite<T>(
  db: Database,
  operation: string,
  input: { requestId: string },
  work: (trx: DatabaseTransaction) => Promise<T>,
  { now = () => toIsoInstant(new Date()) }: { now?: () => IsoInstant } = {},
): Promise<T> {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(input.requestId))
    throw new AppError('VALIDATION', 'Solicitação sem identificador válido.');
  const fingerprint = createHash('sha256').update(canonical({ operation, input })).digest('hex');
  return writeTransaction(db, async (trx) => {
    const store = tables<{ core_mutations: Mutation }>(trx);
    const previous = await store
      .selectFrom('core_mutations')
      .selectAll()
      .where('request_id', '=', input.requestId)
      .executeTakeFirst();
    if (previous) {
      if (previous.fingerprint !== fingerprint)
        throw new AppError('REQUEST_REUSED', 'Esta solicitação já foi usada com outros dados.');
      return JSON.parse(previous.response) as T;
    }
    const value = await work(trx);
    const response = JSON.stringify(value ?? null);
    await store
      .insertInto('core_mutations')
      .values({ request_id: input.requestId, operation, fingerprint, response, created_at: now() })
      .execute();
    return JSON.parse(response) as T;
  });
}

export async function cleanupMutations(db: Database, now = new Date()): Promise<void> {
  const cutoff = toIsoInstant(new Date(now.getTime() - 30 * 86_400_000));
  await tables<{ core_mutations: Mutation }>(db)
    .deleteFrom('core_mutations')
    .where('created_at', '<', cutoff)
    .execute();
}
