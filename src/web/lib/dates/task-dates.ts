import type { CivilDate } from '@tinyfold/core/domain';

/**
 * How the interface writes a task's dates (docs/etapas/10-quadro-tarefa.md): "04 nov" on a card,
 * "qua 04 nov 2026" in the drawer, and "· em 5 dias", "· hoje", "· amanhã" or "· há 2 dias" beside it.
 */
const MONTHS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
const WEEKDAYS = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];

/** The parts of a civil date, YYYY-MM-DD. */
function partsOf(date: CivilDate) {
  const [year, month, day] = date.split('-').map(Number);
  return { year: year ?? 1970, month: (month ?? 1) - 1, day: day ?? 1 };
}

/** Days from `from` to `to`, both civil dates: positive when `to` is later. */
export function daysBetween(from: CivilDate, to: CivilDate) {
  const a = partsOf(from);
  const b = partsOf(to);
  return Math.round((Date.UTC(b.year, b.month, b.day) - Date.UTC(a.year, a.month, a.day)) / 86_400_000);
}

/** "04 nov". */
export function shortCivilDate(date: CivilDate) {
  const { month, day } = partsOf(date);
  return `${String(day).padStart(2, '0')} ${MONTHS[month]}`;
}

/** "qua 04 nov 2026". */
export function longDate(date: CivilDate) {
  const { year, month, day } = partsOf(date);
  const weekday = new Date(Date.UTC(year, month, day)).getUTCDay();
  return `${WEEKDAYS[weekday]} ${String(day).padStart(2, '0')} ${MONTHS[month]} ${year}`;
}

/** "hoje", "amanhã", "ontem", "em 5 dias" or "há 2 dias", from `today`. */
export function relativeDay(date: CivilDate, today: CivilDate) {
  const days = daysBetween(today, date);
  if (days === 0) return 'hoje';
  if (days === 1) return 'amanhã';
  if (days === -1) return 'ontem';
  return days > 0 ? `em ${days} dias` : `há ${-days} dias`;
}
