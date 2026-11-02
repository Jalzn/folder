import './editor.css';
import { type BlockNoteEditor, combineByGroup } from '@blocknote/core';
import { filterSuggestionItems } from '@blocknote/core/extensions';
import { BlockNoteView } from '@blocknote/mantine';
import { getMathBlockTypeSelectItems, getMathSlashMenuItems } from '@blocknote/math-block';
import {
  blockTypeSelectItems,
  type DefaultReactSuggestionItem,
  FormattingToolbar,
  FormattingToolbarController,
  getDefaultReactSlashMenuItems,
  getFormattingToolbarItems,
  SuggestionMenuController,
  useComponentsContext,
} from '@blocknote/react';
import { Plus } from 'lucide-react';
import { cx } from '../lib/cx';
import { isEmbedSelected } from './blocks/embed-selection';

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
 * toolbar, and `slashItems` a group to the slash menu, as the document's "Incorporar"; only a document offers
 * them.
 */
export function BlockEditor({
  editor,
  theme,
  className,
  onChange,
  onSelectionChange,
  onCreateTask,
  slashItems,
  editable = true,
}: {
  // biome-ignore lint/suspicious/noExplicitAny: BlockNote's editor type depends on the schema's generics.
  editor: BlockNoteEditor<any, any, any>;
  theme: 'light' | 'dark';
  className?: string;
  onChange: () => void;
  onSelectionChange?: () => void;
  onCreateTask?: () => void;
  slashItems?: DefaultReactSuggestionItem[];
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
          formattingToolbar={() =>
            // An embed selected as a node has no text to format.
            isEmbedSelected(editor.prosemirrorState) ? null : (
              <FormattingToolbar>
                {getFormattingToolbarItems([...blockTypeSelectItems(editor), ...getMathBlockTypeSelectItems(editor)])}
                {onCreateTask && <CreateTaskButton onPress={onCreateTask} />}
              </FormattingToolbar>
            )
          }
        />
        <SuggestionMenuController
          triggerCharacter="/"
          getItems={async (query) =>
            filterSuggestionItems(
              combineByGroup(getDefaultReactSlashMenuItems(editor), getMathSlashMenuItems(editor), slashItems ?? []),
              query,
            )
          }
        />
      </BlockNoteView>
    </div>
  );
}
