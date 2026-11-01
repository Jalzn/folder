export class DomainError extends Error {
  constructor(
    message: string,
    readonly conflict = false,
  ) {
    super(message);
    this.name = 'DomainError';
  }
}
export { addDays, isCivilDate, isTimeZone, startOfDayIn, todayIn } from './time-zone.js';
