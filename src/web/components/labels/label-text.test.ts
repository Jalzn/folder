import { describe, expect, it } from 'vitest';
import {
  LABEL_TOO_LONG,
  LABELS_FULL,
  labelColorText,
  labelDeletedText,
  labelRestoredText,
  labelRowDescription,
  labelTakenText,
  labelTaskCount,
} from './label-text';

describe('label text', () => {
  it('counts the tasks of a row', () => {
    expect(labelTaskCount(0)).toBe('Nenhuma tarefa');
    expect(labelTaskCount(1)).toBe('1 tarefa');
    expect(labelTaskCount(4)).toBe('4 tarefas');
    expect(labelTaskCount(1000)).toBe('1.000 tarefas');
  });

  it('describes a row for a screen reader', () => {
    expect(labelRowDescription('blue', 4)).toBe('Azul, 4 tarefas. Enter renomeia');
    expect(labelRowDescription('teal', 0)).toBe('Verde-água, nenhuma tarefa. Enter renomeia');
  });

  it('says what refuses a name, as the server does', () => {
    expect(labelTakenText('mcp')).toBe('Já existe uma etiqueta mcp.');
    expect(LABEL_TOO_LONG).toBe('Use até 30 caracteres no nome da etiqueta.');
    expect(LABELS_FULL).toBe('Máximo de 100 etiquetas.');
  });

  it('says how many tasks a deleted label was in', () => {
    expect(labelDeletedText('mcp', 4)).toBe('Etiqueta mcp excluída. Estava em 4 tarefas.');
    expect(labelDeletedText('mcp', 1)).toBe('Etiqueta mcp excluída. Estava em 1 tarefa.');
    expect(labelDeletedText('mcp', 0)).toBe('Etiqueta mcp excluída. Não estava em nenhuma tarefa.');
    expect(labelDeletedText('mcp', 1200)).toBe('Etiqueta mcp excluída. Estava em 1.200 tarefas.');
  });

  it('says which tasks a restored label could not go back to', () => {
    expect(labelRestoredText('mcp', 0)).toBe('Etiqueta mcp restaurada.');
    expect(labelRestoredText('mcp', 1)).toBe(
      'Etiqueta mcp restaurada. 1 tarefa já tinha 20 etiquetas e ficou sem ela.',
    );
    expect(labelRestoredText('mcp', 3)).toBe(
      'Etiqueta mcp restaurada. 3 tarefas já tinham 20 etiquetas e ficaram sem ela.',
    );
  });

  it('announces a new color by its name', () => {
    expect(labelColorText('mcp', 'coral')).toBe('Cor da etiqueta mcp: Coral');
  });
});
