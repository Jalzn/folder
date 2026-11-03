import './label-chip.css';
import './labels.css';
import type { CSSProperties } from 'react';
import type { LabelColor } from '#board/domain';
import { labelColorVar } from './label-colors';

/** A label's 8 px square of color, as in menus; without a color, the outline of a label yet to be named. */
export function LabelSquare({ color }: { color: LabelColor | null }) {
  return (
    <i
      className="label-square"
      style={color ? ({ '--label-color': labelColorVar(color) } as CSSProperties) : undefined}
      data-empty={color ? undefined : ''}
      aria-hidden="true"
    />
  );
}
