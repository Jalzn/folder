import type { ReactNode } from 'react';
import { useToday } from '../lib/dates/civil-date';
import type { Owner } from './LoginScreen';
import { NewItemsProvider, type NewItemsValue, useNewItems } from './new-items';
import { OwnerProvider, type OwnerValue, useOwner } from './owner';
import { ProjectDialogHost, type ProjectDialogValue, useProjectDialog } from './project/project-dialog-host';

/**
 * What every screen can ask of the app (WF-4): who is signed in (owner.tsx), creating items (new-items.tsx)
 * and the project dialog (project/project-dialog-host.tsx). A facade over the three, for the screens that use
 * more than one; a screen that needs one part can use its own hook.
 */
export function useApp(): OwnerValue & NewItemsValue & ProjectDialogValue {
  return { ...useOwner(), ...useNewItems(), ...useProjectDialog() };
}

/** Today in the owner's time zone, kept current at midnight and when the tab comes back. */
export const useOwnerToday = () => useToday(useOwner().timeZone);

/**
 * The app's three parts, drawn as before: the screens, the field that holds the keys for a new document, then
 * the project dialog.
 */
export function AppProvider({ owner, children }: { owner: Owner; children: ReactNode }) {
  return (
    <OwnerProvider owner={owner}>
      <ProjectDialogHost>
        <NewItemsProvider>{children}</NewItemsProvider>
      </ProjectDialogHost>
    </OwnerProvider>
  );
}
