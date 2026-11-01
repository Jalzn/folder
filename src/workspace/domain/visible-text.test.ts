import { describe, expect, it } from 'vitest';
import { visibleText, withoutInvisible } from './visible-text.js';

describe('visible text', () => {
  it('drops format characters and fillers, and the spaces at the ends', () => {
    expect(visibleText('  Vis\u{200B}ão\u{00AD} do\u{2060} produto\u{FEFF} ')).toBe('Visão do produto');
    expect(visibleText('A\u{3164}B\u{115F}\u{1160}\u{FFA0}')).toBe('AB');
    // Inner spaces stay, as titles keep them.
    expect(visibleText('a  b')).toBe('a  b');
  });

  it('keeps what joins emoji and shapes scripts: the joiners, the flag tags and the marks', () => {
    for (const text of [
      '👩\u{200D}💻',
      'می\u{200C}خواهم',
      '🏴\u{E0067}\u{E0062}\u{E0073}\u{E0063}\u{E0074}\u{E007F}',
      '❤\u{FE0F}',
      'é',
    ])
      expect(visibleText(text)).toBe(text);
  });

  it('reads a text with nothing visible as empty', () => {
    for (const text of ['\u{200B}', '\u{200D}', '\u{0301}', ' \u{3164} ', '\u{FEFF}', '\u{E0067}', ''])
      expect(visibleText(text)).toBe('');
    expect(visibleText('\u{0000}x')).toBe('\u{0000}x');
  });

  it('drops the joiners and marks too for keys', () => {
    expect(withoutInvisible('👩\u{200D}💻 e\u{0301}')).toBe('👩💻 e');
  });
});
