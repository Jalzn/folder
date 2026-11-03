import { describe, expect, it } from 'vitest';
import { defaultProjectColor, projectInitial } from './project.js';

describe('project marks', () => {
  it('takes the first grapheme of the name in capitals', () => {
    expect(projectInitial('tinyfold')).toBe('T');
    expect(projectInitial('ébano')).toBe('É');
    expect(projectInitial('e\u0301bano').normalize('NFC')).toBe('É');
    expect(projectInitial('  reforma do escritório')).toBe('R');
    expect(projectInitial('🚀 Lançamento')).toBe('🚀');
    expect(projectInitial('👩‍💻 Código')).toBe('👩‍💻');
    expect(projectInitial('')).toBe('?');
    expect(projectInitial('   ')).toBe('?');
  });

  it('picks the first colour no active project uses, then starts over', () => {
    expect(defaultProjectColor([])).toBe('violet');
    expect(defaultProjectColor(['violet'])).toBe('ochre');
    expect(defaultProjectColor(['violet', 'ochre', 'violet'])).toBe('gray');
    expect(defaultProjectColor(['gray', 'violet', 'ochre'])).toBe('green');
    expect(defaultProjectColor(['violet', 'ochre', 'gray', 'green'])).toBe('violet');
  });
});
