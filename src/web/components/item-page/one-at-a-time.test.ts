import { describe, expect, it } from 'vitest';
import { oneAtATime } from './one-at-a-time';

describe('one task at a time', () => {
  it('ignores a second import while the first runs, and takes the next once it ended', async () => {
    const run = oneAtATime();
    let release: () => void = () => undefined;
    const ran: string[] = [];
    const first = run(
      () =>
        new Promise<void>((resolve) => {
          ran.push('primeira');
          release = resolve;
        }),
    );
    expect(await run(async () => void ran.push('segunda'))).toBe(false);
    release();
    expect(await first).toBe(true);
    expect(await run(async () => void ran.push('terceira'))).toBe(true);
    expect(ran).toEqual(['primeira', 'terceira']);
  });

  it('frees the next import after one that failed', async () => {
    const run = oneAtATime();
    await expect(run(() => Promise.reject(new Error('sessão')))).rejects.toThrow('sessão');
    expect(await run(async () => undefined)).toBe(true);
  });
});
