import { createContext, type ReactNode, useMemo, useState } from 'react';
import { useShellContext } from './context';
import type { ShellActions, ShellState, SwitcherPlace } from './types';

type State = Pick<
  ShellState,
  'overlay' | 'switcherAt' | 'palette' | 'shortcutsOpen' | 'newItemOpen' | 'newTaskColumn' | 'moveOpen' | 'labelsOpen'
>;
type Actions = Pick<
  ShellActions,
  | 'setOverlay'
  | 'setSwitcherAt'
  | 'openPalette'
  | 'closePalette'
  | 'setShortcutsOpen'
  | 'setNewItemOpen'
  | 'setMoveOpen'
  | 'setLabelsOpen'
>;
const StateContext = createContext<State | null>(null);
const ActionsContext = createContext<Actions | null>(null);
function useStateValue() {
  return useShellContext(StateContext);
}
function useActions() {
  return useShellContext(ActionsContext);
}
export const overlays = { useState: useStateValue, useActions };
export function OverlaysProvider({ children }: { children: ReactNode }) {
  const [overlay, setOverlayState] = useState({ open: false, search: false });
  const [switcherAt, setSwitcherAt] = useState<SwitcherPlace | null>(null);
  const [palette, setPalette] = useState<string | null>(null);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [newItemOpen, setNewItemOpen] = useState(false);
  const [newTaskColumn, setNewTaskColumn] = useState<string | null>(null);
  const [moveOpen, setMoveOpen] = useState<false | 'folder' | 'project'>(false);
  const [labelsOpen, setLabelsOpen] = useState(false);
  const actions = useMemo<Actions>(
    () => ({
      setOverlay: (open, options = {}) => setOverlayState({ open, search: open && Boolean(options.search) }),
      setSwitcherAt,
      openPalette: (text = '') => setPalette(text),
      closePalette: () => setPalette(null),
      setShortcutsOpen,
      setNewItemOpen: (open, taskColumnId) => {
        setNewItemOpen(open);
        setNewTaskColumn(open ? (taskColumnId ?? null) : null);
      },
      setMoveOpen,
      setLabelsOpen,
    }),
    [],
  );
  const state = useMemo<State>(
    () => ({ overlay, switcherAt, palette, shortcutsOpen, newItemOpen, newTaskColumn, moveOpen, labelsOpen }),
    [overlay, switcherAt, palette, shortcutsOpen, newItemOpen, newTaskColumn, moveOpen, labelsOpen],
  );
  return (
    <ActionsContext.Provider value={actions}>
      <StateContext.Provider value={state}>{children}</StateContext.Provider>
    </ActionsContext.Provider>
  );
}
