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
 * The document's content in BlockNote, in the resolved theme: the formatting toolbar gains "Criar tarefa",
 * and the slash menu gains the equations.
 */
export function DocumentContentEditor({
  editor,
  theme,
  onChange,
  onSelectionChange,
  onCreateTask,
}: {
  // biome-ignore lint/suspicious/noExplicitAny: BlockNote's editor type depends on the schema's generics.
  editor: BlockNoteEditor<any, any, any>;
  theme: 'light' | 'dark';
  onChange: () => void;
  onSelectionChange: () => void;
  onCreateTask: () => void;
}) {
  return (
    <div className="document__content">
      <BlockNoteView
        editor={editor}
        theme={theme}
        formattingToolbar={false}
        slashMenu={false}
        onChange={onChange}
        onSelectionChange={onSelectionChange}
      >
        <FormattingToolbarController
          formattingToolbar={() => (
            <FormattingToolbar>
              {getFormattingToolbarItems([...blockTypeSelectItems(editor), ...getMathBlockTypeSelectItems(editor)])}
              <CreateTaskButton onPress={onCreateTask} />
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
