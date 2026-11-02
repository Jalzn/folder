export class DomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DomainError';
  }
}
export { addDays, canonicalTimeZone, isCivilDate, isTimeZone, startOfDayIn, todayIn } from './time-zone.js';
export { joinsEmoji, visibleText, withoutHidden } from './visible-text.js';
