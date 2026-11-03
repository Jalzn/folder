import type { CivilDate } from '@tinyfold/core/domain';
import { useEffect, useState } from 'react';

/** This device's time zone, which the owner's replaces once the server sends it with the board. */
export const deviceTimeZone = () => Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';

/** The civil date, YYYY-MM-DD, of an instant in a time zone. */
export function civilDateIn(timeZone: string, now: Date): CivilDate {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((each) => each.type === type)?.value;
  return `${part('year')}-${part('month')}-${part('day')}` as CivilDate;
}

/** Today in a time zone, kept current: it turns over at midnight and when the tab comes back. */
export function useToday(timeZone: string = deviceTimeZone()) {
  const [today, setToday] = useState(() => civilDateIn(timeZone, new Date()));
  useEffect(() => {
    const update = () => setToday(civilDateIn(timeZone, new Date()));
    update();
    const timer = window.setInterval(update, 60_000);
    document.addEventListener('visibilitychange', update);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', update);
    };
  }, [timeZone]);
  return today;
}
