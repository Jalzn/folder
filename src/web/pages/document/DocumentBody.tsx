import type { BlockNoteEditor } from '@blocknote/core';
import type { DefaultReactSuggestionItem } from '@blocknote/react';
import { BlockEditor } from '../../editor/BlockEditor';
import { displayTitle } from '../../lib/types';
import { DocumentTitle } from './DocumentTitle';

/**
 * The document's column (docs/etapas/11-documento-desenho.md, "Coluna"): 680 px, the title in 30/36, a
 * hairline and the content in 15/24. ↵ in the title takes the cursor to the start of the text.
 */
export function DocumentBody({
  editor,
  title,
  theme,
  onTitleChange,
  onChange,
  onSelectionChange,
  onCreateTask,
  slashItems,
}: {
  // biome-ignore lint/suspicious/noExplicitAny: BlockNote's editor type depends on the schema's generics.
  editor: BlockNoteEditor<any, any, any>;
  title: string;
  theme: 'light' | 'dark';
  onTitleChange: (value: string) => void;
  onChange: () => void;
  onSelectionChange: () => void;
  onCreateTask: () => void;
  /** The `/` menu's "Incorporar" group, when the document takes embeds. */
  slashItems: DefaultReactSuggestionItem[] | undefined;
}) {
  function enterText() {
    const first = editor.document[0];
    if (first) editor.setTextCursorPosition(first, 'start');
    editor.focus();
  }
  return (
    <article className="document">
      <h1 className="sr-only" tabIndex={-1}>
        {displayTitle(title)}
      </h1>
      <DocumentTitle value={title} onChange={onTitleChange} onEnter={enterText} />
      <hr className="document__hair" />
      <BlockEditor
        editor={editor}
        className="document__content"
        theme={theme}
        onChange={onChange}
        onSelectionChange={onSelectionChange}
        onCreateTask={onCreateTask}
        {...(slashItems ? { slashItems } : {})}
      />
    </article>
  );
}
