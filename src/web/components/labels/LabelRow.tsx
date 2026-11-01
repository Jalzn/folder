import type { LabelColor } from '@tinyfold/workspace/domain';
import { type KeyboardEvent, type Ref, useId } from 'react';
import type { LabelSummary } from '../../lib/queries/labels';
import { type LabelCommand, LabelMenu } from './LabelMenu';
import { type LabelFieldExit, LabelNameField } from './LabelNameField';
import { LabelSquare } from './LabelSquare';
import { labelRowDescription, labelTaskCount } from './label-text';

/** The keys a row's name hands to the list: the arrows, Home and End move between the names. */
export type RowStep = 'previous' | 'next' | 'first' | 'last';

const steps: Record<string, RowStep> = { ArrowUp: 'previous', ArrowDown: 'next', Home: 'first', End: 'last' };

/**
 * One label of "Etiquetas" (docs/etapas/10-quadro-tarefa.md, "Etiquetas"), 32 px like a menu row: its color,
 * its name, which ↵ or a double click rename in place, how many tasks have it and its ⋯. ⇧F10 or the Menu key
 * on the name open the ⋯.
 */
export function LabelRow({
  label,
  renaming,
  taken,
  menuOpen,
  rowRef,
  nameRef,
  onMenuOpenChange,
  onCommand,
  onColor,
  onRename,
  onRenamed,
  onStep,
}: {
  label: LabelSummary;
  renaming: boolean;
  /** The other labels, by name. */
  taken: readonly string[];
  menuOpen: boolean;
  rowRef: Ref<HTMLLIElement>;
  nameRef: Ref<HTMLButtonElement>;
  onMenuOpenChange: (open: boolean) => void;
  onCommand: (command: LabelCommand) => void;
  onColor: (color: LabelColor) => void;
  onRename: (name: string) => Promise<boolean>;
  onRenamed: (exit: LabelFieldExit) => void;
  onStep: (step: RowStep) => void;
}) {
  const descriptionId = useId();
  function keyDown(event: KeyboardEvent<HTMLButtonElement>) {
    const step = steps[event.key];
    const modified = event.altKey || event.ctrlKey || event.metaKey;
    if (step && !modified && !event.shiftKey) onStep(step);
    else if ((event.key === 'F10' && event.shiftKey && !modified) || event.key === 'ContextMenu')
      onMenuOpenChange(true);
    else return;
    event.preventDefault();
    event.stopPropagation();
  }
  return (
    <li ref={rowRef} className="label-row" data-editing={renaming || undefined}>
      <LabelSquare color={label.color} />
      {renaming ? (
        <LabelNameField
          initial={label.name}
          label="Nome da etiqueta"
          taken={taken}
          onSubmit={onRename}
          onDone={onRenamed}
        />
      ) : (
        <>
          <button
            ref={nameRef}
            type="button"
            className="label-row__name"
            aria-describedby={descriptionId}
            // ↵, Space or a screen reader's press come as a click of no count; a mouse renames by double click.
            onClick={(event) => event.detail === 0 && onCommand('rename')}
            onDoubleClick={() => onCommand('rename')}
            onKeyDown={keyDown}
          >
            {label.name}
          </button>
          <span id={descriptionId} className="sr-only">
            {labelRowDescription(label.color, label.taskCount)}
          </span>
        </>
      )}
      <span className="label-row__count" aria-hidden="true">
        {labelTaskCount(label.taskCount)}
      </span>
      <LabelMenu
        name={label.name}
        color={label.color}
        open={menuOpen}
        onOpenChange={onMenuOpenChange}
        onCommand={onCommand}
        onColor={onColor}
      />
    </li>
  );
}
