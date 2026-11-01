import { describe, expect, it } from 'vitest';
import { inFolderOrRoot } from './folder-fallback';

const refused = (code: string) => Object.assign(new Error(code), { code });

describe('inFolderOrRoot', () => {
  it('creates in the folder while it is there', async () => {
    const calls: (string | undefined)[] = [];
    const result = await inFolderOrRoot('f1', async (folderId) => {
      calls.push(folderId);
      return 'id';
    });
    expect(result).toEqual({ created: 'id', atRoot: false });
    expect(calls).toEqual(['f1']);
  });

  it('creates at the root once when the folder is gone', async () => {
    const calls: (string | undefined)[] = [];
    const result = await inFolderOrRoot('f1', async (folderId) => {
      calls.push(folderId);
      if (folderId) throw refused('NOT_FOUND');
      return 'id';
    });
    expect(result).toEqual({ created: 'id', atRoot: true });
    expect(calls).toEqual(['f1', undefined]);
  });

  it('lets any other failure, or one at the root, go up', async () => {
    await expect(inFolderOrRoot('f1', async () => Promise.reject(refused('VALIDATION')))).rejects.toThrow('VALIDATION');
    await expect(inFolderOrRoot(undefined, async () => Promise.reject(refused('NOT_FOUND')))).rejects.toThrow(
      'NOT_FOUND',
    );
  });
});
