import './glyphs.css';

function ringShape(index: number, count: number) {
  if (count > 1 && index >= count - 1)
    return {
      state: 'done',
      shape: (
        <>
          <circle cx="7" cy="7" r="7" fill="currentColor" />
          <path className="column-ring__check" d="M4.3 7.2l1.8 1.8 3.6-3.7" fill="none" strokeWidth="1.6" />
        </>
      ),
    };
  const ring = <circle cx="7" cy="7" r="6.1" fill="none" stroke="currentColor" strokeWidth="1.5" />;
  const fraction = count > 1 ? Math.min(0.85, Math.max(0, index) / (count - 1)) : 0;
  if (!fraction) return { state: 'start', shape: ring };
  const radius = 3.4;
  const angle = 2 * Math.PI * fraction;
  const x = (7 + radius * Math.sin(angle)).toFixed(2);
  const y = (7 - radius * Math.cos(angle)).toFixed(2);
  const sector = `M7 7V${(7 - radius).toFixed(2)}A${radius} ${radius} 0 ${fraction > 0.5 ? 1 : 0} 1 ${x} ${y}Z`;
  return {
    state: 'progress',
    shape: (
      <>
        {ring}
        <path d={sector} fill="currentColor" />
      </>
    ),
  };
}

/**
 * The column ring (docs/interface/visual.md §5): a task's state drawn by its column's position. The first
 * column is an empty circle, the middle ones fill a sector of index ÷ (n − 1), and the last is a full
 * circle with a check. Decorative: the column's name always goes with it.
 */
export function ColumnRing({ index, count, size = 14 }: { index: number; count: number; size?: number }) {
  const { state, shape } = ringShape(index, count);
  return (
    <svg className="column-ring" data-state={state} width={size} height={size} viewBox="0 0 14 14" aria-hidden="true">
      {shape}
    </svg>
  );
}
