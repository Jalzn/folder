import { Clock } from 'lucide-react';
import { LabelChip } from '../../components/labels/LabelChip';
import type { LabelSummary } from '../../lib/queries';
import { shortDate } from '../../lib/task-dates';
import type { Task } from '../../lib/types';

/** Chips a card shows before "+n". */
const SHOWN_LABELS = 2;

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
 * A card's meta line in 12/16 (docs/interface/visual.md, "Quadro"), in order: the due date, late in --late
 * with the clock; the checklist's progress; and up to two labels, then "+n". It describes the card's title.
 */
export function CardMeta({
  id,
  task,
  late,
  labels,
}: {
  id: string;
  task: Task;
  late: boolean;
  labels: ReadonlyMap<string, LabelSummary>;
}) {
  const chips = task.labelIds.flatMap((labelId) => labels.get(labelId) ?? []);
  const shown = chips.slice(0, SHOWN_LABELS);
  const more = chips.slice(SHOWN_LABELS);
  const progress = task.checklist;
  // An empty line keeps the title's description pointing somewhere.
  if (!task.dueOn && !progress && !chips.length) return <span id={id} hidden />;
  return (
    <div id={id} className="card-meta">
      {task.dueOn &&
        (late ? (
          <span className="card-meta__late" title={`Atrasada desde ${shortDate(task.dueOn)}`}>
            <Clock size={12} aria-hidden="true" />
            <span aria-hidden="true">{shortDate(task.dueOn)}</span>
            <span className="sr-only">Atrasada desde {shortDate(task.dueOn)}</span>
          </span>
        ) : (
          <span className="card-meta__due">
            <span className="sr-only">Prazo </span>
            {shortDate(task.dueOn)}
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
      {chips.length > 0 && (
        <span className="card-meta__labels">
          {shown.map((label) => (
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
    </div>
  );
}
