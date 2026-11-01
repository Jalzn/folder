import { useCallback, useSyncExternalStore } from 'react';
import { useApp } from '../AppProvider';
import {
  type ProjectPrefs,
  parseSidebarPrefs,
  projectPrefs,
  type SidebarPrefs,
  sidebarPrefsKey,
  withProject,
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

/** The collapsed rail and each project's order and open folders, kept on this device and shared by the shell. */
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
    /** A project's order and open folders, or null on its first visit from this device. */
    project: (projectId: string) => projectPrefs(prefs, projectId),
    setProject: (projectId: string, patch: Partial<ProjectPrefs>) => save(withProject(prefs, projectId, patch)),
  };
}
