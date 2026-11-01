import {
  BlockNoteSchema,
  type BlockSpec,
  createHeadingBlockSpec,
  defaultBlockSpecs,
  defaultInlineContentSpecs,
  type PartialBlock,
} from '@blocknote/core';
import { pt } from '@blocknote/core/locales';
import { createReactMathBlockSpec, locales as mathLocales } from '@blocknote/math-block';
import { createInlineMathSpec } from '../components/InlineMath';
import { createDrawingEmbedSpec, createTaskEmbedSpec } from './blocks/embed-specs';

/** The blocks every editor takes: text, three heading levels, lists, quote, code and equations. */
const baseBlockSpecs = () => ({
  paragraph: defaultBlockSpecs.paragraph,
  // BlockNote 0.56 declares an optional property even with toggle headings disabled.
  heading: createHeadingBlockSpec({ levels: [1, 2, 3], allowToggleHeadings: false }) as unknown as BlockSpec<
    'heading',
    Omit<typeof defaultBlockSpecs.heading.config.propSchema, 'isToggleable'>,
    'inline'
  >,
  bulletListItem: defaultBlockSpecs.bulletListItem,
  numberedListItem: defaultBlockSpecs.numberedListItem,
  checkListItem: defaultBlockSpecs.checkListItem,
  quote: defaultBlockSpecs.quote,
  codeBlock: defaultBlockSpecs.codeBlock,
  mathBlock: createReactMathBlockSpec(),
});

const inlineContentSpecs = {
  ...defaultInlineContentSpecs,
  math: createInlineMathSpec(),
};

/** A task's description: the base blocks, without embeds (docs/etapas/11-documento-desenho.md, decision 2). */
export const descriptionSchema = BlockNoteSchema.create({ blockSpecs: baseBlockSpecs(), inlineContentSpecs });

/** A document: the base blocks and the embedded tasks and drawings. */
export const documentSchema = BlockNoteSchema.create({
  blockSpecs: { ...baseBlockSpecs(), taskEmbed: createTaskEmbedSpec(), drawingEmbed: createDrawingEmbedSpec() },
  inlineContentSpecs,
});

/** Which of the two an editor takes. */
export type EditorSchemaKind = 'document' | 'description';

export type EditorBlocks = PartialBlock<typeof documentSchema.blockSchema, typeof documentSchema.inlineContentSchema>[];

const equationPlaceholder = 'Equação em LaTeX, exemplo: E = mc^2';

/** BlockNote's Portuguese, with the equation menu items and the empty document's hint in Tinyfold's words. */
export const documentDictionary = {
  ...pt,
  math: {
    ...mathLocales.pt,
    block: { ...mathLocales.pt.block, input_placeholder: equationPlaceholder },
    inline: { ...mathLocales.pt.inline, input_placeholder: equationPlaceholder },
    slash_menu: {
      math_block: {
        ...mathLocales.pt.slash_menu.math_block,
        title: 'Equação',
        aliases: ['equacao', 'equação', 'formula', 'fórmula', 'latex', 'math', 'equation'],
      },
      inline_math: {
        ...mathLocales.pt.slash_menu.inline_math,
        aliases: ['equacao', 'equação', 'formula', 'fórmula', 'latex', 'math', 'inline'],
      },
    },
  },
  placeholders: {
    ...pt.placeholders,
    default: 'Escreva uma ideia ou digite / para explorar…',
    emptyDocument: 'Escreva uma ideia ou digite / para explorar…',
  },
};
