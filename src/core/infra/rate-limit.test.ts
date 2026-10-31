import { describe, expect, it } from 'vitest';
import { createSlidingWindow } from './rate-limit.js';

describe('sliding window', () => {
  it('blocks a key at its limit until the oldest hit leaves the window', () => {
    const window = createSlidingWindow({ limit: 3, windowMs: 60_000, maxKeys: 10 });
    for (const time of [0, 10_000, 20_000]) {
      expect(window.blockedFor('ip', time)).toBe(0);
      window.record('ip', time);
    }
    expect(window.blockedFor('ip', 30_000)).toBe(30_000);
    expect(window.blockedFor('other', 30_000)).toBe(0);
    expect(window.blockedFor('ip', 60_000)).toBe(0);
  });
  it('keeps at most maxKeys keys, dropping expired and then least recent ones', () => {
    const window = createSlidingWindow({ limit: 1, windowMs: 1000, maxKeys: 2 });
    window.record('a', 0);
    window.record('b', 500);
    window.record('c', 1200);
    expect(window.blockedFor('a', 1200)).toBe(0);
    expect(window.blockedFor('b', 1200)).toBe(300);
    window.record('d', 1300);
    expect(window.blockedFor('b', 1300)).toBe(0);
    expect(window.blockedFor('c', 1300)).toBe(900);
    expect(window.blockedFor('d', 1300)).toBe(1000);
  });
});
