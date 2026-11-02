/**
 * The session's events on the page, which AuthGate listens to: the session ended mid-work, which only the RPC
 * link tells (any 401, lib/api.ts), or the person signed out (signOut, lib/session.ts).
 */
const EXPIRED = 'tinyfold:session-expired';
const SIGNED_OUT = 'tinyfold:logout';

export const sessionExpired = (target: EventTarget = window) => void target.dispatchEvent(new Event(EXPIRED));
export const signedOut = (target: EventTarget = window) => void target.dispatchEvent(new Event(SIGNED_OUT));

/** Listens to both events; returns the removal. */
export function onSessionEvents(
  handlers: { expired: () => void; signedOut: () => void },
  target: EventTarget = window,
) {
  target.addEventListener(EXPIRED, handlers.expired);
  target.addEventListener(SIGNED_OUT, handlers.signedOut);
  return () => {
    target.removeEventListener(EXPIRED, handlers.expired);
    target.removeEventListener(SIGNED_OUT, handlers.signedOut);
  };
}
