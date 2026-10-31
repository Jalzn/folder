import './editor.css';
import { CircleAlert, GitCompareArrows } from 'lucide-react';
import type { SaveStatus } from '../../lib/autosave';

const labels: Record<SaveStatus, string> = {
  saved: 'Salvo',
  dirty: 'Salvando…',
  saving: 'Salvando…',
  error: 'Não salvo',
  conflict: 'Conflito de edição',
};

/** An editor's save state in the page bar, 12/16 `--text-3`; a failure or a conflict takes its colour. */
export function SaveState({ status }: { status: SaveStatus }) {
  return (
    <span className="save-state" data-status={status} role="status" aria-live="polite">
      {status === 'error' && <CircleAlert size={14} aria-hidden="true" />}
      {status === 'conflict' && <GitCompareArrows size={14} aria-hidden="true" />}
      {labels[status]}
    </span>
  );
}
