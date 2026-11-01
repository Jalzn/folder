import './editor.css';
import { type BlockNoteEditor, combineByGroup } from '@blocknote/core';
import { filterSuggestionItems } from '@blocknote/core/extensions';
import { BlockNoteView } from '@blocknote/mantine';
import { getMathBlockTypeSelectItems, getMathSlashMenuItems } from '@blocknote/math-block';
import {
  blockTypeSelectItems,
  FormattingToolbar,
  FormattingToolbarController,
  getDefaultReactSlashMenuItems,
  getFormattingToolbarItems,
  SuggestionMenuController,
  useComponentsContext,
} from '@blocknote/react';
import { Plus } from 'lucide-react';
import { cx } from '../lib/cx';

function CreateTaskButton({ onPress }: { onPress: () => void }) {
  const components = useComponentsContext();
  if (!components) return null;
  return (
    <components.FormattingToolbar.Button
      mainTooltip="Criar tarefa a partir da seleção"
      label="Criar tarefa"
      icon={<Plus size={15} />}
      onClick={onPress}
    >
      Criar tarefa
    </components.FormattingToolbar.Button>
  );
}

/**
 * The block editor shared by documents and task descriptions, in the resolved theme: BlockNote with the
 * formatting toolbar and the slash menu, both with the equations. `onCreateTask` adds "Criar tarefa" to the
 * toolbar, which only a document offers.
 */
export function BlockEditor({
  editor,
  theme,
  className,
  onChange,
  onSelectionChange,
  onCreateTask,
  editable = true,
}: {
  // biome-ignore lint/suspicious/noExplicitAny: BlockNote's editor type depends on the schema's generics.
  editor: BlockNoteEditor<any, any, any>;
  theme: 'light' | 'dark';
  className?: string;
  onChange: () => void;
  onSelectionChange?: () => void;
  onCreateTask?: () => void;
  /** False shows the blocks to read only, as an archived project's task. */
  editable?: boolean;
}) {
  return (
    <div className={cx('block-editor', className)}>
      <BlockNoteView
        editor={editor}
        theme={theme}
        editable={editable}
        formattingToolbar={false}
        slashMenu={false}
        onChange={onChange}
        {...(onSelectionChange ? { onSelectionChange } : {})}
      >
        <FormattingToolbarController
          formattingToolbar={() => (
            <FormattingToolbar>
              {getFormattingToolbarItems([...blockTypeSelectItems(editor), ...getMathBlockTypeSelectItems(editor)])}
              {onCreateTask && <CreateTaskButton onPress={onCreateTask} />}
            </FormattingToolbar>
          )}
        />
        <SuggestionMenuController
          triggerCharacter="/"
          getItems={async (query) =>
            filterSuggestionItems(
              combineByGroup(getDefaultReactSlashMenuItems(editor), getMathSlashMenuItems(editor)),
              query,
            )
          }
        />
      </BlockNoteView>
    </div>
  );
}
