import { describe, expect, it } from 'vitest';
import { displayName, nameKey, nameTakenBy } from './names.js';

describe('names of folders, columns and labels', () => {
  it('stores a name on one line, without what draws nothing', () => {
    expect(displayName('  Em \n andamento\u{200B} ')).toBe('Em andamento');
    expect(displayName('\u{200B}\u{00AD}')).toBe('');
  });

  it('keys names without case, accents, compatibility forms or invisible characters', () => {
    for (const [one, other] of [
      ['Revisão', 'revisao'],
      ['MCP', 'mcp'],
      ['Concluído', 'CONCLUIDO'],
      ['Ａｃｏｅｓ', 'Ações'],
      ['ope\u{200B}ração', 'Operação'],
    ] as [string, string][])
      expect(nameKey(one)).toBe(nameKey(other));
    expect(nameKey('A fazer')).toBe('a fazer');
    expect(nameKey('Concluído')).toBe('concluido');
    expect(nameKey('Revisão')).not.toBe(nameKey('Revisões'));
  });
  it('finds the one that already has a name by its key, except the one being renamed', () => {
    const named = [
      { id: 'a', name: 'Ações' },
      { id: 'b', name: 'Revisão' },
    ];
    expect(nameTakenBy(named, ' acoes ')).toBe(named[0]);
    expect(nameTakenBy(named, 'AÇÕES', 'a')).toBeUndefined();
    expect(nameTakenBy(named, 'Revisões')).toBeUndefined();
  });
});
