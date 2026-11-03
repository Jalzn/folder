import './label-chip.css';
import './labels.css';
import type { CSSProperties, ReactNode } from 'react';
import type { LabelColor } from '#board/domain';
import { labelColorVar } from './label-colors';

/** A label as a 20 px chip: its color square and its name, and what may follow, as a remove button. */
export function LabelChip({ name, color, children }: { name: string; color: LabelColor; children?: ReactNode }) {
  return (
    <span className="label-chip" style={{ '--label-color': labelColorVar(color) } as CSSProperties}>
      <i aria-hidden="true" />
      {name}
      {children}
    </span>
  );
}
