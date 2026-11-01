import { describe, expect, it } from 'vitest';
import { folderName, folderNameKey, folderOrder, restoredPosition } from './folders.js';

describe('folders', () => {
  it('collapses the spaces of a name, line breaks included, and trims it', () => {
    expect(folderName('  Arquitetura \n\t do   produto  ')).toBe('Arquitetura do produto');
    expect(folderName(' \n ')).toBe('');
  });

  it('keys names without case and accents', () => {
    expect(folderNameKey('Ações')).toBe(folderNameKey('acoes'));
    expect(folderNameKey('MCP')).toBe(folderNameKey(' mcp '));
    expect(folderNameKey('Ações')).toBe(folderNameKey('Ações'));
    expect(folderNameKey('MCP')).not.toBe(folderNameKey('MCPs'));
    // A name of marks alone keeps nothing to tell it apart.
    expect(folderNameKey('́')).toBe('');
  });

  it('drops what draws nothing from a name, and keeps the joiners of emoji', () => {
    for (const name of ['Aç\u{200B}ões', 'Aç\u{00AD}ões', 'Ações\u{2060}', '\u{FEFF}Ações', 'A\u{3164}ções'])
      expect(folderName(name)).toBe('Ações');
    expect(folderName('a \u{200B} b')).toBe('a b');
    for (const name of ['\u{200B}', '\u{3164}', '\u{200D}', '\u{0301}']) expect(folderName(name)).toBe('');
    expect(folderName('👩\u{200D}💻 Dev')).toBe('👩\u{200D}💻 Dev');
  });

  it('keys look-alike names as one: full width, ligatures, invisible characters and a dotted I', () => {
    for (const name of ['Ａｃｏｅｓ', 'Aç\u{200B}ões', 'Aç\u{00AD}ões', 'Ações\u{2060}', 'AÇÕES'])
      expect(folderNameKey(name)).toBe('acoes');
    expect(folderNameKey('ﬁo')).toBe(folderNameKey('fio'));
    expect(folderNameKey('İ')).toBe(folderNameKey('i'));
    expect(folderNameKey('™')).toBe(folderNameKey('TM'));
    expect(folderNameKey('\u{200B}')).toBe('');
  });

  it('tells apart names that look different: marks of other scripts, emoji sequences, flags', () => {
    const tags = (text: string) =>
      Array.from(text, (letter) => String.fromCodePoint(0xe0000 + (letter.codePointAt(0) ?? 0))).join('');
    for (const [one, other] of [
      ['क\u{093E}म', 'कम'],
      ['ม\u{0E49}า', 'มา'],
      ['👨\u{200D}👩\u{200D}👧', '👨👩👧'],
      ['🏳\u{FE0F}\u{200D}🌈', '🏳🌈'],
      [`🏴${tags('gbsct')}\u{E007F}`, `🏴${tags('gbeng')}\u{E007F}`],
      ['1\u{FE0F}\u{20E3}', '1'],
      ['👍\u{1F3FB}', '👍\u{1F3FF}'],
      ['Pr\u{043E}jeto', 'Projeto'],
      // Cyrillic letters with a breve, a diaeresis or the Macedonian acute.
      ['мой', 'мои'],
      ['ў', 'у'],
      ['ї', 'і'],
      ['ё', 'е'],
      ['ѓ', 'г'],
      ['Ќ', 'К'],
      ['ѝ', 'и'],
      ['ѐ', 'е'],
    ] as [string, string][])
      expect(folderNameKey(one)).not.toBe(folderNameKey(other));
  });

  it('keys as one what reads as one: Latin accents, compatibility forms, presentation and Persian joiners', () => {
    for (const [one, other] of [
      ['má', 'ma'],
      ['1\u{00BA} ano', '1o ano'],
      ['x\u{00B2}', 'x2'],
      ['Fase \u{2163}', 'Fase IV'],
      ['\u{D55C}', '\u{1112}\u{1161}\u{11AB}'],
      ['❤\u{FE0F}', '❤'],
      ['می\u{200C}خواهم', 'میخواهم'],
      ['ά', 'α'],
      // Cyrillic stress, the acute and the grave over a vowel.
      ['за\u{0301}мок', 'замок'],
      ['дома\u{0300}', 'дома'],
      ['ё\u{0301}', 'ё'],
    ] as [string, string][])
      expect(folderNameKey(one)).toBe(folderNameKey(other));
  });

  it('keys "Notas" with a default ignorable or unassigned code point as "Notas"', () => {
    for (const hidden of [
      '\u{034F}',
      '\u{180B}',
      '\u{17B4}',
      '\u{2065}',
      '\u{FFF0}',
      '\u{E0080}',
      '\u{0378}',
      '\u{FFF9}',
      '\u{13430}',
    ])
      expect(folderNameKey(`Notas${hidden}`)).toBe(folderNameKey('Notas'));
  });

  it('stores and keys "MCP" with hidden tags as plain "MCP"', () => {
    const hidden = Array.from({ length: 32 }, (_, index) => String.fromCodePoint(0xe0041 + (index % 26))).join('');
    expect(folderName(`MCP${hidden}`)).toBe('MCP');
    expect(folderNameKey(`MCP${hidden}`)).toBe('mcp');
  });

  it('orders a folder before another, at the end, and refuses unknown or identical ids', () => {
    const ids = ['a', 'b', 'c', 'd'];
    expect(folderOrder(ids, 'd', 'a')).toEqual(['d', 'a', 'b', 'c']);
    expect(folderOrder(ids, 'a', 'c')).toEqual(['b', 'a', 'c', 'd']);
    expect(folderOrder(ids, 'b', null)).toEqual(['a', 'c', 'd', 'b']);
    expect(folderOrder(ids, 'x', 'a')).toBeUndefined();
    expect(folderOrder(ids, 'a', 'x')).toBeUndefined();
    expect(folderOrder(ids, 'a', 'a')).toBeUndefined();
  });

  it('restores a folder at its position, or at the end when fewer remain', () => {
    expect(restoredPosition(2, 5)).toBe(2);
    expect(restoredPosition(7, 3)).toBe(3);
    expect(restoredPosition(0, 0)).toBe(0);
  });
});
