/** Keep each cursor parser's own error semantics. */
export const optionalCursor = <T>(cursor: string | undefined, read: (value: string) => T): T | undefined =>
  cursor === undefined ? undefined : read(cursor);
