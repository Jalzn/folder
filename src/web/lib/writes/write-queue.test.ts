import { describe, expect, it } from 'vitest';
import { createWriteQueue } from './write-queue';

/** A write that ends when the test says so. */
function pending<T>(value: T) {
  let finish: () => void = () => undefined;
  let fail: () => void = () => undefined;
  const promise = new Promise<T>((resolve, reject) => {
    finish = () => resolve(value);
    fail = () => reject(new Error('recusado'));
  });
  return { promise, finish, fail };
}

describe('createWriteQueue', () => {
  it('runs one write at a time, refusing a second one while the first runs', async () => {
    const queue = createWriteQueue();
    const first = pending('a');
    const started = queue.start(() => first.promise);
    expect(queue.busy).toBe(true);
    expect(queue.start(async () => 'b')).toBeNull();
    first.finish();
    expect(await started).toBe('a');
    await Promise.resolve();
    expect(queue.busy).toBe(false);
    expect(await queue.start(async () => 'c')).toBe('c');
  });

  it('runs a write asked with after once the one in progress settles, failed or not', async () => {
    const queue = createWriteQueue();
    const order: string[] = [];
    const first = pending('a');
    const started = queue.start(() => first.promise.finally(() => order.push('first')));
    const undo = queue.after(async () => {
      order.push('undo');
      return 'undone';
    });
    await Promise.resolve();
    expect(order).toEqual([]);
    first.fail();
    await expect(started).rejects.toThrow('recusado');
    expect(await undo).toBe('undone');
    expect(order).toEqual(['first', 'undo']);
  });

  it('runs an after at once when nothing runs', async () => {
    const queue = createWriteQueue();
    expect(await queue.after(async () => 1)).toBe(1);
  });
});
