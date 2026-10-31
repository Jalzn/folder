import type { TokenName } from './palette';

/** WCAG 2 relative luminance of a `#RRGGBB` colour. */
export function relativeLuminance(hex: string) {
  const match = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex);
  if (!match) throw new Error(`Cor sem contraste mensurável: ${hex}`);
  const [red, green, blue] = match.slice(1).map((channel) => {
    const value = Number.parseInt(channel, 16) / 255;
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  }) as [number, number, number];
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
}

export function contrastRatio(first: string, second: string) {
  const [lighter, darker] = [relativeLuminance(first), relativeLuminance(second)].sort((a, b) => b - a) as [
    number,
    number,
  ];
  return (lighter + 0.05) / (darker + 0.05);
}

export interface ContrastRule {
  foregrounds: TokenName[];
  backgrounds: TokenName[];
  minimum: number;
}

/** Where content sits: the work area, the elevation levels and the sidebar. */
const surfaces: TokenName[] = ['side', 'bg', 'raised-1', 'raised-2', 'raised-3', 'sidebar-bg'];
/** The same surfaces in their interaction states. */
const states: TokenName[] = ['hover', 'hover-raised', 'pressed', 'selected'];
const sidebarStates: TokenName[] = ['sidebar-hover', 'sidebar-active'];

/**
 * The pairs `check` enforces (docs/etapas/08-fundacao.md, "Tokens"). The semantic colours ok, warn and
 * conflict never sit on a hovered or active sidebar row, where --ok would measure 4.48:1 in the light theme;
 * the sidebar's own states are checked against the text, accent and late colours it shows.
 */
export const contrastRules: ContrastRule[] = [
  {
    foregrounds: ['text', 'text-2', 'text-3', 'accent', 'late', 'ok', 'warn', 'conflict'],
    backgrounds: [...surfaces, ...states],
    minimum: 4.5,
  },
  { foregrounds: ['text', 'text-2', 'text-3', 'accent', 'late'], backgrounds: sidebarStates, minimum: 4.5 },
  { foregrounds: ['late'], backgrounds: ['late-bg'], minimum: 4.5 },
  { foregrounds: ['ok'], backgrounds: ['ok-bg'], minimum: 4.5 },
  { foregrounds: ['warn'], backgrounds: ['warn-bg'], minimum: 4.5 },
  { foregrounds: ['conflict'], backgrounds: ['conflict-bg'], minimum: 4.5 },
  { foregrounds: ['text'], backgrounds: ['late-bg', 'ok-bg', 'warn-bg', 'conflict-bg'], minimum: 4.5 },
  { foregrounds: ['on-accent'], backgrounds: ['accent-solid', 'danger'], minimum: 4.5 },
  { foregrounds: ['on-toast'], backgrounds: ['toast'], minimum: 4.5 },
  { foregrounds: ['field-border', 'icon'], backgrounds: surfaces, minimum: 3 },
];
