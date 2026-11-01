import { describe, expect, it } from 'vitest';
import { checkLabelName } from './label-name';

const taken = ['backend', 'Operação'];

describe('a typed label name', () => {
  it('changes nothing when empty or the same', () => {
    expect(checkLabelName('', '', taken)).toEqual({ kind: 'unchanged' });
    expect(checkLabelName('   ', 'mcp', taken)).toEqual({ kind: 'unchanged' });
    expect(checkLabelName('​', '', taken)).toEqual({ kind: 'unchanged' });
    expect(checkLabelName(' mcp  ', 'mcp', taken)).toEqual({ kind: 'unchanged' });
  });

  it('saves the tidied name, the label’s own name in another case included', () => {
    expect(checkLabelName('  urgente   agora ', '', taken)).toEqual({ kind: 'ok', name: 'urgente agora' });
    expect(checkLabelName('MCP', 'mcp', taken)).toEqual({ kind: 'ok', name: 'MCP' });
  });

  it('names the label that has it, ignoring case and accents', () => {
    expect(checkLabelName('BACKEND', '', taken)).toEqual({ kind: 'error', text: 'Já existe uma etiqueta backend.' });
    expect(checkLabelName('operacao', 'mcp', taken)).toEqual({
      kind: 'error',
      text: 'Já existe uma etiqueta Operação.',
    });
  });

  it('refuses more than 30 characters, counting each emoji once', () => {
    expect(checkLabelName('x'.repeat(30), '', taken)).toEqual({ kind: 'ok', name: 'x'.repeat(30) });
    expect(checkLabelName('😀'.repeat(30), '', taken)).toEqual({ kind: 'ok', name: '😀'.repeat(30) });
    expect(checkLabelName('x'.repeat(31), '', taken)).toEqual({
      kind: 'error',
      text: 'Use até 30 caracteres no nome da etiqueta.',
    });
  });
});
