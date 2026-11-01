import { nameKey } from '@tinyfold/workspace/domain';
import { describe, expect, it } from 'vitest';
import {
  boardCount,
  columnDeletedText,
  columnLabel,
  columnRestoredText,
  movedText,
  newColumnName,
  positionText,
} from './board-text';

describe('board text', () => {
  it('counts the visible tasks and the late ones apart', () => {
    expect(boardCount(6, 1)).toEqual({ total: '6 tarefas', late: '1 atrasada' });
    expect(boardCount(1, 0)).toEqual({ total: '1 tarefa', late: null });
  });

  it('names a column for a screen reader', () => {
    expect(columnLabel('Em andamento', 2, false)).toBe(
      'Coluna Em andamento, 2 tarefas. Enter renomeia; Shift e setas movem a coluna',
    );
    expect(columnLabel('Concluído', 1, true)).toBe(
      'Coluna Concluído, coluna de conclusão, 1 tarefa. Enter renomeia; Shift e setas movem a coluna',
    );
  });

  it('says where a card went', () => {
    expect(movedText('Em andamento', 1, 3)).toBe('Movida para Em andamento, 2 de 3');
    expect(positionText(0, 3, 'A fazer')).toBe('Posição 1 de 3 em A fazer');
  });

  it('says what a deleted column’s tasks did', () => {
    expect(columnDeletedText(0, null)).toBe('Coluna excluída.');
    expect(columnDeletedText(1, 'A fazer')).toBe('Coluna excluída. 1 tarefa foi para A fazer.');
    expect(columnDeletedText(3, 'A fazer')).toBe('Coluna excluída. 3 tarefas foram para A fazer.');
    expect(columnRestoredText('Revisão', 0)).toBe('Coluna Revisão restaurada.');
    expect(columnRestoredText('Revisão', 2)).toBe(
      'Coluna Revisão restaurada. 2 tarefas mudaram depois e ficaram onde estavam.',
    );
  });

  it('names a new column with the first free name', () => {
    expect(newColumnName(['A fazer'], nameKey)).toBe('Nova coluna');
    expect(newColumnName(['nova coluna', 'Nova Coluna 2'], nameKey)).toBe('Nova coluna 3');
  });
});
