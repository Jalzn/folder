/** The row that holds an element of the tree. */
export const rowOf = (target: EventTarget | null) =>
  target instanceof Element ? target.closest<HTMLElement>('[role="row"]') : null;

/** A row of the tree by its key, as React Aria draws it now: the data may change and redraw it. */
export const rowIn = (tree: HTMLElement | null, key: string | null) =>
  tree && key ? tree.querySelector<HTMLElement>(`[role="row"][data-key="${CSS.escape(key)}"]`) : null;
