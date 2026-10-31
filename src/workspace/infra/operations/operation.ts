import type { z } from 'zod';

/**
 * A use case bound to its context, with the schema of its input. The RPC router and the service
 * expose the same operations: oRPC validates the input before `run`, the service parses it.
 */
export interface Operation<Input extends z.ZodType = z.ZodType, Output = unknown> {
  input: Input;
  run(input: z.output<Input>): Promise<Output>;
}

export const operation = <Input extends z.ZodType, Output>(
  input: Input,
  run: (input: z.output<Input>) => Promise<Output>,
): Operation<Input, Output> => ({ input, run });
