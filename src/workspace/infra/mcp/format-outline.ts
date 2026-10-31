import type {
  CanvasOutline,
  OutlineBox,
  OutlineConnection,
  OutlineCountKind,
  OutlineEndpoint,
  OutlineNode,
  OutlineNodeKind,
} from '../../domain/canvas-outline.js';
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

/**
 * The outline as indented text, for example `e3 retângulo "Validar versão" (960, 80, 220×90)` and
 * `s1 seta "salva": e1 → e3`. Lines stop before `maxChars`; the last line then counts what was left out.
 */
export function formatCanvasOutline(
  outline: CanvasOutline,
  maxChars: number = READING_LIMITS.outline.maxChars,
): string {
  const counts = countNames.flatMap(([kind, singular, plural]) => {
    const value = outline.counts[kind] ?? 0;
    return value ? [`${count(value)} ${value === 1 ? singular : plural}`] : [];
  });
  const lines = [`Elementos ativos: ${count(outline.total)}${counts.length ? ` (${counts.join(', ')})` : ''}`];
  if (outline.area)
    lines.push(`Área: ${outline.area.width}×${outline.area.height}; coordenadas a partir do canto superior esquerdo`);

  const entries: { text: string; element: boolean }[] = [];
  const section = (title: string, items: string[]) => {
    if (!items.length) return;
    entries.push({ text: title, element: false });
    for (const text of items) entries.push({ text: `  ${text}`, element: true });
  };
  for (const frame of outline.frames) {
    const name = frame.name === null ? '' : ` ${quoted(frame.name)}`;
    entries.push({ text: `Quadro ${frame.alias}${name} ${boxText(frame.box)}`, element: true });
    for (const child of frame.children) entries.push({ text: `  ${nodeLine(child)}`, element: true });
  }
  section(outline.frames.length ? 'Fora de quadros' : 'Formas e textos', outline.loose.map(nodeLine));
  section('Conexões', outline.connections.map(connectionLine));
  const summary = [
    outline.groups.length &&
      `Grupos: ${outline.groups.map((group) => `${group.alias} = ${group.members.join(', ')}`).join('; ')}`,
    outline.freehand && `Traços livres: ${count(outline.freehand.count)}, em ${boxText(outline.freehand.box)}`,
    outline.links.length && `Links: ${outline.links.map((link) => `${link.alias} → ${link.url}`).join('; ')}`,
  ];
  for (const text of summary) if (text) entries.push({ text, element: false });

  // Reserve room for the closing note so the whole text stays within the limit.
  let length = lines.join('\n').length + 80;
  let written = 0;
  for (const entry of entries) {
    if (length + entry.text.length + 1 > maxChars) break;
    if (written === 0) lines.push('');
    lines.push(entry.text);
    length += entry.text.length + 1;
    written += 1;
  }
  const omitted = outline.omitted + entries.slice(written).filter((entry) => entry.element).length;
  if (omitted) lines.push(`… mais ${count(omitted)} ${omitted === 1 ? 'elemento omitido' : 'elementos omitidos'}`);
  else if (written < entries.length) lines.push('… lista truncada');
  return lines.join('\n');
}
