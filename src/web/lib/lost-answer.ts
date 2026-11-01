import { errorCode } from './errors';

/**
 * A failure with no answer from the server, as the network dropping or a timeout, which may have been
 * applied: no code of the server's or of the app's (a timeout's DOMException has only a number).
 */
export const isLostAnswer = (error: unknown) => typeof errorCode(error) !== 'string';

/**
 * Sends a write, and once more when its answer was lost on the way: with the same request ID, the server
 * replays what it recorded, as the lists a folder's deletion answers for its undo. A refusal is not repeated.
 */
export async function onceMoreIfLost<T>(send: () => Promise<T>): Promise<T> {
  try {
    return await send();
  } catch (error) {
    if (!isLostAnswer(error)) throw error;
    return send();
  }
}
