import type { CivilDate } from '#core/domain';
/** The owner's civil date: the time zone dates hold in and the day it is there now. */
export interface Calendar {
  timeZone: string;
  /** YYYY-MM-DD in `timeZone`. */
  today: CivilDate;
}
