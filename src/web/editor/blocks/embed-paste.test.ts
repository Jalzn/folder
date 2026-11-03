import { Slice } from '@tiptap/pm/model';
import { describe, expect, it } from 'vitest';
import type { DocumentContent } from '#rich-text/domain';
import { setupBlockNoteEditor } from '../../testing/blocknote-editor';
import { embedPaste } from './embed-paste';

const editor = setupBlockNoteEditor();

const TASK = '0b4f2a4e-8f8c-4a5e-9d55-1f2a3b4c5d6e';
const paragraph = (id: string, children: DocumentContent = []) => ({
  id,
  type: 'paragraph',
  props: {},
  content: [{ type: 'text', text: id, styles: {} }],
  children,
});
const embed = (id: string, taskId: string, children: DocumentContent = []) => ({
  id,
  type: 'taskEmbed',
  props: { taskId },
  children,
});

/** The blocks of a pasted slice, after the paste's check, as their IDs or the embed's in brackets. */
function pasted(blocks: DocumentContent) {
  const doc = editor.prosemirrorDoc(blocks);
  const transform = embedPaste().props.transformPasted as (slice: Slice) => Slice;
  const result = transform(new Slice(doc.content, 0, 0));
  const seen: string[] = [];
  result.content.descendants((node) => {
    if (node.type.name === 'blockContainer')
      seen.push(node.firstChild?.type.name === 'taskEmbed' ? `[${node.attrs.id}]` : String(node.attrs.id));
    return true;
  });
  return seen;
}

describe('embedPaste', () => {
  it('leaves out an embed with an ID the server refuses, and keeps what it held in its place (Sec R1, R4)', () => {
    expect(
      pasted([paragraph('antes'), embed('falso', 'NOT-A-UUID', [paragraph('dentro')]), paragraph('depois')]),
    ).toEqual(['antes', 'dentro', 'depois']);
  });

  it('pastes valid embeds as they are', () => {
    expect(pasted([paragraph('antes'), embed('card', TASK), paragraph('depois')])).toEqual([
      'antes',
      '[card]',
      'depois',
    ]);
  });
});
