import type { IsoInstant } from '@tinyfold/core/domain';
import { toIsoInstant } from '@tinyfold/core/domain';
import { describe, expect, it } from 'vitest';
import { completedItems, completedSummary, groupCompleted, monthLabel } from './completed-groups';

const task = (id: string, completedAt: IsoInstant) => ({ id, completedAt });
const shape = (groups: ReturnType<typeof groupCompleted<{ id: string; completedAt: IsoInstant }>>) =>
  groups.map((group) => [
    `${group.label} · ${group.entries.length}`,
    group.entries.map((entry) => `${entry.item.id} ${entry.day}`),
  ]);

describe('groupCompleted', () => {
  it("splits by month in the owner's time zone, the newest first", () => {
    const items = [
      task('a', toIsoInstant(new Date('2026-11-01T13:00:00.000Z'))),
      task('b', toIsoInstant(new Date('2026-11-01T02:00:00.000Z'))),
      task('c', toIsoInstant(new Date('2026-10-01T02:59:59.000Z'))),
    ];
    expect(shape(groupCompleted(items, 'America/Sao_Paulo'))).toEqual([
      ['Novembro 2026 · 1', ['a 2026-11-01']],
      ['Outubro 2026 · 1', ['b 2026-10-31']],
      ['Setembro 2026 · 1', ['c 2026-09-30']],
    ]);
    expect(shape(groupCompleted(items, 'UTC'))).toEqual([
      ['Novembro 2026 · 2', ['a 2026-11-01', 'b 2026-11-01']],
      ['Outubro 2026 · 1', ['c 2026-10-01']],
    ]);
  });

  it('takes the month ahead east of UTC and keeps the zone’s daylight saving', () => {
    const lastOfOctober = [task('t', toIsoInstant(new Date('2026-10-31T15:00:00.000Z')))];
    expect(shape(groupCompleted(lastOfOctober, 'Asia/Tokyo'))).toEqual([['Novembro 2026 · 1', ['t 2026-11-01']]]);
    // 04:30 UTC on the 1st is 00:30 in New York's summer (UTC−4), but still 23:30 of the day before in winter (UTC−5).
    const firsts = [
      task('dec', toIsoInstant(new Date('2026-12-01T04:30:00.000Z'))),
      task('jul', toIsoInstant(new Date('2026-07-01T04:30:00.000Z'))),
    ];
    expect(shape(groupCompleted(firsts, 'America/New_York'))).toEqual([
      ['Novembro 2026 · 1', ['dec 2026-11-30']],
      ['Julho 2026 · 1', ['jul 2026-07-01']],
    ]);
  });

  it('orders the months across years, even when the items come out of order, and keeps each group’s order', () => {
    const items = [
      task('dec', toIsoInstant(new Date('2026-12-15T12:00:00.000Z'))),
      task('jan', toIsoInstant(new Date('2027-01-02T12:00:00.000Z'))),
      task('dec2', toIsoInstant(new Date('2026-12-31T12:00:00.000Z'))),
    ];
    expect(shape(groupCompleted(items, 'UTC'))).toEqual([
      ['Janeiro 2027 · 1', ['jan 2027-01-02']],
      ['Dezembro 2026 · 2', ['dec 2026-12-15', 'dec2 2026-12-31']],
    ]);
    expect(groupCompleted([], 'UTC')).toEqual([]);
  });
});

describe('completedItems', () => {
  it('joins the pages in order, each task once and only with its completion date', () => {
    const pages = [
      {
        items: [
          task('a', toIsoInstant(new Date('2026-10-29T15:00:00.000Z'))),
          task('b', toIsoInstant(new Date('2026-10-17T15:00:00.000Z'))),
        ],
      },
      {
        items: [
          task('b', toIsoInstant(new Date('2026-10-17T15:00:00.000Z'))),
          { id: 'x', completedAt: null },
          task('c', toIsoInstant(new Date('2026-10-15T15:00:00.000Z'))),
        ],
      },
    ];
    expect(completedItems(pages).map((item) => item.id)).toEqual(['a', 'b', 'c']);
    expect(completedItems([])).toEqual([]);
  });
});

describe('words', () => {
  it('writes the summary with the total, in the singular for one', () => {
    expect(completedSummary(1)).toBe('1 tarefa concluída. O quadro mostra só os últimos 14 dias.');
    expect(completedSummary(1234)).toBe('1.234 tarefas concluídas. O quadro mostra só os últimos 14 dias.');
    expect(completedSummary(0)).toBe('0 tarefas concluídas. O quadro mostra só os últimos 14 dias.');
  });

  it('names each month in Portuguese, with its year', () => {
    expect(monthLabel('2026-03')).toBe('Março 2026');
    expect(monthLabel('2027-01')).toBe('Janeiro 2027');
    expect(monthLabel('2026-12')).toBe('Dezembro 2026');
  });
});
