import { emptyCanvasScene } from '@tinyfold/workspace/domain';
import { describe, expect, it } from 'vitest';
import { draftDownload, localDrafts } from './local-drafts';

/** Local storage with only the reads the drafts use. */
function storageWith(entries: Record<string, string>): Storage {
  const keys = Object.keys(entries);
  return {
    get length() {
      return keys.length;
    },
    key: (index: number) => keys[index] ?? null,
    getItem: (key: string) => entries[key] ?? null,
    setItem: () => undefined,
    removeItem: () => undefined,
    clear: () => undefined,
  };
}

const canvasDraft = (title: string) =>
  JSON.stringify({
    format: 1,
    baseVersion: 3,
    snapshot: { title, projectId: 'p', scene: emptyCanvasScene() },
    pending: null,
  });

describe('localDrafts', () => {
  const storage = storageWith({
    'tinyfold:draft:inst:doc:tab-a': '{"a":1}',
    'tinyfold:draft:inst:doc:tab-b': '{"b":2}',
    'tinyfold:draft:inst:doc-2:tab-a': '{"other item":true}',
    'tinyfold:draft:other-inst:doc:tab-a': '{"other installation":true}',
    'tinyfold:canvas-draft:inst:doc:tab-a': '{"a drawing with the same id":true}',
    'tinyfold:draft:inst:doc:empty': '',
    'tinyfold:draft-pointer:inst:doc': 'tab-a',
  });

  it('keeps every writer of the item in this installation, and nothing else', () => {
    expect(localDrafts(storage, 'inst', 'document', 'doc').sort()).toEqual(['{"a":1}', '{"b":2}']);
  });

  it('reads a drawing under its own prefix', () => {
    expect(localDrafts(storage, 'inst', 'drawing', 'doc')).toEqual(['{"a drawing with the same id":true}']);
  });

  it('finds none for an id that only starts like another', () => {
    expect(localDrafts(storage, 'inst', 'document', 'do')).toEqual([]);
  });
});

describe('draftDownload', () => {
  it('gives a document draft as it was saved, in JSON', async () => {
    const { blob, fileName } = draftDownload('document', 'doc', '{"a":1}');
    expect(fileName).toBe('tinyfold-rascunho-documento-doc.json');
    expect(blob.type).toBe('application/json');
    expect(await blob.text()).toBe('{"a":1}');
  });

  it('gives a readable drawing draft as an editable Excalidraw file named after its title', async () => {
    const { blob, fileName } = draftDownload('drawing', 'c', canvasDraft('Mapa: v2'));
    expect(fileName).toBe('Mapa- v2.excalidraw');
    expect(blob.type).toBe('application/vnd.excalidraw+json');
    expect(JSON.parse(await blob.text())).toMatchObject({ type: 'excalidraw', elements: [] });
  });

  it('keeps an unreadable drawing draft as raw JSON, so nothing is lost', async () => {
    const raw = '{"format":1,"snapshot":"broken"}';
    const { blob, fileName } = draftDownload('drawing', 'c', raw);
    expect(fileName).toBe('tinyfold-rascunho-desenho-c.json');
    expect(await blob.text()).toBe(raw);
  });
});
