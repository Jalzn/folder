export function firstUnused<T>(palette: readonly [T, ...T[]], usedValues: Iterable<T>): T {
  const used = new Set(usedValues);
  return palette.find((value) => !used.has(value)) ?? palette[0];
}
