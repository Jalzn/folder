import { createContext, type ReactNode, useMemo, useRef, useState } from 'react';
import { useShellContext } from './context';
import type { CreatedFolder, FolderDraft, FolderReveal, ShellActions, ShellState } from './types';

type State = Pick<ShellState, 'searchRequest' | 'folderDraft' | 'folderReveal'>;
type Actions = Pick<ShellActions, 'requestSearch' | 'startFolder' | 'endFolder' | 'revealFolder'>;
const StateContext = createContext<State | null>(null);
const ActionsContext = createContext<Actions | null>(null);
function useStateValue() {
  return useShellContext(StateContext);
}
function useActions() {
  return useShellContext(ActionsContext);
}
export const sidebarRequests = { useState: useStateValue, useActions };
export function SidebarRequestsProvider({ children }: { children: ReactNode }) {
  const [searchRequest, setSearchRequest] = useState(0);
  const [folderDraft, setFolderDraft] = useState<FolderDraft | null>(null);
  const [folderReveal, revealFolder] = useState<FolderReveal | null>(null);
  const draftCreated = useRef<((folder: CreatedFolder) => void) | undefined>(undefined);
  const actions = useMemo<Actions>(
    () => ({
      requestSearch: () => setSearchRequest((count) => count + 1),
      startFolder: ({ onCreated, ...draft }) => {
        draftCreated.current = onCreated;
        setFolderDraft(draft);
      },
      endFolder: (created) => {
        const then = draftCreated.current;
        draftCreated.current = undefined;
        setFolderDraft(null);
        if (!created || !then) return false;
        then(created);
        return true;
      },
      revealFolder,
    }),
    [],
  );
  const state = useMemo<State>(
    () => ({ searchRequest, folderDraft, folderReveal }),
    [searchRequest, folderDraft, folderReveal],
  );
  return (
    <ActionsContext.Provider value={actions}>
      <StateContext.Provider value={state}>{children}</StateContext.Provider>
    </ActionsContext.Provider>
  );
}
