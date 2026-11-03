declare const instantBrand: unique symbol;

/** A canonical UTC ISO instant, including milliseconds; distinct from a civil calendar date. */
export type IsoInstant = string & { readonly [instantBrand]: true };

/** Construct at the clock boundary; the serialized representation remains Date.toISOString(). */
export const toIsoInstant = (date: Date): IsoInstant => date.toISOString() as IsoInstant;

/** Whether a stored or fixture value is in the canonical form written by the application. */
export function isIsoInstant(value: string): value is IsoInstant {
  const date = new Date(value);
  return Number.isFinite(date.getTime()) && date.toISOString() === value;
}

export function readIsoInstant(value: string): IsoInstant {
  if (!isIsoInstant(value)) throw new RangeError(`Not an ISO instant: ${value}`);
  return value;
}
