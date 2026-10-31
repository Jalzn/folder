import type { CanvasElement, CanvasScene } from './canvas.js';
import { READING_LIMITS } from './reading-limits.js';

/**
 * A token-light description of a drawing for agents: what is drawn, where, and what connects to
 * what. Short aliases replace Excalidraw IDs; coordinates are integers relative to the occupied area.
 */
export interface CanvasOutline {
  /** Every active element, including those omitted from the lists below. */
  total: number;
  counts: Partial<Record<OutlineCountKind, number>>;
  area: { width: number; height: number } | null;
  frames: OutlineFrame[];
  /** Shapes and texts outside any frame. */
  loose: OutlineNode[];
  connections: OutlineConnection[];
  groups: { alias: string; members: string[] }[];
  freehand: { count: number; box: OutlineBox } | null;
  links: { alias: string; url: string }[];
  /** Frames, shapes, texts and connections left out by the element limit, by type. */
  omitted: Partial<Record<OutlineCountKind, number>>;
}

export type OutlineNodeKind = 'rectangle' | 'diamond' | 'ellipse' | 'text';
export type OutlineCountKind = OutlineNodeKind | 'frame' | 'arrow' | 'line' | 'label' | 'freedraw';
export interface OutlineBox {
  x: number;
  y: number;
  width: number;
  height: number;
}
export interface OutlineNode {
  alias: string;
  kind: OutlineNodeKind;
  label: string | null;
  box: OutlineBox;
}
export interface OutlineFrame {
  alias: string;
  name: string | null;
  box: OutlineBox;
  children: OutlineNode[];
}
export type OutlineEndpoint = { alias: string } | { point: [number, number] };
export interface OutlineConnection {
  alias: string;
  kind: 'arrow' | 'line';
  label: string | null;
  start: OutlineEndpoint;
  end: OutlineEndpoint;
  startArrowhead: boolean;
  endArrowhead: boolean;
}

const emptyOutline: CanvasOutline = {
  total: 0,
  counts: {},
  area: null,
  frames: [],
  loose: [],
  connections: [],
  groups: [],
  freehand: null,
  links: [],
  omitted: {},
};

export function outlineCanvasScene(
  scene: CanvasScene,
  limits: { maxElements: number; maxTextChars: number } = READING_LIMITS.outline,
): CanvasOutline {
  const active = scene.elements.filter((element) => !element.isDeleted);
  if (!active.length) return emptyOutline;
  const view = sceneView(active, limits.maxTextChars);
  const listed = chooseListed(view, limits.maxElements);
  const isListed = (element: CanvasElement) => listed.has(element.id);
  const frames = view.ordered
    .filter((element) => element.type === 'frame' && isListed(element))
    .map((frame) => ({
      alias: view.alias(frame),
      name: view.frameName(frame),
      box: view.box(frame),
      children: view.ordered
        .filter((element) => view.isNode(element) && isListed(element) && view.frameOf(element) === frame.id)
        .map(view.node),
    }));
  // A child whose frame was left out is listed with the elements outside frames.
  const loose = view.ordered.filter((element) => {
    const frame = view.frameOf(element);
    return view.isNode(element) && isListed(element) && (!frame || !listed.has(frame));
  });
  const omitted: CanvasOutline['omitted'] = {};
  for (const element of view.ordered)
    if ((element.type === 'frame' || view.isNode(element) || view.isConnection(element)) && !isListed(element))
      omitted[element.type as OutlineCountKind] = (omitted[element.type as OutlineCountKind] ?? 0) + 1;
  const strokes = view.ordered.filter((element) => element.type === 'freedraw');
  return {
    total: active.length,
    counts: view.counts,
    area: view.area,
    frames,
    loose: loose.map(view.node),
    connections: view.ordered.filter((element) => view.isConnection(element) && isListed(element)).map(view.connection),
    groups: view.groups(listed),
    freehand: strokes.length ? { count: strokes.length, box: view.box(...strokes) } : null,
    links: view.ordered.flatMap((element) => {
      const url = typeof element.link === 'string' ? element.link : '';
      return url && isListed(element) ? [{ alias: view.alias(element), url: view.cut(url) }] : [];
    }),
    omitted,
  };
}

/**
 * The frames, shapes, texts and connections to list, at most `limit`. Shapes go in reading order,
 * each followed by the connections it completes, so a large drawing keeps a readable part of its
 * graph instead of shapes only. Connections bound to nothing come last.
 */
function chooseListed(view: SceneView, limit: number): Set<string> {
  const listed = new Set<string>();
  const waiting = new Map<string, CanvasElement[]>();
  const unbound: CanvasElement[] = [];
  for (const connection of view.ordered.filter(view.isConnection)) {
    const ends = view.boundEnds(connection);
    if (!ends.length) unbound.push(connection);
    for (const end of ends) {
      const connections = waiting.get(end);
      if (connections) connections.push(connection);
      else waiting.set(end, [connection]);
    }
  }
  const add = (element: CanvasElement) => {
    if (listed.size >= limit || listed.has(element.id)) return;
    listed.add(element.id);
  };
  for (const element of view.ordered) {
    if (element.type !== 'frame' && !view.isNode(element)) continue;
    add(element);
    for (const connection of waiting.get(element.id) ?? [])
      if (view.boundEnds(connection).every((end) => listed.has(end))) add(connection);
  }
  for (const connection of unbound) add(connection);
  return listed;
}

type SceneView = ReturnType<typeof sceneView>;

interface Extent {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

const linearTypes = new Set(['line', 'arrow', 'freedraw']);
const nodeTypes = new Set(['rectangle', 'diamond', 'ellipse', 'text']);
/** q for frames, e for shapes, t for free text and s for arrows and lines. Labels and strokes get none. */
const aliasPrefixes: Partial<Record<OutlineCountKind, string>> = {
  frame: 'q',
  rectangle: 'e',
  diamond: 'e',
  ellipse: 'e',
  text: 't',
  arrow: 's',
  line: 's',
};

const reference = (value: unknown) => (typeof value === 'string' ? value : undefined);
const bindingTarget = (binding: unknown) =>
  binding !== null && typeof binding === 'object'
    ? reference((binding as { elementId?: unknown }).elementId)
    : undefined;
const textOf = (element: CanvasElement) =>
  typeof element.originalText === 'string' ? element.originalText : String(element.text ?? '');

function absolutePoints(element: CanvasElement): [number, number][] {
  if (!Array.isArray(element.points)) return [];
  const x = element.x as number;
  const y = element.y as number;
  return (element.points as number[][]).map(([px = 0, py = 0]) => [x + px, y + py]);
}

function extentOf(element: CanvasElement): Extent {
  const points = linearTypes.has(element.type) ? absolutePoints(element) : [];
  if (points.length) {
    const xs = points.map(([x]) => x);
    const ys = points.map(([, y]) => y);
    return { left: Math.min(...xs), top: Math.min(...ys), right: Math.max(...xs), bottom: Math.max(...ys) };
  }
  const left = element.x as number;
  const top = element.y as number;
  return { left, top, right: left + (element.width as number), bottom: top + (element.height as number) };
}

/** Lookups shared by the outline lists: labels, reading order, aliases and relative geometry. */
function sceneView(active: CanvasElement[], maxTextLength: number) {
  const cut = (text: string) => (text.length > maxTextLength ? `${text.slice(0, maxTextLength)}…` : text);
  const byId = new Map(active.map((element) => [element.id, element]));
  const labels = new Map<string, string>();
  for (const element of active) {
    const container = reference(element.containerId);
    if (element.type === 'text' && container && byId.has(container)) labels.set(container, cut(textOf(element)));
  }
  const isLabel = (element: CanvasElement) => element.type === 'text' && byId.has(reference(element.containerId) ?? '');

  const extents = new Map(active.map((element) => [element.id, extentOf(element)]));
  const all = [...extents.values()];
  const originX = Math.min(...all.map((extent) => extent.left));
  const originY = Math.min(...all.map((extent) => extent.top));
  const relative = (x: number, y: number): [number, number] => [Math.round(x - originX), Math.round(y - originY)];

  // Reading order: top to bottom, then left to right; the ID keeps ties stable.
  const ordered = [...active].sort((a, b) => {
    const first = extents.get(a.id) as Extent;
    const second = extents.get(b.id) as Extent;
    return first.top - second.top || first.left - second.left || (a.id < b.id ? -1 : 1);
  });
  const aliases = new Map<string, string>();
  const counts: CanvasOutline['counts'] = {};
  const perPrefix = new Map<string, number>();
  for (const element of ordered) {
    const kind = isLabel(element) ? 'label' : (element.type as OutlineCountKind);
    counts[kind] = (counts[kind] ?? 0) + 1;
    const prefix = aliasPrefixes[kind];
    if (!prefix) continue;
    perPrefix.set(prefix, (perPrefix.get(prefix) ?? 0) + 1);
    aliases.set(element.id, `${prefix}${perPrefix.get(prefix)}`);
  }

  const alias = (element: CanvasElement) => aliases.get(element.id) ?? '';
  const box = (...elements: CanvasElement[]): OutlineBox => {
    const covered = elements.map((element) => extents.get(element.id) as Extent);
    const left = Math.min(...covered.map((extent) => extent.left));
    const top = Math.min(...covered.map((extent) => extent.top));
    const [x, y] = relative(left, top);
    const width = Math.round(Math.max(...covered.map((extent) => extent.right)) - left);
    const height = Math.round(Math.max(...covered.map((extent) => extent.bottom)) - top);
    return { x, y, width, height };
  };
  const endpoint = (target: string | undefined, point: [number, number] | undefined): OutlineEndpoint => {
    const targetAlias = target && aliases.get(target);
    return targetAlias ? { alias: targetAlias } : { point: point ? relative(...point) : [0, 0] };
  };

  return {
    ordered,
    counts,
    cut,
    alias,
    box,
    area: {
      width: Math.round(Math.max(...all.map((extent) => extent.right)) - originX),
      height: Math.round(Math.max(...all.map((extent) => extent.bottom)) - originY),
    },
    isConnection: (element: CanvasElement) => element.type === 'arrow' || element.type === 'line',
    /** The listed elements a connection is bound to, by ID. */
    boundEnds: (element: CanvasElement) =>
      [bindingTarget(element.startBinding), bindingTarget(element.endBinding)].filter(
        (id): id is string => id !== undefined && aliases.has(id),
      ),
    isNode: (element: CanvasElement) => nodeTypes.has(element.type) && !isLabel(element),
    frameOf: (element: CanvasElement) => {
      const frameId = reference(element.frameId);
      return frameId && byId.get(frameId)?.type === 'frame' ? frameId : undefined;
    },
    frameName: (frame: CanvasElement) => (typeof frame.name === 'string' && frame.name ? cut(frame.name) : null),
    node: (element: CanvasElement): OutlineNode => ({
      alias: alias(element),
      kind: element.type as OutlineNodeKind,
      label: element.type === 'text' ? cut(textOf(element)) : (labels.get(element.id) ?? null),
      box: box(element),
    }),
    connection: (element: CanvasElement): OutlineConnection => {
      const points = absolutePoints(element);
      return {
        alias: alias(element),
        kind: element.type as 'arrow' | 'line',
        label: labels.get(element.id) ?? null,
        start: endpoint(bindingTarget(element.startBinding), points[0]),
        end: endpoint(bindingTarget(element.endBinding), points.at(-1)),
        startArrowhead: typeof element.startArrowhead === 'string',
        endArrowhead: typeof element.endArrowhead === 'string',
      };
    },
    /** Groups in order of first appearance, with their listed members, nested groups included. */
    groups: (listed: ReadonlySet<string>) => {
      const members = new Map<string, string[]>();
      for (const element of ordered) {
        const elementAlias = aliases.get(element.id);
        if (!elementAlias || !listed.has(element.id) || !Array.isArray(element.groupIds)) continue;
        for (const group of element.groupIds)
          if (typeof group === 'string') members.set(group, [...(members.get(group) ?? []), elementAlias]);
      }
      return [...members.values()].map((list, index) => ({ alias: `g${index + 1}`, members: list }));
    },
  };
}
