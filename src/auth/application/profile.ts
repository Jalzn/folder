import type { Owner } from '@tinyfold/core/application';
import { canonicalTimeZone } from '@tinyfold/core/domain';
import type { AuthDependencies, StoredOwner } from './ports.js';
export function authProfile(deps: AuthDependencies) {
  let read: { stored: string; canonical: string | null; warned: boolean } | undefined;
  /** The stored zone by its canonical name when Intl knows it; otherwise null, with one warning. */
  function storedZone(owner: StoredOwner): string | null {
    const stored = owner.timeZone;
    if (stored === null) return null;
    if (read?.stored !== stored) read = { stored, canonical: canonicalTimeZone(stored) ?? null, warned: false };
    if (read.canonical === null && !read.warned) {
      read.warned = true;
      deps.warn(
        `The owner's stored time zone ${JSON.stringify(stored)} is not a zone name Intl knows; dates use UTC until it is set again.`,
      );
    }
    return read.canonical;
  }
  // An unusable zone reads as none, so the web sends the browser's again on its next load.
  const profile = (owner: StoredOwner): Owner => ({
    name: owner.name,
    installationId: owner.installationId,
    timeZone: storedZone(owner),
  });

  return { profile, storedZone };
}
