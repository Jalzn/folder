import { describe, expect, expectTypeOf, it, vi } from 'vitest';
import type { ModuleEvent } from '../application/module-events.js';
import { toIsoInstant } from '../domain/instant.js';
import { createEventChannel } from './module-events.js';

type Saved = ModuleEvent<'item.saved', { version: number }>;
type Removed = ModuleEvent<'item.removed', { reason: string }>;
const saved = (version = 1): Saved => ({
  eventId: `event-${version}`,
  type: 'item.saved',
  entityId: 'item',
  occurredAt: toIsoInstant(new Date('2026-11-03T12:00:00.000Z')),
  payload: { version },
});

describe('module event channels', () => {
  it('narrows event payloads and schedules a batch in publication order', async () => {
    const channel = createEventChannel<Saved | Removed>();
    const seen: number[] = [];
    channel.source.on('item.saved', (event) => {
      expectTypeOf(event).toEqualTypeOf<Saved>();
      seen.push(event.payload.version);
    });
    channel.source.on('item.removed', (event) => {
      expectTypeOf(event.payload.reason).toEqualTypeOf<string>();
      throw new Error('A different event must not invoke this listener.');
    });
    channel.publish(saved(1));
    channel.publish(saved(2));
    expect(seen).toEqual([]);
    await channel.drain();
    expect(seen).toEqual([1, 2]);
  });

  it('snapshots the payload and prevents observers from changing it for each other', async () => {
    const errors: unknown[] = [];
    const channel = createEventChannel<Saved>({ logError: (error) => errors.push(error) });
    const source = saved();
    const seen: number[] = [];
    channel.source.on('item.saved', (event) => {
      (event.payload as { version: number }).version = 900;
    });
    channel.source.on('item.saved', (event) => {
      seen.push(event.payload.version);
    });
    channel.publish(source);
    (source.payload as { version: number }).version = 100;
    await channel.drain();
    expect(seen).toEqual([1]);
    expect(errors).toHaveLength(1);
  });

  it('isolates synchronous and asynchronous failures, including failure of the diagnostic sink', async () => {
    const logError = vi.fn(() => {
      throw new Error('Logging is unavailable.');
    });
    const channel = createEventChannel<Saved>({ logError });
    const handled = vi.fn();
    channel.source.on('item.saved', () => {
      throw new Error('Synchronous failure.');
    });
    channel.source.on('item.saved', async () => {
      throw new Error('Asynchronous failure.');
    });
    channel.source.on('item.saved', handled);
    channel.publish(saved());
    await expect(channel.drain()).resolves.toBeUndefined();
    expect(handled).toHaveBeenCalledOnce();
    expect(logError).toHaveBeenCalledTimes(2);
  });

  it('removes subscriptions, disposes queued deliveries and isolates instances', async () => {
    const first = createEventChannel<Saved>();
    const second = createEventChannel<Saved>();
    const firstHandler = vi.fn();
    const secondHandler = vi.fn();
    const unsubscribe = first.source.on('item.saved', firstHandler);
    second.source.on('item.saved', secondHandler);
    first.publish(saved());
    unsubscribe();
    await first.drain();
    expect(firstHandler).not.toHaveBeenCalled();
    expect(secondHandler).not.toHaveBeenCalled();
    second.publish(saved());
    await second.drain();
    expect(secondHandler).toHaveBeenCalledOnce();
    second.publish(saved(2));
    second.dispose();
    await second.drain();
    second.publish(saved(3));
    await second.drain();
    expect(secondHandler).toHaveBeenCalledOnce();
  });
});
