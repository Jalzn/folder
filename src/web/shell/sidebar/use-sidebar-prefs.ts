import { useCallback, useSyncExternalStore } from 'react';
import { useApp } from '../AppProvider';
import {
  parseSidebarPrefs,
  type SectionKind,
  type SectionPrefs,
  type SidebarPrefs,
  sectionPrefs,
  sidebarPrefsKey,
  withSection,
} from './sidebar-prefs';

const stores = new Map<string, { prefs: SidebarPrefs; listeners: Set<() => void> }>();

function storeFor(installationId: string) {
  let store = stores.get(installationId);
  if (!store) {
    let raw: string | null = null;
    try {
      raw = localStorage.getItem(sidebarPrefsKey(installationId));
    } catch {
      // Blocked storage: the defaults for this visit.
    }
    store = { prefs: parseSidebarPrefs(raw), listeners: new Set() };
    stores.set(installationId, store);
  }
  return store;
}

/** The collapsed rail and each section's state and order, kept on this device and shared by the shell. */
export function useSidebarPrefs() {
  const installationId = useApp().owner.installationId;
  const store = storeFor(installationId);
  const subscribe = useCallback(
    (listener: () => void) => {
      store.listeners.add(listener);
      return () => store.listeners.delete(listener);
    },
    [store],
  );
  const prefs = useSyncExternalStore(subscribe, () => store.prefs);
  const save = useCallback(
    (next: SidebarPrefs) => {
      store.prefs = next;
      try {
        localStorage.setItem(sidebarPrefsKey(installationId), JSON.stringify(next));
      } catch {
        // Kept until the page closes.
      }
      for (const listener of store.listeners) listener();
    },
    [store, installationId],
  );
  return {
    collapsed: prefs.collapsed,
    setCollapsed: (collapsed: boolean) => save({ ...prefs, collapsed }),
    section: (projectId: string, kind: SectionKind) => sectionPrefs(prefs, projectId, kind),
    setSection: (projectId: string, kind: SectionKind, patch: Partial<SectionPrefs>) =>
      save(withSection(prefs, projectId, kind, patch)),
  };
}
