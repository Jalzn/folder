import './task-meta.css';
import type { LabelColor } from '@tinyfold/workspace/domain';
import { Clock } from 'lucide-react';
import { shortDate } from '../../lib/task-dates';
import { LabelChip } from '../labels/LabelChip';

/** The checklist's ring of 12 px: the share of checked items, in --ok once all are. */
function ProgressRing({ done, total }: { done: number; total: number }) {
  const radius = 6;
  const length = 2 * Math.PI * radius;
  const share = total ? done / total : 0;
  return (
    <svg className="card-meta__ring" width="12" height="12" viewBox="0 0 14 14" aria-hidden="true">
      <circle className="card-meta__track" cx="7" cy="7" r={radius} fill="none" strokeWidth="2" />
      <circle
        className="card-meta__value"
        cx="7"
        cy="7"
        r={radius}
        fill="none"
        strokeWidth="2"
        strokeDasharray={`${(share * length).toFixed(2)} ${length.toFixed(2)}`}
        transform="rotate(-90 7 7)"
      />
    </svg>
  );
}

/**
 * A task's meta line in 12/16 (docs/interface/visual.md, "Quadro"), on a board's card and on a card embedded
 * in a document, in order: the due date, late in --late with the clock; the checklist's progress; and up to
 * `shown` labels, then "+n". It describes the card's title, by `id`.
 */
export function TaskMeta({
  id,
  dueOn,
  checklist,
  labels,
  late,
  shown,
  unsaved = false,
}: {
  id: string;
  dueOn: string | null;
  checklist: { done: number; total: number } | null;
  labels: readonly { id: string; name: string; color: LabelColor }[];
  late: boolean;
  /** Chips shown before "+n": 2 on the board, 3 in a document. */
  shown: number;
  unsaved?: boolean;
}) {
  const first = labels.slice(0, shown);
  const more = labels.slice(shown);
  const progress = checklist;
  // An empty line keeps the title's description pointing somewhere.
  if (!dueOn && !progress && !labels.length)
    return (
      <span id={id} hidden>
        {unsaved && 'Não salvo'}
      </span>
    );
  return (
    <span id={id} className="card-meta">
      {unsaved && <span className="sr-only">Não salvo</span>}
      {dueOn &&
        (late ? (
          <span className="card-meta__late" title={`Atrasada desde ${shortDate(dueOn)}`}>
            <Clock size={12} aria-hidden="true" />
            <span aria-hidden="true">{shortDate(dueOn)}</span>
            <span className="sr-only">Atrasada desde {shortDate(dueOn)}</span>
          </span>
        ) : (
          <span className="card-meta__due">
            <span className="sr-only">Prazo </span>
            {shortDate(dueOn)}
          </span>
        ))}
      {progress && (
        <span className="card-meta__progress" data-full={progress.done === progress.total || undefined}>
          <ProgressRing done={progress.done} total={progress.total} />
          <span aria-hidden="true">
            {progress.done}/{progress.total}
          </span>
          <span className="sr-only">
            Checklist {progress.done} de {progress.total}
          </span>
        </span>
      )}
      {labels.length > 0 && (
        <span className="card-meta__labels">
          {first.map((label) => (
            <LabelChip key={label.id} name={label.name} color={label.color} />
          ))}
          {more.length > 0 && (
            <span className="card-meta__more">
              <span aria-hidden="true">+{more.length}</span>
              <span className="sr-only">
                mais {more.length} etiquetas: {more.map((label) => label.name).join(', ')}
              </span>
            </span>
          )}
        </span>
      )}
    </span>
  );
}
