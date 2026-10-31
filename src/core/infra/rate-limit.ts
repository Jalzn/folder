export interface SlidingWindowOptions {
  /** Hits allowed per key within the window. */
  limit: number;
  windowMs: number;
  /** Keys kept in memory; past it, expired keys go first, then the least recently hit. */
  maxKeys: number;
}

export interface SlidingWindow {
  /** Milliseconds until `key` may be hit again; 0 when a hit fits now. */
  blockedFor(key: string, now: number): number;
  record(key: string, now: number): void;
}

/**
 * Hit counts per key over the last window, kept in memory. Restarts forget them, which suits the
 * single instance Tinyfold runs as.
 */
export function createSlidingWindow({ limit, windowMs, maxKeys }: SlidingWindowOptions): SlidingWindow {
  const hits = new Map<string, number[]>();
  const recent = (key: string, now: number) => (hits.get(key) ?? []).filter((time) => time > now - windowMs);
  return {
    blockedFor(key, now) {
      const times = recent(key, now);
      return times.length < limit ? 0 : (times[times.length - limit] as number) + windowMs - now;
    },
    record(key, now) {
      const times = recent(key, now);
      times.push(now);
      // Re-inserting keeps the map in order of the latest hit.
      hits.delete(key);
      hits.set(key, times);
      if (hits.size <= maxKeys) return;
      for (const [other] of hits) if (!recent(other, now).length) hits.delete(other);
      for (const [other] of hits) {
        if (hits.size <= maxKeys) break;
        hits.delete(other);
      }
    },
  };
}
