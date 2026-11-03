import { type Expression, type RawBuilder, sql } from 'kysely';

type KeysetPart = {
  expression: Expression<unknown>;
  value: string | number;
  direction: 'asc' | 'desc';
};

/** Strictly after a non-null sort key, in the same order/directions as ORDER BY. Values stay bound. */
export function afterKeyset(parts: readonly [KeysetPart, ...KeysetPart[]]): RawBuilder<boolean> {
  let tail: RawBuilder<boolean> | undefined;
  for (const { expression, value, direction } of [...parts].reverse()) {
    const beyond = direction === 'asc' ? sql`${expression} > ${value}` : sql`${expression} < ${value}`;
    tail = tail ? sql<boolean>`(${beyond} or (${expression} = ${value} and ${tail}))` : sql<boolean>`(${beyond})`;
  }
  // A key always has at least one part; the tuple enforces that at each caller.
  return tail as RawBuilder<boolean>;
}
