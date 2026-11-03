export class DomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DomainError';
  }
}

export * from './collections/names.js';
export * from './collections/order.js';
export * from './collections/palette.js';
export * from './collections/search-text.js';
export { assertContentJson, boundedLimit, object, validColor } from './content-guards.js';
export { civilWindowStart, isPastDue } from './date-window.js';
export { textFingerprint } from './fingerprint.js';
export { type IsoInstant, isIsoInstant, readIsoInstant, toIsoInstant } from './instant.js';
export type { JsonValue } from './json.js';
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
export { collapseWhitespace } from './whitespace.js';
