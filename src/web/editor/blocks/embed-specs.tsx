import './embeds.css';
import { createReactBlockSpec } from '@blocknote/react';
import { DrawingEmbed } from './DrawingEmbed';
import { EmbedKeysExtension } from './embed-keys';
import { TaskEmbed } from './TaskEmbed';

/**
 * The two embed blocks of a document (docs/etapas/11-documento-desenho.md, "Blocos"): a node without content,
 * whose one property is the item's ID, drawn by its React view from the document's resolver. The keys of a
 * selected embed come with them, so a description, which has neither, has no such keys either.
 */
export const createTaskEmbedSpec = createReactBlockSpec(
  { type: 'taskEmbed', propSchema: { taskId: { default: '' } }, content: 'none' },
  { render: ({ block }) => <TaskEmbed taskId={block.props.taskId} blockId={block.id} /> },
  [EmbedKeysExtension()],
);

export const createDrawingEmbedSpec = createReactBlockSpec(
  { type: 'drawingEmbed', propSchema: { canvasId: { default: '' } }, content: 'none' },
  { render: ({ block }) => <DrawingEmbed canvasId={block.props.canvasId} blockId={block.id} /> },
);
