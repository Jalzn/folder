import type { Database } from '@tinyfold/core/infra';
import type { z } from 'zod';
import { type Operation, workspaceOperations } from './operations/index.js';

/** An operation called in-process; inputs whose fields are all optional may be left out. */
type ServiceCall<Op> =
  Op extends Operation<infer Input, infer Output>
    ? object extends z.input<Input>
      ? (input?: z.input<Input>) => Promise<Output>
      : (input: z.input<Input>) => Promise<Output>
    : never;

/**
 * The workspace operations for seed/QA scripts and persistence tests. Each call parses its input
 * first, as the RPC boundary does, and throws before any work when it is invalid.
 */
export function createWorkspaceService(db: Database, clock = () => new Date()) {
  const operations = workspaceOperations(db, clock);
  return Object.fromEntries(
    Object.entries(operations).map(([name, operation]: [string, Operation]) => [
      name,
      (input: unknown = {}) => operation.run(operation.input.parse(input)),
    ]),
  ) as { [Name in keyof typeof operations]: ServiceCall<(typeof operations)[Name]> };
}

export type WorkspaceService = ReturnType<typeof createWorkspaceService>;
