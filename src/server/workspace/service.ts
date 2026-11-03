import type { z } from 'zod';
import type { Database } from '#core/infra';
import type { TimeZoneSource } from '#workspace/composition';
import { utc } from '#workspace/composition';
import type { WorkspaceOperations } from './operations.js';
import { type Operation, workspaceOperations } from './operations.js';

/** An operation called in-process; inputs whose fields are all optional may be left out. */
type ServiceCall<Op> =
  Op extends Operation<infer Input, infer Output>
    ? object extends z.input<Input>
      ? (input?: z.input<Input>) => Promise<Output>
      : (input: z.input<Input>) => Promise<Output>
    : never;

/**
 * The workspace operations for seed/QA scripts and persistence tests. Each call parses its input
 * first, as the RPC boundary does, and throws before any work when it is invalid. Civil dates hold
 * in UTC unless a time zone is given.
 */
export function createWorkspaceService(
  db: Database,
  clock = () => new Date(),
  timeZone: TimeZoneSource = utc,
  mutationClock = clock,
) {
  const operations = workspaceOperations(db, clock, timeZone, mutationClock);
  return serviceFromOperations(operations);
}

export function serviceFromOperations(operations: WorkspaceOperations) {
  return Object.fromEntries(
    Object.entries(operations).map(([name, operation]: [string, Operation]) => [
      name,
      (input: unknown = {}) => operation.run(operation.input.parse(input)),
    ]),
  ) as { [Name in keyof typeof operations]: ServiceCall<(typeof operations)[Name]> };
}

export type WorkspaceService = ReturnType<typeof createWorkspaceService>;
