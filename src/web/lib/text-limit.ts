import { Refusal } from './errors';

/** The limit of a text the editor saves, a document's content or a task's description (decision 8): 1 MiB. */
export const MAX_TEXT_BYTES = 1_048_576;

/** Refuses, before sending, a text over the limit, with the words the person reads. */
export function refuseOverLimit(content: unknown, message: string) {
  if (new TextEncoder().encode(JSON.stringify(content)).length > MAX_TEXT_BYTES) throw new Refusal(message);
}
