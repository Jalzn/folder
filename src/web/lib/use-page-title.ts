import { useEffect } from 'react';

/** The browser tab shows the open item's title: "Visão do produto · Tinyfold". */
export function usePageTitle(title: string) {
  useEffect(() => {
    document.title = `${title || 'Sem título'} · Tinyfold`;
    return () => {
      document.title = 'Tinyfold';
    };
  }, [title]);
}
