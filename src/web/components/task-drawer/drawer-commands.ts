/** What the drawer's content gives its frame: the drawer's ⌘↵, which completes, reopens or creates. */
export interface DrawerCommands {
  primary?: (() => void) | undefined;
}
