import type {
  CanvasOutline,
  OutlineBox,
  OutlineConnection,
  OutlineCountKind,
  OutlineEndpoint,
  OutlineNode,
  OutlineNodeKind,
} from '../../domain/canvas/outline.js';
import { READING_LIMITS } from '../../domain/reading-limits.js';

const nodeNames: Record<OutlineNodeKind, string> = {
  rectangle: 'retângulo',
  diamond: 'losango',
  ellipse: 'elipse',
  text: 'texto',
};
const countNames: [OutlineCountKind, string, string][] = [
  ['rectangle', 'retângulo', 'retângulos'],
  ['diamond', 'losango', 'losangos'],
  ['ellipse', 'elipse', 'elipses'],
  ['arrow', 'seta', 'setas'],
  ['line', 'linha', 'linhas'],
  ['text', 'texto', 'textos'],
  ['label', 'rótulo', 'rótulos'],
  ['freedraw', 'traço livre', 'traços livres'],
  ['frame', 'quadro', 'quadros'],
];

const count = (value: number) => value.toLocaleString('pt-BR');
const quoted = (text: string) => JSON.stringify(text);
const boxText = (box: OutlineBox) => `(${box.x}, ${box.y}, ${box.width}×${box.height})`;
const endpointText = (endpoint: OutlineEndpoint) =>
  'alias' in endpoint ? endpoint.alias : `(${endpoint.point[0]}, ${endpoint.point[1]})`;
const direction = ({ startArrowhead, endArrowhead }: OutlineConnection) =>
  startArrowhead && endArrowhead ? '↔' : startArrowhead ? '←' : endArrowhead ? '→' : '—';

function nodeLine(node: OutlineNode): string {
  const label = node.label === null ? '' : ` ${quoted(node.label)}`;
  const place = node.kind === 'text' ? `(${node.box.x}, ${node.box.y})` : boxText(node.box);
  return `${node.alias} ${nodeNames[node.kind]}${label} ${place}`;
}

function connectionLine(connection: OutlineConnection): string {
  const label = connection.label === null ? '' : ` ${quoted(connection.label)}`;
  const ends = `${endpointText(connection.start)} ${direction(connection)} ${endpointText(connection.end)}`;
  return `${connection.alias} ${connection.kind === 'arrow' ? 'seta' : 'linha'}${label}: ${ends}`;
}

const countList = (counts: Partial<Record<OutlineCountKind, number>>) =>
  countNames.flatMap(([kind, singular, plural]) => {
    const value = counts[kind] ?? 0;
    return value ? [`${count(value)} ${value === 1 ? singular : plural}`] : [];
  });

const omittedNote = (omitted: Partial<Record<OutlineCountKind, number>>) =>
  `… omitidos: ${countList(omitted).join(', ')}`;

/**
 * The outline as indented text, for example `e3 retângulo "Validar versão" (960, 80, 220×90)` and
 * `s1 seta "salva": e1 → e3`. Lines stop before `maxChars`; the last line then counts, by type, the
 * elements left out.
 */
export function formatCanvasOutline(
  outline: CanvasOutline,
  maxChars: number = READING_LIMITS.outline.maxChars,
): string {
  const counts = countList(outline.counts);
  const lines = [`Elementos ativos: ${count(outline.total)}${counts.length ? ` (${counts.join(', ')})` : ''}`];
  if (outline.area)
    lines.push(`Área: ${outline.area.width}×${outline.area.height}; coordenadas a partir do canto superior esquerdo`);

  // Element lines carry their kind, so the elements a cut leaves out are counted by type.
  const entries: { text: string; kind?: OutlineCountKind }[] = [];
  const section = (title: string, items: { text: string; kind: OutlineCountKind }[]) => {
    if (!items.length) return;
    entries.push({ text: title });
    for (const item of items) entries.push({ text: `  ${item.text}`, kind: item.kind });
  };
  const nodeEntry = (node: OutlineNode) => ({ text: nodeLine(node), kind: node.kind });
  for (const frame of outline.frames) {
    const name = frame.name === null ? '' : ` ${quoted(frame.name)}`;
    entries.push({ text: `Quadro ${frame.alias}${name} ${boxText(frame.box)}`, kind: 'frame' });
    for (const child of frame.children) entries.push({ ...nodeEntry(child), text: `  ${nodeLine(child)}` });
  }
  section(outline.frames.length ? 'Fora de quadros' : 'Formas e textos', outline.loose.map(nodeEntry));
  section(
    'Conexões',
    outline.connections.map((connection) => ({ text: connectionLine(connection), kind: connection.kind })),
  );
  const summary = [
    outline.groups.length &&
      `Grupos: ${outline.groups.map((group) => `${group.alias} = ${group.members.join(', ')}`).join('; ')}`,
    outline.freehand && `Traços livres: ${count(outline.freehand.count)}, em ${boxText(outline.freehand.box)}`,
    outline.links.length && `Links: ${outline.links.map((link) => `${link.alias} → ${quoted(link.url)}`).join('; ')}`,
  ];
  for (const text of summary) if (text) entries.push({ text });

  // Reserve room for the closing note, at its longest every kind omitted, so the text stays within the limit.
  const longestNote = omittedNote(Object.fromEntries(countNames.map(([kind]) => [kind, outline.total])));
  let length = lines.join('\n').length + longestNote.length + 1;
  let written = 0;
  for (const entry of entries) {
    if (length + entry.text.length + 1 > maxChars) break;
    if (written === 0) lines.push('');
    lines.push(entry.text);
    length += entry.text.length + 1;
    written += 1;
  }
  const omitted = { ...outline.omitted };
  for (const { kind } of entries.slice(written)) if (kind) omitted[kind] = (omitted[kind] ?? 0) + 1;
  if (countList(omitted).length) lines.push(omittedNote(omitted));
  else if (written < entries.length) lines.push('… lista truncada');
  return lines.join('\n');
}
