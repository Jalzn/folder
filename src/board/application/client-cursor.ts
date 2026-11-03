import { AppError } from '@tinyfold/core/application';
import { DomainError } from '@tinyfold/core/domain';

/** A cursor the client sent back, read by `read`; one it did not get from us is a VALIDATION error. */
export function readClientCursor<T>(read: () => T): T {
  try {
    return read();
  } catch (error) {
    if (error instanceof DomainError) throw new AppError('VALIDATION', error.message);
    throw error;
  }
}
