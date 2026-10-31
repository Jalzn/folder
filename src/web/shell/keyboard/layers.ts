/**
 * The Esc rule (docs/etapas/08-fundacao.md, "Teclado e Esc"): each layer the app opens joins a stack, and Esc
 * closes only the most recent one. React Aria's popovers, menus and dialogs close themselves and stop the
 * event; this stack holds the shell's own layers, such as the sidebar search with text.
 */
export interface Layer {
  id: string;
  close: () => void;
}

export function createLayerStack() {
  let layers: Layer[] = [];
  return {
    /** Adds a layer on top; the returned function removes it, wherever it is in the stack. */
    open(layer: Layer) {
      layers = [...layers.filter((item) => item.id !== layer.id), layer];
      return () => {
        layers = layers.filter((item) => item !== layer);
      };
    },
    top: () => layers.at(-1) ?? null,
    get size() {
      return layers.length;
    },
  };
}

export type LayerStack = ReturnType<typeof createLayerStack>;

export interface EscapeContext {
  /** A component already handled this Esc, as React Aria's overlays do. */
  handled: boolean;
  /** The event comes from a text field or the document editor. */
  editable: boolean;
  /** The drawing editor keeps its own Esc. */
  inDrawing: boolean;
}

/** What one Esc does. It never navigates, deletes, confirms or collapses the fixed sidebar. */
export type EscapeAction = { kind: 'none' } | { kind: 'leave-field' } | { kind: 'close'; layer: Layer };

export function escapeAction(stack: LayerStack, context: EscapeContext): EscapeAction {
  if (context.handled || context.inDrawing) return { kind: 'none' };
  if (context.editable) return { kind: 'leave-field' };
  const layer = stack.top();
  return layer ? { kind: 'close', layer } : { kind: 'none' };
}
