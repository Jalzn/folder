import { workspaceErrors } from './errors.js';

/** The one answer to a stale version, whether the write sees it before or during its UPDATE. */
export const versionConflict = () => workspaceErrors.versionConflict();

export function assertVersion(actual: number, expected: number): void {
  if (actual !== expected) throw versionConflict();
}
