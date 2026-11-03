import './origin-markers.css';
import { createExtension } from '@blocknote/core';
import { type EditorState, Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet, type EditorView } from '@tiptap/pm/view';
import { createRoot } from 'react-dom/client';
import { ColumnRing } from '../ui';
import { markerPlaces, type OriginMarker } from './origin-places';

export type { OriginMarker } from './origin-places';

interface MarkersState {
  markers: readonly OriginMarker[];
  decorations: DecorationSet;
}

type MarkersMeta = { markers: readonly OriginMarker[] };

/** The CSS highlight that underlines a hovered marker's excerpt: `::highlight(origin-excerpt)` styles it. */
export const EXCERPT_HIGHLIGHT = 'origin-excerpt';

export const originMarkersKey = new PluginKey<MarkersState>('originMarkers');

/**
 * The marker's button: 18 px, with the task's ring in the accent, which opens the task (visual.md). It is for
 * the pointer and touch only, out of the Tab order (decision 9): the keyboard reaches the document's tasks
 * through "Tarefas · n".
 */
function markerButton(marker: OriginMarker, open: (taskId: string) => void, hover: (taskId: string | null) => void) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'origin-marker';
  button.contentEditable = 'false';
  button.tabIndex = -1;
  button.dataset.task = marker.taskId;
  button.setAttribute('aria-label', `Tarefa originada aqui: ${marker.title}, ${marker.status}. Abrir`);
  button.title = `Originou: ${marker.title} · ${marker.status}`;
  // A press keeps the editor's selection; the click opens the task.
  button.addEventListener('mousedown', (event) => event.preventDefault());
  button.addEventListener('click', () => open(marker.taskId));
  button.addEventListener('mouseenter', () => hover(marker.taskId));
  button.addEventListener('mouseleave', () => hover(null));
  const root = createRoot(button);
  root.render(<ColumnRing index={marker.ring.index} count={marker.ring.count} isDone={marker.ring.done} size={12} />);
  return { button, root };
}

/** The React roots of the markers' rings, by their button, unmounted with the widget. */
type Roots = WeakMap<HTMLElement, ReturnType<typeof createRoot>>;

function decorationsOf(
  state: EditorState,
  markers: readonly OriginMarker[],
  open: (taskId: string) => void,
  hover: (taskId: string | null) => void,
  roots: Roots,
) {
  const decorations: Decoration[] = [];
  for (const [index, place] of markerPlaces(state.doc, markers).entries()) {
    const { marker } = place;
    decorations.push(
      Decoration.widget(
        place.at,
        () => {
          const { button, root } = markerButton(marker, open, hover);
          roots.set(button, root);
          return button;
        },
        {
          side: 1 + index,
          ignoreSelection: true,
          // A changed task draws a new button; the same one keeps its element.
          key: `origin-${marker.taskId}-${marker.status}-${marker.title}-${marker.ring.index}-${marker.ring.done}`,
          destroy: (node) => {
            const root = roots.get(node as HTMLElement);
            roots.delete(node as HTMLElement);
            // After the view's update, never inside a React render that dispatched it.
            if (root) queueMicrotask(() => root.unmount());
          },
        },
      ),
    );
  }
  return DecorationSet.create(state.doc, decorations);
}

/**
 * The underline of a hovered marker's excerpt (review M3): a CSS highlight over the text's range, which leaves
 * the DOM alone. A decoration would redraw the text around the marker, and the marker with it, under the
 * pointer; Chrome then lost the pointer's leaving, and the underline stayed. Browsers without CSS highlights
 * show no underline.
 */
function underline(view: EditorView, markers: readonly OriginMarker[], taskId: string | null) {
  const highlights = typeof CSS !== 'undefined' && 'highlights' in CSS ? CSS.highlights : null;
  if (!highlights || typeof Highlight === 'undefined') return;
  const excerpt = taskId
    ? markerPlaces(view.state.doc, markers, taskId).find((place) => place.marker.taskId === taskId)?.excerpt
    : null;
  if (!excerpt || excerpt.from >= excerpt.to) {
    highlights.delete(EXCERPT_HIGHLIGHT);
    return;
  }
  const start = view.domAtPos(excerpt.from);
  const end = view.domAtPos(excerpt.to);
  const range = view.dom.ownerDocument.createRange();
  range.setStart(start.node, start.offset);
  range.setEnd(end.node, end.offset);
  highlights.set(EXCERPT_HIGHLIGHT, new Highlight(range));
}

/**
 * The origin markers of a document (docs/etapas/11-documento-desenho.md, "Marcador de origem"): a ProseMirror
 * decoration, so the JSON never changes. The document hands it the tasks born there with `setOriginMarkers`;
 * the decorations follow the text as it changes, and hovering a marker underlines its excerpt (`underline`),
 * with no change to the editor's state or DOM.
 */
export function createOriginMarkers(open: (taskId: string) => void) {
  let view: EditorView | null = null;
  const roots: Roots = new WeakMap();
  const hover = (taskId: string | null) => {
    if (view) underline(view, originMarkersKey.getState(view.state)?.markers ?? [], taskId);
  };
  const plugin = new Plugin<MarkersState>({
    key: originMarkersKey,
    state: {
      init: () => ({ markers: [], decorations: DecorationSet.empty }),
      apply(tr, value, _old, state) {
        const meta = tr.getMeta(originMarkersKey) as MarkersMeta | undefined;
        if (!meta && !tr.docChanged) return value;
        const markers = meta ? meta.markers : value.markers;
        return { markers, decorations: decorationsOf(state, markers, open, hover, roots) };
      },
    },
    props: { decorations: (state) => originMarkersKey.getState(state)?.decorations },
    view: (editorView) => {
      view = editorView;
      return {
        destroy: () => {
          hover(null);
          view = null;
        },
      };
    },
  });
  return createExtension({ key: 'originMarkers', prosemirrorPlugins: [plugin] });
}

/** Hands the document's editor the markers to draw, as an edit that leaves no undo step. */
export function setOriginMarkers(view: EditorView | undefined, markers: readonly OriginMarker[]) {
  if (!view) return;
  view.dispatch(view.state.tr.setMeta(originMarkersKey, { markers }).setMeta('addToHistory', false));
}
