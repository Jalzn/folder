import { useEffect, useRef } from 'react';
import { type PageCommands, useShellUi } from './shell-ui';

/** A page offers ⌘S (and, later, its palette actions) while it is mounted. */
export function usePageCommands(commands: PageCommands) {
  const { page } = useShellUi();
  const latest = useRef(commands);
  latest.current = commands;
  useEffect(() => {
    const current: PageCommands = { saveNow: () => latest.current.saveNow?.() };
    page.current = current;
    return () => {
      if (page.current === current) page.current = {};
    };
  }, [page]);
}
