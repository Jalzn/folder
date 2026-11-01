import { useState } from 'react';
import { useApp } from '../../../shell';
import { type IndexSort, type IndexView, parseIndexView } from './index-rows';

// The key of stage 08's order, which now keeps "Agrupar por pasta" beside it.
const viewKey = (installationId: string) => `tinyfold:${installationId}:index-sort`;

/** The Índice's order and "Agrupar por pasta", the same for every project and kept on this device. */
export function useIndexView() {
  const key = viewKey(useApp().owner.installationId);
  const [view, setView] = useState<IndexView>(() => {
    try {
      return parseIndexView(localStorage.getItem(key));
    } catch {
      return parseIndexView(null);
    }
  });
  function change(patch: Partial<IndexView>) {
    const next = { ...view, ...patch };
    setView(next);
    try {
      localStorage.setItem(key, JSON.stringify({ ...next.sort, grouped: next.grouped }));
    } catch {
      // Kept until the page closes.
    }
  }
  return {
    ...view,
    setSort: (sort: IndexSort) => change({ sort }),
    setGrouped: (grouped: boolean) => change({ grouped }),
  };
}
