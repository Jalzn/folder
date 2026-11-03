import type { CivilDate, IsoInstant } from '@tinyfold/core/domain';
import { civilDateIn } from '../../lib/dates/civil-date';
import { daysBetween, shortCivilDate } from '../../lib/dates/task-dates';

/**
 * When an item was last edited, beside "Salvo" in its page bar (the prototype's `saveSeg`): "editado hoje",
 * "editado ontem" or "editado em 28 out", by the civil date of `updatedAt` in the owner's time zone.
 */
export function editedPhrase(updatedAt: IsoInstant, today: CivilDate, timeZone: string) {
  const day = civilDateIn(timeZone, new Date(updatedAt));
  const days = daysBetween(day, today);
  if (days === 0) return 'editado hoje';
  if (days === 1) return 'editado ontem';
  return `editado em ${shortCivilDate(day)}`;
}

/** The time of the last save, "14:32", for the save state's "Salvo às 14:32". */
export function savedTime(updatedAt: IsoInstant, timeZone: string) {
  return new Intl.DateTimeFormat('pt-BR', { timeZone, hour: '2-digit', minute: '2-digit' }).format(new Date(updatedAt));
}
