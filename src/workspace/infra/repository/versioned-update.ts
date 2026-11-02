import { versionConflict } from '../../application/helpers.js';

/** A versioned UPDATE that matched no row lost a race with another device. */
export function expectUpdated(count: bigint): void {
  if (count !== 1n) throw versionConflict();
}
