import { errorCode } from '../../lib/errors';
import { displayTitle } from '../../lib/types';

/** "<título> — cópia", the title of a copy that saves a draft beside its item, within the 300 characters. */
export const copyTitle = (title: string) => `${displayTitle(title)} — cópia`.slice(0, 300);

/**
 * Refusals that a retry with the same request would only repeat, the target gone included: a copy of a
 * document, a drawing or a task stops on them, and the next attempt starts a new request (decision 7).
 */
const FINAL_ERRORS = ['VALIDATION', 'DOMAIN_RULE', 'BAD_REQUEST', 'PAYLOAD_TOO_LARGE', 'NOT_FOUND'];

/** Whether a copy's refusal is final. */
export const isFinalRefusal = (error: unknown) => FINAL_ERRORS.includes(errorCode(error) ?? '');
