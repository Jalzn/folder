import { emptyCanvasScene, readCanvasScene } from '@tinyfold/drawings/domain';
import { readDocumentContent } from '@tinyfold/rich-text/domain';
import { describe, expect, it } from 'vitest';

const deep = () => {
  let value: unknown = 'x';
  for (let level = 0; level < 45; level += 1) value = [value];
  return value;
};

for (const [kind, read] of [
  ['document', readDocumentContent],
  ['drawing', readCanvasScene],
] as const)
  describe(`${kind} refuses invalid content without changing its message`, () => {
    for (const [name, input] of [
      ['wrong shape', null],
      ['non JSON value', undefined],
      ['non finite number', { value: Number.POSITIVE_INFINITY }],
      ['prototype key', JSON.parse('{"__proto__":{}}')],
      ['constructor key', { constructor: 'x' }],
      ['too deep', deep()],
    ] as const)
      it(name, () => expect(() => read(input)).toThrowErrorMatchingSnapshot());
  });

it('keeps the document block and byte ceilings distinct', () => {
  expect(() => readDocumentContent([{ type: 'unsupported' }])).toThrowErrorMatchingSnapshot();
  expect(() =>
    readDocumentContent(Array.from({ length: 5001 }, () => ({ type: 'paragraph' }))),
  ).toThrowErrorMatchingSnapshot();
  expect(() =>
    readDocumentContent([{ type: 'paragraph', content: 'x'.repeat(1024 * 1024) }]),
  ).toThrowErrorMatchingSnapshot();
});

it('keeps drawing media, element and byte refusals distinct', () => {
  expect(() =>
    readCanvasScene({ ...emptyCanvasScene(), elements: [{ id: 'x', type: 'image' }] }),
  ).toThrowErrorMatchingSnapshot();
  expect(() =>
    readCanvasScene({ ...emptyCanvasScene(), elements: Array.from({ length: 5001 }, () => ({})) }),
  ).toThrowErrorMatchingSnapshot();
  expect(() =>
    readCanvasScene({ ...emptyCanvasScene(), payload: 'x'.repeat(1024 * 1024) }),
  ).toThrowErrorMatchingSnapshot();
});
