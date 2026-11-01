import { type KeyboardEvent, type RefObject, useImperativeHandle } from 'react';
import { BlockEditor } from '../../editor/BlockEditor';
import { useBlockEditor } from '../../editor/use-block-editor';
import type { SaveState } from '../../lib/autosave';
import type { DocumentContent } from '../../lib/types';
import { useTheme } from '../../shell/theme';
import type { TaskTextSnapshot } from './task-text-draft';

/** What the drawer asks of the description: the cursor at its start, after ↵ in the title. */
export interface DescriptionHandle {
  focusStart: () => void;
}

/**
 * A task's description (docs/etapas/10-quadro-tarefa.md, "Descrição"): the shared block editor in 14/22,
 * without "Criar tarefa", with its own hint. Each change goes to the text's autosave; a version taken from
 * elsewhere (`remoteEpoch`) replaces the blocks. Esc leaves it for the drawer, unless one of BlockNote's
 * menus took the key first.
 */
export function TaskDescription({
  state,
  editable,
  handle,
  drawer,
  onChange,
}: {
  state: SaveState<TaskTextSnapshot>;
  editable: boolean;
  handle: RefObject<DescriptionHandle | null>;
  drawer: RefObject<HTMLElement | null>;
  onChange: (description: DocumentContent) => void;
}) {
  const theme = useTheme();
  const editor = useBlockEditor({
    schema: 'description',
    initial: state.snapshot.description,
    epoch: state.remoteEpoch,
    content: state.snapshot.description,
    label: 'Descrição da tarefa',
    placeholder: 'Descreva a tarefa ou digite / para inserir…',
  });
  useImperativeHandle(handle, () => ({
    focusStart: () => {
      const first = editor.document[0];
      if (first) editor.setTextCursorPosition(first, 'start');
      editor.focus();
    },
  }));
  function keyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key !== 'Escape' || event.defaultPrevented || event.nativeEvent.isComposing) return;
    // The drawer's first Esc from the text: the focus goes to the drawer, which the next Esc closes.
    event.preventDefault();
    event.stopPropagation();
    drawer.current?.focus({ preventScroll: true });
  }
  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: Esc leaves the editor inside for the drawer.
    <div className="task-description" onKeyDown={keyDown}>
      <BlockEditor
        editor={editor}
        className="task-description__editor"
        theme={theme.resolved}
        editable={editable}
        onChange={() => onChange(editor.document as unknown as DocumentContent)}
      />
    </div>
  );
}
