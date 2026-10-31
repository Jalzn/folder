/** How long the G of a chord waits for its second key. */
export const CHORD_TIMEOUT_MS = 1500;

export type ChordCommand =
  | { kind: 'switcher' }
  | { kind: 'project'; index: number }
  | { kind: 'overview' }
  | { kind: 'board' }
  | { kind: 'trash' };

const seconds: Record<string, ChordCommand> = {
  p: { kind: 'switcher' },
  v: { kind: 'overview' },
  q: { kind: 'board' },
  l: { kind: 'trash' },
};

/**
 * The G chords: G P, G 1–9, G V, G Q and G L. `press` returns the command a key completes, `'pending'` while
 * G waits for the next key, or null. The clock comes in, so tests can move time.
 */
export function createChords(now: () => number = () => Date.now()) {
  let startedAt: number | null = null;
  return {
    press(key: string): ChordCommand | 'pending' | null {
      const lower = key.toLowerCase();
      const waiting = startedAt !== null && now() - startedAt <= CHORD_TIMEOUT_MS;
      startedAt = null;
      if (waiting) {
        if (/^[1-9]$/.test(lower)) return { kind: 'project', index: Number(lower) - 1 };
        const command = seconds[lower];
        if (command) return command;
      }
      if (lower === 'g') {
        startedAt = now();
        return 'pending';
      }
      return null;
    },
    get pending() {
      return startedAt !== null && now() - startedAt <= CHORD_TIMEOUT_MS;
    },
    reset() {
      startedAt = null;
    },
  };
}
