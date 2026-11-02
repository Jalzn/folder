import { describe, expect, it } from 'vitest';
import { type DriftFacts, driftDecision } from './selection-drift';

/** A selection change ProseMirror read from the DOM while an embed is selected, during an embed key. */
const drift: DriftFacts = {
  inKey: true,
  sticky: true,
  embedSelected: true,
  docChanged: false,
  selectionSet: true,
  sameSelection: false,
  readFromDom: true,
  atFirstText: true,
};

describe('the drift guard’s policy', () => {
  it('refuses any change read from the DOM during an embed key, wherever it goes', () => {
    expect(driftDecision(drift)).toBe('refuse');
    expect(driftDecision({ ...drift, atFirstText: false })).toBe('refuse');
    expect(driftDecision({ ...drift, sticky: false, atFirstText: false })).toBe('refuse');
  });

  it('after the key, until another key or a press, refuses only the caret at the document’s first text', () => {
    const after = { ...drift, inKey: false };
    expect(driftDecision(after)).toBe('refuse');
    expect(driftDecision({ ...after, atFirstText: false })).toBe('pass');
  });

  it('lets everything through once another key or a press released it: ⌘↓, a screen reader, the page’s search', () => {
    expect(driftDecision({ ...drift, inKey: false, sticky: false })).toBe('pass');
  });

  it('never refuses an edit, a selection the editor set itself, the same selection, or one with no embed selected', () => {
    expect(driftDecision({ ...drift, docChanged: true })).toBe('pass');
    expect(driftDecision({ ...drift, readFromDom: false })).toBe('pass');
    expect(driftDecision({ ...drift, sameSelection: true })).toBe('pass');
    expect(driftDecision({ ...drift, selectionSet: false })).toBe('pass');
    expect(driftDecision({ ...drift, embedSelected: false })).toBe('pass');
  });
});
