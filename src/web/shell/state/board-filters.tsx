import { createContext, type ReactNode, useMemo, useState } from 'react';
import { useShellContext } from './context';
import type { ShellActions, ShellState } from './types';

type State = Pick<ShellState, 'labelFilters'>;
type Actions = Pick<ShellActions, 'setLabelFilter'>;
const StateContext = createContext<State | null>(null);
const ActionsContext = createContext<Actions | null>(null);
function useStateValue() {
  return useShellContext(StateContext);
}
function useActions() {
  return useShellContext(ActionsContext);
}
export const boardFilters = { useState: useStateValue, useActions };
export function BoardFiltersProvider({ children }: { children: ReactNode }) {
  const [labelFilters, setLabelFilters] = useState<Readonly<Record<string, readonly string[]>>>({});
  const actions = useMemo<Actions>(
    () => ({
      setLabelFilter: (projectId, labelIds) => setLabelFilters((all) => ({ ...all, [projectId]: [...labelIds] })),
    }),
    [],
  );
  const state = useMemo<State>(() => ({ labelFilters }), [labelFilters]);
  return (
    <ActionsContext.Provider value={actions}>
      <StateContext.Provider value={state}>{children}</StateContext.Provider>
    </ActionsContext.Provider>
  );
}
