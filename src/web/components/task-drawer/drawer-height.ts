/**
 * The drawer's height, as a share of the content area (docs/etapas/10-quadro-tarefa.md, "Gaveta da tarefa"):
 * 55% to start, between 25% and 85%, never under 320 px, and always leaving 120 px of the page above it.
 */
export const DRAWER_HEIGHT = {
  initial: 0.55,
  min: 0.25,
  max: 0.85,
  /** ↑ and ↓ on the handle. */
  step: 0.05,
  /** ⌥↑ and ⌥↓ in the drawer, outside the text. */
  presets: [0.35, 0.55, 0.8],
  minPixels: 320,
  pageLeft: 120,
} as const;

/** A share kept between the limits; anything that is not a number is the initial share. */
export function clampShare(share: unknown) {
  if (typeof share !== 'number' || !Number.isFinite(share)) return DRAWER_HEIGHT.initial;
  return Math.min(DRAWER_HEIGHT.max, Math.max(DRAWER_HEIGHT.min, share));
}

/** The drawer's height in pixels for a share of the available height. */
export function drawerPixels(share: number, available: number) {
  const wanted = Math.max(DRAWER_HEIGHT.minPixels, available * clampShare(share));
  return Math.round(Math.min(wanted, Math.max(200, available - DRAWER_HEIGHT.pageLeft)));
}

/** The next fixed height up or down from `share`, or null at the end. */
export function nextPreset(share: number, direction: 1 | -1): number | null {
  const presets = DRAWER_HEIGHT.presets;
  if (direction > 0) return presets.find((preset) => preset > share + 0.01) ?? null;
  return [...presets].reverse().find((preset) => preset < share - 0.01) ?? null;
}

/** The share kept on this device, read leniently: an old or broken value is the initial share. */
export function parseDrawerShare(raw: string | null) {
  if (!raw) return DRAWER_HEIGHT.initial;
  try {
    const value: unknown = JSON.parse(raw);
    return clampShare(typeof value === 'object' && value !== null ? (value as { height?: unknown }).height : value);
  } catch {
    return DRAWER_HEIGHT.initial;
  }
}

/** "Gaveta em 55% da altura", said as the height changes. */
export const shareText = (share: number) => `Gaveta em ${Math.round(clampShare(share) * 100)}% da altura`;
