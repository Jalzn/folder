import { NewLabelRow } from './NewLabelRow';
import { useLabelFocus } from './use-label-focus';
import './labels.css';
import { LABEL_LIMITS } from '@tinyfold/workspace/domain';
import { Plus } from 'lucide-react';
import { type KeyboardEvent, useState } from 'react';
import { Button as AriaButton } from 'react-aria-components';
import { usesCommandKey } from '../../lib/platform';
import { type LabelSummary, useLabels } from '../../lib/queries/labels';
import { useAction } from '../../shell/writes';
import { Dialog, ErrorNotice, focusIsLost, Spinner, useToast, useUndoLatest } from '../../ui';
import type { LabelCommand } from './LabelMenu';
import type { LabelFieldExit } from './LabelNameField';
import { LabelRow } from './LabelRow';
import { LABELS_FULL } from './label-text';
import { useLabelActions } from './use-label-actions';

/**
 * "Gerenciar etiquetas…" (docs/etapas/10-quadro-tarefa.md, "Etiquetas"), from the board's ⋯, the end of its
 * label filter and ⌘K: a 480 px dialog with one row per active label, in alphabetical order, and "+ Nova
 * etiqueta" at its foot. Esc closes it, unless a name field takes it first to give the name back.
 */
export function LabelsDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Dialog title="Etiquetas" open={open} onClose={onClose} className="labels-dialog">
      <LabelsList />
    </Dialog>
  );
}

/** Whether a key press asks for the toast's undo: ⌘Z on Apple platforms, Ctrl+Z elsewhere. */
const isUndoKey = (event: KeyboardEvent) =>
  event.key.toLowerCase() === 'z' &&
  (usesCommandKey() ? event.metaKey : event.ctrlKey) &&
  !event.shiftKey &&
  !event.altKey;

/** The dialog's content: the rows, the new label's field and the foot. */
function LabelsList() {
  const labels = useLabels();
  const action = useAction();
  const actions = useLabelActions(action);
  const toast = useToast();
  const undoLatest = useUndoLatest();
  const [renaming, setRenaming] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [menu, setMenu] = useState<string | null>(null);
  const list = labels.data ?? [];
  const { rows, names, body, add, focusOnce, focusName, focusAdd, step } = useLabelFocus(list);

  /**
   * Excluir at once: the focus goes to the next row's name once the row is gone, or the one before for the
   * last, or "+ Nova etiqueta" when none is left. Desfazer brings the focus to the label back, unless it is
   * somewhere else by then.
   */
  async function remove(label: LabelSummary) {
    const at = list.findIndex((each) => each.id === label.id);
    const neighbour = list[at + 1] ?? list[at - 1];
    const back = () =>
      focusOnce(
        () => names.get(label.id),
        () => {
          const active = document.activeElement;
          return focusIsLost() || (Boolean(body.current?.contains(active)) && !(active instanceof HTMLInputElement));
        },
      );
    const removed = await actions.remove(label, back);
    if (!removed) return;
    focusOnce(() => (rows.get(label.id) ? null : neighbour ? names.get(neighbour.id) : add.current));
  }

  function command(label: LabelSummary, which: LabelCommand) {
    setMenu(null);
    if (which === 'rename') setRenaming(label.id);
    else void remove(label);
  }

  function startCreating() {
    if (list.length >= LABEL_LIMITS.active) {
      toast(LABELS_FULL, 'error');
      return;
    }
    setCreating(true);
  }

  /** ⌘Z on the rows or the foot runs the toast's Desfazer: the dialog has no text there to undo. */
  function keyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (!isUndoKey(event) || event.target instanceof HTMLInputElement) return;
    if (!(event.target instanceof Node && body.current?.contains(event.target))) return;
    if (!undoLatest()) return;
    event.preventDefault();
    event.stopPropagation();
  }

  const others = (id: string | null) => list.filter((label) => label.id !== id).map((label) => label.name);
  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: ⌘Z on the rows and buttons inside it runs the toast's undo.
    <div ref={body} className="labels-dialog__body" onKeyDown={keyDown}>
      {labels.isPending ? (
        <Spinner />
      ) : labels.isError ? (
        <ErrorNotice error={labels.error} retry={() => void labels.refetch()} />
      ) : list.length || creating ? (
        <ul className="labels-dialog__list" aria-label="Etiquetas">
          {list.map((label) => (
            <LabelRow
              key={label.id}
              label={label}
              renaming={renaming === label.id}
              taken={others(label.id)}
              menuOpen={menu === label.id}
              rowRef={rows.ref(label.id)}
              nameRef={names.ref(label.id)}
              onMenuOpenChange={(isOpen) => setMenu(isOpen ? label.id : null)}
              onCommand={(which) => command(label, which)}
              onColor={(color) => void actions.recolor(label, color)}
              onRename={(name) => actions.rename(label, name)}
              onRenamed={(exit: LabelFieldExit) => {
                setRenaming(null);
                if (exit === 'key') focusName(label.id);
              }}
              onStep={(to) => step(label.id, to)}
            />
          ))}
          {creating && (
            <NewLabelRow
              taken={others(null)}
              create={actions.create}
              onDone={(id, exit) => {
                setCreating(false);
                if (exit === 'key') {
                  if (id) focusName(id);
                  else focusAdd();
                }
              }}
            />
          )}
        </ul>
      ) : (
        <p className="labels-dialog__empty">Nenhuma etiqueta ainda.</p>
      )}
      {!creating && (
        <div className="labels-dialog__foot">
          <AriaButton
            ref={add}
            className="btn"
            data-variant="ghost"
            data-size="md"
            isDisabled={labels.isPending || labels.isError}
            onPress={startCreating}
          >
            <Plus size={14} aria-hidden="true" />
            Nova etiqueta
          </AriaButton>
        </div>
      )}
    </div>
  );
}
