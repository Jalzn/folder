import { describe, expect, it } from 'vitest';
import { leftOutLine, overviewSummary } from './overview-text';

const now = new Date(2026, 9, 31, 15, 0);
const today = new Date(2026, 9, 31, 9, 30).toISOString();

describe('overviewSummary', () => {
  it('counts open tasks and names the text edited last', () => {
    expect(overviewSummary(5, { type: 'document', title: 'Visão do produto', updatedAt: today }, now)).toBe(
      '5 tarefas abertas. Último texto editado: Visão do produto, hoje.',
    );
  });

  it('says one task in the singular and a drawing as a drawing', () => {
    const lastEdited = { type: 'drawing' as const, title: 'Fluxo', updatedAt: new Date(2026, 9, 27).toISOString() };
    expect(overviewSummary(1, lastEdited, now)).toBe('1 tarefa aberta. Último desenho editado: Fluxo, 27 out.');
  });

  it('says when nothing is open and leaves out the last edit of an empty project', () => {
    expect(overviewSummary(0, null, now)).toBe('Nenhuma tarefa aberta.');
    expect(overviewSummary(0, { type: 'document', title: '', updatedAt: today }, now)).toBe(
      'Nenhuma tarefa aberta. Último texto editado: Sem título, hoje.',
    );
  });
});

describe('leftOutLine', () => {
  it('sums up each column Agora leaves out, in board order', () => {
    expect(leftOutLine([{ status: 'todo', count: 3 }])).toBe('Mais 3 em A fazer.');
    expect(
      leftOutLine([
        { status: 'todo', count: 3 },
        { status: 'doing', count: 2 },
      ]),
    ).toBe('Mais 3 em A fazer · Mais 2 em Em andamento.');
  });

  it('is empty when Agora lists everything open', () => {
    expect(leftOutLine([])).toBe('');
    expect(leftOutLine([{ status: 'todo', count: 0 }])).toBe('');
  });
});
