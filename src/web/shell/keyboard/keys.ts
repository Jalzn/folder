/**
 * The keys of each shortcut, named once (WF-8): the Atalhos dialog, the palette, the menus and the tooltips
 * read them here, so a key changes in one place and the dialog cannot disagree with the menus. `mod` is ⌘ on
 * Apple platforms and Ctrl elsewhere (ui/Kbd.tsx). Who acts on each key is the keyboard model's: the field,
 * then the widget (tree, board, drawer, editor), then the palette, the global listener and the Esc stack.
 */
export const KEYS = {
  palette: ['mod', 'K'],
  toggleSidebar: ['mod', '\\'],
  switcher: ['G', 'P'],
  overview: ['G', 'V'],
  board: ['G', 'Q'],
  trash: ['G', 'L'],
  newItem: ['N'],
  pin: ['P'],
  move: ['M'],
  search: ['/'],
  shortcuts: ['?'],
  save: ['mod', 'S'],
  back: ['mod', '['],
  undo: ['mod', 'Z'],
  createTask: ['mod', 'alt', 'T'],
  toggleDone: ['mod', '↵'],
  close: ['Esc'],
  rename: ['F2'],
  moveUp: ['⌥', '↑'],
  moveDown: ['⌥', '↓'],
  menu: ['⇧', 'F10'],
} as const satisfies Record<string, readonly string[]>;
