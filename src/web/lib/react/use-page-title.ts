import { useEffect } from 'react';
import { displayTitle } from '../types';

/** The browser tab shows the open item's title: "Visão do produto · Tinyfold". */
export function usePageTitle(title: string) {
  useEffect(() => {
    document.title = `${displayTitle(title)} · Tinyfold`;
    return () => {
      document.title = 'Tinyfold';
    };
  }, [title]);
}
