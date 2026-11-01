import { describe, expect, it } from 'vitest';
import { leftOutLine, overviewSummary } from './overview-text';

const now = new Date(2026, 9, 31, 15, 0);
const today = new Date(2026, 9, 31, 9, 30).toISOString();

describe('overviewSummary', () => {
  it('counts open and late tasks and names the text edited last', () => {
    expect(overviewSummary(5, 1, { type: 'document', title: 'Visão do produto', updatedAt: today }, now)).toBe(
      '5 tarefas abertas, 1 atrasada. Último texto editado: Visão do produto, hoje.',
    );
    expect(overviewSummary(5, 2, null, now)).toBe('5 tarefas abertas, 2 atrasadas.');
  });

  it('says one task in the singular and a drawing as a drawing', () => {
    const lastEdited = { type: 'drawing' as const, title: 'Fluxo', updatedAt: new Date(2026, 9, 27).toISOString() };
    expect(overviewSummary(1, 0, lastEdited, now)).toBe('1 tarefa aberta. Último desenho editado: Fluxo, 27 out.');
  });

  it('says when nothing is open and leaves out the last edit of an empty project', () => {
    expect(overviewSummary(0, 0, null, now)).toBe('Nenhuma tarefa aberta.');
    expect(overviewSummary(0, 0, { type: 'document', title: '', updatedAt: today }, now)).toBe(
      'Nenhuma tarefa aberta. Último texto editado: Sem título, hoje.',
    );
  });
});

describe('leftOutLine', () => {
  it('sums up each column Agora leaves out, in board order', () => {
    expect(leftOutLine([{ name: 'A fazer', count: 3, only: null }])).toBe('Mais 3 em A fazer.');
    expect(
      leftOutLine([
        { name: 'A fazer', count: 3, only: null },
        { name: 'Em andamento', count: 2, only: null },
      ]),
    ).toBe('Mais 3 em A fazer · Mais 2 em Em andamento.');
  });

  it('names the one task left out when it has a due date', () => {
    expect(leftOutLine([{ name: 'A fazer', count: 1, only: { title: 'Renovar domínio', dueOn: '2026-11-15' } }])).toBe(
      'Mais 1 em A fazer: Renovar domínio, 15 nov.',
    );
  });

  it('is empty when Agora lists everything open', () => {
    expect(leftOutLine([])).toBe('');
    expect(leftOutLine([{ name: 'A fazer', count: 0, only: null }])).toBe('');
  });
});
