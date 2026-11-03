import { authedProcedure, type Database, fileUpload } from '@tinyfold/core/infra';
import { z } from 'zod';
import { SaveCanvasPreviewInput } from '../application/schemas/canvases.js';
import type { TimeZoneSource } from './calendar.js';
import type { WorkspaceOperations } from './operations/index.js';
import { type Operation, workspaceOperations } from './operations/index.js';

/** An operation behind a session. oRPC validates the input against the same schema before it runs. */
const procedure = <Input extends z.ZodType, Output>(operation: Operation<Input, Output>) =>
  authedProcedure.input(operation.input).handler(({ input }) => operation.run(input as z.output<Input>));

type ProcedureOf<Op> =
  Op extends Operation<infer Input, infer Output> ? ReturnType<typeof procedure<Input, Output>> : never;

/** The router, with the owner's time zone, which the server reads from auth, for civil dates. */
export function createWorkspaceRouter(
  db: Database,
  { timeZone, clock = () => new Date() }: { timeZone?: TimeZoneSource; clock?: () => Date } = {},
) {
  return routerFromOperations(workspaceOperations(db, clock, timeZone));
}
export function routerFromOperations(operations: WorkspaceOperations) {
  const procedures = Object.fromEntries(
    Object.entries(operations).map(([name, operation]: [string, Operation]) => [name, procedure(operation)]),
  ) as unknown as { [Name in keyof typeof operations]: ProcedureOf<(typeof operations)[Name]> };
  return {
    ...procedures,
    // The browser sends the PNG as a multipart File, within the /rpc body limit.
    saveCanvasPreview: authedProcedure
      .input(SaveCanvasPreviewInput.extend({ png: z.file() }))
      .handler(async ({ input }) => operations.saveCanvasPreview.run({ ...input, png: await fileUpload(input.png) })),
  };
}
