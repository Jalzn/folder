import { firstUnused } from './palette.js';
/** The mark colours a project can have, in the order a new project takes the first unused one. */
export const PROJECT_COLORS = ['violet', 'ochre', 'gray', 'green'] as const;

export type ProjectColor = (typeof PROJECT_COLORS)[number];

/**
 * Documents and drawings pinned at the top of one scope of a project's sidebar, counted together: the
 * project's root, or each folder.
 */
export const MAX_PINNED = 8;

const graphemes = new Intl.Segmenter('pt-BR', { granularity: 'grapheme' });

/** The letter on a project's mark: the first grapheme of its name, in capitals, or "?" without a name. */
export function projectInitial(name: string): string {
  const [first] = graphemes.segment(name.trim());
  return first ? first.segment.toLocaleUpperCase('pt-BR') : '?';
}

/** The first colour no active project uses; once all are taken, colours repeat from the first. */
export function defaultProjectColor(activeColors: Iterable<ProjectColor>): ProjectColor {
  return firstUnused(PROJECT_COLORS, activeColors);
}
