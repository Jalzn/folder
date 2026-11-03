import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';
import { parseProjectPath, paths } from './paths';

it('parses every child route mounted under the project, including encoded IDs', () => {
  const source = readFileSync(new URL('./routes.tsx', import.meta.url), 'utf8');
  const children = [...source.matchAll(/getParentRoute: \(\) => projectRoute,\s*path: '([^']+)'/g)];
  expect(children.length).toBeGreaterThan(0);
  for (const [, path] of children) {
    const child = path?.replace(/\$\w+/g, encodeURIComponent('item / ç'));
    const parsed = parseProjectPath(`/projetos/${encodeURIComponent('projeto / ç')}/${child}`);
    expect(parsed, child).not.toBeNull();
    expect(parsed?.projectId).toBe('projeto / ç');
    if (child?.includes('documentos/') || child?.includes('desenhos/')) expect(parsed?.item?.id).toBe('item / ç');
  }
});

it('round trips the public address builders, preserving the item kind', () => {
  for (const address of [
    paths.overview('p'),
    paths.board('p'),
    paths.index('p', { pasta: 'raiz' }),
    paths.trash('p'),
    paths.completed('p'),
    paths.task('p', 't'),
  ])
    expect(parseProjectPath(address)).toEqual({ projectId: 'p', item: null });
  expect(parseProjectPath(paths.document('p', 'd', 'b'))).toEqual({
    projectId: 'p',
    item: { type: 'document', id: 'd' },
  });
  expect(parseProjectPath(paths.drawing('p', 'c'))).toEqual({ projectId: 'p', item: { type: 'drawing', id: 'c' } });
});
