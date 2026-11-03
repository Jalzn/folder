import { randomUUID } from 'node:crypto';
import { sql } from 'kysely';
import { describe, expect, it, vi } from 'vitest';
import type { ModuleEvent } from '../application/module-events.js';
import type { ModuleContext, TransactionScope } from '../application/unit-of-work.js';
import { useTestDatabases } from '../testing/temp-database.js';
import { type Database, tables } from './db.js';
import { coreModule } from './module.js';
import { createEventChannel } from './module-events.js';
import { createUnitOfWork } from './unit-of-work.js';
import { idempotentWrite } from './write.js';

type CounterEvent = ModuleEvent<'counter.changed', { value: number }>;
const instant = '2026-11-03T12:00:00.000Z';
const databases = useTestDatabases([coreModule], 'tinyfold-unit-of-work-');

async function fixture() {
  const { db } = await databases.create();
  await sql`create table counters (id text primary key, value integer not null)`.execute(db);
  await sql`insert into counters values ('first', 0), ('second', 0)`.execute(db);
  let nextEvent = 0;
  const channel = createEventChannel<CounterEvent>();
  const unit = createUnitOfWork(db, {
    clock: () => new Date(instant),
    eventClock: () => new Date(instant),
    eventId: () => `event-${++nextEvent}`,
  });
  const repositories = (id: string) => (scope: TransactionScope) => {
    const trx = unit.connection(scope);
    return {
      async add(amount: number) {
        await sql`update counters set value = value + ${amount} where id = ${id}`.execute(trx);
        const value = await counter(trx, id);
        unit.emit(scope, channel, { type: 'counter.changed', entityId: id, payload: { value } });
        return { id, value };
      },
      nested: { current: () => counter(trx, id) },
    };
  };
  return { db, unit, channel, repositories };
}

async function counter(db: Database, id: string) {
  const row = (await sql<{ value: number }>`select value from counters where id = ${id}`.execute(db)).rows[0];
  if (!row) throw new Error(`Missing counter ${id}.`);
  return row.value;
}

async function requests(db: Database) {
  return (await sql<{ total: number }>`select count(*) as total from core_mutations`.execute(db)).rows[0]?.total;
}

describe('module unit of work', () => {
  it('binds two participants to one write and publishes only after both are committed', async () => {
    const { db, unit, channel, repositories } = await fixture();
    const seen: { event: CounterEvent; first: number | undefined; second: number | undefined }[] = [];
    channel.source.on('counter.changed', async (event) => {
      seen.push({ event, first: await counter(db, 'first'), second: await counter(db, 'second') });
    });
    const input = { requestId: randomUUID(), first: 3, second: 7 };
    const result = await unit.write('workspace.combined', input, async (scope) => {
      const first = unit.participantContext(scope, repositories('first'));
      const second = unit.participantContext(scope, repositories('second'));
      await first.write('nested.first', { requestId: randomUUID() }, (repo) => repo.add(input.first));
      await channel.drain();
      expect(seen).toEqual([]);
      await second.write('nested.second', { requestId: randomUUID() }, (repo) => repo.add(input.second));
      return { saved: true };
    });
    await channel.drain();
    expect(result).toEqual({ saved: true });
    expect(await requests(db)).toBe(1);
    expect(seen.map(({ event }) => event.entityId)).toEqual(['first', 'second']);
    expect(seen.every((entry) => entry.first === 3 && entry.second === 7)).toBe(true);
    expect(seen[0]?.event).toMatchObject({ eventId: 'event-1', requestId: input.requestId, occurredAt: instant });
  });

  it('rolls back the first participant and queued events when the second participant fails', async () => {
    const { db, unit, channel, repositories } = await fixture();
    const handler = vi.fn();
    channel.source.on('counter.changed', handler);
    const input = { requestId: randomUUID() };
    await expect(
      unit.write('workspace.combined', input, async (scope) => {
        await unit.participantContext(scope, repositories('first')).writeWithoutRequestRecord((repo) => repo.add(4));
        await unit.participantContext(scope, repositories('second')).writeWithoutRequestRecord(async (repo) => {
          await repo.add(8);
          throw new Error('Second participant failed.');
        });
      }),
    ).rejects.toThrow('Second participant failed.');
    await channel.drain();
    expect(await counter(db, 'first')).toBe(0);
    expect(await counter(db, 'second')).toBe(0);
    expect(await requests(db)).toBe(0);
    expect(handler).not.toHaveBeenCalled();
    const ctx = unit.context(repositories('first'));
    await ctx.write('workspace.combined', input, (repo) => repo.add(4));
    await channel.drain();
    expect(await counter(db, 'first')).toBe(4);
    expect(handler).toHaveBeenCalledOnce();
  });

  it('discards events when response serialization fails after the work completes', async () => {
    const { db, unit, channel, repositories } = await fixture();
    const handler = vi.fn();
    channel.source.on('counter.changed', handler);
    const cyclic: { self?: unknown } = {};
    cyclic.self = cyclic;
    await expect(
      unit.context(repositories('first')).write('workspace.circular', { requestId: randomUUID() }, async (repo) => {
        await repo.add(10);
        return cyclic;
      }),
    ).rejects.toThrow();
    await channel.drain();
    expect(await counter(db, 'first')).toBe(0);
    expect(await requests(db)).toBe(0);
    expect(handler).not.toHaveBeenCalled();
  });

  it('discards events when SQLite refuses the final commit', async () => {
    const { db, unit, channel, repositories } = await fixture();
    await sql`create table parent (id text primary key)`.execute(db);
    await sql`create table child (parent_id text references parent(id) deferrable initially deferred)`.execute(db);
    const handler = vi.fn();
    channel.source.on('counter.changed', handler);
    await expect(
      unit.write('workspace.deferred', { requestId: randomUUID() }, async (scope) => {
        await unit.participantContext(scope, repositories('first')).writeWithoutRequestRecord((repo) => repo.add(6));
        await sql`insert into child values ('missing')`.execute(unit.connection(scope));
        return { saved: true };
      }),
    ).rejects.toThrow();
    await channel.drain();
    expect(await counter(db, 'first')).toBe(0);
    expect(await requests(db)).toBe(0);
    expect(handler).not.toHaveBeenCalled();
  });

  it('preserves the complete legacy fingerprint and never constructs replayed participants', async () => {
    const { db, unit, channel, repositories } = await fixture();
    const handler = vi.fn();
    channel.source.on('counter.changed', handler);
    const input = { requestId: randomUUID(), amount: 2, source: { id: 'document', version: 4 } };
    const factory = vi.fn(repositories('first'));
    const context = unit.context(factory);
    const results = await Promise.all(
      Array.from({ length: 5 }, () => context.write('workspace.original', input, (repo) => repo.add(input.amount))),
    );
    await channel.drain();
    expect(results).toEqual(Array.from({ length: 5 }, () => ({ id: 'first', value: 2 })));
    expect(factory).toHaveBeenCalledOnce();
    expect(handler).toHaveBeenCalledOnce();
    expect(await requests(db)).toBe(1);
    const shouldNotRun = vi.fn(async () => ({ id: 'first', value: 99 }));
    expect(await idempotentWrite(db, 'workspace.original', input, shouldNotRun)).toEqual(results[0]);
    expect(shouldNotRun).not.toHaveBeenCalled();
    const changed = { ...input, source: { ...input.source, version: 5 } };
    await expect(unit.write('workspace.original', changed, shouldNotRun)).rejects.toMatchObject({
      code: 'REQUEST_REUSED',
    });

    const legacy = { requestId: randomUUID(), title: 'Already saved' };
    await idempotentWrite(db, 'workspace.legacy', legacy, async () => ({ version: 3 }));
    expect(await unit.write('workspace.legacy', legacy, shouldNotRun)).toEqual({ version: 3 });
    expect(shouldNotRun).not.toHaveBeenCalled();
  });

  it('expires scopes, participant contexts and captured methods including nested ports', async () => {
    const { db, unit, repositories } = await fixture();
    type Ports = ReturnType<ReturnType<typeof repositories>>;
    let scope: TransactionScope | undefined;
    let participant: ModuleContext<Ports> | undefined;
    let add: Ports['add'] | undefined;
    let current: Ports['nested']['current'] | undefined;
    const otherUnit = createUnitOfWork(db);
    await unit.write('workspace.capture', { requestId: randomUUID() }, async (active) => {
      scope = active;
      expect(() => otherUnit.connection(active)).toThrow('no longer active');
      participant = unit.participantContext(active, repositories('first'));
      await participant.read(async (repo) => {
        add = repo.add;
        current = repo.nested.current;
        expect(await current()).toBe(0);
      });
      return { saved: true };
    });
    expect(() => scope && unit.connection(scope)).toThrow('no longer active');
    expect(() => participant?.write('late', { requestId: randomUUID() }, (repo) => repo.add(1))).toThrow(
      'no longer active',
    );
    expect(() => add?.(2)).toThrow('no longer active');
    expect(() => current?.()).toThrow('no longer active');
    expect(await counter(db, 'first')).toBe(0);
  });

  it('refuses participant writes and event publication in a read scope', async () => {
    const { db, unit, channel, repositories } = await fixture();
    await unit.read(async (scope) => {
      const participant = unit.participantContext(scope, repositories('first'));
      expect(() => participant.writeWithoutRequestRecord((repo) => repo.add(1))).toThrow('cannot perform a write');
      expect(() =>
        unit.emit(scope, channel, { type: 'counter.changed', entityId: 'first', payload: { value: 4 } }),
      ).toThrow('cannot perform a write');
      expect(await participant.read((repo) => repo.nested.current())).toBe(0);
    });
    expect(await requests(db)).toBe(0);
  });

  it('keeps event IDs separate and non-idempotent writes outside the request journal', async () => {
    const { db, unit, channel, repositories } = await fixture();
    const entityId = vi.fn(() => 'entity-id');
    const context = unit.context(repositories('first'), { newId: entityId });
    const seen: CounterEvent[] = [];
    channel.source.on('counter.changed', (event) => {
      seen.push(event);
    });
    expect(context.newId()).toBe('entity-id');
    await context.writeWithoutRequestRecord((repo) => repo.add(2));
    await context.writeWithoutRequestRecord(async () => ({ unchanged: true }));
    await channel.drain();
    expect(entityId).toHaveBeenCalledOnce();
    expect(seen).toHaveLength(1);
    expect(seen[0]?.eventId).toBe('event-1');
    expect(seen[0]).not.toHaveProperty('requestId');
    expect(await requests(db)).toBe(0);
  });

  it('does not consume a stepping entity clock while assigning event metadata', async () => {
    const { db } = await fixture();
    const clock = vi.fn(() => new Date(instant));
    const unit = createUnitOfWork(db, { clock, eventClock: () => new Date(instant) });
    const channel = createEventChannel<CounterEvent>();
    await unit.writeWithoutRequestRecord(async (scope) => {
      expect(unit.operation(scope)).toBeUndefined();
      unit.assertWritable(scope);
      unit.emit(scope, channel, { type: 'counter.changed', entityId: 'first', payload: { value: 1 } });
      unit.emit(scope, channel, { type: 'counter.changed', entityId: 'second', payload: { value: 2 } });
    });
    expect(clock).not.toHaveBeenCalled();
  });

  it('does not turn an observer or publisher failure into a failed committed write', async () => {
    const { db } = await fixture();
    const unit = createUnitOfWork(db, {
      logError: () => {
        throw new Error('Logger failed.');
      },
    });
    const channel = createEventChannel<CounterEvent>({ logError: () => {} });
    let finish: (() => void) | undefined;
    const pending = new Promise<void>((resolve) => {
      finish = resolve;
    });
    channel.source.on('counter.changed', () => pending);
    const input = { requestId: randomUUID() };
    await expect(
      unit.write('workspace.observed', input, async (scope) => {
        await sql`update counters set value = 5 where id = 'first'`.execute(unit.connection(scope));
        const event = { type: 'counter.changed' as const, entityId: 'first', payload: { value: 5 } };
        unit.emit(scope, channel, event);
        unit.emit<CounterEvent>(
          scope,
          {
            publish: () => {
              throw new Error('Publisher failed.');
            },
          },
          event,
        );
        return { version: 1 };
      }),
    ).resolves.toEqual({ version: 1 });
    expect(await counter(db, 'first')).toBe(5);
    expect(await requests(db)).toBe(1);
    finish?.();
    await channel.drain();
    const records = await tables<{ core_mutations: { response: string } }>(db)
      .selectFrom('core_mutations')
      .select('response')
      .execute();
    expect(records.map((row) => JSON.parse(row.response))).toEqual([{ version: 1 }]);
  });
});
