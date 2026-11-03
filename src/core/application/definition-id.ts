/** Stable names shared by module, application and project definitions. */
export function assertDefinitionId(id: unknown): asserts id is string {
  if (typeof id !== 'string' || !/^[a-z][a-z0-9-]*$/u.test(id)) throw new Error(`Invalid definition ID: ${String(id)}`);
}
