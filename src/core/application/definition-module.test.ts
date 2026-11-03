import { describe, expect, expectTypeOf, it, vi } from 'vitest';
import { toIsoInstant } from '../domain/instant.js';
import { defineModule } from './definition-module.js';
import type { EventSource, ModuleEvent } from './module-events.js';
import { Module } from './runtime-module.js';

type Changed = ModuleEvent<'counter.changed', { value: number }>;
type Reset = ModuleEvent<'counter.reset', { previous: number }>;
type CounterEvent = Changed | Reset;

function eventSource() {
  const listeners = new Set<(event: CounterEvent) => void>();
  return {
    subscriptions: 0,
    on<Type extends CounterEvent['type']>(type: Type, handler: (event: Extract<CounterEvent, { type: Type }>) => void) {
      this.subscriptions += 1;
      const listener = (event: CounterEvent) => {
        if (event.type === type) handler(event as Extract<CounterEvent, { type: Type }>);
      };
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    publish(event: CounterEvent) {
      for (const listener of listeners) listener(event);
    },
  };
}

function counterDefinition() {
  return defineModule({
    id: 'counter',
    setup: ({ initial }: { initial: number }) => ({ value: initial, source: eventSource() }),
    api: (state) => ({
      commands: {
        increment: (amount: number) => {
          state.value += amount;
          state.source.publish({
            eventId: 'event',
            entityId: 'counter',
            type: 'counter.changed',
            occurredAt: toIsoInstant(new Date('2026-11-03T12:00:00.000Z')),
            payload: { value: state.value },
          });
          return state.value;
        },
      },
      queries: { current: () => state.value },
      events: state.source,
    }),
  });
}

describe('module definitions', () => {
  it('isolates private state and preserves the inferred API of named subclasses', () => {
    const definition = counterDefinition();
    class CounterModule extends definition.Module {}
    const first = new CounterModule({ initial: 2 });
    const second = new CounterModule({ initial: 10 });
    expect(first).toBeInstanceOf(Module);
    expectTypeOf(first.id).toEqualTypeOf<'counter'>();
    expectTypeOf(first.commands.increment).toEqualTypeOf<(amount: number) => number>();
    expectTypeOf(first.queries.current).toEqualTypeOf<() => number>();
    expectTypeOf(first.events).toEqualTypeOf<EventSource<CounterEvent>>();
    expect(Object.keys(first).sort()).toEqual(['commands', 'events', 'id', 'queries']);
    first.commands.increment(3);
    expect(definition.stateOf(first).value).toBe(5);
    expect(definition.stateOf(second).value).toBe(10);
    expect(definition.stateOf(first)).not.toBe(definition.stateOf(second));
    expect(first).not.toHaveProperty('state');
    expect(first).not.toHaveProperty('dispose');
  });

  it('rejects instances from another definition, copies and forged prototypes', () => {
    const owner = counterDefinition();
    const other = counterDefinition();
    const instance = new owner.Module({ initial: 1 });
    expect(() => owner.stateOf(new other.Module({ initial: 1 }))).toThrow('does not belong');
    expect(() => owner.stateOf({ ...instance })).toThrow('does not belong');
    expect(() => owner.stateOf(Object.create(owner.Module.prototype))).toThrow('does not belong');
    expect(owner.stateOf(instance).value).toBe(1);
  });

  it('keeps extracted commands and subscriptions bound without exposing the publisher', () => {
    const definition = counterDefinition();
    const instance = new definition.Module({ initial: 1 });
    const { increment } = instance.commands;
    const { current } = instance.queries;
    const { on } = instance.events;
    const seen = vi.fn();
    const unsubscribe = on('counter.changed', (event) => {
      expectTypeOf(event).toEqualTypeOf<Changed>();
      seen(event.payload.value);
    });
    on('counter.reset', (event) => {
      expectTypeOf(event).toEqualTypeOf<Reset>();
    });
    expect(Object.keys(instance.events)).toEqual(['on']);
    expect(instance.events).not.toHaveProperty('publish');
    expect(instance.events).not.toHaveProperty('subscriptions');
    expect(definition.stateOf(instance).source.subscriptions).toBe(2);
    expect(increment(2)).toBe(3);
    expect(current()).toBe(3);
    expect(seen).toHaveBeenCalledWith(3);
    unsubscribe();
    increment(1);
    expect(seen).toHaveBeenCalledTimes(1);
  });

  it('validates names before setup and accepts a module without private state', () => {
    const setup = vi.fn(() => undefined);
    const api = () => ({ commands: {}, queries: {}, events: eventSource() });
    for (const id of ['', 'Not-valid', 'with_underscore', '1invalid', 'space here', undefined, null, true])
      expect(() => defineModule({ id: id as string, setup, api })).toThrow('Invalid definition ID');
    expect(setup).not.toHaveBeenCalled();
    const definition = defineModule({ id: 'rich-text', setup, api });
    const instance = new definition.Module(undefined);
    expect(definition.stateOf(instance)).toBeUndefined();
    expect(setup).toHaveBeenCalledOnce();
  });
});
