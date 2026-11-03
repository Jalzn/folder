import { describe, expect, it } from 'vitest';
import { byLabelName, LABEL_COLORS, nextLabelColor } from './labels.js';

describe('labels', () => {
  it('gives a new label the first color no active label uses, and the first again once all are taken', () => {
    expect(nextLabelColor([])).toBe('blue');
    expect(nextLabelColor([{ color: 'blue' }, { color: 'purple' }])).toBe('slate');
    expect(nextLabelColor(LABEL_COLORS.map((color) => ({ color })))).toBe('blue');
  });

  it('orders labels alphabetically, as Portuguese sorts them', () => {
    const labels = [
      { id: '3', name: 'operação' },
      { id: '1', name: 'Editor' },
      { id: '2', name: 'backend' },
      { id: '4', name: 'Ética' },
    ];
    expect([...labels].sort(byLabelName).map((label) => label.name)).toEqual([
      'backend',
      'Editor',
      'Ética',
      'operação',
    ]);
  });
});
