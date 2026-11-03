import type { LabelColor } from '#board/domain';

/** The seven label colors by their names in the interface (docs/interface/visual.md, "Etiquetas"). */
export const labelColorNames: Record<LabelColor, string> = {
  blue: 'Azul',
  slate: 'Ardósia',
  purple: 'Roxo',
  teal: 'Verde-água',
  amber: 'Âmbar',
  coral: 'Coral',
  lime: 'Lima',
};

/** The token of a label's color. */
export const labelColorVar = (color: LabelColor) => `var(--label-${color})`;
