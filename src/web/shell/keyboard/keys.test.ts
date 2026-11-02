import { describe, expect, it } from 'vitest';
import { KEYS } from './keys';
import { shortcutGroups } from './shortcut-list';

describe('KEYS', () => {
  it('are all in the Atalhos dialog, so a named key is never missing from it', () => {
    const listed = new Set(shortcutGroups.flatMap((group) => group.rows.flatMap((row) => row.alternatives)));
    const missing = Object.entries(KEYS).filter(([, keys]) => !listed.has(keys));
    expect(missing).toEqual([]);
  });
});
