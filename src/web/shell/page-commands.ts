import { useCommandSlot } from '../lib/react/use-command-slot';
import { useStableHandlers } from '../lib/react/use-stable-handlers';
import { type PageCommands, useShellActions } from './shell-ui';

const EMPTY: PageCommands = {};
/** The historical page slot always offers save and the focused column; other actions are conditional. */
export function usePageCommands(commands: PageCommands) {
  const { page } = useShellActions();
  const current = useStableHandlers<PageCommands>({
    ...commands,
    saveNow: () => commands.saveNow?.(),
    newTaskColumn: () => commands.newTaskColumn?.(),
  });
  useCommandSlot(page, current, EMPTY);
}
