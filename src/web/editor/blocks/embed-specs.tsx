import './embeds.css';
import { createReactBlockSpec } from '@blocknote/react';
import { DrawingEmbed } from './DrawingEmbed';
import { EmbedExport } from './EmbedExport';
import { TaskEmbed } from './TaskEmbed';

/**
 * The two embed blocks of a document (docs/etapas/11-documento-desenho.md, "Blocos"): a node without content,
 * whose one property is the item's ID, drawn by its React view from the document's resolver, and copied out
 * of the editor as the item's link (EmbedExport). Their keys come with the document's editor (embed-keys.ts),
 * which the blocks' actions reach.
 */
export const createTaskEmbedSpec = createReactBlockSpec(
  { type: 'taskEmbed', propSchema: { taskId: { default: '' } }, content: 'none' },
  {
    render: ({ block }) => <TaskEmbed taskId={block.props.taskId} blockId={block.id} />,
    toExternalHTML: ({ block }) => <EmbedExport kind="task" id={block.props.taskId} />,
  },
);

export const createDrawingEmbedSpec = createReactBlockSpec(
  { type: 'drawingEmbed', propSchema: { canvasId: { default: '' } }, content: 'none' },
  {
    render: ({ block }) => <DrawingEmbed canvasId={block.props.canvasId} blockId={block.id} />,
    toExternalHTML: ({ block }) => <EmbedExport kind="drawing" id={block.props.canvasId} />,
  },
);
