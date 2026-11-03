import { createContext, type ReactNode, useMemo, useRef, useState } from 'react';
import { useShellContext } from './context';
import type { PageCommands, ShellActions, ShellState } from './types';

type State = Pick<ShellState, 'topBarActions'>;
type Actions = Pick<ShellActions, 'page' | 'setTopBarActions'>;
const StateContext = createContext<State | null>(null);
const ActionsContext = createContext<Actions | null>(null);
function useStateValue() {
  return useShellContext(StateContext);
}
function useActions() {
  return useShellContext(ActionsContext);
}
export const pageUi = { useState: useStateValue, useActions };
export function PageUiProvider({ children }: { children: ReactNode }) {
  const [topBarActions, setTopBarActions] = useState<HTMLElement | null>(null);
  const page = useRef<PageCommands>({});
  const actions = useMemo<Actions>(() => ({ page, setTopBarActions }), []);
  const state = useMemo<State>(() => ({ topBarActions }), [topBarActions]);
  return (
    <ActionsContext.Provider value={actions}>
      <StateContext.Provider value={state}>{children}</StateContext.Provider>
    </ActionsContext.Provider>
  );
}
