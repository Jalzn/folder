import { realpathSync } from 'node:fs';
import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';

/** Where a package resolves from another package's own folder, as Node and Vite find it there. */
const resolveFrom = (from: string, name: string) => realpathSync(createRequire(from).resolve(name));

const web = createRequire(import.meta.url);
const blocknote = web.resolve('@blocknote/core');
const tiptap = web.resolve('@tiptap/pm/view');

/**
 * One copy of ProseMirror (review Q4): the origin markers make their PluginKey and decorations with
 * `@tiptap/pm`, which src/web pins to the version BlockNote uses. Were an update to give BlockNote another
 * copy, the editor would ignore the plugin's state without an error of types, and the markers would go.
 * The alternative, a pnpm override, would hide the drift instead of failing on it.
 */
describe('ProseMirror', () => {
  it.each(['prosemirror-view', 'prosemirror-state', 'prosemirror-model'])(
    'has one %s, the same for BlockNote and for the web’s @tiptap/pm',
    (name) => {
      expect(resolveFrom(tiptap, name)).toBe(resolveFrom(blocknote, name));
    },
  );
});
