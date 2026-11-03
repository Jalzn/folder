import { randomUUID } from 'node:crypto';
import type { EventDraft, EventPublisher, ModuleEvent } from '../application/module-events.js';
import type { ModuleContext, TransactionScope, UnitOfWork } from '../application/unit-of-work.js';
import { toIsoInstant } from '../domain/instant.js';
import { type Database, type DatabaseTransaction, readTransaction, writeTransaction } from './db.js';
import { eventSnapshot, reportObserverError } from './module-events.js';
import { idempotentWrite } from './write.js';

export interface UnitOfWorkOptions {
  clock?: () => Date;
  mutationClock?: () => Date;
  eventId?: () => string;
  /** Event metadata never consumes a stepping business clock. */
  eventClock?: () => Date;
  logError?: (error: unknown) => void;
}

export interface ContextOptions {
  clock?: () => Date;
  newId?: () => string;
}

interface ScopeState {
  connection: DatabaseTransaction;
  writable: boolean;
  active: boolean;
  requestId?: string;
  operation?: string;
  events: (() => void)[];
}

export interface SqliteUnitOfWork extends UnitOfWork {
  assertActive(scope: TransactionScope): void;
  assertWritable(scope: TransactionScope): void;
  bind<Ports extends object>(scope: TransactionScope, ports: Ports): Ports;
  connection(scope: TransactionScope): DatabaseTransaction;
  operation(scope: TransactionScope): string | undefined;
  emit<Event extends ModuleEvent>(
    scope: TransactionScope,
    publisher: EventPublisher<Event>,
    draft: EventDraft<Event>,
  ): void;
  context<Repositories extends object>(
    repositories: (scope: TransactionScope) => Repositories,
    options?: ContextOptions,
  ): ModuleContext<Repositories>;
  participantContext<Repositories extends object>(
    scope: TransactionScope,
    repositories: (scope: TransactionScope) => Repositories,
    options?: ContextOptions,
  ): ModuleContext<Repositories>;
}

/** Uses the existing write protocol unchanged and publishes only after its commit has succeeded. */
export function createUnitOfWork(
  db: Database,
  {
    clock = () => new Date(),
    mutationClock = clock,
    eventId = randomUUID,
    eventClock = () => new Date(),
    logError = console.error,
  }: UnitOfWorkOptions = {},
): SqliteUnitOfWork {
  const scopes = new WeakMap<TransactionScope, ScopeState>();

  const stateOf = (scope: TransactionScope): ScopeState => {
    const state = scopes.get(scope);
    if (!state?.active) throw new Error('Transaction scope is no longer active.');
    return state;
  };
  const writableState = (scope: TransactionScope): ScopeState => {
    const state = stateOf(scope);
    if (!state.writable) throw new Error('A read transaction cannot perform a write.');
    return state;
  };

  const inScope = async <T>(
    connection: DatabaseTransaction,
    writable: boolean,
    events: (() => void)[],
    work: (scope: TransactionScope) => Promise<T>,
    requestId?: string,
    operation?: string,
  ): Promise<T> => {
    const scope = Object.freeze({}) as TransactionScope;
    const state: ScopeState = {
      connection,
      writable,
      active: true,
      events,
      ...(requestId === undefined ? {} : { requestId }),
      ...(operation === undefined ? {} : { operation }),
    };
    scopes.set(scope, state);
    try {
      return await work(scope);
    } finally {
      state.active = false;
    }
  };

  const committed = async <T>(run: (events: (() => void)[]) => Promise<T>): Promise<T> => {
    const events: (() => void)[] = [];
    const result = await run(events);
    for (const publish of events) {
      try {
        publish();
      } catch (error) {
        reportObserverError(logError, error);
      }
    }
    return result;
  };

  /** Guard both a captured repository and a method extracted from it after its scope has expired. */
  const guard = <Repositories extends object>(scope: TransactionScope, repositories: Repositories): Repositories => {
    const proxies = new WeakMap<object, object>();
    const wrap = <Value extends object>(value: Value): Value => {
      const found = proxies.get(value);
      if (found) return found as Value;
      const proxy = new Proxy(value, {
        get(target, key, receiver) {
          stateOf(scope);
          const member: unknown = Reflect.get(target, key, receiver);
          if (typeof member === 'function') {
            return (...args: unknown[]) => {
              stateOf(scope);
              return Reflect.apply(member, target, args);
            };
          }
          return member !== null && typeof member === 'object' ? wrap(member) : member;
        },
      });
      proxies.set(value, proxy);
      return proxy;
    };
    return wrap(repositories);
  };

  const unit: SqliteUnitOfWork = {
    assertActive: (scope) => void stateOf(scope),
    assertWritable: (scope) => void writableState(scope),
    bind: (scope, ports) => {
      stateOf(scope);
      return guard(scope, ports);
    },
    connection: (scope) => stateOf(scope).connection,
    operation: (scope) => stateOf(scope).operation,
    read: (work) => readTransaction(db, (connection) => inScope(connection, false, [], work)),
    write: (operation, input, work) =>
      committed((events) =>
        idempotentWrite(
          db,
          operation,
          input,
          (connection) => inScope(connection, true, events, work, input.requestId, operation),
          { now: () => toIsoInstant(mutationClock()) },
        ),
      ),
    writeWithoutRequestRecord: (work) =>
      committed((events) => writeTransaction(db, (connection) => inScope(connection, true, events, work))),
    emit(scope, publisher, draft) {
      const state = writableState(scope);
      const event = eventSnapshot({
        ...draft,
        eventId: eventId(),
        occurredAt: toIsoInstant(eventClock()),
        ...(state.requestId === undefined ? {} : { requestId: state.requestId }),
      }) as unknown as Parameters<typeof publisher.publish>[0];
      state.events.push(() => publisher.publish(event));
    },
    context(repositories, { clock: contextClock = clock, newId = randomUUID } = {}) {
      const run = <T>(scope: TransactionScope, work: (ports: ReturnType<typeof repositories>) => Promise<T>) =>
        work(guard(scope, repositories(scope)));
      return {
        now: () => toIsoInstant(contextClock()),
        newId,
        read: (work) => unit.read((scope) => run(scope, work)),
        write: (operation, input, work) => unit.write(operation, input, (scope) => run(scope, work)),
        writeWithoutRequestRecord: (work) => unit.writeWithoutRequestRecord((scope) => run(scope, work)),
      };
    },
    participantContext(scope, repositories, { clock: contextClock = clock, newId = randomUUID } = {}) {
      stateOf(scope);
      const run = <T>(work: (ports: ReturnType<typeof repositories>) => Promise<T>) => {
        stateOf(scope);
        return work(guard(scope, repositories(scope)));
      };
      return {
        now: () => {
          stateOf(scope);
          return toIsoInstant(contextClock());
        },
        newId: () => {
          stateOf(scope);
          return newId();
        },
        read: run,
        write: (_operation, _input, work) => {
          writableState(scope);
          return run(work);
        },
        writeWithoutRequestRecord: (work) => {
          writableState(scope);
          return run(work);
        },
      };
    },
  };
  return unit;
}
