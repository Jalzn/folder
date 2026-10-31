import { useEffect, useRef } from 'react';
import { type PageCommands, useShellUi } from './shell-ui';

/** A page offers ⌘S and its palette actions while it is mounted; the shell reads the latest ones. */
export function usePageCommands(commands: PageCommands) {
  const { page } = useShellUi();
  const latest = useRef(commands);
  latest.current = commands;
  useEffect(() => {
    const current: PageCommands = {
      saveNow: () => latest.current.saveNow?.(),
      get files() {
        return latest.current.files;
      },
      get trash() {
        return latest.current.trash;
      },
    };
    page.current = current;
    return () => {
      if (page.current === current) page.current = {};
    };
  }, [page]);
}
