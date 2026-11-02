import type { BlockNoteEditor } from '@blocknote/core';

/** A block editor of any schema, for the parts that serve both the document's and the description's. */
// biome-ignore lint/suspicious/noExplicitAny: BlockNote's editor type depends on the schema's generics.
export type AnyBlockEditor = BlockNoteEditor<any, any, any>;
