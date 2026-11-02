import { describe, expect, it, vi } from 'vitest';
import { embedSlashItems } from './insert-menu';

describe('embedSlashItems', () => {
  it('gives the document’s / menu "Tarefa" and "Desenho" under Incorporar, each opening its picker', () => {
    const open = vi.fn();
    const items = embedSlashItems(open);
    expect(items.map(({ title, group, subtext, aliases }) => ({ title, group, subtext, aliases }))).toEqual([
      {
        title: 'Tarefa',
        group: 'Incorporar',
        subtext: 'incorporar',
        aliases: ['tarefa', 'task', 'card', 'incorporar', 'embed'],
      },
      {
        title: 'Desenho',
        group: 'Incorporar',
        subtext: 'incorporar',
        aliases: ['desenho', 'figura', 'drawing', 'incorporar', 'embed'],
      },
    ]);
    items[0]?.onItemClick();
    items[1]?.onItemClick();
    expect(open.mock.calls).toEqual([['task'], ['drawing']]);
  });
});
