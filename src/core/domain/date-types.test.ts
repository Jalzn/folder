import { expect, expectTypeOf, it } from 'vitest';
import { type IsoInstant, isIsoInstant, readIsoInstant, toIsoInstant } from './instant.js';
import { addDays, type CivilDate, readCivilDate, startOfDayIn, todayIn } from './time-zone.js';

it('keeps civil dates and instants distinct through calendar and clock operations', () => {
  const instant = toIsoInstant(new Date('2026-11-03T01:00:00.000Z'));
  const today = todayIn('America/Sao_Paulo', new Date(instant));
  expectTypeOf(instant).toEqualTypeOf<IsoInstant>();
  expectTypeOf(today).toEqualTypeOf<CivilDate>();
  expectTypeOf<CivilDate>().not.toExtend<IsoInstant>();
  expectTypeOf<IsoInstant>().not.toExtend<CivilDate>();
  expectTypeOf<string>().not.toExtend<CivilDate>();
  expectTypeOf<string>().not.toExtend<IsoInstant>();
  expectTypeOf(addDays(today, 1)).toEqualTypeOf<CivilDate>();
  expectTypeOf(startOfDayIn(today, 'America/Sao_Paulo')).toEqualTypeOf<IsoInstant>();
  expect(JSON.stringify({ today, instant })).toBe('{"today":"2026-11-02","instant":"2026-11-03T01:00:00.000Z"}');
});

it('constructs fixture and boundary values only in their respective formats', () => {
  expect(readCivilDate('2028-02-29')).toBe('2028-02-29');
  expect(readIsoInstant('2026-11-03T01:00:00.000Z')).toBe('2026-11-03T01:00:00.000Z');
  for (const value of ['2026-02-29', '2026-11-03T01:00:00.000Z', ''])
    expect(() => readCivilDate(value)).toThrow(RangeError);
  for (const value of ['2026-11-03', '2026-02-30T00:00:00.000Z', '2026-11-03T01:00:00Z', '']) {
    expect(isIsoInstant(value)).toBe(false);
    expect(() => readIsoInstant(value)).toThrow(RangeError);
  }
  expect(() => toIsoInstant(new Date('invalid'))).toThrow(RangeError);
});
