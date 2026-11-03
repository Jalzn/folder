import type { AuthContext } from './ports.js';

/** Civil dates use UTC until the owner has a usable zone. */
export const DEFAULT_TIME_ZONE = 'UTC';

export async function timeZone(deps: AuthContext) {
  const owner = await deps.store.owner();
  return (owner && deps.storedZone(owner)) ?? DEFAULT_TIME_ZONE;
}
