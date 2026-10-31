import { type NavState, navStorageKey, parseNavState } from './last-location';

/** Reads this device's navigation state; blocked or broken storage reads as empty. */
export function loadNavState(installationId: string): NavState {
  try {
    return parseNavState(localStorage.getItem(navStorageKey(installationId)));
  } catch {
    return parseNavState(null);
  }
}

/** Keeps the state when storage allows; the app works the same without it. */
export function saveNavState(installationId: string, state: NavState) {
  try {
    localStorage.setItem(navStorageKey(installationId), JSON.stringify(state));
  } catch {
    // Storage blocked or full: the next visit starts at the first project.
  }
}
