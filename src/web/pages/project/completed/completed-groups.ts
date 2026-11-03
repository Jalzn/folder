import type { CivilDate, IsoInstant } from '#core/domain';
import { countOf } from '../../../lib/text/count';

const MONTHS = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
];

type Dated<Item> = Item & { completedAt: IsoInstant };

/** A completed task and the day it was completed, YYYY-MM-DD in the owner's time zone. */
export interface CompletedEntry<Item> {
  item: Item;
  day: CivilDate;
}

export interface CompletedGroup<Item> {
  /** YYYY-MM. */
  month: string;
  /** "Outubro 2026". */
  label: string;
  entries: CompletedEntry<Item>[];
}

/** The page's summary: "12 tarefas concluídas. O quadro mostra só os últimos 14 dias.". */
export const completedSummary = (total: number) =>
  `${countOf(total, 'tarefa concluída', 'tarefas concluídas')}. O quadro mostra só os últimos 14 dias.`;

/** "Outubro 2026", from YYYY-MM. */
export function monthLabel(month: string) {
  const [year, number] = month.split('-').map(Number);
  return `${MONTHS[(number ?? 1) - 1]} ${year}`;
}

/**
 * The loaded pages as one list, in the order they give: each task once, the first time it shows, and only the
 * ones with a completion date, which every task of the listing has.
 */
export function completedItems<Item extends { id: string; completedAt: IsoInstant | null }>(
  pages: readonly { items: readonly Item[] }[],
): Dated<Item>[] {
  const seen = new Set<string>();
  const items: Dated<Item>[] = [];
  for (const page of pages)
    for (const item of page.items) {
      if (!isDated(item) || seen.has(item.id)) continue;
      seen.add(item.id);
      items.push(item);
    }
  return items;
}

const isDated = <Item extends { completedAt: IsoInstant | null }>(item: Item): item is Dated<Item> =>
  item.completedAt !== null;

/** The civil date of an instant in a time zone, by one formatter for the whole list. */
function civilDates(timeZone: string) {
  const format = new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' });
  return (instant: string) => {
    const parts = format.formatToParts(new Date(instant));
    const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((each) => each.type === type)?.value;
    return `${part('year')}-${part('month')}-${part('day')}` as CivilDate;
  };
}

/**
 * Groups completed tasks by the month they were completed in the owner's time zone, the newest month first.
 * Each group keeps the order given, the most recently completed first as the listing sends them.
 */
export function groupCompleted<Item extends { completedAt: IsoInstant }>(
  items: readonly Item[],
  timeZone: string,
): CompletedGroup<Item>[] {
  const dayOf = civilDates(timeZone);
  const groups = new Map<string, CompletedGroup<Item>>();
  for (const item of items) {
    const day = dayOf(item.completedAt);
    const month = day.slice(0, 7);
    let group = groups.get(month);
    if (!group) {
      group = { month, label: monthLabel(month), entries: [] };
      groups.set(month, group);
    }
    group.entries.push({ item, day });
  }
  return [...groups.values()].sort((a, b) => b.month.localeCompare(a.month));
}
