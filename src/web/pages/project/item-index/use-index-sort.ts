import { useCallback, useState } from 'react';
import { useApp } from '../../../shell';
import { type IndexSort, parseIndexSort } from './index-rows';

const sortKey = (installationId: string) => `tinyfold:${installationId}:index-sort`;

/** The Índice's order, the same for every project and kept on this device. */
export function useIndexSort() {
  const key = sortKey(useApp().owner.installationId);
  const [sort, setSort] = useState<IndexSort>(() => {
    try {
      return parseIndexSort(localStorage.getItem(key));
    } catch {
      return parseIndexSort(null);
    }
  });
  const change = useCallback(
    (next: IndexSort) => {
      setSort(next);
      try {
        localStorage.setItem(key, JSON.stringify(next));
      } catch {
        // Kept until the page closes.
      }
    },
    [key],
  );
  return [sort, change] as const;
}
