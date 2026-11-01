import './editor.css';
import { CircleAlert, GitCompareArrows } from 'lucide-react';
import type { SaveStatus } from '../../lib/autosave';
import { Button, shortcutLabel, Tooltip, TooltipTrigger } from '../../ui';

const labels: Record<SaveStatus, string> = {
  saved: 'Salvo',
  dirty: 'Salvando…',
  saving: 'Salvando…',
  error: 'Não salvou',
  conflict: 'Conflito',
};

/** When the item was last edited, for "Salvo · editado hoje" and its hint "Salvo às 14:32". */
export interface EditedDetail {
  phrase: string;
  time: string;
}

/**
 * An editor's save state in the bar (the prototype's `saveSeg`), 12/16 `--text-3`: "Salvo", with when the item
 * was last edited on a page; "Salvando…"; "Não salvou" with "Tentar de novo"; or "Conflito". A failure or a
 * conflict takes its colour. `retryKeys` names the shortcut that also tries again, as ⌘S on a page.
 */
export function SaveState({
  status,
  edited,
  onRetry,
  retryKeys,
}: {
  status: SaveStatus;
  edited?: EditedDetail | undefined;
  onRetry?: (() => void) | undefined;
  retryKeys?: readonly string[];
}) {
  const retry = status === 'error' && onRetry && (
    <Button size="sm" onPress={onRetry}>
      Tentar de novo
    </Button>
  );
  return (
    <>
      <span
        className="save-state"
        data-status={status}
        role="status"
        aria-live="polite"
        title={status === 'saved' && edited ? `Salvo às ${edited.time}` : undefined}
      >
        {status === 'error' && <CircleAlert size={14} aria-hidden="true" />}
        {status === 'conflict' && <GitCompareArrows size={14} aria-hidden="true" />}
        <span>{labels[status]}</span>
        {status === 'saved' && edited && <span className="save-state__edited"> · {edited.phrase}</span>}
      </span>
      {retry && retryKeys ? (
        <TooltipTrigger delay={600} closeDelay={0}>
          {retry}
          <Tooltip>
            Tentar de novo
            <span className="tooltip__keys">{shortcutLabel(retryKeys)}</span>
          </Tooltip>
        </TooltipTrigger>
      ) : (
        retry
      )}
    </>
  );
}
