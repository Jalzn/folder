export class DomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DomainError';
  }
}

export { type IsoInstant, isIsoInstant, readIsoInstant, toIsoInstant } from './instant.js';
export {
  addDays,
  type CivilDate,
  canonicalTimeZone,
  isCivilDate,
  isTimeZone,
  readCivilDate,
  startOfDayIn,
  todayIn,
} from './time-zone.js';
export { joinsEmoji, visibleText, withoutHidden } from './visible-text.js';
