import { describe, expect, it } from 'vitest';
import { displayName, nameKey } from './names.js';

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
});
