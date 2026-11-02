import { errorCode } from '../../lib/errors';
import { displayTitle } from '../../lib/types';

/** "<título> — cópia", the title of a copy that saves a draft beside its item, within the 300 characters. */
export const copyTitle = (title: string) => `${displayTitle(title)} — cópia`.slice(0, 300);

/** Refusals that a retry with the same request would only repeat. */
const FINAL_ERRORS = ['VALIDATION', 'DOMAIN_RULE', 'BAD_REQUEST', 'PAYLOAD_TOO_LARGE'];

/**
 * Whether a copy's refusal is final, so the next attempt starts a new request; `notFound` counts an item that
 * is gone as final too, as the task's copy does.
 */
export function isFinalRefusal(error: unknown, { notFound = false } = {}) {
  const code = errorCode(error) ?? '';
  return FINAL_ERRORS.includes(code) || (notFound && code === 'NOT_FOUND');
}
