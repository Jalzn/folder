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

/** The blocks of a document and of a task's description: text, three heading levels, lists, quote, code and equations. */
export const documentSchema = BlockNoteSchema.create({
  blockSpecs: {
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
  },
  inlineContentSpecs: {
    ...defaultInlineContentSpecs,
    math: createInlineMathSpec(),
  },
});

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
