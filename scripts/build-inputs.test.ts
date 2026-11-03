import { beforeEach, describe, expect, it, vi } from 'vitest';
import globalSetup from '../e2e/global-setup.js';

const state = vi.hoisted(() => ({ files: [] as string[], modified: new Map<string, number>() }));
const git = vi.hoisted(() => vi.fn((_command: string, _arguments: string[]) => state.files.join('\n')));
vi.mock('node:child_process', () => ({ execFileSync: git }));
vi.mock('node:fs', () => ({
  readFileSync: () =>
    JSON.stringify({
      imports: {
        '#core/domain': './src/core/domain/index.ts',
        '#rich-text/domain': './src/rich-text/domain/index.ts',
        '#future/domain': './src/future/domain/index.ts',
        '#future/composition': './src/future/infra/composition.ts',
      },
    }),
  statSync: (path: string) => {
    const mtimeMs = state.modified.get(path);
    if (mtimeMs === undefined) throw new Error('Missing file.');
    return { mtimeMs };
  },
}));

beforeEach(() => {
  state.files = [];
  state.modified.clear();
  state.modified.set('src/web/dist/index.html', 100);
  git.mockClear();
});

describe('web bundle freshness after root package centralization', () => {
  it('discovers future public domains from the root catalog and watches dependency/patch inputs', () => {
    globalSetup();
    expect(git.mock.calls[0]?.[1]).toEqual(
      expect.arrayContaining([
        '--cached',
        '--others',
        '--exclude-standard',
        'src/web',
        './src/future/domain',
        './src/rich-text/domain',
        'package.json',
        'pnpm-lock.yaml',
        'pnpm-workspace.yaml',
        'patches',
      ]),
    );
    expect(git.mock.calls[0]?.[1]).not.toContain('./src/future/infra');
  });

  it.each([
    'src/rich-text/domain/markdown.ts',
    'package.json',
    'pnpm-lock.yaml',
    'pnpm-workspace.yaml',
    'patches/editor.patch',
  ])('refuses an older bundle after %s changes', (file) => {
    state.files = [file];
    state.modified.set(file, 101);
    expect(globalSetup).toThrow(`O bundle da web é mais antigo que ${file}`);
  });

  it('ignores tests, test helpers, snapshots and files already deleted', () => {
    state.files = [
      'src/rich-text/domain/text.test.ts',
      'src/web/testing/editor.ts',
      'src/web/__snapshots__/editor.snap',
      'src/web/deleted.ts',
    ];
    for (const file of state.files.slice(0, -1)) state.modified.set(file, 200);
    expect(globalSetup).not.toThrow();
  });

  it('requires a built bundle', () => {
    state.modified.delete('src/web/dist/index.html');
    expect(globalSetup).toThrow('Não há bundle da web');
  });
});
